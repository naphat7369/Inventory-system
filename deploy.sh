#!/usr/bin/env bash

set -Eeuo pipefail

APP_DIR="/root/Inventory-system"
DATABASE_NAME="inventory_prod"
WEB_PROCESS="my-next-app"
WORKER_PROCESS="edocuments-worker"
BACKUP_ROOT="/root/inventory-backups"
BACKUP_DIR=""

deployment_error() {
  local exit_code=$?
  echo "Deployment failed with exit code ${exit_code}."
  echo "Services were not automatically rolled back. Inspect the error before restarting them."
  echo "Backup directory: ${BACKUP_DIR:-not-created}"
  pm2 status || true
  exit "${exit_code}"
}

trap deployment_error ERR

cd "${APP_DIR}"

echo "========================================="
echo "[$(date --iso-8601=seconds)] Starting deployment"
echo "========================================="

echo "1. Checking repository"
if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
  echo "Deployment stopped: tracked files have local changes."
  git status --short
  exit 1
fi

git fetch origin main
if ! git merge-base --is-ancestor HEAD origin/main; then
  echo "Deployment stopped: local HEAD cannot be fast-forwarded to origin/main."
  exit 1
fi

echo "2. Stopping web and worker processes"
pm2 stop "${WEB_PROCESS}" || true
pm2 stop "${WORKER_PROCESS}" || true

echo "3. Backing up PostgreSQL, storage, environment, and commit"
BACKUP_DIR="${BACKUP_ROOT}/deploy-$(date +%Y%m%d-%H%M%S)"
install -d -m 700 "${BACKUP_DIR}"

cp -a .env "${BACKUP_DIR}/env.before-deploy"
git rev-parse HEAD > "${BACKUP_DIR}/commit.before-deploy.txt"
runuser -u postgres -- pg_dump -Fc -d "${DATABASE_NAME}" \
  > "${BACKUP_DIR}/${DATABASE_NAME}.dump"
tar -czf "${BACKUP_DIR}/storage.tar.gz" storage

sha256sum \
  "${BACKUP_DIR}/env.before-deploy" \
  "${BACKUP_DIR}/commit.before-deploy.txt" \
  "${BACKUP_DIR}/${DATABASE_NAME}.dump" \
  "${BACKUP_DIR}/storage.tar.gz" \
  > "${BACKUP_DIR}/SHA256SUMS"
sha256sum -c "${BACKUP_DIR}/SHA256SUMS"

echo "4. Updating source code"
git merge --ff-only origin/main

echo "5. Installing dependencies"
npm ci

echo "6. Applying database and storage migrations"
npx prisma migrate deploy
npm run storage:migrate:edocuments

echo "7. Building production application"
npm run build

echo "8. Starting web and worker as separate PM2 processes"
pm2 delete "${WEB_PROCESS}" >/dev/null 2>&1 || true
pm2 delete "${WORKER_PROCESS}" >/dev/null 2>&1 || true

pm2 start npm \
  --name "${WEB_PROCESS}" \
  --cwd "${APP_DIR}" \
  -- run start:web

pm2 start npm \
  --name "${WORKER_PROCESS}" \
  --cwd "${APP_DIR}" \
  -- run worker

pm2 save

echo "9. Verifying deployment"
npx prisma migrate status

web_ready=0
for _ in $(seq 1 30); do
  if curl --fail --silent --show-error --output /dev/null \
    http://127.0.0.1:3000/login; then
    web_ready=1
    break
  fi
  sleep 2
done

if [[ "${web_ready}" -ne 1 ]]; then
  echo "Web health check failed."
  exit 1
fi

web_pid="$(pm2 pid "${WEB_PROCESS}" | tail -n 1)"
worker_pid="$(pm2 pid "${WORKER_PROCESS}" | tail -n 1)"
if [[ ! "${web_pid}" =~ ^[1-9][0-9]*$ ]] || [[ ! "${worker_pid}" =~ ^[1-9][0-9]*$ ]]; then
  echo "PM2 process verification failed."
  exit 1
fi

pm2 status

trap - ERR
echo "========================================="
echo "[$(date --iso-8601=seconds)] Deployment successful"
echo "Backup directory: ${BACKUP_DIR}"
echo "========================================="
