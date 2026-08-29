import prisma from '@/lib/prisma';
import Link from 'next/link';
import { Package, Plus, Search, Filter, Trash2 } from 'lucide-react';
import { getSession } from '@/lib/auth';
import { ImportExportButtons } from './ImportExportButtons';
import { AssetTable } from './AssetTable';
import { AssetSearchBar } from './AssetSearchBar';
import { Pagination } from '@/components/Pagination';

export default async function AssetsPage({ searchParams }: { searchParams: Promise<{ search?: string, status?: string, page?: string, completeness?: string, trash?: string }> }) {
  const { search = '', status = '', page = '1', completeness = '', trash = '' } = await searchParams;
  const session = await getSession();

  const whereClause: any = {};
  const andConditions: any[] = [];
  
  if (search) {
    andConditions.push({
      OR: [
        { name: { contains: search } },
        { assetId: { contains: search } },
        { owner: { contains: search } },
      ]
    });
  }
  
  if (status) {
    andConditions.push({ status });
  }

  if (completeness === 'incomplete') {
    andConditions.push({
      OR: [
        { name: 'Unknown Asset' },
        { category: { name: 'Uncategorized' } }
      ]
    });
  }

  if (trash === 'true') {
    andConditions.push({ isDeleted: true });
  } else {
    andConditions.push({ isDeleted: false, isQuantityBased: false });
  }

  if (andConditions.length > 0) {
    whereClause.AND = andConditions;
  }

  const PAGE_SIZE = 20;
  const currentPage = parseInt(page, 10) || 1;
  const skip = (currentPage - 1) * PAGE_SIZE;

  const totalItems = await prisma.asset.count({ where: whereClause });
  const totalPages = Math.ceil(totalItems / PAGE_SIZE);

  const assets = await prisma.asset.findMany({
    where: whereClause,
    include: {
      category: true,
      property: true,
    },
    orderBy: { createdAt: 'desc' },
    skip,
    take: PAGE_SIZE,
  });

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:justify-between items-start md:items-center mb-8 gap-4 w-full">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Package className="text-blue-600" /> Assets
        </h1>
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          {session?.role === 'ADMIN' && (
            <ImportExportButtons assets={assets} />
          )}
          <Link 
            href={`/assets/print?search=${search}&status=${status}`} 
            target="_blank"
            className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-900 transition-colors"
          >
            <Package size={20} /> Print Labels
          </Link>
          {session?.role === 'ADMIN' && (
            <>
              <Link 
                href={trash === 'true' ? '/assets' : '/assets?trash=true'} 
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors border ${trash === 'true' ? 'bg-gray-200 text-gray-800 hover:bg-gray-300 border-gray-300' : 'bg-red-50 text-red-600 hover:bg-red-100 border-red-200'}`}
              >
                <Trash2 size={20} /> {trash === 'true' ? 'Exit Trash' : 'View Trash'}
              </Link>
              <Link 
                href="/assets/new" 
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                <Plus size={20} /> New Asset
              </Link>
            </>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 p-4">
        <form method="GET" className="flex flex-col md:flex-row gap-4 md:items-center">
          <AssetSearchBar defaultValue={search} />
          <div className="relative w-full md:w-48">
            <Filter className="absolute left-3 top-2.5 text-gray-400" size={18} />
            <select 
              name="status" 
              defaultValue={status}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">All Statuses</option>
              <option value="Available">Available</option>
              <option value="In-use">In-use</option>
              <option value="Repairing">Repairing</option>
              <option value="Disposed">Disposed</option>
            </select>
          </div>
          <div className="relative w-full md:w-48">
            <Filter className="absolute left-3 top-2.5 text-gray-400" size={18} />
            <select 
              name="completeness" 
              defaultValue={completeness}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">All Data</option>
              <option value="incomplete">Incomplete Only</option>
            </select>
          </div>
          <button type="submit" className="w-full md:w-auto bg-gray-800 text-white px-6 py-2 rounded-lg hover:bg-gray-900 transition-colors font-medium">
            Filter
          </button>
          {(search || status || completeness) && (
            <Link href="/assets" className="w-full md:w-auto text-center text-gray-500 hover:text-gray-700 font-medium px-2 py-2">
              Clear
            </Link>
          )}
        </form>
      </div>

      <AssetTable assets={assets} role={session?.role} isTrash={trash === 'true'} />
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">  
        <Pagination 
          currentPage={currentPage} 
          totalPages={totalPages} 
          totalItems={totalItems} 
          pageSize={PAGE_SIZE} 
        />
      </div>
    </div>
  );
}
