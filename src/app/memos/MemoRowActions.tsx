"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { DeleteMemoModal } from './DeleteMemoModal';

interface MemoRowActionsProps {
  memoId: string;
  documentNo?: string | null;
  status: string;
  subject: string;
  canDelete: boolean;
}

export function MemoRowActions({
  memoId,
  documentNo,
  status,
  subject,
  canDelete,
}: MemoRowActionsProps) {
  const router = useRouter();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  const handleSuccess = (deletionType: 'hard' | 'soft') => {
    showToast(
      deletionType === 'hard' ? 'ลบฉบับร่างเรียบร้อยแล้ว' : 'นำเอกสารออกจากรายการปกติเรียบร้อยแล้ว',
      'success'
    );
    router.refresh();
  };

  const handleError = (errorMsg: string) => {
    showToast(errorMsg, 'error');
  };

  return (
    <>
      <div className="flex items-center gap-3">
        <Link 
          href={`/memos/${memoId}`} 
          className="text-blue-600 dark:text-blue-400 hover:underline font-medium text-sm"
        >
          View
        </Link>

        {canDelete && status !== 'FINAL' && (
          <button
            type="button"
            onClick={() => setIsDeleteOpen(true)}
            className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
            title={status === 'DRAFT' ? 'ลบฉบับร่างถาวร' : 'นำออกจากรายการปกติ'}
            aria-label={status === 'DRAFT' ? 'ลบฉบับร่างถาวร' : 'นำออกจากรายการปกติ'}
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      <DeleteMemoModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onSuccess={handleSuccess}
        onError={handleError}
        memoId={memoId}
        documentNo={documentNo}
        status={status}
        subject={subject}
      />

      {toast && (
        <div 
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium transition-all transform duration-300 animate-in slide-in-from-bottom-2 ${
            toast.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/90 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/90 border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-200'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </>
  );
}
