'use me';
'use client';

import React, { useState } from 'react';
import { X, Boxes, AlertCircle } from 'lucide-react';
import { createAsset } from '@/app/actions';

interface NewQuantityAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Array<{ id: string; name: string }>;
  properties?: Array<{ id: string; name: string }>;
  onSuccess: () => void;
}

export function NewQuantityAssetModal({
  isOpen,
  onClose,
  categories,
  properties = [],
  onSuccess,
}: NewQuantityAssetModalProps) {
  const [name, setName] = useState('');
  const [assetId, setAssetId] = useState('');
  const [categoryId, setCategoryId] = useState(categories[0]?.id || '');
  const [propertyId, setPropertyId] = useState('');
  const [department, setDepartment] = useState('');
  const [location, setLocation] = useState('');
  const [totalQuantity, setTotalQuantity] = useState(5);
  const [availableQuantity, setAvailableQuantity] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('กรุณากรอกชื่ออุปกรณ์ย่อย/นับจำนวน');
      return;
    }

    if (!categoryId) {
      setError('กรุณาเลือกหมวดหมู่อุปกรณ์');
      return;
    }

    setLoading(true);
    try {
      const data = {
        name: name.trim(),
        assetId: assetId.trim() || undefined,
        categoryId,
        propertyId: propertyId || null,
        department: department.trim() || null,
        location: location.trim() || null,
        status: availableQuantity > 0 ? 'Available' : 'Borrowed',
        isBorrowable: true,
        isQuantityBased: true,
        totalQuantity: Math.max(1, totalQuantity),
        availableQuantity: Math.max(0, availableQuantity),
      };

      await createAsset(data);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการบันทึกอุปกรณ์นับจำนวน');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800 my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-lg">
            <Boxes className="w-5 h-5" />
            <span>เพิ่มรายการอุปกรณ์นับจำนวน (Stock Asset)</span>
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

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              ชื่ออุปกรณ์ (Item Name) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="เช่น เมาส์ไร้สาย Logitech, คีย์บอร์ด USB, สาย HDMI 2m"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                รหัสสต็อก (Asset ID) <span className="text-slate-400">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="เว้นว่างเพื่อเจนรหัสให้อัตโนมัติ"
                value={assetId}
                onChange={(e) => setAssetId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                หมวดหมู่ (Category) <span className="text-rose-500">*</span>
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden dark:text-slate-100"
                required
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900">
            <div>
              <label className="block text-xs font-bold text-indigo-950 dark:text-indigo-200 mb-1">
                จำนวนสต็อกทั้งหมด (Total Quantity)
              </label>
              <input
                type="number"
                min={1}
                value={totalQuantity}
                onChange={(e) => {
                  const val = parseInt(e.target.value || '1', 10);
                  setTotalQuantity(val);
                  setAvailableQuantity(val);
                }}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-indigo-950 dark:text-indigo-200 mb-1">
                จำนวนพร้อมยืม (Available Quantity)
              </label>
              <input
                type="number"
                min={0}
                max={totalQuantity}
                value={availableQuantity}
                onChange={(e) => setAvailableQuantity(parseInt(e.target.value || '0', 10))}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              สาขา (Branch / Property) <span className="text-slate-400">(Optional)</span>
            </label>
            <select
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden dark:text-slate-100"
            >
              <option value="">-- เลือกสาขาที่จัดเก็บ --</option>
              {properties.map((prop) => (
                <option key={prop.id} value={prop.id}>
                  {prop.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">แผนกจัดเก็บ (Department)</label>
              <input
                type="text"
                placeholder="เช่น IT Center, Stock Room 2"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">สถานที่เก็บ (Location)</label>
              <input
                type="text"
                placeholder="เช่น ตู้ A ชั้น 3"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden dark:text-slate-100"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition disabled:opacity-50"
            >
              {loading ? 'กำลังบันทึก...' : 'บันทึกสต็อกใหม่'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
