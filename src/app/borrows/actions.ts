'use me';
'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';
import { checkIsOverdue, toBangkokEndOfDay, formatBangkokDate } from '@/lib/datetime';

export interface CreateBorrowInput {
  assetId: string;
  userId?: string;
  borrowerName: string;
  borrowerDept?: string;
  borrowerContact?: string;
  quantity?: number;
  expectedReturnDate: string; // YYYY-MM-DD
  purpose?: string;
  borrowNotes?: string;
  handledBy?: string;
}

export interface ReturnBorrowInput {
  returnCondition: 'GOOD' | 'DAMAGED';
  returnNotes?: string;
  handledBy?: string;
}

export interface VoidBorrowInput {
  voidReason: string;
}

export interface ExtendBorrowInput {
  newExpectedReturnDate: string; // YYYY-MM-DD
}

export interface RejectBorrowInput {
  rejectReason: string;
}

export async function getCurrentUserSession() {
  try {
    const session = await getSession();
    if (!session) return { success: false, data: null };

    // Fetch full user record from database to get latest fullName & department
    const user = await prisma.user.findUnique({
      where: { id: String(session.id) },
      select: { id: true, username: true, fullName: true, department: true, phone: true, role: true },
    });

    return {
      success: true,
      data: {
        id: String(session.id),
        username: user?.username || (session.username as string),
        fullName: user?.fullName || (session.fullName as string) || null,
        department: user?.department || (session.department as string) || null,
        phone: user?.phone || (session.phone as string) || null,
        role: session.role as string,
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Get all borrow logs with computed isOverdue field and support for search & status filter
 */
export async function getBorrowLogs(query?: string, statusFilter?: string) {
  try {
    const session = await getSession();
    const whereClause: any = {};

    // If non-admin user calls this, only return their own borrow logs
    if (session && session.role !== 'ADMIN') {
      whereClause.userId = String(session.id);
    }

    if (query && query.trim() !== '') {
      const q = query.trim();
      whereClause.OR = [
        { borrowerName: { contains: q } },
        { borrowerDept: { contains: q } },
        { asset: { name: { contains: q } } },
        { asset: { assetId: { contains: q } } },
      ];
    }

    if (statusFilter && statusFilter !== 'ALL' && statusFilter !== 'OVERDUE') {
      whereClause.status = statusFilter;
    }

    const logs = await prisma.borrowLog.findMany({
      where: whereClause,
      include: {
        asset: {
          include: {
            category: true,
          },
        },
        user: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const logsWithOverdue = logs.map((log: any) => ({
      ...log,
      isOverdue: checkIsOverdue(log.expectedReturnDate, log.status),
    }));

    if (statusFilter === 'OVERDUE') {
      return {
        success: true,
        data: logsWithOverdue.filter((log: any) => log.isOverdue),
      };
    }

    return {
      success: true,
      data: logsWithOverdue,
    };
  } catch (error: any) {
    console.error('Failed to get borrow logs:', error);
    return { success: false, error: error.message || 'ไม่สามารถดึงข้อมูลประวัติการยืม-คืนได้' };
  }
}

/**
 * Create a new borrow log or request transactionally.
 * Supports quantity deduction for quantity-based assets.
 */
export async function createBorrowLog(input: CreateBorrowInput) {
  try {
    const session = await getSession();
    const isAdmin = session?.role === 'ADMIN';
    const handledBy = input.handledBy || (session ? (session.username as string) : 'System');
    const userId = input.userId || (session ? String(session.id) : undefined);
    const borrowQty = Math.max(1, input.quantity || 1);

    const result = await prisma.$transaction(async (tx: any) => {
      // 1. Verify Asset exists and is Available + isBorrowable
      const asset = await tx.asset.findUnique({
        where: { id: input.assetId },
      });

      if (!asset || asset.isDeleted) {
        throw new Error('ไม่พบข้อมูลอุปกรณ์ในระบบ');
      }

      if (!asset.isBorrowable) {
        throw new Error('อุปกรณ์นี้ยังไม่ได้ถูกเปิดให้ยืมโดย Admin');
      }

      // Check stock for quantity based asset or availability for single unit
      if (asset.isQuantityBased) {
        if (asset.availableQuantity < borrowQty) {
          throw new Error(`จำนวนอุปกรณ์คงเหลือไม่เพียงพอ (คงเหลือ ${asset.availableQuantity} ชิ้น แต่ต้องการยืม ${borrowQty} ชิ้น)`);
        }
      } else {
        if (asset.status !== 'Available') {
          throw new Error(`อุปกรณ์นี้ไม่ได้อยู่ในสถานะพร้อมใช้งาน (สถานะปัจจุบัน: ${asset.status})`);
        }
      }

      // 2. Process expected return date with Bangkok EndOfDay (23:59:59)
      const expectedReturnDate = toBangkokEndOfDay(input.expectedReturnDate);
      const originalReturnDate = expectedReturnDate;

      // Initial status: BORROWED if Admin, PENDING_APPROVAL if Staff/User
      const initialStatus = isAdmin ? 'BORROWED' : 'PENDING_APPROVAL';

      // 3. Create BorrowLog
      const borrowLog = await tx.borrowLog.create({
        data: {
          assetId: input.assetId,
          userId: userId || null,
          borrowerName: input.borrowerName,
          borrowerDept: input.borrowerDept || null,
          borrowerContact: input.borrowerContact || null,
          quantity: borrowQty,
          expectedReturnDate,
          originalReturnDate,
          status: initialStatus,
          purpose: input.purpose || null,
          borrowNotes: input.borrowNotes || null,
          handledBy,
          approvedBy: isAdmin ? (session?.username as string) : null,
          approvedAt: isAdmin ? new Date() : null,
        },
      });

      // 4. Update Asset Stock and Status if Admin auto-approved
      if (isAdmin) {
        const newAvailable = Math.max(0, asset.availableQuantity - borrowQty);
        await tx.asset.update({
          where: { id: input.assetId },
          data: {
            availableQuantity: newAvailable,
            status: newAvailable === 0 ? 'Borrowed' : asset.status,
          },
        });
      }

      // 5. Record AuditLog
      await tx.auditLog.create({
        data: {
          action: 'CREATED',
          entity: 'BORROW',
          entityId: borrowLog.id,
          userId: session?.id ? String(session.id) : null,
          newValue: JSON.stringify({
            assetId: input.assetId,
            borrowerName: input.borrowerName,
            quantity: borrowQty,
            status: initialStatus,
            expectedReturnDate: expectedReturnDate.toISOString(),
          }),
          details: isAdmin
            ? `อนุมัติการยืมอุปกรณ์ ${asset.name} (${asset.assetId}) จำนวน ${borrowQty} ชิ้น ให้ ${input.borrowerName}`
            : `ส่งคำขอยืมอุปกรณ์ ${asset.name} (${asset.assetId}) จำนวน ${borrowQty} ชิ้น โดย ${input.borrowerName} (รออนุมัติ)`,
        },
      });

      return borrowLog;
    });

    revalidatePath('/borrows');
    revalidatePath('/assets');
    revalidatePath('/');
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Failed to create borrow log:', error);
    return { success: false, error: error.message || 'เกิดข้อผิดพลาดในการบันทึกการยืม' };
  }
}

/**
 * Approve a pending borrow request (Admin only)
 */
export async function approveBorrowLog(borrowLogId: string) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return { success: false, error: 'เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่สามารถอนุมัติคำขอยืมได้' };
    }

    const result = await prisma.$transaction(async (tx: any) => {
      const borrowLog = await tx.borrowLog.findUnique({
        where: { id: borrowLogId },
        include: { asset: true },
      });

      if (!borrowLog) {
        throw new Error('ไม่พบคำขอยืมนี้');
      }

      if (borrowLog.status !== 'PENDING_APPROVAL') {
        throw new Error('คำขอนี้ไม่ได้อยู่ในสถานะรออนุมัติ');
      }

      const borrowQty = borrowLog.quantity || 1;
      const asset = borrowLog.asset;

      if (asset.isQuantityBased) {
        if (asset.availableQuantity < borrowQty) {
          throw new Error(`จำนวนอุปกรณ์คงเหลือไม่เพียงพอสำหรับการอนุมัติ (คงเหลือ ${asset.availableQuantity} ชิ้น แต่ยื่นขอ ${borrowQty} ชิ้น)`);
        }
      } else {
        if (asset.status !== 'Available') {
          throw new Error(`อุปกรณ์ไม่ได้อยู่ในสถานะพร้อมใช้งาน (สถานะปัจจุบัน: ${asset.status})`);
        }
      }

      const now = new Date();
      const newAvailable = Math.max(0, asset.availableQuantity - borrowQty);

      // Update BorrowLog to BORROWED
      const approvedLog = await tx.borrowLog.update({
        where: { id: borrowLogId },
        data: {
          status: 'BORROWED',
          approvedBy: session.username as string,
          approvedAt: now,
        },
      });

      // Update Asset stock & status
      await tx.asset.update({
        where: { id: borrowLog.assetId },
        data: {
          availableQuantity: newAvailable,
          status: newAvailable === 0 ? 'Borrowed' : asset.status,
        },
      });

      // AuditLog
      await tx.auditLog.create({
        data: {
          action: 'UPDATED',
          entity: 'BORROW',
          entityId: borrowLogId,
          userId: String(session.id),
          oldValue: JSON.stringify({ status: 'PENDING_APPROVAL' }),
          newValue: JSON.stringify({ status: 'BORROWED', approvedBy: session.username, quantity: borrowQty }),
          details: `อนุมัติคำขอยืมอุปกรณ์ ${asset.name} จำนวน ${borrowQty} ชิ้น สำหรับ ${borrowLog.borrowerName}`,
        },
      });

      return approvedLog;
    });

    revalidatePath('/borrows');
    revalidatePath('/assets');
    revalidatePath('/');
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Failed to approve borrow log:', error);
    return { success: false, error: error.message || 'เกิดข้อผิดพลาดในการอนุมัติคำขอยืม' };
  }
}

/**
 * Reject a pending borrow request (Admin only)
 */
export async function rejectBorrowLog(borrowLogId: string, input: RejectBorrowInput) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return { success: false, error: 'เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่สามารถปฏิเสธคำขอยืมได้' };
    }

    const result = await prisma.$transaction(async (tx: any) => {
      const borrowLog = await tx.borrowLog.findUnique({
        where: { id: borrowLogId },
        include: { asset: true },
      });

      if (!borrowLog) {
        throw new Error('ไม่พบคำขอยืมนี้');
      }

      if (borrowLog.status !== 'PENDING_APPROVAL') {
        throw new Error('คำขอนี้ไม่ได้อยู่ในสถานะรออนุมัติ');
      }

      const rejectedLog = await tx.borrowLog.update({
        where: { id: borrowLogId },
        data: {
          status: 'REJECTED',
          rejectReason: input.rejectReason,
          handledBy: session.username as string,
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'UPDATED',
          entity: 'BORROW',
          entityId: borrowLogId,
          userId: String(session.id),
          oldValue: JSON.stringify({ status: 'PENDING_APPROVAL' }),
          newValue: JSON.stringify({ status: 'REJECTED', rejectReason: input.rejectReason }),
          details: `ปฏิเสธคำขอยืมอุปกรณ์ ${borrowLog.asset.name} สำหรับ ${borrowLog.borrowerName} (เหตุผล: ${input.rejectReason})`,
        },
      });

      return rejectedLog;
    });

    revalidatePath('/borrows');
    revalidatePath('/assets');
    revalidatePath('/');
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Failed to reject borrow log:', error);
    return { success: false, error: error.message || 'เกิดข้อผิดพลาดในการปฏิเสธคำขอยืม' };
  }
}

/**
 * Return a borrowed asset transactionally and restore stock
 */
export async function returnBorrowLog(borrowLogId: string, input: ReturnBorrowInput) {
  try {
    const session = await getSession();
    const handledBy = input.handledBy || (session ? (session.username as string) : 'System');

    const result = await prisma.$transaction(async (tx: any) => {
      const borrowLog = await tx.borrowLog.findUnique({
        where: { id: borrowLogId },
        include: { asset: true },
      });

      if (!borrowLog) {
        throw new Error('ไม่พบข้อมูลรายการยืม');
      }

      if (borrowLog.status !== 'BORROWED') {
        throw new Error('รายการยืมนี้ไม่ได้อยู่ในสถานะรอยืนยันคืน (อาจคืนหรือถูกยกเลิกไปแล้ว)');
      }

      const now = new Date();
      const borrowQty = borrowLog.quantity || 1;
      const asset = borrowLog.asset;

      const updatedBorrowLog = await tx.borrowLog.update({
        where: { id: borrowLogId },
        data: {
          actualReturnDate: now,
          status: 'RETURNED',
          returnCondition: input.returnCondition,
          returnNotes: input.returnNotes || null,
          handledBy,
        },
      });

      const newAvailable = Math.min(asset.totalQuantity, asset.availableQuantity + borrowQty);

      if (input.returnCondition === 'DAMAGED') {
        await tx.asset.update({
          where: { id: borrowLog.assetId },
          data: {
            availableQuantity: newAvailable,
            status: 'Repairing',
          },
        });

        await tx.repairLog.create({
          data: {
            assetId: borrowLog.assetId,
            reason: input.returnNotes
              ? `ชำรุดจากการยืม-คืน (จำนวน ${borrowQty} ชิ้น): ${input.returnNotes}`
              : `ชำรุดจากการยืม-คืน จำนวน ${borrowQty} ชิ้น (ยืมโดย: ${borrowLog.borrowerName})`,
            status: 'IN_PROGRESS',
            sentDate: now,
            technician: handledBy,
          },
        });
      } else {
        await tx.asset.update({
          where: { id: borrowLog.assetId },
          data: {
            availableQuantity: newAvailable,
            status: newAvailable > 0 ? 'Available' : asset.status,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          action: 'UPDATED',
          entity: 'BORROW',
          entityId: borrowLogId,
          userId: session?.id ? String(session.id) : null,
          oldValue: JSON.stringify({ status: 'BORROWED' }),
          newValue: JSON.stringify({
            status: 'RETURNED',
            quantity: borrowQty,
            returnCondition: input.returnCondition,
            returnNotes: input.returnNotes,
          }),
          details: `ทำรายการคืนอุปกรณ์ ${asset.name} จำนวน ${borrowQty} ชิ้น สภาพ: ${input.returnCondition === 'DAMAGED' ? 'ชำรุด/ส่งซ่อม' : 'ปกติ'}`,
        },
      });

      return updatedBorrowLog;
    });

    revalidatePath('/borrows');
    revalidatePath('/assets');
    revalidatePath('/repairs');
    revalidatePath('/');
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Failed to return borrow log:', error);
    return { success: false, error: error.message || 'เกิดข้อผิดพลาดในการบันทึกการคืน' };
  }
}

/**
 * Void a borrow log (Admin only) transactionally and restore stock
 */
export async function voidBorrowLog(borrowLogId: string, input: VoidBorrowInput) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return { success: false, error: 'เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่สามารถยกเลิกรายการยืมได้' };
    }

    const result = await prisma.$transaction(async (tx: any) => {
      const borrowLog = await tx.borrowLog.findUnique({
        where: { id: borrowLogId },
        include: { asset: true },
      });

      if (!borrowLog) {
        throw new Error('ไม่พบข้อมูลรายการยืม');
      }

      if (borrowLog.status !== 'BORROWED' && borrowLog.status !== 'PENDING_APPROVAL') {
        throw new Error('สามารถยกเลิกได้เฉพาะรายการที่ยังยืมอยู่หรือรออนุมัติเท่านั้น');
      }

      const now = new Date();
      const borrowQty = borrowLog.quantity || 1;
      const asset = borrowLog.asset;

      const voidedLog = await tx.borrowLog.update({
        where: { id: borrowLogId },
        data: {
          status: 'VOIDED',
          voidReason: input.voidReason,
          voidedBy: session.username as string,
          voidedAt: now,
        },
      });

      if (borrowLog.status === 'BORROWED') {
        const newAvailable = Math.min(asset.totalQuantity, asset.availableQuantity + borrowQty);
        await tx.asset.update({
          where: { id: borrowLog.assetId },
          data: {
            availableQuantity: newAvailable,
            status: newAvailable > 0 ? 'Available' : asset.status,
          },
        });
      }

      await tx.auditLog.create({
        data: {
          action: 'DELETED',
          entity: 'BORROW',
          entityId: borrowLogId,
          userId: String(session.id),
          oldValue: JSON.stringify({ status: borrowLog.status }),
          newValue: JSON.stringify({ status: 'VOIDED', voidReason: input.voidReason }),
          details: `ยกเลิกรายการยืมอุปกรณ์ ${asset.name} จำนวน ${borrowQty} ชิ้น เหตุผล: ${input.voidReason}`,
        },
      });

      return voidedLog;
    });

    revalidatePath('/borrows');
    revalidatePath('/assets');
    revalidatePath('/');
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Failed to void borrow log:', error);
    return { success: false, error: error.message || 'เกิดข้อผิดพลาดในการยกเลิกรายการ' };
  }
}

/**
 * Extend borrow log return date transactionally
 */
export async function extendBorrowLog(borrowLogId: string, input: ExtendBorrowInput) {
  try {
    const session = await getSession();

    const result = await prisma.$transaction(async (tx: any) => {
      const borrowLog = await tx.borrowLog.findUnique({
        where: { id: borrowLogId },
        include: { asset: true },
      });

      if (!borrowLog) {
        throw new Error('ไม่พบข้อมูลรายการยืม');
      }

      if (borrowLog.status !== 'BORROWED') {
        throw new Error('สามารถต่อเวลาได้เฉพาะรายการที่ยืมอยู่อย่างเดียวเท่านั้น');
      }

      const newExpectedReturnDate = toBangkokEndOfDay(input.newExpectedReturnDate);

      const extendedLog = await tx.borrowLog.update({
        where: { id: borrowLogId },
        data: {
          expectedReturnDate: newExpectedReturnDate,
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'UPDATED',
          entity: 'BORROW',
          entityId: borrowLogId,
          userId: session?.id ? String(session.id) : null,
          oldValue: JSON.stringify({ expectedReturnDate: borrowLog.expectedReturnDate.toISOString() }),
          newValue: JSON.stringify({ expectedReturnDate: newExpectedReturnDate.toISOString() }),
          details: `ต่อเวลายืมอุปกรณ์ ${borrowLog.asset.name} เป็นวันที่ ${formatBangkokDate(newExpectedReturnDate)}`,
        },
      });

      return extendedLog;
    });

    revalidatePath('/borrows');
    revalidatePath('/assets');
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Failed to extend borrow log:', error);
    return { success: false, error: error.message || 'เกิดข้อผิดพลาดในการต่อเวลา' };
  }
}

/**
 * Update asset isBorrowable flag (Admin only)
 */
export async function updateAssetBorrowable(assetId: string, isBorrowable: boolean) {
  try {
    const session = await getSession();
    if (!session || session.role !== 'ADMIN') {
      return { success: false, error: 'เฉพาะ Admin เท่านั้นที่กำหนดอุปกรณ์ให้ยืมได้' };
    }

    const updatedAsset = await prisma.asset.update({
      where: { id: assetId },
      data: { isBorrowable },
    });

    revalidatePath('/assets');
    revalidatePath('/borrows');
    return { success: true, data: updatedAsset };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Helper to fetch available & borrowable assets for borrow selection
 */
export async function getAvailableAssets() {
  try {
    const assets = await prisma.asset.findMany({
      where: {
        isDeleted: false,
        isBorrowable: true,
        OR: [
          { status: 'Available' },
          { isQuantityBased: true, availableQuantity: { gt: 0 } },
        ],
      },
      select: {
        id: true,
        assetId: true,
        name: true,
        department: true,
        isQuantityBased: true,
        totalQuantity: true,
        availableQuantity: true,
        category: {
          select: {
            name: true,
          },
        },
        property: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        assetId: 'asc',
      },
    });
    return { success: true, data: assets };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Helper to fetch system users for borrower selection
 */
export async function getUsersList() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        fullName: true,
        department: true,
        phone: true,
        role: true,
      },
      orderBy: {
        username: 'asc',
      },
    });
    return { success: true, data: users };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Helper to find an asset by exact Asset ID or UUID
 */
export async function findAssetByCode(code: string) {
  try {
    const trimmed = code.trim();
    const asset = await prisma.asset.findFirst({
      where: {
        isDeleted: false,
        isBorrowable: true,
        OR: [
          { assetId: trimmed },
          { id: trimmed },
        ],
      },
      include: {
        category: true,
      },
    });

    if (!asset) {
      return { success: false, error: `ไม่พบอุปกรณ์รหัส "${trimmed}" ที่เปิดอนุญาตให้ยืม` };
    }

    return { success: true, data: asset };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

/**
 * Aggregates Department Borrow Statistics for Dashboard
 */
export async function getDepartmentBorrowStats() {
  try {
    const logs = await prisma.borrowLog.findMany({
      select: {
        id: true,
        borrowerDept: true,
        status: true,
        quantity: true,
        borrowDate: true,
        asset: {
          select: {
            name: true,
            category: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    const deptMap: Record<string, { totalBorrows: number, activeBorrows: number, items: Record<string, number> }> = {};

    logs.forEach((log) => {
      const deptName = log.borrowerDept || 'ไม่ระบุแผนก';
      const qty = log.quantity || 1;
      if (!deptMap[deptName]) {
        deptMap[deptName] = { totalBorrows: 0, activeBorrows: 0, items: {} };
      }

      deptMap[deptName].totalBorrows += qty;
      if (log.status === 'BORROWED') {
        deptMap[deptName].activeBorrows += qty;
      }

      const itemName = log.asset?.name || 'อุปกรณ์ทั่วไป';
      deptMap[deptName].items[itemName] = (deptMap[deptName].items[itemName] || 0) + qty;
    });

    const departmentStats = Object.entries(deptMap).map(([dept, data]) => {
      const topItems = Object.entries(data.items)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([itemName, count]) => `${itemName} (${count})`);

      return {
        department: dept,
        totalBorrows: data.totalBorrows,
        activeBorrows: data.activeBorrows,
        topItems: topItems.length > 0 ? topItems.join(', ') : '-',
      };
    });

    departmentStats.sort((a, b) => b.totalBorrows - a.totalBorrows);

    return { success: true, data: departmentStats };
  } catch (error: any) {
    console.error('Failed to get department borrow stats:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Fetch Stock Summary for Quantity-Based Assets for Dashboard
 */
export async function getQuantityAssetsStock() {
  try {
    const assets = await prisma.asset.findMany({
      where: {
        isDeleted: false,
        isBorrowable: true,
        isQuantityBased: true,
      },
      select: {
        id: true,
        assetId: true,
        name: true,
        totalQuantity: true,
        availableQuantity: true,
        category: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    const result = assets.map((a) => {
      const borrowed = Math.max(0, a.totalQuantity - a.availableQuantity);
      return {
        id: a.id,
        assetId: a.assetId,
        name: a.name,
        category: a.category?.name || '-',
        total: a.totalQuantity,
        borrowed,
        available: a.availableQuantity,
      };
    });

    return { success: true, data: result };
  } catch (error: any) {
    console.error('Failed to get quantity assets stock:', error);
    return { success: false, error: error.message };
  }
}
