import prisma from '@/lib/prisma';
import { createCustomField, deleteCustomField } from '@/app/actions';
import Link from 'next/link';
import { ArrowRight, Building2, Settings, Trash2, Workflow } from 'lucide-react';

export default async function SettingsPage() {
  const categories = await prisma.category.findMany();
  const customFields = await prisma.customField.findMany({
    include: { category: true },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Settings className="text-gray-600 dark:text-gray-400" /> Settings
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          จัดการโครงสร้างองค์กร ระบบอนุมัติ และข้อมูลกำหนดเองจากศูนย์กลาง
        </p>
      </div>

      <section className="mb-8 grid gap-4 md:grid-cols-2">
        <Link
          href="/settings/departments"
          className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-blue-500"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-300">
                <Building2 size={22} />
              </span>
              <div>
                <h2 className="font-bold text-slate-900 dark:text-slate-100">จัดการแผนก (Departments)</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  เพิ่ม แก้ไข และกำหนดข้อมูลแผนกที่ใช้ในระบบ
                </p>
              </div>
            </div>
            <ArrowRight className="mt-2 shrink-0 text-slate-400 transition group-hover:translate-x-1 group-hover:text-blue-600" size={19} />
          </div>
        </Link>

        <Link
          href="/settings/e-approve"
          className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-400 hover:shadow-md dark:border-slate-700 dark:bg-slate-900 dark:hover:border-indigo-500"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-300">
                <Workflow size={22} />
              </span>
              <div>
                <h2 className="font-bold text-slate-900 dark:text-slate-100">E‑Approve</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  ตั้งค่าสาขา HOD/GM ผู้อนุมัติ ประเภท Memo และลำดับการอนุมัติ
                </p>
              </div>
            </div>
            <ArrowRight className="mt-2 shrink-0 text-slate-400 transition group-hover:translate-x-1 group-hover:text-indigo-600" size={19} />
          </div>
        </Link>
      </section>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4 md:p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Custom Fields (Dynamic Columns)</h2>
        <form action={createCustomField} className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-4 w-full">
            <input
              type="text"
              name="name"
              placeholder="Field Name (e.g. MAC Address)"
              required
              className="flex-1 w-full px-4 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <select
              name="type"
              required
              className="w-full md:w-auto px-4 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="text">Text</option>
              <option value="number">Number</option>
              <option value="date">Date</option>
            </select>
            <select
              name="categoryId"
              required
              className="w-full md:w-auto px-4 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select Category</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="w-full md:w-auto md:self-end px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors">
            Add Field
          </button>
        </form>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden w-full">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left whitespace-nowrap">
          <thead className="bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-700">
            <tr>
              <th className="p-4 font-semibold text-gray-600 dark:text-gray-400">Field Name</th>
              <th className="p-4 font-semibold text-gray-600 dark:text-gray-400">Type</th>
              <th className="p-4 font-semibold text-gray-600 dark:text-gray-400">Applies To</th>
              <th className="p-4 font-semibold text-gray-600 dark:text-gray-400 w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {customFields.map(field => (
              <tr key={field.id} className="border-b border-gray-100 dark:border-slate-800 last:border-0 hover:bg-slate-50/80 dark:hover:bg-slate-800/60">
                <td className="p-4 font-medium">{field.name}</td>
                <td className="p-4 text-gray-600 dark:text-gray-400 capitalize">{field.type}</td>
                <td className="p-4 text-gray-600 dark:text-gray-400">{field.category.name}</td>
                <td className="p-4">
                  <form action={deleteCustomField.bind(null, field.id)}>
                    <button type="submit" className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {customFields.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-500 dark:text-gray-400">No custom fields found.</td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
