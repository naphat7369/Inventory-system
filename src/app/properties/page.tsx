import prisma from '@/lib/prisma';
import { createProperty, deleteProperty } from '@/app/actions';
import { Building, Trash2 } from 'lucide-react';

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

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Add New Property</h2>
        <form action={async (formData) => {
          'use server';
          await createProperty({
            name: formData.get('name') as string,
            prefix: (formData.get('prefix') as string) || undefined
          });
        }} className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Property Name *</label>
            <input 
              type="text" 
              name="name" 
              required 
              placeholder="e.g. Headquarters, Branch 1"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="w-48">
            <label className="block text-sm font-medium text-gray-700 mb-1">Prefix (Optional)</label>
            <input 
              type="text" 
              name="prefix" 
              placeholder="e.g. HQ, B1"
              maxLength={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 uppercase"
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

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="p-4 font-semibold text-gray-600">Property Name</th>
              <th className="p-4 font-semibold text-gray-600">Prefix</th>
              <th className="p-4 font-semibold text-gray-600">Assets</th>
              <th className="p-4 font-semibold text-gray-600 w-24">Action</th>
            </tr>
          </thead>
          <tbody>
            {properties.map(property => (
              <tr key={property.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                <td className="p-4 font-medium">{property.name}</td>
                <td className="p-4 text-gray-500">{property.prefix || '-'}</td>
                <td className="p-4 text-gray-500">{property._count.assets} items</td>
                <td className="p-4">
                  <form action={async () => {
                    'use server';
                    await deleteProperty(property.id);
                  }}>
                    <button 
                      type="submit" 
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
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
                <td colSpan={4} className="p-8 text-center text-gray-500">No properties added yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
