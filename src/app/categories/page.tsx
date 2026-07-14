import prisma from '@/lib/prisma';
import { createCategory, deleteCategory } from '@/app/actions';
import { Tag, Trash2 } from 'lucide-react';

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({
    include: { _count: { select: { assets: true } } },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Tag className="text-blue-600" /> Categories
        </h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Add New Category</h2>
        <form action={createCategory} className="flex gap-4">
          <input
            type="text"
            name="name"
            placeholder="Category Name (e.g. IT Equipment)"
            required
            className="flex-[2] px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            name="prefix"
            placeholder="Prefix (e.g. IT)"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
            maxLength={5}
          />
          <button type="submit" className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700">
            Add
          </button>
        </form>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="p-4 font-semibold text-gray-600">Name</th>
              <th className="p-4 font-semibold text-gray-600">Prefix</th>
              <th className="p-4 font-semibold text-gray-600">Assets Count</th>
              <th className="p-4 font-semibold text-gray-600 w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map(cat => (
              <tr key={cat.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                <td className="p-4 font-medium">{cat.name}</td>
                <td className="p-4 text-gray-500">{cat.prefix || '-'}</td>
                <td className="p-4 text-gray-600">{cat._count.assets}</td>
                <td className="p-4">
                  <form action={deleteCategory.bind(null, cat.id)}>
                    <button type="submit" className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50">
                      <Trash2 size={18} />
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr>
                <td colSpan={3} className="p-8 text-center text-gray-500">No categories found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
