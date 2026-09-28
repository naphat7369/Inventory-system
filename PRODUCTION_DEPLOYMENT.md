# Production deployment

The current application architecture requires a persistent Node.js host. It uses SQLite, local file storage, and a long-running E-Approve worker, so a stateless/serverless deployment without a persistent volume is not supported.

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
- `NEXTAUTH_URL`: public HTTPS URL; this enables secure authentication cookies
- `EAPPROVE_APP_URL`: URL the worker can use to reach the web application
- `CHROME_PATH`: Chrome/Chromium executable path
- `SMTP_HOST` and `SMTP_FROM`: required to enable email; SMTP credentials depend on the provider

## Install and migrate

```bash
npm ci
npx prisma migrate deploy
npm run build
```

Back up the database and `storage/` before running migrations on an existing production installation.

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
