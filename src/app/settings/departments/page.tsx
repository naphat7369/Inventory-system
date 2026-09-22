"use client";

import { useState, useEffect, useRef } from 'react';
import { Building, Trash2, Edit2, Plus, X, Check, Upload, RotateCcw } from 'lucide-react';
import Link from 'next/link';

type Department = {
  id: string;
  name: string;
  nameEn?: string | null;
  code: string;
  logoUrl?: string | null;
  logoAssetId?: string | null;
  isActive: boolean;
};

const DEFAULT_LOGO = '/assets/branding/s-hotel-default-v1.png';

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [logoUrl, setLogoUrl] = useState(DEFAULT_LOGO);
  const [logoAssetId, setLogoAssetId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editNameEn, setEditNameEn] = useState('');
  const [editLogoUrl, setEditLogoUrl] = useState(DEFAULT_LOGO);
  const [editLogoAssetId, setEditLogoAssetId] = useState<string | null>(null);
  const [editIsActive, setEditIsActive] = useState(true);
  const [editUploading, setEditUploading] = useState(false);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/departments');
      if (!res.ok) throw new Error('Failed to fetch departments');
      const data = await res.json();
      setDepartments(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch departments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const res = await fetch('/api/departments');
        if (!res.ok) throw new Error('Failed to fetch departments');
        const data = await res.json();
        if (!ignore) setDepartments(data);
      } catch (err: unknown) {
        if (!ignore) setError(err instanceof Error ? err.message : 'Failed to fetch departments');
      } finally {
        if (!ignore) setLoading(false);
      }
    };
    load();
    return () => { ignore = true; };
  }, []);

  const handleFileUpload = async (file: File, isEditMode: boolean = false) => {
    if (file.size > 2 * 1024 * 1024) {
      alert('File size exceeds 2MB limit');
      return;
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('Only PNG, JPEG, and WEBP formats are supported');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    if (isEditMode) setEditUploading(true);
    else setUploading(true);

    try {
      const res = await fetch('/api/memos/upload-logo', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await res.json();
      if (isEditMode) {
        setEditLogoUrl(data.asset.url);
        setEditLogoAssetId(data.asset.id);
      } else {
        setLogoUrl(data.asset.url);
        setLogoAssetId(data.asset.id);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to upload logo');
    } finally {
      if (isEditMode) setEditUploading(false);
      else setUploading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const formattedNameEn = (nameEn || `${name.trim()} DEPARTMENT`).trim().toLocaleUpperCase('en-US');
      const res = await fetch('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          code,
          nameEn: formattedNameEn,
          logoUrl,
          logoAssetId
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create department');
      }
      setName('');
      setCode('');
      setNameEn('');
      setLogoUrl(DEFAULT_LOGO);
      setLogoAssetId(null);
      fetchDepartments();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to create department');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this department?')) return;
    try {
      const res = await fetch(`/api/departments/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete department');
      }
      fetchDepartments();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete department');
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      const formattedNameEn = editNameEn.trim().toLocaleUpperCase('en-US');
      const res = await fetch(`/api/departments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: editName, 
          nameEn: formattedNameEn,
          logoUrl: editLogoUrl,
          logoAssetId: editLogoAssetId,
          isActive: editIsActive 
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update department');
      }
      setEditingId(null);
      fetchDepartments();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to update department');
    }
  };

  const startEdit = (dept: Department) => {
    setEditingId(dept.id);
    setEditName(dept.name);
    setEditNameEn(dept.nameEn || `${dept.name.trim()} DEPARTMENT`.toLocaleUpperCase('en-US'));
    setEditLogoUrl(dept.logoUrl || DEFAULT_LOGO);
    setEditLogoAssetId(dept.logoAssetId || null);
    setEditIsActive(dept.isActive);
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto w-full">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Building className="text-gray-600 dark:text-gray-400" /> Departments Management
        </h1>
        <Link href="/memos" className="text-indigo-600 hover:underline font-medium">
          ← กลับหน้าแบบฟอร์มบันทึกข้อความ (Memos)
        </Link>
      </div>

      {/* Add Department Box */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4 md:p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4">Add Department (เพิ่มแผนกใหม่)</h2>
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                ชื่อแผนก (ภาษาไทย) *
              </label>
              <input
                type="text"
                placeholder="เช่น ฝ่ายเทคโนโลยีสารสนเทศ"
                required
                value={name}
                onChange={e => {
                  setName(e.target.value);
                  if (!nameEn) {
                    setNameEn(`${e.target.value.trim()} DEPARTMENT`.toLocaleUpperCase('en-US'));
                  }
                }}
                className="w-full px-4 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                รหัสแผนก (Code) *
              </label>
              <input
                type="text"
                placeholder="เช่น IT, ACC, FB"
                required
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                ชื่อหัวข้อภาษาอังกฤษ (ใต้ MEMORANDUM) *
              </label>
              <input
                type="text"
                placeholder="เช่น INFORMATION TECHNOLOGY DEPARTMENT"
                required
                value={nameEn}
                onChange={e => setNameEn(e.target.value.toLocaleUpperCase('en-US'))}
                className="w-full px-4 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-gray-300 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase text-sm"
              />
            </div>
          </div>

          {/* Logo Setting */}
          <div className="p-4 bg-gray-50 dark:bg-slate-800/50 rounded-lg border border-gray-200 dark:border-slate-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-24 h-16 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 rounded-lg flex items-center justify-center p-1 overflow-hidden shadow-sm">
                <img
                  src={logoUrl}
                  alt="Logo preview"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
              <div>
                <div className="text-sm font-medium">Logo เริ่มต้นประจำแผนก</div>
                <div className="text-xs text-gray-500">
                  {logoUrl === DEFAULT_LOGO ? 'ใช้ Default S Hotel Logo' : 'Logo ประจำแผนก'} (PNG, JPG, WEBP สูงสุด 2MB)
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/png,image/jpeg,image/webp"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file, false);
                }}
              />
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Upload size={14} /> {uploading ? 'กำลังอัปโหลด...' : 'อัปโหลด Logo ใหม่'}
              </button>
              {logoUrl !== DEFAULT_LOGO && (
                <button
                  type="button"
                  onClick={() => { setLogoUrl(DEFAULT_LOGO); setLogoAssetId(null); }}
                  className="px-3 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:underline flex items-center gap-1"
                >
                  <RotateCcw size={12} /> รีเซ็ตเป็น Default
                </button>
              )}
            </div>
          </div>

          <button
            type="submit"
            className="w-full md:w-auto md:self-end px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 text-sm shadow-sm"
          >
            <Plus size={18} /> เพิ่มแผนก (Add Department)
          </button>
        </form>
      </div>

      {/* Departments Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden w-full">
        {loading ? (
          <div className="p-8 text-center text-gray-500">กำลังโหลดข้อมูล...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">{error}</div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left whitespace-nowrap">
              <thead className="bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-700">
                <tr>
                  <th className="p-4 font-semibold text-gray-600 dark:text-gray-400 w-24">Logo</th>
                  <th className="p-4 font-semibold text-gray-600 dark:text-gray-400 w-24">Code</th>
                  <th className="p-4 font-semibold text-gray-600 dark:text-gray-400">ชื่อแผนก</th>
                  <th className="p-4 font-semibold text-gray-600 dark:text-gray-400">Header ใต้ MEMORANDUM</th>
                  <th className="p-4 font-semibold text-gray-600 dark:text-gray-400 w-24">Status</th>
                  <th className="p-4 font-semibold text-gray-600 dark:text-gray-400 w-32">Actions</th>
                </tr>
              </thead>
              <tbody>
                {departments.map(dept => (
                  <tr key={dept.id} className="border-b border-gray-100 dark:border-slate-800 last:border-0 hover:bg-slate-50/80 dark:hover:bg-slate-800/60">
                    {editingId === dept.id ? (
                      <>
                        <td className="p-4">
                          <div className="w-16 h-12 bg-white dark:bg-slate-800 border rounded flex items-center justify-center p-1 mb-1">
                            <img src={editLogoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                          </div>
                          <input
                            type="file"
                            ref={editFileInputRef}
                            className="hidden"
                            accept="image/png,image/jpeg,image/webp"
                            onChange={e => {
                              const f = e.target.files?.[0];
                              if (f) handleFileUpload(f, true);
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => editFileInputRef.current?.click()}
                            disabled={editUploading}
                            className="text-[11px] text-indigo-600 hover:underline block"
                          >
                            {editUploading ? 'Uploading...' : 'เปลี่ยนรูป'}
                          </button>
                        </td>
                        <td className="p-4 font-medium text-gray-500">{dept.code}</td>
                        <td className="p-4">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="p-4">
                          <input
                            type="text"
                            value={editNameEn}
                            onChange={(e) => setEditNameEn(e.target.value.toLocaleUpperCase('en-US'))}
                            className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-md text-sm uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </td>
                        <td className="p-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={editIsActive}
                              onChange={(e) => setEditIsActive(e.target.checked)}
                              className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                            />
                            <span className={editIsActive ? "text-green-600 text-xs font-semibold" : "text-gray-500 text-xs"}>
                              {editIsActive ? 'Active' : 'Inactive'}
                            </span>
                          </label>
                        </td>
                        <td className="p-4 flex items-center gap-2">
                          <button onClick={() => handleUpdate(dept.id)} className="text-green-600 hover:text-green-700 p-2 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors" title="Save">
                            <Check size={18} />
                          </button>
                          <button onClick={() => setEditingId(null)} className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title="Cancel">
                            <X size={18} />
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-4">
                          <div className="w-16 h-12 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded flex items-center justify-center p-1">
                            <img
                              src={dept.logoUrl || DEFAULT_LOGO}
                              alt={dept.name}
                              className="max-w-full max-h-full object-contain"
                            />
                          </div>
                        </td>
                        <td className="p-4 font-bold text-slate-800 dark:text-slate-100">{dept.code}</td>
                        <td className="p-4 font-medium">{dept.name}</td>
                        <td className="p-4 text-xs font-semibold tracking-wider text-slate-600 dark:text-slate-300 uppercase">
                          {dept.nameEn || `${dept.name} DEPARTMENT`}
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 text-xs rounded-full font-medium ${dept.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'}`}>
                            {dept.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="p-4 flex items-center gap-2">
                          <button onClick={() => startEdit(dept)} className="text-indigo-600 hover:text-indigo-800 p-2 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors" title="Edit">
                            <Edit2 size={18} />
                          </button>
                          <button onClick={() => handleDelete(dept.id)} className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors" title="Delete">
                            <Trash2 size={18} />
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
                {departments.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500 dark:text-gray-400">ยังไม่มีแผนกในระบบ</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
