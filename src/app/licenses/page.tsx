import prisma from '@/lib/prisma';
import Link from 'next/link';
import { Key, Plus, Eye, Pencil, Search } from 'lucide-react';
import { getSession } from '@/lib/auth';

export default async function LicensesPage({ searchParams }: { searchParams: Promise<{ search?: string }> }) {
  const { search = '' } = await searchParams;
  const session = await getSession();

  const licenses = await prisma.license.findMany({
    where: {
      name: { contains: search }
    },
    include: {
      property: true,
      _count: {
        select: { assignments: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Key className="text-blue-600" /> Licenses
        </h1>
        
        <div className="flex w-full md:w-auto gap-4">
          <form className="relative flex-1 md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text"
              name="search"
              defaultValue={search}
              placeholder="Search licenses..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </form>
          {session?.role === 'ADMIN' && (
            <Link 
              href="/licenses/new" 
              className="flex items-center justify-center whitespace-nowrap gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} /> New License
            </Link>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="p-4 font-semibold text-gray-600">Name / Account</th>
              <th className="p-4 font-semibold text-gray-600">Slots Used</th>
              <th className="p-4 font-semibold text-gray-600 hidden md:table-cell">Property</th>
              <th className="p-4 font-semibold text-gray-600 hidden lg:table-cell">Expires</th>
              <th className="p-4 font-semibold text-gray-600">Status</th>
              <th className="p-4 font-semibold text-gray-600 text-center w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {licenses.map(license => {
              const usedRatio = license._count.assignments / license.totalSlots;
              const isFull = license._count.assignments >= license.totalSlots;
              const isExpired = license.expirationDate && new Date(license.expirationDate) < new Date();
              
              return (
                <tr key={license.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="p-4">
                    <div className="font-semibold text-gray-900">{license.name}</div>
                    {license.accountEmail && <div className="text-sm text-gray-500">{license.accountEmail}</div>}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden w-24">
                        <div 
                          className={`h-full ${isFull ? 'bg-red-500' : 'bg-green-500'}`} 
                          style={{ width: `${Math.min(usedRatio * 100, 100)}%` }}
                        />
                      </div>
                      <span className={`text-sm font-medium ${isFull ? 'text-red-600' : 'text-gray-600'}`}>
                        {license._count.assignments} / {license.totalSlots}
                      </span>
                    </div>
                  </td>
                  <td className="p-4 hidden md:table-cell text-gray-600">
                    {license.property?.name || '-'}
                  </td>
                  <td className="p-4 hidden lg:table-cell text-gray-600">
                    {license.expirationDate ? new Date(license.expirationDate).toLocaleDateString() : '-'}
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-md text-xs font-semibold ${
                      isExpired || license.status === 'Expired' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {isExpired ? 'Expired' : license.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex justify-center gap-2">
                      <Link 
                        href={`/licenses/${license.id}`} 
                        className="flex items-center justify-center p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                        title="Manage License"
                      >
                        {session?.role === 'ADMIN' ? <Pencil size={18} /> : <Eye size={18} />}
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
            
            {licenses.length === 0 && (
              <tr>
                <td colSpan={6} className="p-12 text-center text-gray-500">
                  <Key size={48} className="mx-auto text-gray-300 mb-4" />
                  <p className="text-lg font-medium">No licenses found</p>
                  <p>Add a new software license to start managing slots.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
