const escapeHtml = (value) => String(value ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#39;');

const stripUrls = (value) => String(value ?? '').replace(/\b(?:https?:\/\/|www\.)\S+/gi, '[ลิงก์ถูกตัดออก]');
const safeHeader = (value) => stripUrls(value).replace(/[\r\n]+/g, ' ').trim();
const noLinksNotice = 'ระบบไม่มีนโยบายส่งลิงก์ทางอีเมล กรุณาเข้า E‑Approve ผ่านช่องทางภายในองค์กรเท่านั้น';

function shell({ title, badge, badgeColor = '#087a5b', content, footer = noLinksNotice }) {
  return `<!doctype html><html lang="th"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
  <body style="margin:0;padding:0;background:#edf3f1;font-family:Arial,Tahoma,sans-serif;color:#12211d">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#edf3f1"><tr><td align="center" style="padding:28px 12px">
  <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background:#fff;border:1px solid #d5e2de;border-radius:12px">
  <tr><td style="padding:22px 28px;background:#0b3b31;border-radius:12px 12px 0 0"><table role="presentation" width="100%"><tr><td style="font-size:20px;font-weight:700;color:#fff">E‑Approve System</td><td align="right" style="font-size:12px;color:#bfe0d7">S HOTEL</td></tr></table></td></tr>
  <tr><td align="center" style="padding:30px 28px 12px"><div style="display:inline-block;padding:6px 12px;border-radius:16px;background:${badgeColor}1a;color:${badgeColor};font-size:11px;font-weight:700">${escapeHtml(badge)}</div><h1 style="margin:14px 0 0;font-size:22px;line-height:1.45;color:#0b3b31">${escapeHtml(title)}</h1></td></tr>
  ${content}
  <tr><td style="padding:18px 28px;background:#f3f8f6;border-top:1px solid #dce8e4;font-size:11px;line-height:1.7;color:#60756f">${escapeHtml(footer)}</td></tr>
  <tr><td align="center" style="padding:16px 28px;background:#0b3b31;border-radius:0 0 12px 12px;font-size:11px;color:#bfe0d7">E‑Approve System · S Hotel · Official Notification</td></tr>
  </table></td></tr></table></body></html>`;
}
function memoCard(documentNo, subject, status) {
  return `<tr><td style="padding:14px 28px 0"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f3f8f6;border:1px solid #d5e5df;border-radius:8px"><tr><td style="padding:17px 18px"><div style="font-size:12px;color:#60756f">เลขที่เอกสาร</div><div style="padding-top:3px;font-size:20px;font-weight:700">${escapeHtml(documentNo || 'ยังไม่ออกเลข')}</div><div style="padding-top:8px;font-size:14px;line-height:1.6;color:#344a44">${escapeHtml(subject)}</div></td><td width="100" align="right" valign="top" style="padding:17px 18px"><span style="display:inline-block;padding:5px 9px;border-radius:12px;background:#d8f2e8;font-size:10px;font-weight:700;color:#087a5b">${escapeHtml(status)}</span></td></tr></table></td></tr>`;
}

function messageBlock(label, message) {
  if (!message) return '';
  return `<tr><td style="padding:20px 28px 0"><div style="font-size:13px;font-weight:700;color:#344a44">${escapeHtml(label)}</div><div style="padding-top:7px;font-size:14px;line-height:1.7;color:#344a44">${escapeHtml(message).replaceAll('\n', '<br>')}</div></td></tr>`;
}

export function renderEmail({ template, memo, payload = {}, attachmentIncluded = false, attachmentTooLarge = false }) {
  if (template === 'APPROVAL_SUMMARY') {
    const pendingCount = Math.max(0, Number(payload.pendingCount) || 0);
    return {
      subject: `[E‑Approve] สรุปงานรออนุมัติ: ${pendingCount} รายการ`,
      html: shell({
        title: `คุณมี Memo รออนุมัติ ${pendingCount} รายการ`,
        badge: 'DAILY SUMMARY',
        badgeColor: '#b7791f',
        content: messageBlock('สรุปงาน', `ณ เวลาส่งอีเมล มี Memo ที่ถึงคิวและยังรอคุณอนุมัติ ${pendingCount} รายการ`)
          + messageBlock('การดำเนินการ', 'กรุณาเข้าสู่ระบบ E‑Approve ผ่านช่องทางภายในองค์กรเพื่อตรวจสอบรายการ'),
      }),
      text: `คุณมี Memo รออนุมัติ ${pendingCount} รายการ\n\nกรุณาเข้าสู่ระบบ E‑Approve ผ่านช่องทางภายในองค์กร\n${noLinksNotice}`,
    };
  }

  const documentNo = safeHeader(payload.documentNo || memo?.documentNo || 'Memo');
  const subject = safeHeader(payload.subject || memo?.subject || 'เอกสาร');
  const reason = stripUrls(payload.reason || '').slice(0, 500);
  let mailSubject = `[E‑Approve] ${documentNo} - ${subject}`;
  let html;
  let text;

  if (template === 'APPROVAL_PENDING') {
    mailSubject = `[E‑Approve] รอคุณอนุมัติ: ${documentNo}`;
    html = shell({ title: 'มี Memo รอการอนุมัติจากคุณ', badge: 'ACTION REQUIRED', badgeColor: '#b7791f', content:
      memoCard(documentNo, subject, 'PENDING') + messageBlock('การดำเนินการ', 'กรุณาเข้าสู่ระบบ E‑Approve เพื่อตรวจสอบ อนุมัติ หรือส่งกลับแก้ไข') });
    text = `มี Memo รอการอนุมัติจากคุณ\nเลขที่: ${documentNo}\nหัวข้อ: ${subject}\n\nกรุณาเข้าสู่ระบบ E‑Approve ผ่านช่องทางภายในองค์กร\n${noLinksNotice}`;
  } else if (template === 'APPROVAL_REMINDER') {
    mailSubject = `[E‑Approve] เตือน: ${documentNo} ยังรอการอนุมัติ`;
    html = shell({ title: 'แจ้งเตือนงานอนุมัติที่ยังค้าง', badge: 'REMINDER', badgeColor: '#b7791f', content: memoCard(documentNo, subject, 'PENDING') + messageBlock('การดำเนินการ', 'กรุณาเข้าสู่ระบบ E‑Approve ผ่านช่องทางภายในองค์กร') });
    text = `แจ้งเตือนงานอนุมัติที่ยังค้าง\nเลขที่: ${documentNo}\nหัวข้อ: ${subject}\n\n${noLinksNotice}`;
  } else if (template === 'REVISION_REQUESTED') {
    mailSubject = `[E‑Approve] ส่งกลับแก้ไข: ${documentNo}`;
    html = shell({ title: 'Memo ถูกส่งกลับให้แก้ไข', badge: 'REVISION REQUESTED', badgeColor: '#7c3aed', content: memoCard(documentNo, subject, 'REVISION') + messageBlock('เหตุผล', reason) + messageBlock('การดำเนินการ', 'กรุณาเข้าสู่ระบบ E‑Approve เพื่อตรวจสอบรายละเอียดและแก้ไขเอกสาร') });
    text = `Memo ถูกส่งกลับให้แก้ไข\nเลขที่: ${documentNo}\nหัวข้อ: ${subject}\nเหตุผล: ${reason}\n\n${noLinksNotice}`;
  } else if (template === 'PDF_GENERATION_FAILED') {
    mailSubject = `[E‑Approve] PDF ล้มเหลว: ${documentNo}`;
    html = shell({ title: 'สร้าง Official PDF ไม่สำเร็จ', badge: 'ACTION REQUIRED', badgeColor: '#dc2626', content: memoCard(documentNo, subject, 'PDF FAILED') + messageBlock('รหัสข้อผิดพลาด', payload.errorCode) + messageBlock('การดำเนินการ', 'กรุณาตรวจสอบที่ Audit & Operations และสั่ง Retry หลังแก้ไขสาเหตุ') });
    text = `สร้าง Official PDF ไม่สำเร็จ\nเลขที่: ${documentNo}\nหัวข้อ: ${subject}\nรหัสข้อผิดพลาด: ${payload.errorCode || '-'}\n\nกรุณาตรวจสอบที่ Audit & Operations`;
  } else {
    mailSubject = `[E‑Approve] อนุมัติแล้ว: ${documentNo}`;
    const attachmentMessage = attachmentIncluded
      ? 'Official PDF แนบมากับอีเมลฉบับนี้'
      : attachmentTooLarge
        ? 'Official PDF มีขนาดเกินข้อจำกัดของระบบอีเมล จึงไม่ได้แนบไฟล์ กรุณาเข้า E‑Approve ผ่านช่องทางภายในองค์กร'
        : 'กรุณาเข้า E‑Approve ผ่านช่องทางภายในองค์กรเพื่อตรวจสอบเอกสาร';
    const senderMessage = stripUrls(payload.message || '');
    html = shell({ title: 'เอกสารได้รับการอนุมัติแล้ว', badge: 'APPROVED', content: memoCard(documentNo, subject, 'APPROVED') + messageBlock('ข้อความจากผู้ส่ง', senderMessage) + messageBlock('Official PDF', attachmentMessage) + '<tr><td style="padding:24px 28px 28px;font-size:12px;line-height:1.7;color:#60756f">เพื่อความปลอดภัย ระบบจะไม่ขอรหัสผ่านหรือส่งลิงก์ให้กดผ่านอีเมล</td></tr>' });
    text = `เอกสารได้รับการอนุมัติแล้ว\nเลขที่: ${documentNo}\nหัวข้อ: ${subject}\n\n${senderMessage ? `${senderMessage}\n\n` : ''}${attachmentMessage}\n${noLinksNotice}`;
  }
  return { subject: safeHeader(mailSubject), html, text };
}
