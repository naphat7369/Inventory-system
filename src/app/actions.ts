'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createSession, deleteSession, getSession } from '@/lib/auth';
import bcrypt from 'bcryptjs';

async function requireAdmin() {
  const session = await getSession();
  if (session?.role !== 'ADMIN') throw new Error('Unauthorized');
}

export async function getAssetSuggestions(query: string) {
  if (!query || query.length < 2) return [];
  
  return prisma.asset.findMany({
    where: {
      OR: [
        { name: { contains: query } },
        { assetId: { contains: query } },
        { owner: { contains: query } },
      ],
      isDeleted: false
    },
    select: {
      id: true,
      name: true,
      assetId: true,
      owner: true,
    },
    take: 5
  });
}

export async function createAuditLog(
  tx: any, 
  action: string, 
  entity: string, 
  entityId: string, 
  data?: { oldValue?: any, newValue?: any, details?: string, userId?: any }
) {
  return tx.auditLog.create({
    data: {
      action,
      entity,
      entityId,
      oldValue: data?.oldValue ? JSON.stringify(data.oldValue) : null,
      newValue: data?.newValue ? JSON.stringify(data.newValue) : null,
      details: data?.details,
      userId: data?.userId ? String(data.userId) : null
    }
  });
}


// Categories
export async function initAdmin() {
  const count = await prisma.user.count();
  if (count === 0) {
    const passwordHash = await bcrypt.hash('password123', 10);
    await prisma.user.create({
      data: {
        username: 'admin',
        passwordHash,
        role: 'ADMIN'
      }
    });
  }
}

export async function createCategory(formData: FormData) {
  await requireAdmin();
  const name = formData.get('name') as string;
  const prefix = formData.get('prefix') as string;
  if (!name) return;
  await prisma.category.create({ data: { name, prefix: prefix || null } });
  revalidatePath('/categories');
}

export async function deleteCategory(id: string) {
  await requireAdmin();
  await prisma.category.delete({ where: { id } });
  revalidatePath('/categories');
}

// Custom Fields
export async function createCustomField(formData: FormData) {
  await requireAdmin();
  const name = formData.get('name') as string;
  const type = formData.get('type') as string;
  const categoryId = formData.get('categoryId') as string;
  
  if (!name || !type || !categoryId) return;
  
  await prisma.customField.create({ 
    data: { name, type, categoryId } 
  });
  revalidatePath('/settings');
}

export async function deleteCustomField(id: string) {
  await requireAdmin();
  await prisma.customField.delete({ where: { id } });
  revalidatePath('/settings');
}

// Assets
export async function createAsset(data: any) {
  await requireAdmin();
  let assetId = data.assetId;
  
  if (!assetId && data.categoryId) {
    const category = await prisma.category.findUnique({ where: { id: data.categoryId } });
    
    let catPrefix = category?.prefix;
    if (!catPrefix && category?.name) {
      catPrefix = category.name.substring(0, 3).toUpperCase();
    }
    if (!catPrefix) catPrefix = 'ASSET';

    let propPrefix = '';
    if (data.propertyId) {
      const property = await prisma.property.findUnique({ where: { id: data.propertyId } });
      if (property) {
        propPrefix = property.prefix || property.name.substring(0, 3).toUpperCase();
        propPrefix += '-';
      }
    }
    
    const count = await prisma.asset.count({ 
      where: { 
        categoryId: data.categoryId,
        propertyId: data.propertyId || null
      } 
    });
    assetId = `${propPrefix}${catPrefix}-${(count + 1).toString().padStart(4, '0')}`;
  } else if (!assetId) {
    assetId = `ASSET-${Date.now()}`;
  }

  await prisma.$transaction(async (tx) => {
    const newAsset = await tx.asset.create({
      data: {
        ...data,
        assetId
      }
    });

    const session = await getSession();
    await createAuditLog(tx, 'CREATED', 'ASSET', newAsset.id, {
      newValue: newAsset,
      userId: session?.id
    });
  });

  revalidatePath('/assets');
  revalidatePath('/');
}

export async function getNextAssetId(categoryId: string, propertyId?: string) {
  if (!categoryId) return '';
  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  
  // If prefix is missing, use the first 3 letters of the category name
  let catPrefix = category?.prefix;
  if (!catPrefix && category?.name) {
    catPrefix = category.name.substring(0, 3).toUpperCase();
  }
  if (!catPrefix) catPrefix = 'ASSET';

  let propPrefix = '';
  if (propertyId) {
    const property = await prisma.property.findUnique({ where: { id: propertyId } });
    if (property) {
      propPrefix = property.prefix || property.name.substring(0, 3).toUpperCase();
      propPrefix += '-';
    }
  }
  
  const count = await prisma.asset.count({ 
    where: { 
      categoryId,
      propertyId: propertyId || null
    } 
  });
  return `${propPrefix}${catPrefix}-${(count + 1).toString().padStart(4, '0')}`;
}

export async function createProperty(formData: FormData) {
  await requireAdmin();
  const name = formData.get('name') as string;
  const prefix = formData.get('prefix') as string;
  if (!name) return;
  await prisma.property.create({ data: { name, prefix: prefix || null } });
  revalidatePath('/properties');
  revalidatePath('/assets/new');
}

export async function deleteProperty(id: string) {
  await requireAdmin();
  await prisma.property.delete({ where: { id } });
  revalidatePath('/properties');
  revalidatePath('/assets/new');
}

export async function updateAsset(id: string, data: any) {
  await requireAdmin();
  
  await prisma.$transaction(async (tx) => {
    const oldAsset = await tx.asset.findUnique({ where: { id } });
    const newAsset = await tx.asset.update({
      where: { id },
      data,
    });
    
    const session = await getSession();
    await createAuditLog(tx, 'UPDATED', 'ASSET', id, {
      oldValue: oldAsset,
      newValue: newAsset,
      userId: session?.id
    });
  });

  revalidatePath('/assets');
  revalidatePath(`/assets/${id}`);
  revalidatePath('/');
}

export async function unlinkAsset(id: string) {
  await requireAdmin();
  await prisma.asset.update({
    where: { id },
    data: { parentId: null }
  });
  revalidatePath('/assets');
  revalidatePath(`/assets/${id}`);
}

export async function updateAssetStatus(id: string, status: string) {
  await requireAdmin();
  const session = await getSession();

  await prisma.$transaction(async (tx) => {
    const oldAsset = await tx.asset.findUnique({ where: { id } });

    // 1. If changing to Repairing, auto-create a RepairLog if one doesn't exist
    if (status === 'Repairing' && oldAsset?.status !== 'Repairing') {
      const existingRepair = await tx.repairLog.findFirst({
        where: { assetId: id, status: { in: ['IN_PROGRESS', 'WAITING_FOR_PARTS'] } }
      });
      
      if (!existingRepair) {
        const newRepair = await tx.repairLog.create({
          data: {
            assetId: id,
            reason: 'Status changed to Repairing via Asset Table',
            status: 'IN_PROGRESS'
          }
        });
        await createAuditLog(tx, 'CREATED', 'REPAIR', newRepair.id, {
          newValue: newRepair,
          userId: session?.id
        });
      }
    }

    // 2. If changing from Repairing to Available, auto-complete the active RepairLog
    if (status === 'Available' && oldAsset?.status === 'Repairing') {
      const existingRepair = await tx.repairLog.findFirst({
        where: { assetId: id, status: { in: ['IN_PROGRESS', 'WAITING_FOR_PARTS'] } }
      });
      
      if (existingRepair) {
        const updatedRepair = await tx.repairLog.update({
          where: { id: existingRepair.id },
          data: { 
            status: 'COMPLETED', 
            completionDate: new Date(), 
            resolution: 'Status changed to Available via Asset Table' 
          }
        });
        await createAuditLog(tx, 'UPDATED', 'REPAIR', updatedRepair.id, {
          newValue: updatedRepair,
          userId: session?.id
        });
      }
    }

    // 3. Update the Asset
    const newAsset = await tx.asset.update({
      where: { id },
      data: { status }
    });

    // 4. Audit the Asset update
    await createAuditLog(tx, 'UPDATED', 'ASSET', id, {
      oldValue: oldAsset,
      newValue: newAsset,
      userId: session?.id
    });
  });

  revalidatePath('/assets');
  revalidatePath(`/assets/${id}`);
  revalidatePath('/repairs');
  revalidatePath('/');
}

export async function deleteAsset(id: string) {
  await requireAdmin();
  const session = await getSession();
  
  try {
    await prisma.$transaction(async (tx) => {
      const oldAsset = await tx.asset.findUnique({ where: { id } });
      await tx.asset.delete({ where: { id } });
      
      await createAuditLog(tx, 'DELETED', 'ASSET', id, {
        oldValue: oldAsset,
        userId: session?.id
      });
    });
    revalidatePath('/assets');
    revalidatePath('/');
  } catch (err: any) {
    if (err.code === 'P2003') {
      throw new Error("Cannot delete: this asset has repair history.");
    }
    throw err;
  }
}

export async function softDeleteAssets(ids: string[]) {
  await requireAdmin();
  await prisma.asset.updateMany({
    where: { id: { in: ids } },
    data: { isDeleted: true }
  });
  revalidatePath('/assets');
}

export async function restoreAsset(id: string) {
  await requireAdmin();
  await prisma.asset.update({ 
    where: { id },
    data: { isDeleted: false }
  });
  revalidatePath('/assets');
}

export async function hardDeleteAsset(id: string) {
  await requireAdmin();
  await prisma.$transaction(async (tx) => {
    await tx.repairLog.deleteMany({ where: { assetId: id } });
    await tx.borrowLog.deleteMany({ where: { assetId: id } });
    await tx.asset.delete({ where: { id } });
  });
  revalidatePath('/assets');
  revalidatePath('/borrows');
  revalidatePath('/repairs');
  revalidatePath('/');
}

export async function hardDeleteAssets(ids: string[]) {
  await requireAdmin();
  await prisma.$transaction(async (tx) => {
    await tx.repairLog.deleteMany({ where: { assetId: { in: ids } } });
    await tx.borrowLog.deleteMany({ where: { assetId: { in: ids } } });
    await tx.asset.deleteMany({ where: { id: { in: ids } } });
  });
  revalidatePath('/assets');
  revalidatePath('/borrows');
  revalidatePath('/repairs');
  revalidatePath('/');
}

// === User Authentication & Management Actions ===

export async function getAllAssetsForExport() {
  await requireAdmin();
  return prisma.asset.findMany({
    where: { isDeleted: false, isQuantityBased: false },
    include: { category: true, property: true },
    orderBy: { createdAt: 'desc' }
  });
}

export async function login(formData: FormData) {
  const username = formData.get('username') as string;
  const password = formData.get('password') as string;

  if (!username || !password) {
    return { error: 'Username and password are required' };
  }

  const user = await prisma.user.findUnique({
    where: { username }
  });

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return { error: 'Invalid username or password' };
  }

  await createSession({
    id: user.id,
    username: user.username,
    role: user.role,
    fullName: user.fullName,
    department: user.department,
    phone: user.phone,
  });

  if (user.role === 'STAFF') {
    redirect('/borrows');
  } else {
    redirect('/assets');
  }
}

export async function logout() {
  await deleteSession();
  redirect('/login');
}

export async function getUsers() {
  const session = await getSession();
  if (session?.role !== 'ADMIN') throw new Error('Unauthorized');

  return prisma.user.findMany({
    select: {
      id: true,
      username: true,
      fullName: true,
      department: true,
      phone: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createUser(formData: FormData) {
  const session = await getSession();
  if (session?.role !== 'ADMIN') throw new Error('Unauthorized');

  const username = (formData.get('username') as string)?.trim();
  const password = formData.get('password') as string;
  const fullName = (formData.get('fullName') as string)?.trim() || null;
  const department = (formData.get('department') as string)?.trim() || null;
  const phone = (formData.get('phone') as string)?.trim() || null;
  const role = (formData.get('role') as string) || 'STAFF';

  if (!username || !password) {
    return { error: 'กรุณากรอก Username และ Password' };
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    return { error: 'Username นี้ถูกใช้งานไปแล้ว' };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      username,
      passwordHash,
      fullName,
      department,
      phone,
      role,
    },
  });

  revalidatePath('/users');
  return { success: true };
}

export async function updateUser(
  userId: string,
  data: {
    username?: string;
    password?: string;
    fullName?: string | null;
    department?: string | null;
    phone?: string | null;
    role?: string;
  }
) {
  const session = await getSession();
  if (session?.role !== 'ADMIN') throw new Error('Unauthorized');

  const existingUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!existingUser) return { success: false, error: 'ไม่พบผู้ใช้งานนี้ในระบบ' };

  if (data.username && data.username.trim() !== existingUser.username) {
    const duplicate = await prisma.user.findUnique({ where: { username: data.username.trim() } });
    if (duplicate) return { success: false, error: 'Username นี้ถูกใช้งานไปแล้ว' };
  }

  const updateData: any = {};
  if (data.username) updateData.username = data.username.trim();
  if (data.fullName !== undefined) updateData.fullName = data.fullName ? data.fullName.trim() : null;
  if (data.department !== undefined) updateData.department = data.department ? data.department.trim() : null;
  if (data.phone !== undefined) updateData.phone = data.phone ? data.phone.trim() : null;
  if (data.role) updateData.role = data.role;

  if (data.password && data.password.trim() !== '') {
    updateData.passwordHash = await bcrypt.hash(data.password.trim(), 10);
  }

  await prisma.user.update({
    where: { id: userId },
    data: updateData,
  });

  revalidatePath('/users');
  revalidatePath('/borrows');
  return { success: true };
}

export async function deleteUser(id: string) {
  const session = await getSession();
  if (session?.role !== 'ADMIN') throw new Error('Unauthorized');
  if (session.id === id) throw new Error('Cannot delete yourself');

  await prisma.user.delete({
    where: { id }
  });

  revalidatePath('/users');
}

// === License Actions ===

export async function createLicense(formData: FormData) {
  await requireAdmin();
  const name = formData.get('name') as string;
  const accountEmail = formData.get('accountEmail') as string;
  const productKey = formData.get('productKey') as string;
  const totalSlots = parseInt(formData.get('totalSlots') as string) || 1;
  const purchaseDateStr = formData.get('purchaseDate') as string;
  const expirationDateStr = formData.get('expirationDate') as string;
  const propertyId = formData.get('propertyId') as string;

  if (!name) throw new Error('Name is required');

  let createdLicense;
  await prisma.$transaction(async (tx) => {
    createdLicense = await tx.license.create({
      data: {
        name,
        accountEmail: accountEmail || null,
        productKey: productKey || null,
        totalSlots,
        purchaseDate: purchaseDateStr ? new Date(purchaseDateStr) : null,
        expirationDate: expirationDateStr ? new Date(expirationDateStr) : null,
        propertyId: propertyId || null
      }
    });

    const session = await getSession();
    await createAuditLog(tx, 'CREATED', 'LICENSE', createdLicense.id, {
      newValue: createdLicense,
      userId: session?.id
    });
  });

  revalidatePath('/licenses');
  revalidatePath('/');
  redirect('/licenses');
}

export async function updateLicense(id: string, formData: FormData) {
  await requireAdmin();
  const name = formData.get('name') as string;
  const accountEmail = formData.get('accountEmail') as string;
  const productKey = formData.get('productKey') as string;
  const totalSlots = parseInt(formData.get('totalSlots') as string) || 1;
  const purchaseDateStr = formData.get('purchaseDate') as string;
  const expirationDateStr = formData.get('expirationDate') as string;
  const propertyId = formData.get('propertyId') as string;
  const status = formData.get('status') as string;

  await prisma.license.update({
    where: { id },
    data: {
      name,
      accountEmail: accountEmail || null,
      productKey: productKey || null,
      totalSlots,
      purchaseDate: purchaseDateStr ? new Date(purchaseDateStr) : null,
      expirationDate: expirationDateStr ? new Date(expirationDateStr) : null,
      propertyId: propertyId || null,
      status: status || 'Active'
    }
  });

  revalidatePath('/licenses');
  revalidatePath(`/licenses/${id}`);
  redirect(`/licenses/${id}`);
}

export async function deleteLicense(id: string) {
  await requireAdmin();
  await prisma.license.delete({ where: { id } });
  revalidatePath('/licenses');
  redirect('/licenses');
}

export async function getLicenseSlotUsage(licenseId: string) {
  const license = await prisma.license.findUnique({
    where: { id: licenseId },
    select: {
      totalSlots: true,
      _count: {
        select: {
          assignments: {
            where: { isActive: true }
          }
        }
      }
    }
  });
  if (!license) return null;
  const usedSlots = license._count.assignments;
  const availableSlots = Math.max(0, license.totalSlots - usedSlots);
  return {
    totalSlots: license.totalSlots,
    usedSlots,
    availableSlots,
    isFull: availableSlots <= 0
  };
}

export async function searchUsers(query: string) {
  await requireAdmin();
  const trimmed = query ? query.trim() : '';

  return prisma.user.findMany({
    where: trimmed ? {
      OR: [
        { username: { contains: trimmed } },
        { fullName: { contains: trimmed } },
        { department: { contains: trimmed } },
      ]
    } : undefined,
    select: {
      id: true,
      username: true,
      fullName: true,
      department: true,
      phone: true
    },
    take: 15,
    orderBy: { username: 'asc' }
  });
}

export async function searchAssets(query: string) {
  await requireAdmin();
  const trimmed = query ? query.trim() : '';

  return prisma.asset.findMany({
    where: {
      isDeleted: false,
      ...(trimmed ? {
        OR: [
          { assetId: { contains: trimmed } },
          { name: { contains: trimmed } },
          { ipAddress: { contains: trimmed } },
          { owner: { contains: trimmed } },
          { department: { contains: trimmed } },
        ]
      } : {})
    },
    select: {
      id: true,
      assetId: true,
      name: true,
      department: true,
      owner: true
    },
    take: 15,
    orderBy: { assetId: 'asc' }
  });
}

export async function assignLicenseSlot(formData: FormData) {
  await requireAdmin();
  const licenseId = formData.get('licenseId') as string;
  const userId = (formData.get('userId') as string) || null;
  const assignedTo = (formData.get('assignedTo') as string) || '';
  const assignedEmail = (formData.get('assignedEmail') as string) || null;
  const department = (formData.get('department') as string) || null;
  const phone = (formData.get('phone') as string) || null;
  const assetId = (formData.get('assetId') as string) || null;
  const deviceName = (formData.get('deviceName') as string) || null;
  const assignedDateStr = (formData.get('assignedDate') as string) || null;
  const notes = (formData.get('notes') as string) || null;

  if (!licenseId || !assignedTo.trim()) {
    throw new Error('License ID and Assigned Name are required');
  }

  // Validate User if linked
  if (userId) {
    const userExists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
    if (!userExists) {
      throw new Error('Selected user was not found');
    }
  }

  // Validate Asset if linked
  if (assetId) {
    const assetExists = await prisma.asset.findUnique({ where: { id: assetId }, select: { id: true } });
    if (!assetExists) {
      throw new Error('Selected asset was not found');
    }
  }

  const assignedDate = assignedDateStr ? new Date(assignedDateStr) : new Date();

  // Transaction with lock/slot validation
  const assignment = await prisma.$transaction(async (tx) => {
    const license = await tx.license.findUnique({
      where: { id: licenseId },
      include: {
        assignments: {
          where: { isActive: true }
        }
      }
    });

    if (!license) throw new Error('License not found');
    if (license.assignments.length >= license.totalSlots) {
      throw new Error('No available license slots.');
    }

    return tx.licenseAssignment.create({
      data: {
        licenseId,
        userId: userId || null,
        assignedTo: assignedTo.trim(),
        assignedEmail: assignedEmail?.trim() || null,
        department: department?.trim() || null,
        phone: phone?.trim() || null,
        assetId: assetId || null,
        deviceName: deviceName?.trim() || null,
        assignedDate,
        notes: notes?.trim() || null,
        isActive: true
      }
    });
  });

  revalidatePath('/licenses');
  revalidatePath(`/licenses/${licenseId}`);
  if (assetId) {
    revalidatePath(`/assets/${assetId}`);
  }

  return { success: true, id: assignment.id };
}

export async function updateLicenseSlot(formData: FormData) {
  await requireAdmin();
  const assignmentId = formData.get('assignmentId') as string;
  const rawUserId = formData.get('userId') as string;
  const clearUser = formData.get('clearUser') === 'true';
  const assignedTo = (formData.get('assignedTo') as string) || '';
  const assignedEmail = (formData.get('assignedEmail') as string) || null;
  const department = (formData.get('department') as string) || null;
  const phone = (formData.get('phone') as string) || null;
  const rawAssetId = formData.get('assetId') as string;
  const clearAsset = formData.get('clearAsset') === 'true';
  const deviceName = (formData.get('deviceName') as string) || null;
  const assignedDateStr = (formData.get('assignedDate') as string) || null;
  const notes = (formData.get('notes') as string) || null;

  if (!assignmentId || !assignedTo.trim()) {
    throw new Error('Assignment ID and Name are required');
  }

  const existing = await prisma.licenseAssignment.findUnique({
    where: { id: assignmentId }
  });
  if (!existing) throw new Error('Assignment not found');

  let finalUserId: string | null = existing.userId;
  if (clearUser) {
    finalUserId = null;
  } else if (rawUserId !== undefined && rawUserId !== null && rawUserId !== '') {
    finalUserId = rawUserId;
  }

  let finalAssetId: string | null = existing.assetId;
  if (clearAsset) {
    finalAssetId = null;
  } else if (rawAssetId !== undefined && rawAssetId !== null && rawAssetId !== '') {
    finalAssetId = rawAssetId;
  }

  const assignedDate = assignedDateStr ? new Date(assignedDateStr) : existing.assignedDate;

  await prisma.licenseAssignment.update({
    where: { id: assignmentId },
    data: {
      userId: finalUserId,
      assignedTo: assignedTo.trim(),
      assignedEmail: assignedEmail?.trim() || null,
      department: department?.trim() || null,
      phone: phone?.trim() || null,
      assetId: finalAssetId,
      deviceName: deviceName?.trim() || null,
      assignedDate,
      notes: notes?.trim() || null,
    }
  });

  revalidatePath('/licenses');
  revalidatePath(`/licenses/${existing.licenseId}`);
  if (existing.assetId) {
    revalidatePath(`/assets/${existing.assetId}`);
  }
  if (finalAssetId && finalAssetId !== existing.assetId) {
    revalidatePath(`/assets/${finalAssetId}`);
  }

  return { success: true };
}

export async function unassignLicenseSlot(assignmentId: string) {
  await requireAdmin();
  const existing = await prisma.licenseAssignment.findUnique({
    where: { id: assignmentId }
  });
  if (!existing) throw new Error('Assignment not found');

  await prisma.licenseAssignment.update({
    where: { id: assignmentId },
    data: {
      isActive: false,
      unassignedDate: new Date()
    }
  });

  revalidatePath('/licenses');
  revalidatePath(`/licenses/${existing.licenseId}`);
  if (existing.assetId) {
    revalidatePath(`/assets/${existing.assetId}`);
  }

  return { success: true };
}

export async function removeLicenseSlot(assignmentId: string) {
  return unassignLicenseSlot(assignmentId);
}

export async function importAssets(rows: any[]) {
  await requireAdmin();
  if (!rows || rows.length === 0) return { success: true, count: 0 };

  let importedCount = 0;

  await prisma.$transaction(async (tx) => {
    // Cache for categories and properties to avoid redundant creates
    const categoryCache = new Map<string, string>();
    const propertyCache = new Map<string, string>();
    // Cache for asset counts to auto-generate IDs safely without race conditions
    const countCache = new Map<string, number>();

    for (const rawRow of rows) {
      const row: Record<string, any> = {};
      for (const k of Object.keys(rawRow)) {
        row[k.trim()] = rawRow[k];
      }

      const categoryName = (row['Category']?.toString().trim() || row['Asset Type']?.toString().trim()) || 'Uncategorized';
      let categoryId = categoryCache.get(categoryName);
      let catPrefix = '';

      if (!categoryId) {
        let category = await tx.category.findFirst({ where: { name: categoryName } });
        if (!category) {
          catPrefix = categoryName.substring(0, 3).toUpperCase();
          category = await tx.category.create({
            data: { name: categoryName, prefix: catPrefix }
          });
        } else {
          catPrefix = category.prefix || category.name.substring(0, 3).toUpperCase();
        }
        categoryId = category.id;
        categoryCache.set(categoryName, categoryId);
      } else {
        const cat = await tx.category.findUnique({ where: { id: categoryId } });
        catPrefix = cat?.prefix || cat?.name.substring(0, 3).toUpperCase() || 'CAT';
      }

      let propertyId = null;
      let propPrefix = '';
      if (row['Property']) {
        const propertyName = row['Property'].toString().trim();
        propertyId = propertyCache.get(propertyName);
        if (!propertyId) {
          let property = await tx.property.findFirst({ where: { name: propertyName } });
          if (!property) {
            propPrefix = propertyName.substring(0, 3).toUpperCase();
            property = await tx.property.create({
              data: { name: propertyName, prefix: propPrefix }
            });
          } else {
            propPrefix = property.prefix || property.name.substring(0, 3).toUpperCase();
          }
          propertyId = property.id;
          propertyCache.set(propertyName, propertyId);
        } else {
          const prop = await tx.property.findUnique({ where: { id: propertyId } });
          propPrefix = prop?.prefix || prop?.name.substring(0, 3).toUpperCase() || 'PRP';
        }
        propPrefix += '-';
      }

      // Generate Asset ID
      const countKey = `${categoryId}-${propertyId || 'none'}`;
      let currentCount = countCache.get(countKey);
      if (currentCount === undefined) {
        currentCount = await tx.asset.count({
          where: { categoryId, propertyId: propertyId || null }
        });
      }
      currentCount++;
      countCache.set(countKey, currentCount);

      const assetId = `${propPrefix}${catPrefix}-${currentCount.toString().padStart(4, '0')}`;

      // Core fields
      const name = (row['Asset Name']?.toString().trim() || row['Device Name']?.toString().trim()) || 'Unknown Asset';
      let statusKey = Object.keys(row).find(k => 
        ['usage status', 'status', 'สถานะ'].includes(k.toLowerCase())
      );
      let rawStatus = statusKey ? row[statusKey]?.toString().trim() : 'Available';
      
      let status = 'Available';
      const lowerRaw = rawStatus.toLowerCase();
      if (lowerRaw.includes('in-use') || lowerRaw.includes('in use') || lowerRaw.includes('ใช้งาน')) status = 'In-use';
      else if (lowerRaw.includes('repair') || lowerRaw.includes('ซ่อม')) status = 'Repairing';
      else if (lowerRaw.includes('dispose') || lowerRaw.includes('จำหน่าย')) status = 'Disposed';
      else if (lowerRaw.includes('available') || lowerRaw.includes('ว่าง')) status = 'Available';
      else status = rawStatus; // fallback to whatever it is
      const location = row['Location'] || null;
      const ipAddress = row['IP Address'] || null;
      const department = row['Department']?.toString().trim() || row['Departments']?.toString().trim() || null;
      const owner = row['Owner']?.toString().trim() || null;
      const os = row['OS']?.toString().trim() || row['Operating System']?.toString().trim() || null;
      
      let purchaseDate = null;
      if (row['Purchase Date']) {
        purchaseDate = new Date(row['Purchase Date']);
        if (isNaN(purchaseDate.getTime())) purchaseDate = null;
      }

      // Custom Data
      const customDataObj: Record<string, any> = {};
      const coreKeys = ['Category', 'Asset Type', 'Property', 'Asset Name', 'Usage Status', 'Status', 'Location', 'IP Address', 'Department', 'Departments', 'Owner', 'OS', 'Operating System', 'Purchase Date', 'ID', 'Asset ID', 'Asset Code'];
      
      for (const key of Object.keys(row)) {
        if (!coreKeys.includes(key)) {
          customDataObj[key] = row[key];
        }
      }

      await tx.asset.create({
        data: {
          assetId,
          name: name.toString(),
          categoryId,
          propertyId,
          status: status.toString(),
          location: location?.toString(),
          ipAddress: ipAddress?.toString(),
          department: department?.toString(),
          owner: owner?.toString(),
          os: os?.toString(),
          purchaseDate,
          customData: Object.keys(customDataObj).length > 0 ? JSON.stringify(customDataObj) : null
        }
      });
      importedCount++;
    }
  }, {
    maxWait: 15000,
    timeout: 60000 // Extended timeout for bulk imports
  });

  revalidatePath('/assets');
  revalidatePath('/categories');
  revalidatePath('/properties');
  revalidatePath('/');
  return { success: true, count: importedCount };
}

// === Repair Actions ===

export async function createRepairLog(assetId: string, reason: string, technician?: string) {
  await requireAdmin();
  if (!reason || reason.trim() === '') throw new Error('Reason is required');

  await prisma.$transaction(async (tx) => {
    // 1. Guard against duplicate active repairs
    const existing = await tx.repairLog.findFirst({
      where: {
        assetId,
        status: { in: ['IN_PROGRESS', 'WAITING_FOR_PARTS'] }
      }
    });
    
    if (existing) {
      throw new Error('This asset already has an active repair log.');
    }

    // 2. Create Repair Log
    const newRepair = await tx.repairLog.create({
      data: {
        assetId,
        reason,
        technician: technician || null,
        status: 'IN_PROGRESS'
      }
    });

    // 3. Update Asset Status
    await tx.asset.update({
      where: { id: assetId },
      data: { status: 'Repairing' }
    });

    // 4. Audit Log
    const session = await getSession();
    await createAuditLog(tx, 'CREATED', 'REPAIR', newRepair.id, {
      newValue: newRepair,
      userId: session?.id
    });
  });

  revalidatePath('/assets');
  revalidatePath(`/assets/${assetId}`);
  revalidatePath('/repairs');
  revalidatePath('/');
}

export async function updateRepairLog(repairId: string, data: { status?: string; costCents?: number; resolution?: string; technician?: string }) {
  await requireAdmin();

  await prisma.$transaction(async (tx) => {
    // 1. Update RepairLog
    const updateData: any = { ...data };
    if (data.status === 'COMPLETED') {
      updateData.completionDate = new Date();
    }
    
    const repairLog = await tx.repairLog.update({
      where: { id: repairId },
      data: updateData
    });

    // 2. Auto-update Asset if completed and currently in "Repairing"
    if (data.status === 'COMPLETED') {
      const asset = await tx.asset.findUnique({
        where: { id: repairLog.assetId },
        select: { status: true }
      });
      
      if (asset?.status === 'Repairing') {
        await tx.asset.update({
          where: { id: repairLog.assetId },
          data: { status: 'Available' }
        });
      }
    }
    // 3. Audit Log
    const session = await getSession();
    await createAuditLog(tx, 'UPDATED', 'REPAIR', repairLog.id, {
      newValue: repairLog,
      userId: session?.id
    });
  });

  revalidatePath('/assets');
  revalidatePath('/repairs');
  revalidatePath('/');
}

/**
 * Server action to adjust stock quantities with detailed audit logging
 */
export async function adjustQuantityStock(
  id: string,
  data: {
    name?: string;
    totalQuantity: number;
    availableQuantity: number;
    propertyId?: string | null;
    department?: string | null;
    location?: string | null;
    notes?: string | null;
  }
) {
  await requireAdmin();
  const session = await getSession();

  const result = await prisma.$transaction(async (tx) => {
    const oldAsset = await tx.asset.findUnique({
      where: { id },
      include: { property: true },
    });

    if (!oldAsset) {
      throw new Error('ไม่พบรายการอุปกรณ์');
    }

    const newTotal = Math.max(1, data.totalQuantity);
    const newAvail = Math.max(0, data.availableQuantity);
    const newStatus = newAvail > 0 ? 'Available' : 'Borrowed';

    const updatePayload: any = {
      totalQuantity: newTotal,
      availableQuantity: newAvail,
      status: newStatus,
    };

    if (data.name) updatePayload.name = data.name.trim();
    if (data.propertyId !== undefined) updatePayload.propertyId = data.propertyId || null;
    if (data.department !== undefined) updatePayload.department = data.department ? data.department.trim() : null;
    if (data.location !== undefined) updatePayload.location = data.location ? data.location.trim() : null;

    const newAsset = await tx.asset.update({
      where: { id },
      data: updatePayload,
      include: { property: true },
    });

    // Calculate diffs
    const diffTotal = newTotal - (oldAsset.totalQuantity || 1);
    const diffAvailable = newAvail - (oldAsset.availableQuantity || 1);

    const diffParts: string[] = [];
    if (diffTotal !== 0) {
      diffParts.push(`สต็อกรวม: ${oldAsset.totalQuantity} ➔ ${newTotal} ชิ้น (${diffTotal >= 0 ? '+' : ''}${diffTotal} ชิ้น)`);
    } else {
      diffParts.push(`สต็อกรวม: ${newTotal} ชิ้น`);
    }

    if (diffAvailable !== 0) {
      diffParts.push(`พร้อมยืม: ${oldAsset.availableQuantity} ➔ ${newAvail} ชิ้น (${diffAvailable >= 0 ? '+' : ''}${diffAvailable} ชิ้น)`);
    } else {
      diffParts.push(`พร้อมยืม: ${newAvail} ชิ้น`);
    }

    if (oldAsset.propertyId !== newAsset.propertyId) {
      diffParts.push(`สาขา: "${oldAsset.property?.name || 'ไม่ระบุ'}" ➔ "${newAsset.property?.name || 'ไม่ระบุ'}"`);
    }

    let detailMsg = `ปรับปรุงสต็อกอุปกรณ์ "${newAsset.name}" โดยคุณ ${session?.username || 'Admin'}: ` + diffParts.join(', ');
    if (data.notes && data.notes.trim()) {
      detailMsg += ` (หมายเหตุ: ${data.notes.trim()})`;
    }

    await createAuditLog(tx, 'STOCK_ADJUSTMENT', 'ASSET', id, {
      oldValue: oldAsset,
      newValue: newAsset,
      details: detailMsg,
      userId: session?.id ? String(session.id) : null,
    });

    return newAsset;
  });

  revalidatePath('/quantity-assets');
  revalidatePath('/borrows');
  revalidatePath('/assets');
  revalidatePath('/');
  return { success: true, data: result };
}

/**
 * Fetch stock adjustment logs for an asset
 */
export async function getQuantityStockLogs(assetId: string) {
  try {
    const logs = await prisma.auditLog.findMany({
      where: {
        entityId: assetId,
        entity: 'ASSET',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Fetch user details for each log
    const userIds = [...new Set(logs.map((l) => l.userId).filter(Boolean))] as string[];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u.username]));

    const formattedLogs = logs.map((log) => ({
      ...log,
      username: log.userId ? userMap.get(log.userId) || 'System Admin' : 'System Admin',
    }));

    return { success: true, data: formattedLogs };
  } catch (error: any) {
    return { success: false, error: error.message || 'เกิดข้อผิดพลาดในการดึงประวัติสต็อก' };
  }
}

/**
 * Fetch all stock adjustment logs across all assets for the central history section
 */
export async function getAllStockAdjustmentLogs() {
  try {
    const logs = await prisma.auditLog.findMany({
      where: {
        entity: 'ASSET',
        OR: [
          { action: 'STOCK_ADJUSTMENT' },
          { action: 'UPDATED' },
          { action: 'CREATED' },
        ],
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
    });

    // Fetch asset details
    const assetIds = [...new Set(logs.map((l) => l.entityId))];
    const assets = await prisma.asset.findMany({
      where: { id: { in: assetIds } },
      select: {
        id: true,
        assetId: true,
        name: true,
        isQuantityBased: true,
        property: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
    const assetMap = new Map(assets.map((a) => [a.id, a]));

    // Fetch user details
    const userIds = [...new Set(logs.map((l) => l.userId).filter(Boolean))] as string[];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, role: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    // Filter and format quantity stock logs
    const formattedLogs = logs
      .map((log) => {
        const asset = assetMap.get(log.entityId);
        const user = log.userId ? userMap.get(log.userId) : null;

        return {
          ...log,
          assetName: asset?.name || 'ไม่ทราบชื่ออุปกรณ์',
          assetCode: asset?.assetId || '-',
          propertyName: asset?.property?.name || 'ไม่ระบุสาขา',
          propertyId: asset?.property?.id || null,
          username: user?.username || 'System Admin',
          userRole: user?.role || 'ADMIN',
        };
      });

    return { success: true, data: formattedLogs };
  } catch (error: any) {
    return { success: false, error: error.message || 'เกิดข้อผิดพลาดในการดึงประวัติสต็อกรวม' };
  }
}

// ----------------------------------------------------
// RENEWAL CONTRACTS MANAGEMENT SERVER ACTIONS
// ----------------------------------------------------

async function requireAdminSession() {
  const session = await getSession();
  if (session?.role !== 'ADMIN') throw new Error('Unauthorized: Only ADMIN role is allowed');
  return session as unknown as { id?: string; username?: string; role?: string };
}


export async function computeRenewalStatus(endDate: Date, alertAdvanceDays: number = 30): Promise<'EXPIRED' | 'EXPIRING_SOON' | 'ACTIVE'> {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  if (end < now) {
    return 'EXPIRED';
  }

  const alertThreshold = new Date(now.getTime() + (alertAdvanceDays || 30) * 24 * 60 * 60 * 1000);
  if (end <= alertThreshold) {
    return 'EXPIRING_SOON';
  }

  return 'ACTIVE';
}

export async function getRenewalContracts(search?: string, category?: string, statusFilter?: string) {
  await requireAdmin();

  const contracts = await prisma.renewalContract.findMany({
    include: {
      attachments: {
        orderBy: { createdAt: 'desc' },
      },
      histories: {
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { endDate: 'asc' },
  });

  const formattedContracts = await Promise.all(
    contracts.map(async (c) => {
      const computedStatus = await computeRenewalStatus(c.endDate, c.alertAdvanceDays);
      return {
        ...c,
        status: computedStatus,
      };
    })
  );

  return formattedContracts.filter((c) => {
    if (category && category !== 'ALL' && c.category !== category) return false;
    if (statusFilter && statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      const matchTitle = c.title.toLowerCase().includes(q);
      const matchNo = c.contractNo?.toLowerCase().includes(q) || false;
      const matchVendor = c.vendor?.toLowerCase().includes(q) || false;
      if (!matchTitle && !matchNo && !matchVendor) return false;
    }
    return true;
  });
}

export async function getRenewalContractById(id: string) {
  await requireAdmin();

  const contract = await prisma.renewalContract.findUnique({
    where: { id },
    include: {
      attachments: {
        orderBy: { createdAt: 'desc' },
      },
      histories: {
        orderBy: { createdAt: 'desc' },
        include: {
          attachments: true,
        },
      },
    },
  });

  if (!contract) return null;

  const status = await computeRenewalStatus(contract.endDate, contract.alertAdvanceDays);
  return {
    ...contract,
    status,
  };
}


export async function createRenewalContract(
  data: {
    contractNo?: string;
    title: string;
    category?: string;
    vendor?: string;
    costCents?: number;
    startDate?: Date | string | null;
    endDate: Date | string;
    alertAdvanceDays?: number;
    notes?: string;
  },
  attachmentsData?: Array<{
    fileName: string;
    storedFileName: string;
    filePath: string;
    fileType?: string;
    fileSize?: number;
    attachmentCategory?: string;
  }>
) {
  const session = await requireAdminSession();

  const startDate = data.startDate ? new Date(data.startDate) : null;
  const endDate = new Date(data.endDate);
  const alertAdvanceDays = data.alertAdvanceDays ? Number(data.alertAdvanceDays) : 30;

  const contract = await prisma.renewalContract.create({
    data: {
      contractNo: data.contractNo || null,
      title: data.title,
      category: data.category || 'Service',
      vendor: data.vendor || null,
      costCents: data.costCents ?? null,
      startDate,
      endDate,
      alertAdvanceDays,
      notes: data.notes || null,
      createdBy: session?.username || 'ADMIN',
      attachments: attachmentsData && attachmentsData.length > 0
        ? {
            create: attachmentsData.map((att) => ({
              fileName: att.fileName,
              storedFileName: att.storedFileName,
              filePath: att.filePath,
              fileType: att.fileType || null,
              fileSize: att.fileSize || null,
              attachmentCategory: att.attachmentCategory || 'General',
            })),
          }
        : undefined,
    },
    include: {
      attachments: true,
    },
  });

  revalidatePath('/renewals');
  revalidatePath('/');
  return { success: true, contract };
}

export async function updateRenewalContract(
  id: string,
  data: {
    contractNo?: string;
    title?: string;
    category?: string;
    vendor?: string;
    costCents?: number;
    startDate?: Date | string | null;
    endDate?: Date | string;
    alertAdvanceDays?: number;
    notes?: string;
  }
) {
  await requireAdmin();

  const updateData: any = {};
  if (data.contractNo !== undefined) updateData.contractNo = data.contractNo || null;
  if (data.title !== undefined) updateData.title = data.title;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.vendor !== undefined) updateData.vendor = data.vendor || null;
  if (data.costCents !== undefined) updateData.costCents = data.costCents;
  if (data.startDate !== undefined) updateData.startDate = data.startDate ? new Date(data.startDate) : null;
  if (data.endDate !== undefined) updateData.endDate = new Date(data.endDate);
  if (data.alertAdvanceDays !== undefined) updateData.alertAdvanceDays = Number(data.alertAdvanceDays);
  if (data.notes !== undefined) updateData.notes = data.notes || null;

  const contract = await prisma.renewalContract.update({
    where: { id },
    data: updateData,
  });

  revalidatePath('/renewals');
  revalidatePath('/');
  return { success: true, contract };
}

export async function deleteRenewalContract(id: string) {
  await requireAdmin();

  const attachments = await prisma.renewalAttachment.findMany({
    where: { contractId: id },
  });

  const fsPromises = (await import('fs')).promises;
  const path = await import('path');

  for (const att of attachments) {
    try {
      const diskPath = path.join(process.cwd(), 'storage', 'renewals', att.storedFileName);
      await fsPromises.unlink(diskPath);
    } catch (e) {
      // Ignore if file doesn't exist
    }
  }

  await prisma.renewalContract.delete({
    where: { id },
  });

  revalidatePath('/renewals');
  revalidatePath('/');
  return { success: true };
}

export async function renewContractAction(
  contractId: string,
  data: {
    newStartDate?: Date | string | null;
    newEndDate: Date | string;
    costCents?: number;
    notes?: string;
  },
  newAttachmentsData?: Array<{
    fileName: string;
    storedFileName: string;
    filePath: string;
    fileType?: string;
    fileSize?: number;
    attachmentCategory?: string;
  }>
) {
  const session = await requireAdminSession();

  const existing = await prisma.renewalContract.findUnique({
    where: { id: contractId },
  });

  if (!existing) throw new Error('Contract not found');

  const newStart = data.newStartDate ? new Date(data.newStartDate) : null;
  const newEnd = new Date(data.newEndDate);

  // 1. Create history log record
  const history = await prisma.renewalHistory.create({
    data: {
      contractId,
      previousStartDate: existing.startDate,
      previousEndDate: existing.endDate,
      newStartDate: newStart,
      newEndDate: newEnd,
      costCents: data.costCents ?? existing.costCents,
      renewedBy: session?.username || 'ADMIN',
      notes: data.notes || null,
    },
  });

  // 2. Attachments for this renewal cycle
  if (newAttachmentsData && newAttachmentsData.length > 0) {
    await prisma.renewalAttachment.createMany({
      data: newAttachmentsData.map((att) => ({
        contractId,
        renewalHistoryId: history.id,
        fileName: att.fileName,
        storedFileName: att.storedFileName,
        filePath: att.filePath,
        fileType: att.fileType || null,
        fileSize: att.fileSize || null,
        attachmentCategory: att.attachmentCategory || 'Renewal Document',
      })),
    });
  }

  // 3. Update main contract dates and cost
  await prisma.renewalContract.update({
    where: { id: contractId },
    data: {
      startDate: newStart,
      endDate: newEnd,
      costCents: data.costCents ?? existing.costCents,
    },
  });

  revalidatePath('/renewals');
  revalidatePath('/');
  return { success: true };
}

export async function deleteRenewalAttachment(attachmentId: string) {
  await requireAdmin();

  const attachment = await prisma.renewalAttachment.findUnique({
    where: { id: attachmentId },
  });

  if (!attachment) return { success: false, error: 'Attachment not found' };

  const fsPromises = (await import('fs')).promises;
  const path = await import('path');

  try {
    const diskPath = path.join(process.cwd(), 'storage', 'renewals', attachment.storedFileName);
    await fsPromises.unlink(diskPath);
  } catch (e) {
    // Ignore error if file physically removed
  }

  await prisma.renewalAttachment.delete({
    where: { id: attachmentId },
  });

  revalidatePath('/renewals');
  return { success: true };
}

export async function getExpiringRenewalsCount() {
  await requireAdmin();

  const contracts = await prisma.renewalContract.findMany({
    select: {
      id: true,
      endDate: true,
      alertAdvanceDays: true,
    },
  });

  let expiredCount = 0;
  let expiringSoonCount = 0;

  for (const c of contracts) {
    const status = await computeRenewalStatus(c.endDate, c.alertAdvanceDays);
    if (status === 'EXPIRED') expiredCount++;
    if (status === 'EXPIRING_SOON') expiringSoonCount++;
  }

  return {
    totalAlerts: expiredCount + expiringSoonCount,
    expiredCount,
    expiringSoonCount,
  };
}




