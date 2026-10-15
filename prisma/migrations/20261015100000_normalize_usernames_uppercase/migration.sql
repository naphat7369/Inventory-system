DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "User"
    GROUP BY UPPER(BTRIM("username"))
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot normalize usernames: duplicate values differ only by case or surrounding spaces';
  END IF;

  IF EXISTS (SELECT 1 FROM "User" WHERE BTRIM("username") = '') THEN
    RAISE EXCEPTION 'Cannot normalize usernames: blank username found';
  END IF;
END $$;

UPDATE "User"
SET "username" = UPPER(BTRIM("username"))
WHERE "username" <> UPPER(BTRIM("username"));
