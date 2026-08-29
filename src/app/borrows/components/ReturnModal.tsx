'use client';

import React, { useState } from 'react';
import { X, CheckCircle2, AlertTriangle, FileText, AlertCircle, RotateCcw } from 'lucide-react';
import { returnBorrowLog } from '../actions';

interface ReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  borrowLog: any;
  onSuccess: () => void;
}

export default function ReturnModal({
  isOpen,
  onClose,
  borrowLog,
  onSuccess,
}: ReturnModalProps) {
  const [returnCondition, setReturnCondition] = useState<'GOOD' | 'DAMAGED'>('GOOD');
  const [returnNotes, setReturnNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !borrowLog) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await returnBorrowLog(borrowLog.id, {
        returnCondition,
        returnNotes: returnNotes.trim() || undefined,
      });

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.error || 'เกิดข้อผิดพลาดในการบันทึกการคืน');
      }
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800 my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-lg">
            <RotateCcw className="w-5 h-5" />
            <span>ทำรายการคืนอุปกรณ์</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content & Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl flex items-start gap-2.5 text-rose-700 dark:text-rose-300 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Borrow Summary Info */}
          <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200/60 dark:border-slate-700/60 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">อุปกรณ์:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                [{borrowLog.asset?.assetId}] {borrowLog.asset?.name}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">ผู้ยืม:</span>
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {borrowLog.borrowerName} {borrowLog.borrowerDept ? `(${borrowLog.borrowerDept})` : ''}
              </span>
            </div>
          </div>

          {/* Return Condition Options */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
              สภาพอุปกรณ์ตอนรับคืน <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setReturnCondition('GOOD')}
                className={`p-3.5 rounded-xl border text-left font-medium transition flex items-start gap-3 ${
                  returnCondition === 'GOOD'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-800 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-sm">สภาพปกติพร้อมใช้งาน</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">
                    เปลี่ยนสถานะเป็น Available
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setReturnCondition('DAMAGED')}
                className={`p-3.5 rounded-xl border text-left font-medium transition flex items-start gap-3 ${
                  returnCondition === 'DAMAGED'
                    ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 text-amber-900 dark:text-amber-300 ring-2 ring-amber-500/20'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-sm text-amber-700 dark:text-amber-400">ชำรุด / ต้องส่งซ่อม</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-normal mt-0.5">
                    เปิด RepairLog ให้อัตโนมัติ
                  </div>
                </div>
              </button>
            </div>
          </div>

          {returnCondition === 'DAMAGED' && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300">
              ⚠️ เมื่อเลือกสภาพ "ชำรุด / ต้องส่งซ่อม" ระบบจะเปลี่ยนสถานะอุปกรณ์เป็น <b>Repairing</b> และสร้างรายการในระบบส่งซ่อม (Repair Log) ให้อัตโนมัติ
            </div>
          )}

          {/* Return Notes */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
              หมายเหตุการคืนอุปกรณ์ {returnCondition === 'DAMAGED' ? <span className="text-rose-500">* (ระบุอาการเสีย)</span> : ''}
            </label>
            <textarea
              rows={3}
              placeholder={returnCondition === 'DAMAGED' ? 'ระบุอาการเสีย หรือความเสียหายที่พบ' : 'หมายเหตุเพิ่มเติม (ถ้ามี)'}
              value={returnNotes}
              onChange={(e) => setReturnNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-hidden dark:text-slate-100 resize-none"
              required={returnCondition === 'DAMAGED'}
            />
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
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
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-xl shadow-md shadow-emerald-600/20 transition flex items-center gap-2 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? 'กำลังบันทึก...' : 'ยืนยันการรับคืน'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
