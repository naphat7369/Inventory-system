import type { PrismaClient } from '@prisma/client';
import { EApproveError } from './errors';

export async function requireActiveUser(prisma: PrismaClient, userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.isActive) throw new EApproveError('UNAUTHORIZED', 'บัญชีผู้ใช้ไม่พร้อมใช้งาน', 401);
  return user;
}

/** ADMIN is the system's Super Admin role. */
export async function requireAdmin(prisma: PrismaClient, userId: string) {
  const user = await requireActiveUser(prisma, userId);
  if (user.role !== 'ADMIN') throw new EApproveError('ADMIN_REQUIRED', 'เฉพาะผู้ดูแลระบบเท่านั้น', 403);
  return user;
}

export async function requireApprover(prisma: PrismaClient, userId: string) {
  const user = await requireActiveUser(prisma, userId);
  if (!user.isApprover) throw new EApproveError('APPROVER_PERMISSION_REQUIRED', 'ผู้ใช้ไม่มีสิทธิ์ Approver', 403);
  return user;
}
