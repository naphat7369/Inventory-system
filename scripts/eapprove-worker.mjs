import 'dotenv/config';

import { createHash } from 'node:crypto';
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { PrismaClient } from '@prisma/client';
import { SignJWT } from 'jose';
import nodemailer from 'nodemailer';
import puppeteer from 'puppeteer-core';

const prisma = new PrismaClient();
const appUrl = (process.env.EAPPROVE_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
const rendererVersion = 'v2-color-signatures';
const once = process.argv.includes('--once');
const smtpConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
let stopping = false;

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function firstExistingPath(candidates) {
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      await access(candidate);
      return candidate;
    } catch {
      // Try the next supported browser path.
    }
  }
  return null;
}

async function findBrowserExecutable() {
  return firstExistingPath([
    process.env.CHROME_PATH,
    process.platform === 'win32' ? path.join(process.env.PROGRAMFILES || '', 'Google', 'Chrome', 'Application', 'chrome.exe') : null,
    process.platform === 'win32' ? path.join(process.env['PROGRAMFILES(X86)'] || '', 'Google', 'Chrome', 'Application', 'chrome.exe') : null,
    process.platform === 'win32' ? path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe') : null,
    process.platform === 'win32' ? path.join(process.env.PROGRAMFILES || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe') : null,
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ]);
}

async function waitForApplication() {
  while (!stopping) {
    try {
      const response = await fetch(`${appUrl}/login`, { signal: AbortSignal.timeout(5_000) });
      if (response.ok) return;
    } catch {
      // The web process may still be starting.
    }
    if (once) throw new Error('APP_UNAVAILABLE');
    await delay(2_000);
  }
}

async function createWorkerSession() {
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN', isActive: true }, orderBy: { createdAt: 'asc' } });
  if (!admin) throw new Error('ACTIVE_ADMIN_NOT_FOUND');
  const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'super-secret-default-key-change-in-production');
  return new SignJWT({
    id: admin.id,
    username: admin.username,
    role: admin.role,
    fullName: admin.fullName,
    departmentId: admin.departmentId,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('10m')
    .sign(secret);
}

async function claimNextPdfJob() {
  const job = await prisma.backgroundJob.findFirst({
    where: {
      type: 'GENERATE_OFFICIAL_PDF',
      status: 'PENDING',
      availableAt: { lte: new Date() },
      attemptCount: { lt: 5 },
    },
    orderBy: { createdAt: 'asc' },
  });
  if (!job) return null;

  const claimed = await prisma.backgroundJob.updateMany({
    where: { id: job.id, status: 'PENDING' },
    data: { status: 'PROCESSING', lockedAt: new Date(), attemptCount: { increment: 1 }, lastErrorCode: null },
  });
  if (claimed.count === 0) return null;
  if (job.memoId) {
    await prisma.memo.update({ where: { id: job.memoId }, data: { pdfStatus: 'GENERATING', pdfErrorCode: null } });
  }
  return prisma.backgroundJob.findUnique({ where: { id: job.id } });
}

function safeErrorCode(error) {
  const message = error instanceof Error ? error.message : '';
  if (message.includes('APP_UNAVAILABLE') || message.includes('ERR_CONNECTION_REFUSED')) return 'APP_UNAVAILABLE';
  if (message.includes('ACTIVE_ADMIN_NOT_FOUND')) return 'ACTIVE_ADMIN_NOT_FOUND';
  if (message.includes('CHROME_NOT_FOUND')) return 'CHROME_NOT_FOUND';
  if (message.toLowerCase().includes('timeout')) return 'RENDER_TIMEOUT';
  return 'PDF_GENERATION_FAILED';
}

function safeEmailErrorCode(error) {
  const code = String(error?.code || '').toUpperCase();
  if (['EAUTH', 'EENVELOPE'].includes(code)) return 'SMTP_AUTH_OR_RECIPIENT_ERROR';
  if (['ECONNECTION', 'ECONNREFUSED', 'ETIMEDOUT', 'ESOCKET'].includes(code)) return 'SMTP_CONNECTION_ERROR';
  return 'EMAIL_PROVIDER_ERROR';
}

function createSmtpTransport() {
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE === 'true' || port === 465,
    auth: user ? { user, pass: pass || '' } : undefined,
  });
}

async function claimNextEmailDelivery() {
  if (!smtpConfigured) return null;
  const retryBefore = new Date(Date.now() - 30_000);
  const delivery = await prisma.emailDelivery.findFirst({
    where: {
      attemptCount: { lt: 5 },
      OR: [
        { status: 'PENDING' },
        { status: 'FAILED', updatedAt: { lte: retryBefore } },
      ],
    },
    orderBy: { createdAt: 'asc' },
  });
  if (!delivery) return null;
  const claimed = await prisma.emailDelivery.updateMany({
    where: { id: delivery.id, status: delivery.status },
    data: { status: 'SENDING', attemptCount: { increment: 1 }, lastErrorCode: null },
  });
  return claimed.count === 1 ? prisma.emailDelivery.findUnique({ where: { id: delivery.id } }) : null;
}

async function processEmailDelivery(delivery) {
  if (!delivery.memoId) throw new Error('MEMO_NOT_FOUND');
  const memo = await prisma.memo.findUnique({
    where: { id: delivery.memoId },
    include: { pdfArtifacts: { where: { kind: 'OFFICIAL' }, orderBy: { createdAt: 'desc' }, take: 1 } },
  });
  const artifact = memo?.pdfArtifacts[0];
  if (!memo || memo.pdfStatus !== 'READY' || !artifact) throw new Error('OFFICIAL_PDF_NOT_READY');
  const storageRoot = path.resolve(process.cwd(), 'storage', 'eapprove', 'official-pdfs');
  const attachmentPath = path.resolve(process.cwd(), artifact.storageKey);
  if (attachmentPath !== storageRoot && !attachmentPath.startsWith(`${storageRoot}${path.sep}`)) throw new Error('INVALID_STORAGE_PATH');
  await access(attachmentPath);

  const payload = JSON.parse(delivery.payload);
  const customMessage = typeof payload.message === 'string' ? payload.message.trim() : '';
  const memoUrl = typeof payload.memoUrl === 'string' ? payload.memoUrl : `${appUrl}/memos/${memo.id}`;
  const subject = typeof payload.subject === 'string' ? payload.subject : `${memo.documentNo ? `${memo.documentNo} - ` : ''}${memo.subject}`;
  const safeFileName = `${(memo.documentNo || memo.subject || 'memo').replace(/[\\/:*?"<>|]/g, '-')}-official.pdf`;
  const text = [customMessage, customMessage ? '' : null, `เปิดดู Memo: ${memoUrl}`, '', 'เอกสาร Official PDF แนบมากับอีเมลฉบับนี้'].filter((part) => part !== null).join('\n');
  const messageIdHash = createHash('sha256').update(delivery.idempotencyKey).digest('hex').slice(0, 32);

  const transport = createSmtpTransport();
  await transport.sendMail({
    from: process.env.SMTP_FROM,
    to: delivery.recipient,
    subject,
    text,
    messageId: `<${messageIdHash}@eapprove.local>`,
    attachments: [{ filename: safeFileName, path: attachmentPath, contentType: 'application/pdf' }],
  });

  await prisma.$transaction([
    prisma.emailDelivery.update({ where: { id: delivery.id }, data: { status: 'SENT', sentAt: new Date(), lastErrorCode: null } }),
    prisma.auditLog.create({ data: {
      module: 'E_APPROVE',
      action: 'MEMO_EMAIL_SENT',
      entity: 'EMAIL_DELIVERY',
      entityId: delivery.id,
      userId: typeof payload.actorId === 'string' ? payload.actorId : null,
      details: JSON.stringify({ memoId: memo.id, recipient: delivery.recipient, attachmentHash: artifact.contentHash }),
    } }),
  ]);
}

async function finishWithExistingArtifact(job, memoVersionId) {
  const artifact = await prisma.memoPdfArtifact.findUnique({
    where: { memoId_memoVersionId_kind: { memoId: job.memoId, memoVersionId, kind: 'OFFICIAL' } },
  });
  if (!artifact || !artifact.storageKey.endsWith(`-${rendererVersion}.pdf`)) return false;
  try {
    await access(path.resolve(process.cwd(), artifact.storageKey));
  } catch {
    return false;
  }
  await prisma.$transaction([
    prisma.backgroundJob.update({ where: { id: job.id }, data: { status: 'COMPLETED', completedAt: new Date(), lockedAt: null, lastErrorCode: null } }),
    prisma.memo.update({ where: { id: job.memoId }, data: { pdfStatus: 'READY', pdfErrorCode: null } }),
  ]);
  return true;
}

async function renderPdf(job, memoVersionId) {
  const executablePath = await findBrowserExecutable();
  if (!executablePath) throw new Error('CHROME_NOT_FOUND');
  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });
  try {
    const page = await browser.newPage();
    const session = await createWorkerSession();
    await page.setCookie({ name: 'session', value: session, url: appUrl, httpOnly: true, sameSite: 'Lax' });
    await page.evaluateOnNewDocument(() => {
      window.sessionStorage.setItem('inventory-session:active-tab', 'active');
    });
    await page.goto(`${appUrl}/memos/${job.memoId}?pdf=1`, { waitUntil: 'networkidle0', timeout: 60_000 });
    await page.waitForFunction(
      () => {
        const signatureImages = [...document.querySelectorAll('.memo-approval-signature-image')];
        return document.fonts.status === 'loaded'
          && document.querySelectorAll('.memo-page-sheet').length > 0
          && document.querySelectorAll('[data-signature-processing="true"]').length === 0
          && signatureImages.every((image) => image.complete && image.naturalWidth > 0);
      },
      { timeout: 60_000 },
    );
    await page.emulateMediaType('print');
    const bytes = await page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } });

    const storageKey = path.join('storage', 'eapprove', 'official-pdfs', job.memoId, `${memoVersionId}-${rendererVersion}.pdf`);
    const absolutePath = path.resolve(process.cwd(), storageKey);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    try {
      await writeFile(absolutePath, bytes, { flag: 'wx' });
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error;
    }
    const persistedBytes = await readFile(absolutePath);
    return {
      storageKey: storageKey.split(path.sep).join('/'),
      contentHash: createHash('sha256').update(persistedBytes).digest('hex'),
    };
  } finally {
    await browser.close();
  }
}

async function processPdfJob(job) {
  if (!job.memoId) throw new Error('MEMO_NOT_FOUND');
  const payload = JSON.parse(job.payload);
  const memoVersionId = typeof payload.memoVersionId === 'string' ? payload.memoVersionId : '';
  if (!memoVersionId) throw new Error('MEMO_VERSION_NOT_FOUND');
  if (await finishWithExistingArtifact(job, memoVersionId)) return;

  const result = await renderPdf(job, memoVersionId);
  await prisma.$transaction(async (tx) => {
    const existing = await tx.memoPdfArtifact.findUnique({
      where: { memoId_memoVersionId_kind: { memoId: job.memoId, memoVersionId, kind: 'OFFICIAL' } },
    });
    if (existing) {
      await tx.memoPdfArtifact.update({ where: { id: existing.id }, data: result });
    } else {
      await tx.memoPdfArtifact.create({ data: {
        memoId: job.memoId,
        memoVersionId,
        kind: 'OFFICIAL',
        storageKey: result.storageKey,
        contentHash: result.contentHash,
        jobKey: job.idempotencyKey,
      } });
    }
    await tx.backgroundJob.update({ where: { id: job.id }, data: { status: 'COMPLETED', completedAt: new Date(), lockedAt: null, lastErrorCode: null } });
    await tx.memo.update({ where: { id: job.memoId }, data: { pdfStatus: 'READY', pdfErrorCode: null } });
    await tx.auditLog.create({ data: {
      module: 'E_APPROVE',
      action: 'OFFICIAL_PDF_READY',
      entity: 'MEMO',
      entityId: job.memoId,
      details: JSON.stringify({
        memoVersionId,
        rendererVersion,
        previousContentHash: existing?.contentHash ?? null,
        contentHash: result.contentHash,
      }),
    } });
  });
}

async function runOne() {
  const job = await claimNextPdfJob();
  if (job) {
    try {
      await processPdfJob(job);
      console.log(`[eapprove-worker] completed ${job.idempotencyKey}`);
    } catch (error) {
      console.error('Full PDF Error:', error);
      const errorCode = safeErrorCode(error);
      console.error(`[eapprove-worker] failed ${job.idempotencyKey}: ${errorCode}`);
      if (job.memoId) {
        await prisma.$transaction([
          prisma.backgroundJob.update({ where: { id: job.id }, data: { status: 'FAILED', lockedAt: null, lastErrorCode: errorCode } }),
          prisma.memo.update({ where: { id: job.memoId }, data: { pdfStatus: 'FAILED', pdfErrorCode: errorCode } }),
        ]);
      }
    }
    return true;
  }

  const delivery = await claimNextEmailDelivery();
  if (!delivery) return false;
  try {
    await processEmailDelivery(delivery);
    console.log(`[eapprove-worker] email sent ${delivery.id}`);
  } catch (error) {
    const errorCode = safeEmailErrorCode(error);
    console.error(`[eapprove-worker] email failed ${delivery.id}: ${errorCode}`);
    await prisma.emailDelivery.update({ where: { id: delivery.id }, data: { status: 'FAILED', lastErrorCode: errorCode } });
  }
  return true;
}

async function main() {
  await waitForApplication();
  if (!smtpConfigured) console.log('[eapprove-worker] SMTP disabled: set SMTP_HOST and SMTP_FROM to enable real email delivery');
  do {
    const processed = await runOne();
    if (once) break;
    if (!processed) await delay(3_000);
  } while (!stopping);
}

process.on('SIGINT', () => { stopping = true; });
process.on('SIGTERM', () => { stopping = true; });

try {
  await main();
} finally {
  await prisma.$disconnect();
}
