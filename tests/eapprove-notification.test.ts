import test from 'node:test';
import assert from 'node:assert/strict';
import { formatInTimeZone } from 'date-fns-tz';
import { approvalCalendarWindow, isValidEmail, normalizeEmail } from '../src/lib/eapprove/notification-service.ts';
import { renderCalendar, renderEmail } from '../scripts/eapprove-email-templates.mjs';

test('approval calendar uses 16:00 Bangkok and next-day 09:00 reminder', () => {
  const result = approvalCalendarWindow(new Date('2026-10-09T03:00:00.000Z'));
  assert.equal(formatInTimeZone(result.startAt, 'Asia/Bangkok', 'yyyy-MM-dd HH:mm'), '2026-10-09 16:00');
  assert.equal(formatInTimeZone(result.endAt, 'Asia/Bangkok', 'yyyy-MM-dd HH:mm'), '2026-10-09 16:30');
  assert.equal(formatInTimeZone(result.reminderAt, 'Asia/Bangkok', 'yyyy-MM-dd HH:mm'), '2026-10-10 09:00');
});

test('after 16:00 Bangkok schedules the next calendar day', () => {
  const result = approvalCalendarWindow(new Date('2026-10-09T09:01:00.000Z'));
  assert.equal(formatInTimeZone(result.startAt, 'Asia/Bangkok', 'yyyy-MM-dd HH:mm'), '2026-10-10 16:00');
  assert.equal(formatInTimeZone(result.reminderAt, 'Asia/Bangkok', 'yyyy-MM-dd HH:mm'), '2026-10-10 09:00');
});

test('email validation normalizes and blocks header injection', () => {
  assert.equal(normalizeEmail('  USER@S31HOTEL.COM '), 'user@s31hotel.com');
  assert.equal(isValidEmail('user@s31hotel.com'), true);
  assert.equal(isValidEmail('user@s31hotel.com\r\nBcc: attacker@example.com'), false);
});

test('secure official email and calendar contain no application URL', () => {
  const memo = { documentNo: 'IT 001/2569', subject: 'ทดสอบ' };
  const email = renderEmail({ template: 'MEMO_OFFICIAL_PDF', memo, payload: { message: 'ห้ามเปิด https://malicious.example/path' }, attachmentIncluded: true });
  assert.doesNotMatch(email.html, /https?:\/\//i);
  assert.doesNotMatch(email.html, /href\s*=/i);
  assert.doesNotMatch(email.text, /https?:\/\//i);
  const calendar = renderCalendar({ calendar: { method: 'REQUEST', uid: 'step@example', sequence: 1, startAt: '2026-10-09T09:00:00Z', endAt: '2026-10-09T09:30:00Z' }, recipient: 'approver@example.com', organizer: 'system@example.com', documentNo: memo.documentNo, subject: memo.subject, reason: undefined });
  assert.ok(calendar);
  assert.doesNotMatch(calendar, /https?:\/\//i);
  assert.match(calendar, /METHOD:REQUEST/);
});
