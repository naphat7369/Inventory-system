import 'dotenv/config';

import { createHash } from 'node:crypto';
import { access, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { PrismaClient } from '@prisma/client';
import { SignJWT } from 'jose';
import nodemailer from 'nodemailer';
import puppeteer from 'puppeteer-core';
import { renderEmail } from './eapprove-email-templates.mjs';

const prisma = new PrismaClient();
const appUrl = (process.env.EAPPROVE_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
const rendererVersion = 'v4-angsana-pagination';
const once = process.argv.includes('--once');
const smtpConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
let stopping = false;
let lastNotificationCleanupAt = 0;

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

function isPermanentEmailError(error) {
  const responseCode = Number(error?.responseCode || 0);
  const code = String(error?.code || '').toUpperCase();
  return responseCode >= 500 && responseCode < 600 && !['ECONNECTION', 'ECONNREFUSED', 'ETIMEDOUT', 'ESOCKET'].includes(code);
}

async function setting(key, fallback) {
  const row = await prisma.systemSetting.findUnique({ where: { key } });
  if (!row) return fallback;
  try { return JSON.parse(row.value); } catch { return fallback; }
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
  const leaseBefore = new Date(Date.now() - 5 * 60_000);
  await prisma.emailDelivery.updateMany({
    where: { status: 'SENDING', lockedAt: { lt: leaseBefore }, attemptCount: { lt: 3 } },
    data: { status: 'RETRY_WAIT', availableAt: new Date(), lockedAt: null, lastErrorCode: 'LEASE_EXPIRED' },
  });
  const delivery = await prisma.emailDelivery.findFirst({
    where: {
      attemptCount: { lt: 3 }, availableAt: { lte: new Date() },
      status: { in: ['PENDING', 'RETRY_WAIT'] },
    },
    orderBy: [{ availableAt: 'asc' }, { createdAt: 'asc' }],
  });
  if (!delivery) return null;
  const claimed = await prisma.emailDelivery.updateMany({
    where: { id: delivery.id, status: delivery.status },
    data: { status: 'SENDING', lockedAt: new Date(), attemptCount: { increment: 1 }, lastErrorCode: null },
  });
  return claimed.count === 1 ? prisma.emailDelivery.findUnique({ where: { id: delivery.id } }) : null;
}

async function processEmailDelivery(delivery) {
  const payload = JSON.parse(delivery.payload);
  const digestTemplate = delivery.template === 'APPROVAL_SUMMARY';
  const approvalNotification = ['APPROVAL_PENDING', 'APPROVAL_REMINDER'].includes(delivery.template);
  if (approvalNotification) {
    const step = delivery.stepId ? await prisma.memoApprovalStep.findUnique({
      where: { id: delivery.stepId },
      select: { status: true, approverId: true, memoVersionId: true },
    }) : null;
    const stillPending = step?.status === 'PENDING'
      && step.approverId === delivery.recipientUserId
      && step.memoVersionId === delivery.memoVersionId;
    if (!stillPending) {
      await prisma.emailDelivery.update({
        where: { id: delivery.id },
        data: { status: 'CANCELLED', completedAt: new Date(), lockedAt: null, lastErrorCode: 'NO_LONGER_PENDING' },
      });
      return 'CANCELLED';
    }
  }
  let memo = null;
  if (!digestTemplate) {
    if (!delivery.memoId) throw new Error('MEMO_NOT_FOUND');
    memo = await prisma.memo.findUnique({
      where: { id: delivery.memoId },
      include: { pdfArtifacts: { where: { kind: 'OFFICIAL' }, orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    if (!memo) throw new Error('MEMO_NOT_FOUND');
  }

  const emailEnabled = await setting('eapproveEmailEnabled', true) !== false
    && process.env.EAPPROVE_EMAIL_DISABLED !== 'true';
  if (!emailEnabled) {
    await prisma.emailDelivery.update({
      where: { id: delivery.id },
      data: { status: 'PAUSED', lockedAt: null, lastErrorCode: 'FEATURE_DISABLED' },
    });
    return 'PAUSED';
  }
  const officialTemplate = ['MEMO_APPROVED_OFFICIAL', 'MEMO_OFFICIAL_PDF'].includes(delivery.template);
  let attachment = null;
  let attachmentIncluded = false;
  let attachmentTooLarge = false;
  let artifact = null;
  if (officialTemplate) {
    artifact = memo.pdfArtifacts[0];
    if (memo.pdfStatus !== 'READY' || !artifact) throw new Error('OFFICIAL_PDF_NOT_READY');
    const storageRoot = path.resolve(process.cwd(), 'storage', 'eapprove', 'official-pdfs');
    const attachmentPath = path.resolve(process.cwd(), artifact.storageKey);
    if (attachmentPath !== storageRoot && !attachmentPath.startsWith(`${storageRoot}${path.sep}`)) throw new Error('INVALID_STORAGE_PATH');
    await access(attachmentPath);
    const maxMb = Math.max(1, Math.min(100, Number(await setting('emailAttachmentMaxMb', 10)) || 10));
    const fileSize = (await stat(attachmentPath)).size;
    attachmentTooLarge = fileSize > maxMb * 1024 * 1024;
    if (attachmentTooLarge && delivery.template === 'MEMO_OFFICIAL_PDF') throw new Error('ATTACHMENT_TOO_LARGE');
    if (!attachmentTooLarge) {
      attachmentIncluded = true;
      attachment = {
        filename: `${(memo.documentNo || memo.subject || 'memo').replace(/[\\/:*?"<>|]/g, '-')}-official.pdf`,
        path: attachmentPath, contentType: 'application/pdf',
      };
    }
  }
  const rendered = renderEmail({ template: delivery.template, memo, payload, attachmentIncluded, attachmentTooLarge });
  const messageIdHash = createHash('sha256').update(delivery.idempotencyKey).digest('hex').slice(0, 32);

  const transport = createSmtpTransport();
  await transport.sendMail({
    from: process.env.SMTP_FROM,
    to: delivery.recipient,
    subject: rendered.subject,
    html: rendered.html,
    text: rendered.text,
    messageId: `<${messageIdHash}@eapprove.local>`,
    attachments: attachment ? [attachment] : [],
  });

  const updates = [
    prisma.emailDelivery.update({ where: { id: delivery.id }, data: { status: 'SENT', sentAt: new Date(), completedAt: new Date(), lockedAt: null, lastErrorCode: null } }),
    prisma.auditLog.create({ data: {
      module: 'E_APPROVE',
      action: 'MEMO_EMAIL_SENT',
      entity: 'EMAIL_DELIVERY',
      entityId: delivery.id,
      userId: typeof payload.actorId === 'string' ? payload.actorId : null,
      details: JSON.stringify({ memoId: memo?.id ?? null, recipient: delivery.recipient, template: delivery.template, attachmentHash: artifact?.contentHash ?? null }),
    } }),
  ];
  await prisma.$transaction(updates);
  return 'SENT';
}

async function claimNextReminderJob() {
  await prisma.backgroundJob.updateMany({
    where: { type: 'SEND_APPROVAL_REMINDER', status: 'PROCESSING', lockedAt: { lt: new Date(Date.now() - 5 * 60_000) }, attemptCount: { lt: 3 } },
    data: { status: 'PENDING', availableAt: new Date(), lockedAt: null, lastErrorCode: 'LEASE_EXPIRED' },
  });
  const job = await prisma.backgroundJob.findFirst({
    where: { type: 'SEND_APPROVAL_REMINDER', status: 'PENDING', availableAt: { lte: new Date() }, attemptCount: { lt: 3 } },
    orderBy: { availableAt: 'asc' },
  });
  if (!job) return null;
  const claimed = await prisma.backgroundJob.updateMany({ where: { id: job.id, status: 'PENDING' }, data: { status: 'PROCESSING', lockedAt: new Date(), attemptCount: { increment: 1 } } });
  return claimed.count === 1 ? prisma.backgroundJob.findUnique({ where: { id: job.id } }) : null;
}

async function processReminderJob(job) {
  const payload = JSON.parse(job.payload);
  const step = await prisma.memoApprovalStep.findUnique({ where: { id: payload.stepId }, include: { approver: true, round: { include: { memo: true } } } });
  const valid = step && step.status === 'PENDING' && step.memoVersionId === payload.memoVersionId
    && step.approverId === payload.approverUserId && step.approver.isActive
    && step.approver.approvalEmailEnabled && step.approver.approvalEmailMode === 'IMMEDIATE'
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(step.approver.email || '')
    && await setting('eapproveEmailEnabled', true) !== false && process.env.EAPPROVE_EMAIL_DISABLED !== 'true';
  if (!valid) {
    await prisma.backgroundJob.update({ where: { id: job.id }, data: { status: 'CANCELLED', completedAt: new Date(), lockedAt: null, lastErrorCode: 'NO_LONGER_PENDING' } });
    return;
  }
  const key = `AUTO:${createHash('sha256').update(`reminder:${step.round.memoId}:${step.memoVersionId}:${step.id}:${step.approverId}`).digest('hex')}`;
  await prisma.$transaction([
    prisma.emailDelivery.upsert({ where: { idempotencyKey: key }, update: {}, create: {
      memoId: step.round.memoId, memoVersionId: step.memoVersionId, stepId: step.id,
      recipientUserId: step.approverId, recipient: step.approver.email.trim().toLowerCase(),
      template: 'APPROVAL_REMINDER', idempotencyKey: key, maxAttempts: 3,
      payload: JSON.stringify({ stepId: step.id, documentNo: step.round.memo.documentNo, subject: step.round.memo.subject }),
    } }),
    prisma.backgroundJob.update({ where: { id: job.id }, data: { status: 'COMPLETED', completedAt: new Date(), lockedAt: null } }),
  ]);
}

function nextBangkokDigestAt(time, reference = new Date()) {
  const [hours, minutes] = /^(?:(?:0[89]|1[0-7]):(?:00|30)|18:00)$/.test(time || '')
    ? time.split(':').map(Number) : [16, 0];
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(reference).filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  let scheduled = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), hours - 7, minutes));
  if (scheduled <= reference) scheduled = new Date(scheduled.getTime() + 24 * 60 * 60_000);
  const keyParts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(scheduled).filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  return { scheduled, dateKey: `${keyParts.year}-${keyParts.month}-${keyParts.day}` };
}

async function claimNextDigestJob() {
  await prisma.backgroundJob.updateMany({
    where: { type: 'SEND_APPROVAL_DIGEST', status: 'PROCESSING', lockedAt: { lt: new Date(Date.now() - 5 * 60_000) }, attemptCount: { lt: 3 } },
    data: { status: 'PENDING', availableAt: new Date(), lockedAt: null, lastErrorCode: 'LEASE_EXPIRED' },
  });
  const job = await prisma.backgroundJob.findFirst({ where: { type: 'SEND_APPROVAL_DIGEST', status: 'PENDING', availableAt: { lte: new Date() }, attemptCount: { lt: 3 } }, orderBy: { availableAt: 'asc' } });
  if (!job) return null;
  const claimed = await prisma.backgroundJob.updateMany({ where: { id: job.id, status: 'PENDING' }, data: { status: 'PROCESSING', lockedAt: new Date(), attemptCount: { increment: 1 } } });
  return claimed.count === 1 ? prisma.backgroundJob.findUnique({ where: { id: job.id } }) : null;
}

async function processDigestJob(job) {
  const payload = JSON.parse(job.payload);
  const approver = await prisma.user.findUnique({ where: { id: payload.approverUserId } });
  const pendingCount = approver ? await prisma.memoApprovalStep.count({ where: { approverId: approver.id, status: 'PENDING' } }) : 0;
  const featureEnabled = await setting('eapproveEmailEnabled', true) !== false && process.env.EAPPROVE_EMAIL_DISABLED !== 'true';
  if (!featureEnabled) {
    await prisma.backgroundJob.update({ where: { id: job.id }, data: { status: 'PAUSED', lockedAt: null, lastErrorCode: 'FEATURE_DISABLED' } });
    return;
  }
  const valid = approver?.isActive && approver.isApprover && approver.approvalEmailEnabled
    && approver.approvalEmailMode === 'DIGEST' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(approver.email || '');
  if (!valid || pendingCount === 0) {
    await prisma.backgroundJob.update({ where: { id: job.id }, data: { status: 'CANCELLED', completedAt: new Date(), lockedAt: null, lastErrorCode: pendingCount === 0 ? 'NO_PENDING_APPROVALS' : 'FEATURE_DISABLED' } });
    return;
  }
  const emailKey = `AUTO:${createHash('sha256').update(`approval-summary:${approver.id}:${payload.scheduledDate}`).digest('hex')}`;
  const next = nextBangkokDigestAt(approver.approvalEmailDigestTime);
  await prisma.$transaction([
    prisma.emailDelivery.upsert({ where: { idempotencyKey: emailKey }, update: {}, create: {
      recipientUserId: approver.id, recipient: approver.email.trim().toLowerCase(), template: 'APPROVAL_SUMMARY',
      idempotencyKey: emailKey, maxAttempts: 3, payload: JSON.stringify({ pendingCount, digestDate: payload.scheduledDate }),
    } }),
    prisma.backgroundJob.update({ where: { id: job.id }, data: { status: 'COMPLETED', completedAt: new Date(), lockedAt: null } }),
    prisma.backgroundJob.upsert({ where: { idempotencyKey: `APPROVAL_DIGEST:${approver.id}:${next.dateKey}` }, update: { availableAt: next.scheduled }, create: {
      type: 'SEND_APPROVAL_DIGEST', idempotencyKey: `APPROVAL_DIGEST:${approver.id}:${next.dateKey}`,
      payload: JSON.stringify({ approverUserId: approver.id, scheduledDate: next.dateKey }), availableAt: next.scheduled, maxAttempts: 3,
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
    pipe: true,
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
          && document.querySelector('[data-memo-pagination-ready="true"]')
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
    await tx.notification.updateMany({ where: { memoId: job.memoId, type: 'PDF_FAILED', resolvedAt: null }, data: { resolvedAt: new Date() } });
    const memo = await tx.memo.findUnique({ where: { id: job.memoId } });
    const creator = memo?.createdById ? await tx.user.findUnique({ where: { id: memo.createdById } }) : null;
    const autoSendEnabled = await setting('eapproveOfficialPdfAutoSendEnabled', true) !== false
      && process.env.EAPPROVE_OFFICIAL_PDF_AUTO_SEND_DISABLED !== 'true';
    if (memo && autoSendEnabled && creator?.isActive && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(creator.email || '')) {
      const key = `AUTO:${createHash('sha256').update(`official:${memo.id}:${memoVersionId}:${creator.id}`).digest('hex')}`;
      await tx.emailDelivery.upsert({ where: { idempotencyKey: key }, update: {}, create: {
        memoId: memo.id, memoVersionId, recipientUserId: creator.id,
        recipient: creator.email.trim().toLowerCase(), template: 'MEMO_APPROVED_OFFICIAL',
        payload: JSON.stringify({ documentNo: memo.documentNo, subject: memo.subject }),
        idempotencyKey: key, maxAttempts: 3,
      } });
    } else if (memo?.createdById && autoSendEnabled) {
      const reason = !creator?.isActive ? 'SKIPPED_INACTIVE' : 'SKIPPED_NO_EMAIL';
      await tx.notification.upsert({
        where: { idempotencyKey: `NOTIFICATION:OFFICIAL_EMAIL_${reason}:${memo.id}:${memo.createdById}` }, update: {},
        create: { userId: memo.createdById, memoId: memo.id, type: 'OFFICIAL_EMAIL_SKIPPED', payload: JSON.stringify({ reason }), idempotencyKey: `NOTIFICATION:OFFICIAL_EMAIL_${reason}:${memo.id}:${memo.createdById}` },
      });
    }
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
  if (Date.now() - lastNotificationCleanupAt >= 24 * 60 * 60_000) {
    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60_000);
    const cleanup = await prisma.notification.deleteMany({ where: { readAt: { not: null }, resolvedAt: { not: null }, createdAt: { lt: cutoff } } });
    lastNotificationCleanupAt = Date.now();
    console.log(`[eapprove-worker] notification cleanup removed ${cleanup.count} rows`);
  }
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
        await prisma.$transaction(async (tx) => {
          const memo = await tx.memo.findUnique({ where: { id: job.memoId } });
          const itEmail = await tx.systemSetting.findUnique({ where: { key: 'itEmail' } });
          await tx.backgroundJob.update({ where: { id: job.id }, data: { status: 'FAILED', lockedAt: null, lastErrorCode: errorCode } });
          await tx.memo.update({ where: { id: job.memoId }, data: { pdfStatus: 'FAILED', pdfErrorCode: errorCode } });
          if (memo?.createdById) await tx.notification.upsert({
            where: { idempotencyKey: `NOTIFICATION:PDF_FAILED:${job.id}:${memo.createdById}` }, update: {},
            create: { userId: memo.createdById, memoId: memo.id, type: 'PDF_FAILED', payload: JSON.stringify({ errorCode }), idempotencyKey: `NOTIFICATION:PDF_FAILED:${job.id}:${memo.createdById}` },
          });
          let recipient = '';
          try { recipient = JSON.parse(itEmail?.value || 'null') || ''; } catch { recipient = ''; }
          if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
            const key = `AUTO:${createHash('sha256').update(`pdf-failed:${job.id}:${recipient}`).digest('hex')}`;
            await tx.emailDelivery.upsert({ where: { idempotencyKey: key }, update: {}, create: {
              memoId: memo?.id, recipient: recipient.trim().toLowerCase(), template: 'PDF_GENERATION_FAILED',
              payload: JSON.stringify({ documentNo: memo?.documentNo, subject: memo?.subject, errorCode }), idempotencyKey: key, maxAttempts: 3,
            } });
          }
        });
      }
    }
    return true;
  }

  const digest = await claimNextDigestJob();
  if (digest) {
    try { await processDigestJob(digest); }
    catch (error) {
      const errorCode = safeEmailErrorCode(error);
      console.error(`[eapprove-worker] digest failed ${digest.id}: ${errorCode}`);
      const exhausted = digest.attemptCount >= digest.maxAttempts;
      const minutes = [1, 5, 15][Math.max(0, digest.attemptCount - 1)] ?? 15;
      await prisma.backgroundJob.update({ where: { id: digest.id }, data: exhausted
        ? { status: 'FAILED', completedAt: new Date(), lockedAt: null, lastErrorCode: errorCode }
        : { status: 'PENDING', availableAt: new Date(Date.now() + minutes * 60_000), lockedAt: null, lastErrorCode: errorCode }
      });
    }
    return true;
  }

  const reminder = await claimNextReminderJob();
  if (reminder) {
    try { await processReminderJob(reminder); }
    catch (error) {
      const errorCode = safeEmailErrorCode(error);
      console.error(`[eapprove-worker] reminder failed ${reminder.id}: ${errorCode}`);
      const exhausted = reminder.attemptCount >= reminder.maxAttempts;
      const minutes = [1, 5, 15][Math.max(0, reminder.attemptCount - 1)] ?? 15;
      await prisma.backgroundJob.update({ where: { id: reminder.id }, data: exhausted
        ? { status: 'FAILED', completedAt: new Date(), lockedAt: null, lastErrorCode: errorCode }
        : { status: 'PENDING', availableAt: new Date(Date.now() + minutes * 60_000), lockedAt: null, lastErrorCode: errorCode }
      });
    }
    return true;
  }

  const delivery = await claimNextEmailDelivery();
  if (!delivery) return false;
  try {
    const result = await processEmailDelivery(delivery);
    console.log(`[eapprove-worker] email ${result.toLowerCase()} ${delivery.id}`);
  } catch (error) {
    const errorCode = safeEmailErrorCode(error);
    console.error(`[eapprove-worker] email failed ${delivery.id}: ${errorCode}`);
    const permanent = isPermanentEmailError(error) || String(error?.message || '').includes('ATTACHMENT_TOO_LARGE');
    const exhausted = delivery.attemptCount >= delivery.maxAttempts;
    const minutes = [1, 5, 15][Math.max(0, delivery.attemptCount - 1)] ?? 15;
    await prisma.emailDelivery.update({ where: { id: delivery.id }, data: permanent || exhausted
      ? { status: 'FAILED', completedAt: new Date(), lockedAt: null, lastErrorCode: permanent ? `PERMANENT_${errorCode}` : errorCode }
      : { status: 'RETRY_WAIT', availableAt: new Date(Date.now() + minutes * 60_000), lockedAt: null, lastErrorCode: errorCode }
    });
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
