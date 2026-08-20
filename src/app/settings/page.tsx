import prisma from '@/lib/prisma';
import { createCustomField, deleteCustomField } from '@/app/actions';
import { Settings, Trash2 } from 'lucide-react';

export default async function SettingsPage() {
  const categories = await prisma.category.findMany();
  const customFields = await prisma.customField.findMany({
    include: { category: true },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto w-full">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Settings className="text-gray-600" /> Settings (Custom Fields)
        </h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Add Custom Field (Dynamic Column)</h2>
        <form action={createCustomField} className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-4 w-full">
            <input
              type="text"
              name="name"
              placeholder="Field Name (e.g. MAC Address)"
              required
              className="flex-1 w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
            />
            <select
              name="type"
              required
              className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              <option value="text">Text</option>
              <option value="number">Number</option>
              <option value="date">Date</option>
            </select>
            <select
              name="categoryId"
              required
              className="w-full md:w-auto px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              <option value="">Select Category</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="w-full md:w-auto md:self-end px-6 py-2 bg-gray-800 text-white font-medium rounded-lg hover:bg-gray-900">
            Add Field
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden w-full">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left whitespace-nowrap">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="p-4 font-semibold text-gray-600">Field Name</th>
              <th className="p-4 font-semibold text-gray-600">Type</th>
              <th className="p-4 font-semibold text-gray-600">Applies To</th>
              <th className="p-4 font-semibold text-gray-600 w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {customFields.map(field => (
              <tr key={field.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                <td className="p-4 font-medium">{field.name}</td>
                <td className="p-4 text-gray-600 capitalize">{field.type}</td>
                <td className="p-4 text-gray-600">{field.category.name}</td>
                <td className="p-4">
                  <form action={deleteCustomField.bind(null, field.id)}>
                    <button type="submit" className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50">
                      <Trash2 size={18} />
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {customFields.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-500">No custom fields found.</td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
