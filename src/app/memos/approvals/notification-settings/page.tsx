import { redirect } from 'next/navigation';
import { Mail } from 'lucide-react';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { NotificationPreferences } from '../NotificationPreferences';

export default async function ApprovalNotificationSettingsPage() {
  const session = await getSession();
  if (!session?.id) redirect('/login');
  const user = await prisma.user.findUnique({
    where: { id: String(session.id) },
    select: { isActive: true, isApprover: true, email: true, approvalEmailEnabled: true, approvalEmailMode: true, approvalEmailDigestTime: true },
  });
  if (!user?.isActive || !user.isApprover) redirect('/memos');
  return <main className="min-h-full bg-slate-50 p-5 dark:bg-slate-950 md:p-8">
    <div className="mx-auto max-w-3xl">
      <header className="mb-5 rounded-3xl bg-gradient-to-br from-indigo-700 via-blue-700 to-slate-900 p-7 text-white shadow-xl">
        <Mail className="h-9 w-9 text-blue-200"/>
        <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-blue-200">Notification settings</p>
        <h1 className="mt-1 text-3xl font-bold">ตั้งค่าอีเมลแจ้งเตือน</h1>
        <p className="mt-2 text-sm text-blue-100">กำหนดอีเมล รูปแบบ และเวลารับสรุปงานอนุมัติของคุณ</p>
      </header>
      <NotificationPreferences email={user.email} initialEmail={user.approvalEmailEnabled} initialMode={user.approvalEmailMode} initialDigestTime={user.approvalEmailDigestTime}/>
    </div>
  </main>;
}
