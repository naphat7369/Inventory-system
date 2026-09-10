'use client';

import React, { useState } from 'react';
import { X, AlertOctagon, AlertCircle } from 'lucide-react';
import { voidBorrowLog } from '../actions';

interface VoidConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  borrowLog: any;
  onSuccess: () => void;
}

export default function VoidConfirmModal({
  isOpen,
  onClose,
  borrowLog,
  onSuccess,
}: VoidConfirmModalProps) {
  const [voidReason, setVoidReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !borrowLog) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!voidReason.trim()) {
      setError('กรุณาระบุเหตุผลในการยกเลิกรายการ');
      return;
    }

    setLoading(true);

    try {
      const res = await voidBorrowLog(borrowLog.id, {
        voidReason: voidReason.trim(),
      });

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.error || 'เกิดข้อผิดพลาดในการยกเลิกรายการ');
      }
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800 my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-rose-50/50 dark:bg-rose-950/20">
          <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-lg">
            <AlertOctagon className="w-5 h-5" />
            <span>ยกเลิกรายการยืม (Void)</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content & Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl flex items-start gap-2.5 text-rose-700 dark:text-rose-300 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-3.5 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 space-y-1">
            <p><b>อุปกรณ์:</b> [{borrowLog.asset?.assetId}] {borrowLog.asset?.name}</p>
            <p><b>ผู้ยืม:</b> {borrowLog.borrowerName}</p>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            * การยกเลิกจะเปลี่ยนสถานะอุปกรณ์กลับเป็น <b>Available</b> และจะยังเก็บบันทึกประวัติรายการไว้ในระบบเพื่อการตรวจสอบ (จะไม่ถูกลบออกจาก DB)
          </p>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
              เหตุผลในการยกเลิกรายการ <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              placeholder="ระบุเหตุผล เช่น คีย์ลงรายการผิดคน, สแกนรหัสอุปกรณ์ผิดเครื่อง"
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 focus:outline-hidden dark:text-slate-100 resize-none"
              required
            />
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-xl transition"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium rounded-xl shadow-md shadow-rose-600/20 transition flex items-center gap-2 disabled:opacity-50"
            >
              <span>{loading ? 'กำลังบันทึก...' : 'ยืนยันการยกเลิกรายการ'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
