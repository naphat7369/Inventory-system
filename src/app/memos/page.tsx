import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import Link from 'next/link';
import { FileText, Plus, Search, Filter, Building } from 'lucide-react';
import { getSession } from '@/lib/auth';
import { Pagination } from '@/components/Pagination';
import { MemoRowActions } from './MemoRowActions';

function formatThaiDate(date: Date | string) {
  const d = new Date(date);
  const thaiMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  return `${d.getDate()} ${thaiMonths[d.getMonth()]} ${d.getFullYear() + 543}`;
}

export default async function MemosPage({ searchParams }: { searchParams: Promise<{ search?: string, status?: string, departmentId?: string, page?: string }> }) {
  const { search = '', status = '', departmentId = '', page = '1' } = await searchParams;
  const session = await getSession();

  const currentUser = session?.id ? await prisma.user.findUnique({
    where: { id: session.id as string }
  }) : null;

  const isAdmin = currentUser?.role === 'ADMIN';
  const userDeptId = currentUser?.departmentId;

  // Filter out soft-deleted memos
  const whereClause: Prisma.MemoWhereInput = {
    deletedAt: null
  };
  const andConditions: Prisma.MemoWhereInput[] = [];
  
  if (search) {
    andConditions.push({
      OR: [
        { documentNo: { contains: search } },
        { subject: { contains: search } },
        { recipient: { contains: search } },
        { sender: { contains: search } },
      ]
    });
  }
  
  if (status) {
    andConditions.push({ status });
  }

  // Role-based Department restriction
  if (!isAdmin) {
    if (!userDeptId) {
      andConditions.push({ departmentId: 'unauthorized-no-dept' }); // Force empty results
    } else {
      andConditions.push({ departmentId: userDeptId });
    }
  } else if (departmentId) {
    // Only admins can filter by other departments
    andConditions.push({ departmentId });
  }

  if (andConditions.length > 0) {
    whereClause.AND = andConditions;
  }

  const PAGE_SIZE = 20;
  const currentPage = parseInt(page, 10) || 1;
  const skip = (currentPage - 1) * PAGE_SIZE;

  const totalItems = await prisma.memo.count({ where: whereClause });
  const totalPages = Math.ceil(totalItems / PAGE_SIZE);

  const memos = await prisma.memo.findMany({
    where: whereClause,
    include: {
      department: true,
    },
    orderBy: { updatedAt: 'desc' },
    skip,
    take: PAGE_SIZE,
  });

  const departments = await prisma.department.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' }
  });

  return (
    <div className="p-4 md:p-8 max-w-[1700px] mx-auto w-full">
      <div className="flex flex-col md:flex-row md:justify-between items-start md:items-center mb-8 gap-4 w-full">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <FileText className="text-blue-600" /> Memos
        </h1>
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          {isAdmin && (
            <Link 
              href="/settings/departments" 
              className="flex items-center gap-2 bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-slate-600 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              <Building size={18} /> จัดการแผนก (Departments)
            </Link>
          )}
          {Boolean(session?.role) && (
            <Link 
              href="/memos/new" 
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} /> Create Memo
            </Link>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 mb-6 p-4">
        <form method="GET" className="flex flex-col md:flex-row gap-4 md:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            <input 
              type="text" 
              name="search"
              placeholder="Search by Document No, Subject, To, From..."
              defaultValue={search}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div className="relative w-full md:w-48">
            <Filter className="absolute left-3 top-2.5 text-gray-400" size={18} />
            <select 
              name="status" 
              defaultValue={status}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100"
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="FINAL">Final</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          {isAdmin && (
            <div className="relative w-full md:w-48">
              <Filter className="absolute left-3 top-2.5 text-gray-400" size={18} />
              <select 
                name="departmentId" 
                defaultValue={departmentId}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-gray-100"
              >
                <option value="">All Departments</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                ))}
              </select>
            </div>
          )}
          <button type="submit" className="w-full md:w-auto bg-gray-800 dark:bg-slate-800 text-white px-6 py-2 rounded-lg hover:bg-gray-900 dark:hover:bg-slate-700 transition-colors font-medium">
            Filter
          </button>
          {(search || status || departmentId) && (
            <Link href="/memos" className="w-full md:w-auto text-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-300 font-medium px-2 py-2">
              Clear
            </Link>
          )}
        </form>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden mb-6">  
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-700">
              <tr>
                <th className="p-4 font-semibold text-gray-600 dark:text-gray-400">Doc No.</th>
                <th className="p-4 font-semibold text-gray-600 dark:text-gray-400">Date</th>
                <th className="p-4 font-semibold text-gray-600 dark:text-gray-400">Department</th>
                <th className="p-4 font-semibold text-gray-600 dark:text-gray-400">Subject</th>
                <th className="p-4 font-semibold text-gray-600 dark:text-gray-400">Status</th>
                <th className="p-4 font-semibold text-gray-600 dark:text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {memos.map(memo => {
                const canDelete = isAdmin || (Boolean(userDeptId) && userDeptId === memo.departmentId);
                return (
                  <tr key={memo.id} className="border-b border-gray-100 dark:border-slate-800 last:border-0 hover:bg-slate-50/80 dark:hover:bg-slate-800/60">
                    <td className="p-4 font-medium">{memo.documentNo || '-'}</td>
                    <td className="p-4 text-gray-600 dark:text-gray-400" suppressHydrationWarning>
                      {formatThaiDate(memo.documentDate)}
                    </td>
                    <td className="p-4 text-gray-600 dark:text-gray-400">{memo.department.name}</td>
                    <td className="p-4 font-medium">{memo.subject}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                        memo.status === 'FINAL' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                        memo.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                        'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {memo.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <MemoRowActions 
                        memoId={memo.id}
                        documentNo={memo.documentNo}
                        status={memo.status}
                        subject={memo.subject}
                        canDelete={canDelete}
                      />
                    </td>
                  </tr>
                );
              })}
              {memos.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500 dark:text-gray-400">No memos found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {totalPages > 1 && (
        <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden mb-6">  
          <Pagination 
            currentPage={currentPage} 
            totalPages={totalPages} 
            totalItems={totalItems} 
            pageSize={PAGE_SIZE} 
          />
        </div>
      )}
    </div>
  );
}
