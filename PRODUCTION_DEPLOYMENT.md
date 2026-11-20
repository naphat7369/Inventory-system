# Production deployment

The current application architecture requires a persistent Node.js host. It uses SQLite, local file storage, and a long-running E-Documents worker, so a stateless/serverless deployment without a persistent volume is not supported.

## Requirements

- Node.js 20.9 or newer (an active LTS release is recommended)
- A persistent writable disk for the SQLite database and `storage/`
- Google Chrome or Chromium for Official PDF generation
- An SMTP account for real email delivery
- HTTPS in front of the application

## Environment

Copy `.env.example` to `.env` on the server and replace every placeholder. Do not commit `.env`.

Required production values:

- `DATABASE_URL`: SQLite file on a persistent volume
- `JWT_SECRET`: a long random secret shared by the web and worker processes
- `SESSION_IDLE_TIMEOUT_MINUTES`: inactivity timeout in minutes (default `30`, allowed range `5`–`480`)

Refreshing the browser does not end the session. Closing the website tab/window ends its tab session, so opening the website again requires a new login. The authentication cookie is also a browser-session cookie and is not persisted after the browser session ends.
- `NEXTAUTH_URL`: public HTTPS URL; this enables secure authentication cookies
- `EDOCUMENTS_APP_URL`: URL the worker can use to reach the web application
- `CHROME_PATH`: Chrome/Chromium executable path
- `SMTP_HOST` and `SMTP_FROM`: required to enable email; SMTP credentials depend on the provider

## Install and migrate

```bash
npm ci
npx prisma migrate deploy
npm run build
```

Back up the database and `storage/` before running migrations on an existing production installation.

### One-time E-Documents rename upgrade

For the release that renames E-Approve to E-Documents, stop both the web process and the worker before upgrading. Rename the production environment variables from `EAPPROVE_*` to `EDOCUMENTS_*`, then run the database and PDF storage migrations before starting the new build:

```bash
npm ci
npx prisma migrate deploy
npm run storage:migrate:edocuments
npm run build
```

The storage migration moves existing Official PDF artifacts from `storage/eapprove/` to `storage/edocuments/` and updates their database keys. It is safe to run again after a partial failure. Do not restart the application until it completes with `missing=0`; otherwise existing Official PDFs may be unavailable through the new route.

If PM2 currently runs a process named `eapprove-worker`, remove that old process after stopping it and start `npm run worker` under the new process name `edocuments-worker`. The process name itself is operational metadata, but renaming it avoids leaving the retired product name in monitoring and logs.

## Start

For one VPS or one container, run both services together:

```bash
npm run start:all
```

For systemd, PM2, Docker Compose, or another process manager, run them as two services with the same environment and persistent volume:

```bash
npm run start:web
npm run worker
```

The web process serves HTTP. The worker creates Official PDFs and sends queued email. Running only `npm start` starts the web process but leaves PDF/email jobs pending.

## Filesystem and scaling

- Grant write permission to the database directory and `storage/`.
- Back up both the SQLite database and `storage/`; one without the other is incomplete.
- Use one application instance with the current SQLite/local-storage architecture.
- Horizontal scaling requires moving the database and artifact storage to shared production services first.

## Release verification

1. Sign in through the public HTTPS URL.
2. Create and submit a test Memo.
3. Complete every approval and confirm the Memo remains `APPROVED` while PDF status progresses to `READY`.
4. Preview and download the color Official PDF and verify all signatures.
5. Send the Memo to a controlled test email address and confirm the worker records it as sent only once.
6. Check Audit Logs & Operations for the approval, PDF, and email events.
7. Restart both processes and confirm existing data, attachments, and PDFs remain available.

## Known dependency note

The browser-side `xlsx` package currently has upstream security advisories with no patched npm release. Until it is replaced, only trusted administrators should be allowed to import spreadsheet files, and uploaded spreadsheets should be treated as untrusted input.
