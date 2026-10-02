#!/usr/bin/env python3
"""Rehearse or apply a one-time SQLite to PostgreSQL data migration.

The PostgreSQL schema and Prisma baseline must already exist. By default the
script only validates both databases. Pass --apply to insert source data in a
single transaction. The target URL is read from MIGRATION_DATABASE_URL so a
password never needs to be placed on the command line.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import sqlite3
import sys
from datetime import date, datetime, timezone
from decimal import Decimal
from pathlib import Path
from typing import Any
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

import psycopg2
from psycopg2 import sql
from psycopg2.extras import Json, execute_values


EXCLUDED_TABLES = {"_prisma_migrations"}
MIGRATION_LOCK_ID = 2_026_100_200_01


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Validate or migrate SQLite rows into a pre-baselined PostgreSQL database."
    )
    parser.add_argument("--source", required=True, help="Path to the SQLite backup database")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument(
        "--apply",
        action="store_true",
        help="Insert rows. Without this flag the command is validation-only.",
    )
    mode.add_argument(
        "--verify",
        action="store_true",
        help="Compare every migrated value with SQLite without writing data.",
    )
    return parser.parse_args()


def postgres_dsn() -> str:
    raw = os.environ.get("MIGRATION_DATABASE_URL", "").strip()
    if not raw:
        raise RuntimeError("MIGRATION_DATABASE_URL is required")

    parsed = urlsplit(raw)
    if parsed.scheme not in {"postgres", "postgresql"}:
        raise RuntimeError("MIGRATION_DATABASE_URL must be a PostgreSQL URL")

    # `schema=public` is understood by Prisma but not by libpq/psycopg2.
    query = [(key, value) for key, value in parse_qsl(parsed.query) if key != "schema"]
    return urlunsplit((parsed.scheme, parsed.netloc, parsed.path, urlencode(query), parsed.fragment))


def quote_sqlite_identifier(name: str) -> str:
    return '"' + name.replace('"', '""') + '"'


def source_tables(connection: sqlite3.Connection) -> list[str]:
    rows = connection.execute(
        """
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
          AND name NOT LIKE 'sqlite_%'
        ORDER BY name
        """
    ).fetchall()
    return [row[0] for row in rows if row[0] not in EXCLUDED_TABLES]


def source_columns(connection: sqlite3.Connection, table: str) -> list[str]:
    rows = connection.execute(f"PRAGMA table_info({quote_sqlite_identifier(table)})").fetchall()
    return [row[1] for row in rows]


def target_columns(cursor: Any, table: str) -> list[tuple[str, str, str]]:
    cursor.execute(
        """
        SELECT column_name, data_type, udt_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = %s
        ORDER BY ordinal_position
        """,
        (table,),
    )
    return [(row[0], row[1], row[2]) for row in cursor.fetchall()]


def target_tables(cursor: Any) -> set[str]:
    cursor.execute(
        """
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        """
    )
    return {row[0] for row in cursor.fetchall()}


def as_datetime(value: Any, with_timezone: bool) -> datetime:
    if isinstance(value, datetime):
        result = value
    elif isinstance(value, (int, float)):
        number = float(value)
        seconds = number / 1000 if abs(number) >= 100_000_000_000 else number
        result = datetime.fromtimestamp(seconds, tz=timezone.utc)
    elif isinstance(value, str):
        normalized = value.strip().replace("Z", "+00:00")
        result = datetime.fromisoformat(normalized)
    else:
        raise ValueError(f"Unsupported DateTime value type: {type(value).__name__}")

    if with_timezone:
        return result if result.tzinfo else result.replace(tzinfo=timezone.utc)
    if result.tzinfo:
        return result.astimezone(timezone.utc).replace(tzinfo=None)
    return result


def as_boolean(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value != 0
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in {"1", "true", "t", "yes", "y"}:
            return True
        if normalized in {"0", "false", "f", "no", "n"}:
            return False
    raise ValueError(f"Unsupported Boolean value: {value!r}")


def convert_value(value: Any, data_type: str, udt_name: str) -> Any:
    if value is None:
        return None
    if data_type == "boolean":
        return as_boolean(value)
    if data_type == "timestamp without time zone":
        return as_datetime(value, with_timezone=False)
    if data_type == "timestamp with time zone":
        return as_datetime(value, with_timezone=True)
    if data_type == "date":
        converted = as_datetime(value, with_timezone=False)
        return date(converted.year, converted.month, converted.day)
    if data_type in {"json", "jsonb"}:
        return Json(json.loads(value) if isinstance(value, str) else value)
    if data_type in {"smallint", "integer", "bigint"}:
        return int(value)
    if data_type in {"real", "double precision", "numeric", "decimal"}:
        number = float(value)
        if not math.isfinite(number):
            raise ValueError("Non-finite numeric values are not allowed")
        return value
    if data_type == "bytea" and isinstance(value, memoryview):
        return value.tobytes()
    if udt_name == "bytea" and isinstance(value, bytes):
        return psycopg2.Binary(value)
    return value


def assert_sqlite_health(connection: sqlite3.Connection) -> None:
    integrity = connection.execute("PRAGMA integrity_check").fetchone()[0]
    if integrity != "ok":
        raise RuntimeError(f"SQLite integrity_check failed: {integrity}")
    foreign_key_errors = connection.execute("PRAGMA foreign_key_check").fetchall()
    if foreign_key_errors:
        raise RuntimeError(f"SQLite foreign_key_check failed: {foreign_key_errors[:5]}")


def inspect_schema(
    sqlite_connection: sqlite3.Connection,
    pg_connection: Any,
    require_empty: bool,
) -> tuple[list[str], dict[str, list[tuple[str, str, str]]], dict[str, int]]:
    tables = source_tables(sqlite_connection)
    target_metadata: dict[str, list[tuple[str, str, str]]] = {}
    counts: dict[str, int] = {}

    with pg_connection.cursor() as cursor:
        available_targets = target_tables(cursor)
        missing_targets = sorted(set(tables) - available_targets)
        if missing_targets:
            raise RuntimeError(f"Target tables are missing: {', '.join(missing_targets)}")

        for table in tables:
            sqlite_columns = source_columns(sqlite_connection, table)
            postgres_columns = target_columns(cursor, table)
            postgres_names = [column[0] for column in postgres_columns]
            if set(sqlite_columns) != set(postgres_names):
                missing_in_postgres = sorted(set(sqlite_columns) - set(postgres_names))
                missing_in_sqlite = sorted(set(postgres_names) - set(sqlite_columns))
                raise RuntimeError(
                    f"Column mismatch for {table}: "
                    f"missing_in_postgresql={missing_in_postgres}, "
                    f"missing_in_sqlite={missing_in_sqlite}"
                )

            cursor.execute(
                sql.SQL("SELECT COUNT(*) FROM {}.{}").format(
                    sql.Identifier("public"), sql.Identifier(table)
                )
            )
            target_count = int(cursor.fetchone()[0])
            if require_empty and target_count != 0:
                raise RuntimeError(f"Target table {table} is not empty ({target_count} rows)")

            counts[table] = int(
                sqlite_connection.execute(
                    f"SELECT COUNT(*) FROM {quote_sqlite_identifier(table)}"
                ).fetchone()[0]
            )
            target_metadata[table] = postgres_columns

    return tables, target_metadata, counts


def foreign_keys(cursor: Any) -> list[tuple[str, str]]:
    cursor.execute(
        """
        SELECT table_class.relname, constraint_data.conname
        FROM pg_constraint AS constraint_data
        JOIN pg_class AS table_class ON table_class.oid = constraint_data.conrelid
        JOIN pg_namespace AS namespace_data ON namespace_data.oid = table_class.relnamespace
        WHERE constraint_data.contype = 'f' AND namespace_data.nspname = 'public'
        ORDER BY table_class.relname, constraint_data.conname
        """
    )
    return [(row[0], row[1]) for row in cursor.fetchall()]


def set_foreign_key_mode(cursor: Any, constraints: list[tuple[str, str]], deferred: bool) -> None:
    mode = sql.SQL("DEFERRABLE INITIALLY DEFERRED") if deferred else sql.SQL("NOT DEFERRABLE")
    for table, constraint in constraints:
        cursor.execute(
            sql.SQL("ALTER TABLE {}.{} ALTER CONSTRAINT {} {}").format(
                sql.Identifier("public"),
                sql.Identifier(table),
                sql.Identifier(constraint),
                mode,
            )
        )


def insert_table(
    sqlite_connection: sqlite3.Connection,
    pg_cursor: Any,
    table: str,
    metadata: list[tuple[str, str, str]],
) -> int:
    columns = [column[0] for column in metadata]
    selected_columns = ", ".join(quote_sqlite_identifier(column) for column in columns)
    source_cursor = sqlite_connection.execute(
        f"SELECT {selected_columns} FROM {quote_sqlite_identifier(table)}"
    )
    rows = source_cursor.fetchall()
    if not rows:
        return 0

    converted_rows = [
        tuple(
            convert_value(value, metadata[index][1], metadata[index][2])
            for index, value in enumerate(row)
        )
        for row in rows
    ]

    statement = sql.SQL("INSERT INTO {}.{} ({}) VALUES %s").format(
        sql.Identifier("public"),
        sql.Identifier(table),
        sql.SQL(", ").join(sql.Identifier(column) for column in columns),
    )
    execute_values(pg_cursor, statement.as_string(pg_cursor), converted_rows, page_size=500)
    return len(converted_rows)


def validate_counts(cursor: Any, expected_counts: dict[str, int]) -> None:
    mismatches: list[str] = []
    for table, expected in expected_counts.items():
        cursor.execute(
            sql.SQL("SELECT COUNT(*) FROM {}.{}").format(
                sql.Identifier("public"), sql.Identifier(table)
            )
        )
        actual = int(cursor.fetchone()[0])
        if actual != expected:
            mismatches.append(f"{table}: expected={expected}, actual={actual}")
    if mismatches:
        raise RuntimeError("Row count mismatch: " + "; ".join(mismatches))


def normalize_value(value: Any) -> Any:
    if isinstance(value, Json):
        return normalize_value(value.adapted)
    if isinstance(value, datetime):
        if value.tzinfo:
            value = value.astimezone(timezone.utc).replace(tzinfo=None)
        return value.isoformat(timespec="milliseconds")
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, Decimal):
        return format(value, "f")
    if isinstance(value, memoryview):
        return value.tobytes().hex()
    if isinstance(value, bytes):
        return value.hex()
    if isinstance(value, dict):
        return {key: normalize_value(item) for key, item in sorted(value.items())}
    if isinstance(value, (list, tuple)):
        return [normalize_value(item) for item in value]
    return value


def rows_digest(rows: list[list[Any]]) -> str:
    serialized = [
        json.dumps(row, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
        for row in rows
    ]
    serialized.sort()
    payload = "\n".join(serialized).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def verify_migrated_data(
    sqlite_connection: sqlite3.Connection,
    pg_connection: Any,
    tables: list[str],
    metadata: dict[str, list[tuple[str, str, str]]],
    expected_counts: dict[str, int],
) -> None:
    with pg_connection.cursor() as cursor:
        validate_counts(cursor, expected_counts)

        cursor.execute(
            """
            SELECT COUNT(*)
            FROM pg_constraint AS constraint_data
            JOIN pg_class AS table_class ON table_class.oid = constraint_data.conrelid
            JOIN pg_namespace AS namespace_data ON namespace_data.oid = table_class.relnamespace
            WHERE constraint_data.contype = 'f'
              AND namespace_data.nspname = 'public'
              AND (NOT constraint_data.convalidated OR constraint_data.condeferrable)
            """
        )
        unsafe_constraints = int(cursor.fetchone()[0])
        if unsafe_constraints:
            raise RuntimeError(
                f"PostgreSQL has {unsafe_constraints} unvalidated or still-deferrable foreign keys"
            )

        for table in tables:
            columns = [column[0] for column in metadata[table]]
            selected_columns = ", ".join(
                quote_sqlite_identifier(column) for column in columns
            )
            source_rows = sqlite_connection.execute(
                f"SELECT {selected_columns} FROM {quote_sqlite_identifier(table)}"
            ).fetchall()
            normalized_source = [
                [
                    normalize_value(
                        convert_value(value, metadata[table][index][1], metadata[table][index][2])
                    )
                    for index, value in enumerate(row)
                ]
                for row in source_rows
            ]

            cursor.execute(
                sql.SQL("SELECT {} FROM {}.{}").format(
                    sql.SQL(", ").join(sql.Identifier(column) for column in columns),
                    sql.Identifier("public"),
                    sql.Identifier(table),
                )
            )
            normalized_target = [
                [normalize_value(value) for value in row]
                for row in cursor.fetchall()
            ]

            source_hash = rows_digest(normalized_source)
            target_hash = rows_digest(normalized_target)
            if source_hash != target_hash:
                raise RuntimeError(
                    f"Data checksum mismatch for {table}: "
                    f"SQLite={source_hash}, PostgreSQL={target_hash}"
                )
            if expected_counts[table]:
                print(f"Verified {table}: {expected_counts[table]} rows, sha256={source_hash}")


def main() -> int:
    args = parse_args()
    source_path = Path(args.source).resolve(strict=True)
    source_uri = f"file:{source_path.as_posix()}?mode=ro"

    sqlite_connection = sqlite3.connect(source_uri, uri=True)
    sqlite_connection.row_factory = sqlite3.Row
    pg_connection = psycopg2.connect(postgres_dsn())

    try:
        assert_sqlite_health(sqlite_connection)
        tables, metadata, counts = inspect_schema(
            sqlite_connection,
            pg_connection,
            require_empty=not args.verify,
        )
        populated = [(table, count) for table, count in counts.items() if count]

        print(f"Source: {source_path}")
        print(f"Tables checked: {len(tables)}")
        print(f"Populated tables: {len(populated)}")
        print(f"Rows ready: {sum(counts.values())}")
        for table, count in populated:
            print(f"  {table}: {count}")

        if args.verify:
            verify_migrated_data(sqlite_connection, pg_connection, tables, metadata, counts)
            print(f"Verification passed: {sum(counts.values())} rows")
            return 0

        if not args.apply:
            print("Validation only: no PostgreSQL rows were written.")
            return 0

        pg_connection.rollback()
        pg_connection.autocommit = False
        with pg_connection.cursor() as cursor:
            cursor.execute("SELECT pg_advisory_xact_lock(%s)", (MIGRATION_LOCK_ID,))
            constraints = foreign_keys(cursor)
            set_foreign_key_mode(cursor, constraints, deferred=True)
            cursor.execute("SET CONSTRAINTS ALL DEFERRED")

            migrated_rows = 0
            for table in tables:
                inserted = insert_table(sqlite_connection, cursor, table, metadata[table])
                migrated_rows += inserted
                if inserted:
                    print(f"Migrated {table}: {inserted}")

            cursor.execute("SET CONSTRAINTS ALL IMMEDIATE")
            validate_counts(cursor, counts)
            set_foreign_key_mode(cursor, constraints, deferred=False)

        pg_connection.commit()
        print(f"Migration committed: {migrated_rows} rows")
        return 0
    except Exception as error:
        pg_connection.rollback()
        print(f"Migration failed and was rolled back: {error}", file=sys.stderr)
        return 1
    finally:
        sqlite_connection.close()
        pg_connection.close()


if __name__ == "__main__":
    raise SystemExit(main())
