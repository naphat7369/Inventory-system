import prisma from '@/lib/prisma';
import { createProperty, deleteProperty, updateProperty } from '@/app/actions';
import { Building, Save, Trash2 } from 'lucide-react';

export default async function PropertiesPage() {
  const properties = await prisma.property.findMany({
    include: {
      _count: {
        select: { assets: true }
      }
    }
  });

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
        <Building className="text-blue-600" /> Properties Management
      </h1>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Add New Property</h2>
        <form action={createProperty} className="flex gap-4 items-end">

          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Property Name *</label>
            <input 
              type="text" 
              name="name" 
              required 
              placeholder="e.g. Headquarters, Branch 1"
              className="w-full px-4 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="w-48">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prefix (Optional)</label>
            <input 
              type="text" 
              name="prefix" 
              placeholder="e.g. HQ, B1"
              maxLength={12}
              className="w-full px-4 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 uppercase"
            />
          </div>
          <button 
            type="submit" 
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors h-[42px]"
          >
            Add
          </button>
        </form>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-700">
            <tr>
              <th className="p-4 font-semibold text-gray-600 dark:text-gray-400">Property Name</th>
              <th className="p-4 font-semibold text-gray-600 dark:text-gray-400">Prefix</th>
              <th className="p-4 font-semibold text-gray-600 dark:text-gray-400">Assets</th>
              <th className="p-4 font-semibold text-gray-600 dark:text-gray-400 w-24">Action</th>
            </tr>
          </thead>
          <tbody>
            {properties.map(property => (
              <tr key={property.id} className="border-b border-gray-100 dark:border-slate-800 last:border-0 hover:bg-slate-50/80 dark:hover:bg-slate-800/60">
                <td className="p-4 font-medium">
                  <form id={`property-${property.id}`} action={updateProperty}>
                    <input type="hidden" name="id" value={property.id} />
                    <input name="name" required defaultValue={property.name} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium dark:border-slate-600 dark:bg-slate-800" />
                  </form>
                </td>
                <td className="p-4 text-gray-500 dark:text-gray-400">
                  <input form={`property-${property.id}`} name="prefix" defaultValue={property.prefix || ''} maxLength={12} placeholder="Prefix" className="w-32 rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-sm uppercase dark:border-slate-600 dark:bg-slate-800" />
                </td>
                <td className="p-4 text-gray-500 dark:text-gray-400">{property._count.assets} items</td>
                <td className="p-4 flex items-center gap-1">
                  <button form={`property-${property.id}`} type="submit" className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors" title="Save changes">
                    <Save size={18} />
                  </button>
                  <form action={async () => {
                    'use server';
                    await deleteProperty(property.id);
                  }}>
                    <button 
                      type="submit" 
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                      disabled={property._count.assets > 0}
                      title={property._count.assets > 0 ? "Cannot delete property with assets" : "Delete Property"}
                    >
                      <Trash2 size={18} />
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {properties.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-500 dark:text-gray-400">No properties added yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
