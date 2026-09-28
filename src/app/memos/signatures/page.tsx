import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { ApprovalSignaturesClient } from './ApprovalSignaturesClient';

export default async function ApprovalSignaturesPage() {
  const session = await getSession();
  if (!session?.id) redirect('/login');

  const user = await prisma.user.findUnique({
    where: { id: String(session.id) },
    select: {
      isActive: true,
      approvalSignatures: { orderBy: [{ isDefault: 'desc' }, { updatedAt: 'desc' }] },
    },
  });
  if (!user?.isActive) redirect('/memos');

  return <ApprovalSignaturesClient initialSignatures={user.approvalSignatures.map((item) => ({
    ...item,
    updatedAt: item.updatedAt.toISOString(),
  }))} />;
}
