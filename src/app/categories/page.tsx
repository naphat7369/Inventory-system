import prisma from '@/lib/prisma';
import { createCategory, deleteCategory } from '@/app/actions';
import { Tag, Trash2 } from 'lucide-react';

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({
    include: { _count: { select: { assets: true } } },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto w-full">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Tag className="text-blue-600" /> Categories
        </h1>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4 md:p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Add New Category</h2>
        <form action={createCategory} className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            name="name"
            placeholder="Category Name (e.g. IT Equipment)"
            required
            className="flex-[2] w-full px-4 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            name="prefix"
            placeholder="Prefix (e.g. IT)"
            className="flex-1 w-full px-4 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
            maxLength={5}
          />
          <button type="submit" className="w-full md:w-auto px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors">
            Add
          </button>
        </form>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden w-full">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left whitespace-nowrap">
          <thead className="bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-700">
            <tr>
              <th className="p-4 font-semibold text-gray-600 dark:text-gray-400">Name</th>
              <th className="p-4 font-semibold text-gray-600 dark:text-gray-400">Prefix</th>
              <th className="p-4 font-semibold text-gray-600 dark:text-gray-400">Assets Count</th>
              <th className="p-4 font-semibold text-gray-600 dark:text-gray-400 w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map(cat => (
              <tr key={cat.id} className="border-b border-gray-100 dark:border-slate-800 last:border-0 hover:bg-slate-50/80 dark:hover:bg-slate-800/60">
                <td className="p-4 font-medium">{cat.name}</td>
                <td className="p-4 text-gray-500 dark:text-gray-400">{cat.prefix || '-'}</td>
                <td className="p-4 text-gray-600 dark:text-gray-400">{cat._count.assets}</td>
                <td className="p-4">
                  <form action={deleteCategory.bind(null, cat.id)}>
                    <button type="submit" className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {categories.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-500 dark:text-gray-400">No categories found.</td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
