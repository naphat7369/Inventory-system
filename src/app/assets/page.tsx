import prisma from '@/lib/prisma';
import Link from 'next/link';
import { Package, Plus, Eye, Pencil, Search, Filter } from 'lucide-react';
import { getSession } from '@/lib/auth';

export default async function AssetsPage({ searchParams }: { searchParams: Promise<{ search?: string, status?: string }> }) {
  const { search = '', status = '' } = await searchParams;
  const session = await getSession();

  const whereClause: any = {};
  
  if (search) {
    whereClause.OR = [
      { name: { contains: search } },
      { assetId: { contains: search } },
      { owner: { contains: search } },
    ];
  }
  
  if (status) {
    whereClause.status = status;
  }

  const assets = await prisma.asset.findMany({
    where: whereClause,
    include: {
      category: true,
      property: true,
    },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Package className="text-blue-600" /> Assets
        </h1>
        <div className="flex gap-4">
          <Link 
            href={`/assets/print?search=${search}&status=${status}`} 
            target="_blank"
            className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-900 transition-colors"
          >
            <Package size={20} /> Print Labels
          </Link>
          {session?.role === 'ADMIN' && (
            <Link 
              href="/assets/new" 
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} /> New Asset
            </Link>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6 p-4">
        <form method="GET" className="flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            <input 
              type="text" 
              name="search" 
              defaultValue={search}
              placeholder="Search by ID, Name, or Owner..." 
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="relative w-48">
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
          <button type="submit" className="bg-gray-800 text-white px-6 py-2 rounded-lg hover:bg-gray-900 transition-colors font-medium">
            Filter
          </button>
          {(search || status) && (
            <Link href="/assets" className="text-gray-500 hover:text-gray-700 font-medium px-2">
              Clear
            </Link>
          )}
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="p-4 font-semibold text-gray-600">Asset ID</th>
                <th className="p-4 font-semibold text-gray-600">Owner</th>
                <th className="p-4 font-semibold text-gray-600">Dept</th>
                <th className="p-4 font-semibold text-gray-600">Property</th>
                <th className="p-4 font-semibold text-gray-600">Category</th>
                <th className="p-4 font-semibold text-gray-600">Location</th>
                <th className="p-4 font-semibold text-gray-600">Status</th>
                <th className="p-4 font-semibold text-gray-600">Action</th>
              </tr>
            </thead>
            <tbody>
              {assets.map(asset => (
                <tr key={asset.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                  <td className="p-4 font-medium text-blue-600">
                    <Link href={`/assets/${asset.id}`}>{asset.assetId}</Link>
                  </td>
                  <td className="p-4">{asset.owner || '-'}</td>
                  <td className="p-4 text-gray-600">{asset.department || '-'}</td>
                  <td className="p-4 text-gray-600">{asset.property?.name || '-'}</td>
                  <td className="p-4 text-gray-600">{asset.category.name}</td>
                  <td className="p-4 text-gray-600">{asset.location || '-'}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      asset.status === 'Available' ? 'bg-green-100 text-green-700' :
                      asset.status === 'In-use' ? 'bg-blue-100 text-blue-700' :
                      asset.status === 'Repairing' ? 'bg-orange-100 text-orange-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {asset.status}
                    </span>
                  </td>
                  <td className="p-4 flex gap-2">
                    <Link 
                      href={`/assets/${asset.id}`} 
                      className="flex items-center justify-center p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 hover:text-blue-700 transition-colors"
                      title="View Details"
                    >
                      <Eye size={18} />
                    </Link>
                    {session?.role === 'ADMIN' && (
                      <Link 
                        href={`/assets/${asset.id}/edit`} 
                        className="flex items-center justify-center p-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 hover:text-green-700 transition-colors"
                        title="Edit Asset"
                      >
                        <Pencil size={18} />
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
              {assets.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-500">No assets found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
