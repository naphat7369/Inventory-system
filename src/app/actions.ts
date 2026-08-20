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

  await prisma.asset.create({
    data: {
      ...data,
      assetId
    }
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
  await prisma.asset.update({
    where: { id },
    data,
  });
  revalidatePath('/assets');
  revalidatePath(`/assets/${id}`);
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
  await prisma.asset.update({
    where: { id },
    data: { status }
  });
  revalidatePath('/assets');
  revalidatePath(`/assets/${id}`);
}

export async function deleteAsset(id: string) {
  await requireAdmin();
  await prisma.asset.update({ 
    where: { id },
    data: { isDeleted: true }
  });
  revalidatePath('/assets');
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
  await prisma.asset.delete({ where: { id } });
  revalidatePath('/assets');
}

export async function hardDeleteAssets(ids: string[]) {
  await requireAdmin();
  await prisma.asset.deleteMany({ where: { id: { in: ids } } });
  revalidatePath('/assets');
}

// === User Authentication & Management Actions ===

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
    role: user.role
  });

  redirect('/assets');
}

export async function logout() {
  await deleteSession();
  redirect('/login');
}

export async function getUsers() {
  const session = await getSession();
  if (session?.role !== 'ADMIN') throw new Error('Unauthorized');

  return prisma.user.findMany({
    select: { id: true, username: true, role: true, createdAt: true },
    orderBy: { createdAt: 'desc' }
  });
}

export async function createUser(formData: FormData) {
  const session = await getSession();
  if (session?.role !== 'ADMIN') throw new Error('Unauthorized');

  const username = formData.get('username') as string;
  const password = formData.get('password') as string;
  const role = formData.get('role') as string;

  if (!username || !password) {
    return { error: 'Username and password are required' };
  }

  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) {
    return { error: 'Username already exists' };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      username,
      passwordHash,
      role
    }
  });

  revalidatePath('/users');
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

  await prisma.license.create({
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

  revalidatePath('/licenses');
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

export async function assignLicenseSlot(formData: FormData) {
  await requireAdmin();
  const licenseId = formData.get('licenseId') as string;
  const assignedTo = formData.get('assignedTo') as string;
  const assignedEmail = formData.get('assignedEmail') as string;

  if (!licenseId || !assignedTo) return { error: 'Required fields missing' };

  const license = await prisma.license.findUnique({
    where: { id: licenseId },
    include: { assignments: true }
  });

  if (!license) throw new Error('License not found');
  if (license.assignments.length >= license.totalSlots) throw new Error('No available slots');

  await prisma.licenseAssignment.create({
    data: {
      licenseId,
      assignedTo,
      assignedEmail: assignedEmail || null
    }
  });

  revalidatePath(`/licenses/${licenseId}`);
  revalidatePath('/licenses');
}

export async function removeLicenseSlot(assignmentId: string) {
  await requireAdmin();
  const assignment = await prisma.licenseAssignment.delete({
    where: { id: assignmentId }
  });
  
  revalidatePath(`/licenses/${assignment.licenseId}`);
  revalidatePath('/licenses');
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
      const status = row['Usage Status'] || row['Status'] || 'Available';
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
