'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, AlertCircle } from 'lucide-react';
import { extendBorrowLog } from '../actions';
import { formatBangkokDate } from '@/lib/datetime';
import { formatInTimeZone } from 'date-fns-tz';

interface ExtendReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  borrowLog: any;
  onSuccess: () => void;
}

export default function ExtendReturnModal({
  isOpen,
  onClose,
  borrowLog,
  onSuccess,
}: ExtendReturnModalProps) {
  const [newExpectedReturnDate, setNewExpectedReturnDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (borrowLog?.expectedReturnDate) {
      const formatted = formatInTimeZone(
        new Date(borrowLog.expectedReturnDate),
        'Asia/Bangkok',
        'yyyy-MM-dd'
      );
      setNewExpectedReturnDate(formatted);
    }
  }, [borrowLog]);

  if (!isOpen || !borrowLog) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!newExpectedReturnDate) {
      setError('กรุณาระบุวันกำหนดคืนใหม่');
      return;
    }

    setLoading(true);

    try {
      const res = await extendBorrowLog(borrowLog.id, {
        newExpectedReturnDate,
      });

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.error || 'เกิดข้อผิดพลาดในการต่อเวลา');
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
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-indigo-50/50 dark:bg-indigo-950/20">
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-lg">
            <Clock className="w-5 h-5" />
            <span>ต่อเวลาการยืมอุปกรณ์</span>
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
            <p><b>วันกำหนดคืนเดิม (ครั้งแรก):</b> {formatBangkokDate(borrowLog.originalReturnDate)}</p>
            <p><b>วันกำหนดคืนปัจจุบัน:</b> {formatBangkokDate(borrowLog.expectedReturnDate)}</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              ระบุวันกำหนดคืนใหม่ <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="date"
                value={newExpectedReturnDate}
                onChange={(e) => setNewExpectedReturnDate(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden dark:text-slate-100"
                required
              />
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              * การต่อเวลาจะปรับปรุงวันกำหนดคืนเป็น 23:59 น. ของวันที่กำหนดใหม่ โดยวันกำหนดคืนครั้งแรก (Original Return Date) จะยังคงถูกเก็บบันทึกไว้สำหรับตรวจสอบ
            </p>
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
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl shadow-md shadow-indigo-600/20 transition flex items-center gap-2 disabled:opacity-50"
            >
              <span>{loading ? 'กำลังบันทึก...' : 'บันทึกการต่อเวลา'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
