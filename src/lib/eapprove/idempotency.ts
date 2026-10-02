import { createHash } from 'node:crypto';
import { Prisma, type PrismaClient } from '@prisma/client';
import { EApproveError } from './errors.ts';

export function pdfJobKey(memoId: string, memoVersionId: string) {
  return `PDF:OFFICIAL:${memoId}:${memoVersionId}`;
}

export function emailDeliveryKey(event: string, memoId: string, recipient: string) {
  return `EMAIL:${event}:${memoId}:${recipient.trim().toLowerCase()}`;
}

export function notificationKey(event: string, memoId: string, userId: string) {
  return `NOTIFICATION:${event}:${memoId}:${userId}`;
}

export class IdempotencyLedger<T> {
  private readonly values = new Map<string, T>();
  run(key: string, operation: () => T): T {
    if (this.values.has(key)) return this.values.get(key)!;
    const value = operation();
    this.values.set(key, value);
    return value;
  }
  get size() { return this.values.size; }
}

const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');

const MAX_RETRIES = 3;

export async function runIdempotentTransaction<T>(
  prisma: PrismaClient,
  input: { key: string; action: string; actorId: string; resourceId?: string; request: unknown },
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  const requestHash = digest(input.request);
  const execute = () => prisma.$transaction(async (tx) => {
    const existing = await tx.idempotencyRecord.findUnique({ where: { key: input.key } });
    if (existing) {
      if (existing.action !== input.action || existing.actorId !== input.actorId || existing.resourceId !== (input.resourceId ?? null) || existing.requestHash !== requestHash) {
        throw new EApproveError('IDEMPOTENCY_CONFLICT', 'Idempotency Key ถูกใช้กับคำขออื่นแล้ว', 409);
      }
      if (existing.status === 'COMPLETED' && existing.responseJson) return JSON.parse(existing.responseJson) as T;
      throw new EApproveError('REQUEST_IN_PROGRESS', 'คำขอนี้กำลังถูกประมวลผล', 409);
    }

    await tx.idempotencyRecord.create({ data: {
      key: input.key, action: input.action, actorId: input.actorId,
      resourceId: input.resourceId ?? null, requestHash,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    } });
    const result = await operation(tx);
    await tx.idempotencyRecord.update({ where: { key: input.key }, data: {
      status: 'COMPLETED', responseJson: JSON.stringify(result), completedAt: new Date(),
    } });
    return result;
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
    timeout: 30000,
  });

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await execute();
    } catch (error: any) {
      // PostgreSQL serialization failure (40001) or deadlock (40P01) — retry
      if ((error?.code === 'P2034' || error?.meta?.code === '40001' || error?.meta?.code === '40P01') && attempt < MAX_RETRIES) {
        await new Promise((resolve) => setTimeout(resolve, 100 * attempt));
        continue;
      }
      // Unique constraint violation — check for completed idempotent result
      if (error?.code === 'P2002') {
        const existing = await prisma.idempotencyRecord.findUnique({ where: { key: input.key } });
        if (existing) {
          if (existing.action === input.action && existing.actorId === input.actorId && existing.requestHash === requestHash && existing.status === 'COMPLETED' && existing.responseJson) {
            return JSON.parse(existing.responseJson) as T;
          }
          throw new EApproveError('REQUEST_IN_PROGRESS', 'คำขอนี้กำลังถูกประมวลผล', 409);
        }
      }
      throw error;
    }
  }
  throw new EApproveError('RETRY_EXHAUSTED', 'ระบบไม่สามารถดำเนินการได้ในขณะนี้ กรุณาลองอีกครั้ง', 503);
}
