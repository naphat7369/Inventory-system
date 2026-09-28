import nodemailer from 'nodemailer';

const recipient = process.argv[2]?.trim();
const required = ['SMTP_HOST', 'SMTP_FROM'];
const missing = required.filter((name) => !process.env[name]);

if (!recipient) {
  console.error('Usage: npm run smtp:test -- recipient@example.com');
  process.exit(1);
}

if (missing.length > 0) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  process.exit(1);
}

const port = Number(process.env.SMTP_PORT || 587);
const user = process.env.SMTP_USER;
const pass = process.env.SMTP_PASS;
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port,
  secure: process.env.SMTP_SECURE === 'true' || port === 465,
  auth: user && pass ? { user, pass } : undefined,
});

try {
  await transporter.verify();
  const result = await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to: recipient,
    subject: 'E-Approve SMTP test',
    text: `SMTP is working. Test sent at ${new Date().toISOString()}.`,
  });
  console.log(`SMTP test sent successfully. Message ID: ${result.messageId}`);
} catch (error) {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : 'UNKNOWN';
  const responseCode = typeof error === 'object' && error && 'responseCode' in error ? String(error.responseCode) : '';
  console.error(`SMTP test failed (${code}${responseCode ? `/${responseCode}` : ''}).`);
  process.exitCode = 1;
} finally {
  transporter.close();
}
