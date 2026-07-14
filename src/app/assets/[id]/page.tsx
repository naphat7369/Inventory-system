import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { Package, Pencil, Unlink } from 'lucide-react';
import PrintableLabel from './PrintableLabel';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { unlinkAsset, deleteAsset } from '@/app/actions';

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
      }
    }
  });

  const session = await getSession();

  if (!asset) notFound();

  let customData = {};
  try {
    customData = asset.customData ? JSON.parse(asset.customData) : {};
  } catch (e) {}

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
            <Link 
              href={`/assets/${asset.id}/edit`} 
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              <Pencil size={20} /> Edit Asset
            </Link>
            <form action={deleteAsset.bind(null, asset.id)}>
              <button 
                type="submit" 
                className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-lg font-medium hover:bg-red-100 transition-colors border border-red-200"
              >
                Delete Asset
              </button>
            </form>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gray-50 p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-700">General Information</h3>
            </div>
            <div className="p-6 grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-gray-500 mb-1">Property</p>
                <p className="font-medium">{asset.property?.name || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Department</p>
                <p className="font-medium">{asset.department || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Owner Inventory</p>
                <p className="font-medium">{asset.owner || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Location</p>
                <p className="font-medium">{asset.location || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">IP Address</p>
                <p className="font-medium">{asset.ipAddress || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">OS</p>
                <p className="font-medium">{asset.os || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-1">Added On</p>
                <p className="font-medium">{new Date(asset.createdAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {asset.category.customFields.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 p-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-700">Custom Fields</h3>
              </div>
              <div className="p-6 grid grid-cols-2 gap-6">
                {asset.category.customFields.map((field) => (
                  <div key={field.id}>
                    <p className="text-sm text-gray-500 mb-1">{field.name}</p>
                    <p className="font-medium">{(customData as any)[field.id] || '-'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {asset.parent && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 p-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-700">Connected To (Parent Asset)</h3>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between border border-gray-200 p-4 rounded-lg">
                  <div>
                    <Link href={`/assets/${asset.parent.id}`} className="font-semibold text-blue-600 hover:underline">
                      {asset.parent.assetId} - {asset.parent.name}
                    </Link>
                  </div>
                  {session?.role === 'ADMIN' && (
                    <form action={unlinkAsset.bind(null, asset.id)}>
                      <button type="submit" className="text-sm text-red-500 font-medium hover:text-red-700 px-3 py-1 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                        Unlink
                      </button>
                    </form>
                  )}
                </div>
              </div>
            </div>
          )}

          {asset.children.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 p-4 border-b border-gray-200">
                <h3 className="font-semibold text-gray-700">Linked Accessories</h3>
              </div>
              <div className="p-0">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="p-4 font-semibold text-gray-600 text-sm">Asset ID</th>
                      <th className="p-4 font-semibold text-gray-600 text-sm">Name</th>
                      <th className="p-4 font-semibold text-gray-600 text-sm w-24">Action</th>
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
                              <button type="submit" className="flex items-center gap-1 text-sm text-red-600 bg-red-50 px-3 py-1 rounded-md hover:bg-red-100 transition-colors border border-red-200">
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
