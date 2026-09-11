import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import ExcelJS from 'exceljs';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { id: licenseId } = await context.params;
  const searchParams = request.nextUrl.searchParams;
  const filter = searchParams.get('filter') || 'all'; // 'active', 'history', 'all'

  const license = await prisma.license.findUnique({
    where: { id: licenseId },
    include: {
      property: true,
      assignments: {
        include: {
          asset: {
            select: { assetId: true }
          }
        },
        orderBy: { createdAt: 'asc' }
      }
    }
  });

  if (!license) {
    return new NextResponse('License not found', { status: 404 });
  }

  // Filter assignments
  let assignments = license.assignments;
  if (filter === 'active') {
    assignments = assignments.filter((a) => a.isActive);
  } else if (filter === 'history') {
    assignments = assignments.filter((a) => !a.isActive);
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Inventory Management System';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Assignments');

  // Define columns
  worksheet.columns = [
    { header: 'Slot #', key: 'slot', width: 8 },
    { header: 'License', key: 'license', width: 28 },
    { header: 'Product Key', key: 'productKey', width: 25 },
    { header: 'User Name', key: 'userName', width: 24 },
    { header: 'Email', key: 'email', width: 26 },
    { header: 'Department', key: 'department', width: 20 },
    { header: 'Phone', key: 'phone', width: 18 },
    { header: 'Asset ID', key: 'assetId', width: 16 },
    { header: 'Device Name', key: 'deviceName', width: 22 },
    { header: 'Assigned Date', key: 'assignedDate', width: 18 },
    { header: 'Unassigned Date', key: 'unassignedDate', width: 18 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Notes', key: 'notes', width: 30 },
  ];

  // Style header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' } // Slate-800
  };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 28;

  // Add data rows
  assignments.forEach((assignment, index) => {
    const row = worksheet.addRow({
      slot: index + 1,
      license: license.name,
      productKey: license.productKey || '-',
      userName: assignment.assignedTo,
      email: assignment.assignedEmail || '-',
      department: assignment.department || '-',
      phone: assignment.phone || '-',
      assetId: assignment.asset?.assetId || (assignment.assetId ? assignment.assetId : '-'),
      deviceName: assignment.deviceName || '-',
      assignedDate: assignment.assignedDate
        ? new Date(assignment.assignedDate).toLocaleDateString('th-TH')
        : '-',
      unassignedDate: assignment.unassignedDate
        ? new Date(assignment.unassignedDate).toLocaleDateString('th-TH')
        : '-',
      status: assignment.isActive ? 'Active' : 'Archived (History)',
      notes: assignment.notes || '-',
    });

    row.height = 22;
    row.alignment = { vertical: 'middle', horizontal: 'left' };
    row.getCell('slot').alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell('status').alignment = { vertical: 'middle', horizontal: 'center' };

    // Zebra striping
    if (index % 2 === 1) {
      row.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF8FAFC' } // Slate-50
      };
    }
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const dateStr = new Date().toISOString().split('T')[0];
  const safeLicenseName = license.name.replace(/[^a-zA-Z0-9_-]/g, '_');

  return new NextResponse(buffer as any, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="license-${safeLicenseName}-assignments-${dateStr}.xlsx"`,
      'Cache-Control': 'no-store',
    },
  });
}
