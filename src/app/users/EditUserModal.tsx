'use me';
'use client';

import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Shield, User } from 'lucide-react';
import { updateUser } from '@/app/actions';

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    id: string;
    username: string;
    fullName?: string | null;
    department?: string | null;
    phone?: string | null;
    role: string;
  } | null;
  onSuccess: () => void;
}

export function EditUserModal({ isOpen, onClose, user, onSuccess }: EditUserModalProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('STAFF');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setUsername(user.username || '');
      setPassword('');
      setFullName(user.fullName || '');
      setDepartment(user.department || '');
      setPhone(user.phone || '');
      setRole(user.role || 'STAFF');
      setError('');
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username.trim()) {
      setError('กรุณาระบุ Username');
      return;
    }

    setLoading(true);

    try {
      const res = await updateUser(user.id, {
        username: username.trim(),
        password: password.trim() || undefined,
        fullName: fullName.trim() || null,
        department: department.trim() || null,
        phone: phone.trim() || null,
        role,
      });

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.error || 'เกิดข้อผิดพลาดในการอัปเดตข้อมูลผู้ใช้');
      }
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการปรับปรุงข้อมูลผู้ใช้');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800 my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-lg">
            <User className="w-5 h-5" />
            <span>แก้ไขข้อมูลผู้ใช้งาน & สิทธิ์ (Edit User Profile)</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-2 text-rose-700 dark:text-rose-300 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Username */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Username <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden dark:text-slate-100 font-medium"
            />
          </div>

          {/* Password (Optional) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              เปลี่ยนรหัสผ่านใหม่ (New Password) <span className="text-slate-400 font-normal">(เว้นว่างไว้หากไม่ต้องการเปลี่ยน)</span>
            </label>
            <input
              type="password"
              placeholder="กรอกรหัสผ่านใหม่หากต้องการรีเซ็ต"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden dark:text-slate-100 font-medium"
            />
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              ชื่อ - นามสกุล (Full Name)
            </label>
            <input
              type="text"
              placeholder="เช่น นายสมชาย ใจดี"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden dark:text-slate-100 font-medium"
            />
          </div>

          {/* Department */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              แผนก / หน่วยงานที่สังกัด (Department)
            </label>
            <input
              type="text"
              placeholder="เช่น แผนก IT, การเงิน, การตลาด"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden dark:text-slate-100 font-medium"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              เบอร์โทรศัพท์ / ช่องทางติดต่อ (Contact)
            </label>
            <input
              type="text"
              placeholder="เช่น 081-234-5678, เบอร์ภายใน 102"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden dark:text-slate-100 font-medium"
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              สิทธิ์การใช้งาน (Role)
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden dark:text-slate-100 font-semibold"
            >
              <option value="STAFF">STAFF (ยืมอุปกรณ์ & ดูสถานะตนเอง)</option>
              <option value="ADMIN">ADMIN (อนุมัติ, จัดการสต็อก & สิทธิ์ทั้งหมด)</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 transition disabled:opacity-50"
            >
              {loading ? 'กำลังบันทึก...' : 'บันทึกการแก้ไขผู้ใช้งาน'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
