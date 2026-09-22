"use client";

import React, { useState } from 'react';
import { Trash2, Loader2 } from 'lucide-react';

interface DeleteMemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (deletionType: 'hard' | 'soft') => void;
  onError: (errorMsg: string) => void;
  memoId: string;
  documentNo?: string | null;
  status: string;
  subject?: string;
}

export function DeleteMemoModal({
  isOpen,
  onClose,
  onSuccess,
  onError,
  memoId,
  documentNo,
  status,
  subject,
}: DeleteMemoModalProps) {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const isDraft = status === 'DRAFT';
  const isCancelled = status === 'CANCELLED';

  const handleDelete = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const res = await fetch(`/api/memos/${memoId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete memo');
      }

      onSuccess(data.deletionType || (isDraft ? 'hard' : 'soft'));
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการลบเอกสาร';
      onError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md p-6 border border-slate-200 dark:border-slate-800 space-y-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
      >
        <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 font-bold text-lg" id="delete-dialog-title">
          <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center shrink-0">
            <Trash2 className="w-5 h-5 text-rose-600 dark:text-rose-400" />
          </div>
          <span>
            {isDraft ? 'ยืนยันการลบแบบร่าง' : 'ยืนยันนำเอกสารออกจากรายการ'}
          </span>
        </div>

        {subject && (
          <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs text-slate-700 dark:text-slate-300 font-medium truncate">
            เรื่อง: {subject}
          </div>
        )}

        <div className="text-sm text-slate-600 dark:text-slate-300 space-y-2">
          {isDraft ? (
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-100">
                ต้องการลบฉบับร่างนี้ถาวรหรือไม่?
              </p>
              <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">
                ข้อมูลที่ลบแล้วไม่สามารถกู้คืนได้
              </p>
            </div>
          ) : isCancelled && documentNo ? (
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-100">
                ต้องการนำเอกสาร {documentNo} ออกจากรายการปกติหรือไม่?
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                ระบบจะยังเก็บประวัติและเลขเอกสารนี้ไว้
              </p>
            </div>
          ) : (
            <div>
              <p className="font-semibold text-slate-800 dark:text-slate-100">
                ต้องการลบเอกสารฉบับนี้หรือไม่?
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition disabled:opacity-50"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleDelete}
            className="px-5 py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>กำลังดำเนินการ...</span>
              </>
            ) : (
              <span>
                {isDraft ? 'ยืนยันลบถาวร' : 'ยืนยันนำออก'}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
