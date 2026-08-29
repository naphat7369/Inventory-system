'use me';
'use client';

import React, { useState } from 'react';
import { Users, Trash2, Shield, User, Edit3, Plus } from 'lucide-react';
import { createUser, deleteUser } from '@/app/actions';
import { EditUserModal } from './EditUserModal';
import { useRouter } from 'next/navigation';

interface UserItem {
  id: string;
  username: string;
  fullName?: string | null;
  department?: string | null;
  phone?: string | null;
  role: string;
  createdAt: Date | string;
}

interface UsersClientProps {
  users: UserItem[];
  currentUserId: string;
}

export function UsersClient({ users, currentUserId }: UsersClientProps) {
  const router = useRouter();
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);

  const handleRefresh = () => {
    router.refresh();
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-3">
            <Users className="text-indigo-600 dark:text-indigo-400 w-8 h-8" />
            <span>จัดการผู้ใช้งานระบบ & สิทธิ์การใช้งาน (Users & Permissions)</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            เพิ่มและแก้ไขข้อมูลผู้ใช้งาน ระบุชื่อ-นามสกุล แผนก/หน่วยงาน และเบอร์ติดต่อเพื่อซิงค์ข้อมูลการยืม-คืนอัตโนมัติ
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Add User Form */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center gap-2">
              <Plus className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span>เพิ่มผู้ใช้งานใหม่ (Add New User)</span>
            </h2>
            <form action={createUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Username <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="username"
                  required
                  placeholder="เช่น john_doe"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden dark:text-slate-100 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Password <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  name="password"
                  required
                  placeholder="อย่างน้อย 6 ตัวอักษร"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden dark:text-slate-100 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  ชื่อ - นามสกุล (Full Name)
                </label>
                <input
                  type="text"
                  name="fullName"
                  placeholder="เช่น นายสมชาย ใจดี"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden dark:text-slate-100 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  แผนก / หน่วยงานที่สังกัด (Department)
                </label>
                <input
                  type="text"
                  name="department"
                  placeholder="เช่น แผนก IT, การเงิน, การตลาด"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden dark:text-slate-100 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  เบอร์โทรศัพท์ / ช่องทางติดต่อ (Contact)
                </label>
                <input
                  type="text"
                  name="phone"
                  placeholder="เช่น 081-234-5678, เบอร์ภายใน 102"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden dark:text-slate-100 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  สิทธิ์การใช้งาน (Role)
                </label>
                <select
                  name="role"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden dark:text-slate-100 font-semibold"
                >
                  <option value="STAFF">STAFF (ยืมอุปกรณ์ & ดูสถานะตนเอง)</option>
                  <option value="ADMIN">ADMIN (อนุมัติ, จัดการสต็อก & สิทธิ์ทั้งหมด)</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-md shadow-indigo-600/20 transition"
              >
                บันทึกสร้างผู้ใช้ใหม่
              </button>
            </form>
          </div>
        </div>

        {/* Users Table */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="p-4">ผู้ใช้งาน (User & Profile)</th>
                    <th className="p-4">แผนก / หน่วยงาน</th>
                    <th className="p-4">สิทธิ์</th>
                    <th className="p-4 text-right">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                      <td className="p-4">
                        <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          {u.role === 'ADMIN' ? (
                            <Shield className="w-4 h-4 text-purple-600 shrink-0" />
                          ) : (
                            <User className="w-4 h-4 text-indigo-500 shrink-0" />
                          )}
                          <span>{u.fullName || u.username}</span>
                          {u.id === currentUserId && (
                            <span className="text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full">
                              คุณ
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 font-mono mt-0.5">
                          @{u.username} {u.phone ? `• 📞 ${u.phone}` : ''}
                        </div>
                      </td>

                      <td className="p-4">
                        <span className="inline-flex items-center text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                          {u.department || 'ไม่ระบุแผนก'}
                        </span>
                      </td>

                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs font-extrabold ${
                            u.role === 'ADMIN'
                              ? 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>

                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setEditingUser(u)}
                            className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-400 text-xs font-semibold rounded-lg transition flex items-center gap-1"
                            title="แก้ไขข้อมูลผู้ใช้"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>แก้ไข</span>
                          </button>

                          {u.id !== currentUserId && (
                            <form action={deleteUser.bind(null, u.id)}>
                              <button
                                type="submit"
                                className="p-1.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 rounded-lg transition"
                                title="ลบผู้ใช้งานนี้"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </form>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Edit User Modal */}
      <EditUserModal
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        user={editingUser}
        onSuccess={handleRefresh}
      />
    </div>
  );
}
