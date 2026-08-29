import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { Package, Pencil, Unlink } from 'lucide-react';
import PrintableLabel from './PrintableLabel';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { unlinkAsset, deleteAsset } from '@/app/actions';
import { RepairActionModal } from './RepairActionModal';

export default async function AssetDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const asset = await prisma.asset.findUnique({
    where: { id },
    include: {
      category: {
        include: {
          customFields: true
        }
      },
      property: true,
      parent: {
        include: {
          category: true,
          property: true
        }
      },
      children: {
        include: {
          category: true,
          property: true
        }
      },
      repairLogs: {
        orderBy: { sentDate: 'desc' }
      }
    }
  });

  const session = await getSession();

  if (!asset) notFound();

  let customData = {};
  try {
    customData = asset.customData ? JSON.parse(asset.customData) : {};
  } catch (e) {}

  const hasActiveRepair = asset.repairLogs.some(log => log.status === 'IN_PROGRESS' || log.status === 'WAITING_FOR_PARTS');

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <Link href="/assets" className="flex items-center text-gray-500 hover:text-gray-900 mb-6 font-medium">
        <ChevronLeft size={20} /> Back to Assets
      </Link>
      
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Package className="text-blue-600" /> {asset.name}
          </h1>
          <p className="text-gray-500">ID: {asset.assetId} &bull; Category: {asset.category.name}</p>
        </div>
        {session?.role === 'ADMIN' && (
          <div className="flex gap-4">
            <RepairActionModal assetId={asset.id} status={asset.status} existingActiveRepair={hasActiveRepair} />
            <Link 
              href={`/assets/${asset.id}/edit`} 
              className="flex items-center gap-2 bg-[#1C1C1A] text-white px-4 py-2 rounded-sm font-medium hover:bg-gray-800 transition-colors"
            >
              <Pencil size={20} /> Edit Asset
            </Link>
            <form action={deleteAsset.bind(null, asset.id)}>
              <button 
                type="submit" 
                className="flex items-center gap-2 bg-white text-red-600 px-4 py-2 rounded-sm font-medium hover:bg-red-50 transition-colors border border-red-200"
              >
                Delete Asset
              </button>
            </form>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-sm shadow-sm border border-[#D4D6CF] overflow-hidden">
            <div className="bg-[#F8F9F5] p-4 border-b border-[#D4D6CF]">
              <h3 className="font-bold text-[#1C1C1A]">General Information</h3>
            </div>
            <div className="p-6 grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-500 mb-1">Property</p>
                <p className="font-medium text-[#1C1C1A]">{asset.property?.name || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Department</p>
                <p className="font-medium text-[#1C1C1A]">{asset.department || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Owner Inventory</p>
                <p className="font-medium text-[#1C1C1A]">{asset.owner || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Location</p>
                <p className="font-medium text-[#1C1C1A]">{asset.location || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">IP Address</p>
                <p className="font-medium text-[#1C1C1A]">{asset.ipAddress || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">OS</p>
                <p className="font-medium text-[#1C1C1A]">{asset.os || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Added On</p>
                <p className="font-medium text-[#1C1C1A] font-[family-name:var(--font-jetbrains)]">{new Date(asset.createdAt).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Status</p>
                <p className="font-medium text-[#1C1C1A]">{asset.status}</p>
              </div>
            </div>
          </div>

          {asset.category.customFields.length > 0 && (
            <div className="bg-white rounded-sm shadow-sm border border-[#D4D6CF] overflow-hidden">
              <div className="bg-[#F8F9F5] p-4 border-b border-[#D4D6CF]">
                <h3 className="font-bold text-[#1C1C1A]">Custom Fields</h3>
              </div>
              <div className="p-6 grid grid-cols-2 gap-6">
                {asset.category.customFields.map((field) => (
                  <div key={field.id}>
                    <p className="text-sm text-gray-500 mb-1">{field.name}</p>
                    <p className="font-medium text-[#1C1C1A]">{(customData as any)[field.id] || '-'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {asset.repairLogs.length > 0 && (
            <div className="bg-white rounded-sm shadow-sm border border-[#D4D6CF] overflow-hidden mt-8">
              <div className="bg-[#F8F9F5] p-4 border-b border-[#D4D6CF]">
                <h3 className="font-bold text-[#1C1C1A]">Repair History</h3>
              </div>
              <div className="p-0 overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-[#F8F9F5] border-b border-[#D4D6CF]">
                    <tr>
                      <th className="p-4 font-semibold text-[#1C1C1A] text-sm whitespace-nowrap">Status</th>
                      <th className="p-4 font-semibold text-[#1C1C1A] text-sm whitespace-nowrap">Reason</th>
                      <th className="p-4 font-semibold text-[#1C1C1A] text-sm whitespace-nowrap">Sent Date</th>
                      <th className="p-4 font-semibold text-[#1C1C1A] text-sm whitespace-nowrap">Completed Date</th>
                      <th className="p-4 font-semibold text-[#1C1C1A] text-sm whitespace-nowrap">Cost</th>
                      <th className="p-4 font-semibold text-[#1C1C1A] text-sm min-w-[200px]">Resolution</th>
                    </tr>
                  </thead>
                  <tbody>
                    {asset.repairLogs.map(log => (
                      <tr key={log.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                        <td className="p-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-sm text-xs font-bold uppercase tracking-wider ${
                            log.status === 'COMPLETED' ? 'bg-[#4C6246]/10 text-[#4C6246]' :
                            log.status === 'IN_PROGRESS' ? 'bg-[#E24A22]/10 text-[#E24A22]' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {log.status.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-[#1C1C1A]">{log.reason}</td>
                        <td className="p-4 text-sm text-gray-500 font-[family-name:var(--font-jetbrains)]">{new Date(log.sentDate).toLocaleDateString()}</td>
                        <td className="p-4 text-sm text-gray-500 font-[family-name:var(--font-jetbrains)]">{log.completionDate ? new Date(log.completionDate).toLocaleDateString() : '-'}</td>
                        <td className="p-4 text-sm font-[family-name:var(--font-jetbrains)]">
                          {log.costCents ? `$${(log.costCents / 100).toFixed(2)}` : '-'}
                        </td>
                        <td className="p-4 text-sm text-gray-500">{log.resolution || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {asset.parent && (
            <div className="bg-white rounded-sm shadow-sm border border-[#D4D6CF] overflow-hidden">
              <div className="bg-[#F8F9F5] p-4 border-b border-[#D4D6CF]">
                <h3 className="font-bold text-[#1C1C1A]">Connected To (Parent Asset)</h3>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between border border-[#D4D6CF] p-4 rounded-sm">
                  <div>
                    <Link href={`/assets/${asset.parent.id}`} className="font-semibold text-[#1C1C1A] hover:underline">
                      {asset.parent.assetId} - {asset.parent.name}
                    </Link>
                  </div>
                  {session?.role === 'ADMIN' && (
                    <form action={unlinkAsset.bind(null, asset.id)}>
                      <button type="submit" className="text-sm text-[#E24A22] font-medium hover:underline px-3 py-1 bg-white rounded-sm transition-colors border border-[#E24A22]">
                        Unlink
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          )}

          {asset.children.length > 0 && (
            <div className="bg-white rounded-sm shadow-sm border border-[#D4D6CF] overflow-hidden">
              <div className="bg-[#F8F9F5] p-4 border-b border-[#D4D6CF]">
                <h3 className="font-bold text-[#1C1C1A]">Linked Accessories</h3>
              </div>
              <div className="p-0">
                <table className="w-full text-left">
                  <thead className="bg-[#F8F9F5] border-b border-[#D4D6CF]">
                    <tr>
                      <th className="p-4 font-semibold text-[#1C1C1A] text-sm">Asset ID</th>
                      <th className="p-4 font-semibold text-[#1C1C1A] text-sm">Name</th>
                      <th className="p-4 font-semibold text-[#1C1C1A] text-sm w-24">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {asset.children.map(child => (
                      <tr key={child.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                        <td className="p-4 font-medium text-blue-600">
                          <Link href={`/assets/${child.id}`}>{child.assetId}</Link>
                        </td>
                        <td className="p-4 text-sm">{child.name}</td>
                        <td className="p-4">
                          {session?.role === 'ADMIN' && (
                            <form action={unlinkAsset.bind(null, child.id)}>
                              <button type="submit" className="flex items-center gap-1 text-sm text-[#E24A22] bg-white px-3 py-1 rounded-sm transition-colors border border-[#E24A22]">
                                <Unlink size={14} /> Unlink
                              </button>
                            </form>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="md:col-span-1 space-y-6">
          <PrintableLabel asset={asset} role={session?.role} />
        </div>
      </div>
    </div>
  );
}
