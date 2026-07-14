import prisma from '@/lib/prisma';
import { createLicense } from '@/app/actions';
import { Key, ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';

export default async function NewLicensePage() {
  const properties = await prisma.property.findMany();

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <Link href="/licenses" className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors w-fit">
          <ArrowLeft size={20} /> Back to Licenses
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <h1 className="text-2xl font-bold flex items-center gap-3 mb-8">
          <Key className="text-blue-600" /> New Software License
        </h1>

        <form action={createLicense} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">License Name <span className="text-red-500">*</span></label>
              <input type="text" name="name" required placeholder="e.g. Microsoft 365 Family" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white" />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Account Email</label>
              <input type="email" name="accountEmail" placeholder="admin@example.com" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Slots / Devices <span className="text-red-500">*</span></label>
              <input type="number" name="totalSlots" min="1" defaultValue="1" required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date</label>
              <input type="date" name="purchaseDate" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expiration Date</label>
              <input type="date" name="expirationDate" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white" />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Product / License Key</label>
              <input type="text" name="productKey" placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white font-mono" />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Property (Branch / Company)</label>
              <select name="propertyId" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="">-- No Property --</option>
                {properties.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100 flex justify-end">
            <button type="submit" className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors">
              <Save size={20} /> Save License
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
