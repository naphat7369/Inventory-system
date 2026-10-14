import test from 'node:test';
import assert from 'node:assert/strict';
import { formatInTimeZone } from 'date-fns-tz';
import { isValidEmail, nextDayReminderAt, nextEmailDigestAt, normalizeEmail } from '../src/lib/eapprove/notification-service.ts';
import { renderEmail } from '../scripts/eapprove-email-templates.mjs';

test('email digest uses the selected Bangkok time', () => {
  assert.equal(formatInTimeZone(nextEmailDigestAt(new Date('2026-10-09T03:00:00Z'), '16:00'), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm'), '2026-10-09 16:00');
  assert.equal(formatInTimeZone(nextEmailDigestAt(new Date('2026-10-09T09:01:00Z'), '16:00'), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm'), '2026-10-10 16:00');
  assert.equal(formatInTimeZone(nextEmailDigestAt(new Date('2026-10-09T03:00:00Z'), '14:30'), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm'), '2026-10-09 14:30');
});

test('immediate mode reminder is next day at 09:00 Bangkok', () => {
  assert.equal(formatInTimeZone(nextDayReminderAt(new Date('2026-10-09T03:00:00Z')), 'Asia/Bangkok', 'yyyy-MM-dd HH:mm'), '2026-10-10 09:00');
});

test('email validation normalizes and blocks header injection', () => {
  assert.equal(normalizeEmail('  USER@S31HOTEL.COM '), 'user@s31hotel.com');
  assert.equal(isValidEmail('user@s31hotel.com'), true);
  assert.equal(isValidEmail('user@s31hotel.com\r\nBcc: attacker@example.com'), false);
});

test('approval summary contains only the pending count and no links or memo details', () => {
  const email = renderEmail({ template: 'APPROVAL_SUMMARY', memo: null, payload: { pendingCount: 7 } });
  assert.match(email.subject, /7 รายการ/);
  assert.match(email.text, /7 รายการ/);
  assert.doesNotMatch(email.html, /IT 999\/2569|ข้อมูลลับ|https?:\/\//i);
  assert.doesNotMatch(email.html, /href\s*=/i);
});

test('secure official email contains no application URL', () => {
  const email = renderEmail({ template: 'MEMO_OFFICIAL_PDF', memo: { documentNo: 'IT 001/2569', subject: 'ทดสอบ' }, payload: { message: 'ห้ามเปิด https://malicious.example/path' }, attachmentIncluded: true });
  assert.doesNotMatch(email.html, /https?:\/\//i);
  assert.doesNotMatch(email.html, /href\s*=/i);
  assert.doesNotMatch(email.text, /https?:\/\//i);
});
