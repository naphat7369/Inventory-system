'use server';

import { getSession } from '@/lib/auth';

interface PrintSession {
  ids: string[];
  userId: string;
  createdAt: number;
}

// In-memory store for temporary print sessions (with 30-minute expiration)
const printSessionStore = new Map<string, PrintSession>();

// Cleanup expired sessions
function cleanupOldSessions() {
  const now = Date.now();
  const maxAge = 30 * 60 * 1000; // 30 minutes
  for (const [token, session] of printSessionStore.entries()) {
    if (now - session.createdAt > maxAge) {
      printSessionStore.delete(token);
    }
  }
}

/**
 * Creates a temporary print session token for selected asset IDs.
 * Bypasses URL length limits (~2000 characters) when printing dozens or hundreds of items.
 */
export async function createPrintSession(selectedIds: string[]): Promise<{
  success: boolean;
  token?: string;
  count?: number;
  error?: string;
}> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: 'กรุณาเข้าสู่ระบบก่อนทำรายการ' };
    }

    if (!Array.isArray(selectedIds) || selectedIds.length === 0) {
      return { success: false, error: 'กรุณาเลือกรายการที่ต้องการพิมพ์ป้ายอย่างน้อย 1 รายการ' };
    }

    // Sanitize & validate IDs (alphanumeric with hyphens/underscores, max 500 items)
    const validIds = selectedIds
      .filter((id) => typeof id === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(id))
      .slice(0, 500);

    if (validIds.length === 0) {
      return { success: false, error: 'รหัสสินทรัพย์ที่ระบุไม่ถูกต้อง' };
    }

    cleanupOldSessions();

    const token = `ps_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
    printSessionStore.set(token, {
      ids: validIds,
      userId: String(session.id),
      createdAt: Date.now(),
    });

    return { success: true, token, count: validIds.length };
  } catch (err: any) {
    return { success: false, error: err?.message || 'เกิดข้อผิดพลาดในการสร้างเซสชันพิมพ์ป้าย' };
  }
}

/**
 * Retrieves valid asset IDs associated with a print session token.
 */
export async function getPrintSessionIds(token: string): Promise<string[] | null> {
  if (!token || typeof token !== 'string') return null;
  cleanupOldSessions();
  const sessionData = printSessionStore.get(token);
  if (!sessionData) return null;
  return sessionData.ids;
}
