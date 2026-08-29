'use client';

import React, { useState } from 'react';
import { X, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { approveBorrowLog, rejectBorrowLog } from '../actions';

interface ApproveRejectModalProps {
  isOpen: boolean;
  onClose: () => void;
  borrowLog: any;
  actionType: 'APPROVE' | 'REJECT';
  onSuccess: () => void;
}

export default function ApproveRejectModal({
  isOpen,
  onClose,
  borrowLog,
  actionType,
  onSuccess,
}: ApproveRejectModalProps) {
  const [rejectReason, setRejectReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !borrowLog) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (actionType === 'APPROVE') {
        const res = await approveBorrowLog(borrowLog.id);
        if (res.success) {
          onSuccess();
          onClose();
        } else {
          setError(res.error || 'เกิดข้อผิดพลาดในการอนุมัติคำขอ');
        }
      } else {
        if (!rejectReason.trim()) {
          setError('กรุณาระบุเหตุผลในการปฏิเสธคำขอ');
          setLoading(false);
          return;
        }

        const res = await rejectBorrowLog(borrowLog.id, {
          rejectReason: rejectReason.trim(),
        });
        if (res.success) {
          onSuccess();
          onClose();
        } else {
          setError(res.error || 'เกิดข้อผิดพลาดในการปฏิเสธคำขอ');
        }
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
        <div
          className={`flex items-center justify-between px-6 py-4 border-b ${
            actionType === 'APPROVE'
              ? 'border-emerald-100 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400'
              : 'border-rose-100 bg-rose-50/50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400'
          }`}
        >
          <div className="flex items-center gap-2 font-bold text-lg">
            {actionType === 'APPROVE' ? (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span>อนุมัติคำขอยืมอุปกรณ์</span>
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5" />
                <span>ปฏิเสธคำขอยืมอุปกรณ์</span>
              </>
            )}
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
            <p><b>ผู้ขอยืม:</b> {borrowLog.borrowerName} {borrowLog.borrowerDept ? `(${borrowLog.borrowerDept})` : ''}</p>
            <p><b>วัตถุประสงค์:</b> {borrowLog.purpose || '-'}</p>
          </div>

          {actionType === 'APPROVE' ? (
            <p className="text-sm text-slate-600 dark:text-slate-300">
              คุณต้องการยืนยัน <b>อนุมัติคำขอยืมอุปกรณ์</b> นี้ใช่หรือไม่? เมื่ออนุมัติแล้ว สถานะของอุปกรณ์จะเปลี่ยนเป็น <b>Borrowed</b> โดยทันที
            </p>
          ) : (
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                ระบุเหตุผลในการปฏิเสธ <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="เช่น อุปกรณ์ติดภารกิจอื่น, ไม่อยู่ในเงื่อนไขการยืม"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-rose-500 focus:outline-hidden dark:text-slate-100 resize-none"
                required
              />
            </div>
          )}

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
              className={`px-5 py-2.5 text-white text-sm font-medium rounded-xl shadow-md transition flex items-center gap-2 disabled:opacity-50 ${
                actionType === 'APPROVE'
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                  : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
              }`}
            >
              <span>{loading ? 'กำลังบันทึก...' : actionType === 'APPROVE' ? 'ยืนยันการอนุมัติ' : 'ยืนยันปฏิเสธ'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
