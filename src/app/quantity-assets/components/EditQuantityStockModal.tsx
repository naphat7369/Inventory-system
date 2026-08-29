'use me';
'use client';

import React, { useState } from 'react';
import { X, Boxes, AlertCircle } from 'lucide-react';
import { adjustQuantityStock } from '@/app/actions';

interface EditQuantityStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: {
    id: string;
    assetId: string;
    name: string;
    totalQuantity: number;
    availableQuantity: number;
    propertyId?: string | null;
    department?: string | null;
    location?: string | null;
    status: string;
  } | null;
  properties?: Array<{ id: string; name: string }>;
  onSuccess: () => void;
}

const PREDEFINED_REASONS = [
  { id: 'NEW_PURCHASE', label: '🛒 สั่งซื้ออุปกรณ์เพิ่มเข้าคลัง (New Stock In)' },
  { id: 'DAMAGED_LOST', label: '🔧 อุปกรณ์ชำรุด / สูญหาย / จำหน่ายออก (Damaged / Lost)' },
  { id: 'PHYSICAL_COUNT', label: '📦 ปรับปรุงยอดจากการตรวจนับสินค้าประจำปี (Physical Inventory Count)' },
  { id: 'BRANCH_TRANSFER', label: '🚚 โอนย้ายสต็อกระหว่างสาขา (Inter-Branch Transfer)' },
  { id: 'OTHER', label: '✏️ อื่นๆ (ระบุเหตุผลเอง...)' },
];

export function EditQuantityStockModal({
  isOpen,
  onClose,
  asset,
  properties = [],
  onSuccess,
}: EditQuantityStockModalProps) {
  const [name, setName] = useState(asset?.name || '');
  const [totalQuantity, setTotalQuantity] = useState(asset?.totalQuantity || 1);
  const [availableQuantity, setAvailableQuantity] = useState(asset?.availableQuantity || 1);
  const [propertyId, setPropertyId] = useState(asset?.propertyId || '');
  const [department, setDepartment] = useState(asset?.department || '');
  const [location, setLocation] = useState(asset?.location || '');
  const [reasonCategory, setReasonCategory] = useState('NEW_PURCHASE');
  const [customReason, setCustomReason] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (asset) {
      setName(asset.name || '');
      setTotalQuantity(asset.totalQuantity || 1);
      setAvailableQuantity(asset.availableQuantity || 1);
      setPropertyId(asset.propertyId || '');
      setDepartment(asset.department || '');
      setLocation(asset.location || '');
      setReasonCategory('NEW_PURCHASE');
      setCustomReason('');
    }
  }, [asset]);

  if (!isOpen || !asset) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const newTotal = Math.max(1, totalQuantity);
    const newAvail = Math.max(0, availableQuantity);

    if (newAvail > newTotal) {
      setError('จำนวนคงเหลือพร้อมยืมต้องไม่เกินจำนวนสต็อกทั้งหมด');
      return;
    }

    if (reasonCategory === 'OTHER' && !customReason.trim()) {
      setError('กรุณาระบุเหตุผลการปรับปรุงสต็อกเพิ่มเติม');
      return;
    }

    // Build final notes string
    let finalNotes = '';
    const selectedReasonObj = PREDEFINED_REASONS.find((r) => r.id === reasonCategory);
    if (reasonCategory === 'OTHER') {
      finalNotes = `อื่นๆ: ${customReason.trim()}`;
    } else {
      finalNotes = selectedReasonObj?.label || 'ปรับปรุงสต็อก';
      if (customReason.trim()) {
        finalNotes += ` (${customReason.trim()})`;
      }
    }

    setLoading(true);
    try {
      const res = await adjustQuantityStock(asset.id, {
        name: name.trim(),
        totalQuantity: newTotal,
        availableQuantity: newAvail,
        propertyId: propertyId || null,
        department: department.trim() || null,
        location: location.trim() || null,
        notes: finalNotes,
      });

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError((res as any).error || 'เกิดข้อผิดพลาดในการอัปเดตสต็อก');
      }
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการปรับปรุงสต็อก');
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
            <Boxes className="w-5 h-5" />
            <span>แก้ไข & ปรับปรุงสต็อกอุปกรณ์</span>
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

          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="text-xs font-mono text-slate-400">รหัสอุปกรณ์: [{asset.assetId}]</div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              ชื่ออุปกรณ์ (Item Name) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden dark:text-slate-100 font-medium"
            />
          </div>

          {/* Quantities */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-900">
            <div>
              <label className="block text-xs font-bold text-indigo-950 dark:text-indigo-200 mb-1">
                จำนวนสต็อกทั้งหมด (Total)
              </label>
              <input
                type="number"
                min={1}
                value={totalQuantity}
                onChange={(e) => setTotalQuantity(parseInt(e.target.value || '1', 10))}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-700 rounded-xl text-sm font-extrabold focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-indigo-950 dark:text-indigo-200 mb-1">
                จำนวนคงเหลือพร้อมยืม (Available)
              </label>
              <input
                type="number"
                min={0}
                max={totalQuantity}
                value={availableQuantity}
                onChange={(e) => setAvailableQuantity(parseInt(e.target.value || '0', 10))}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-700 rounded-xl text-sm font-extrabold focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
          </div>

          {/* Branch / Property */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              สาขาที่จัดเก็บ (Branch / Property)
            </label>
            <select
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden dark:text-slate-100"
            >
              <option value="">-- ไม่ระบุสาขา --</option>
              {properties.map((prop) => (
                <option key={prop.id} value={prop.id}>
                  {prop.name}
                </option>
              ))}
            </select>
          </div>

          {/* Department & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                แผนกจัดเก็บ (Department)
              </label>
              <input
                type="text"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                สถานที่เก็บ (Location)
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden dark:text-slate-100"
              />
            </div>
          </div>

          {/* Selectable Reason Dropdown */}
          <div>
            <label className="block text-xs font-bold text-amber-800 dark:text-amber-300 mb-1">
              เหตุผลการปรับปรุงสต็อก (Stock Adjustment Reason) <span className="text-rose-500">*</span>
            </label>
            <select
              value={reasonCategory}
              onChange={(e) => setReasonCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-amber-50/60 dark:bg-slate-800 border border-amber-300 dark:border-amber-900 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-amber-500 dark:text-slate-100"
              required
            >
              {PREDEFINED_REASONS.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Conditional Custom Reason Text Input */}
          {(reasonCategory === 'OTHER' || reasonCategory !== '') && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {reasonCategory === 'OTHER' ? (
                  <span className="text-rose-600 font-bold">ระบุเหตุผลอื่นๆ เพิ่มเติม *</span>
                ) : (
                  <span>ข้อความเพิ่มเติม (Optional)</span>
                )}
              </label>
              <input
                type="text"
                placeholder={
                  reasonCategory === 'OTHER'
                    ? 'กรุณากรอกเหตุผลการปรับปรุงสต็อก...'
                    : 'เช่น เลขที่ใบเสร็จ PO-2026-08, หมายเหตุผู้จัดส่ง'
                }
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden dark:text-slate-100"
                required={reasonCategory === 'OTHER'}
              />
            </div>
          )}

          {/* Footer Actions */}
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
              {loading ? 'กำลังบันทึก Log...' : 'บันทึกการปรับปรุงสต็อก'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
