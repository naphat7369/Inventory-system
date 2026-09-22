"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Edit, CheckCircle, Printer, Copy, XCircle, Trash2, CheckCircle2, AlertCircle, Loader2, BookmarkPlus } from 'lucide-react';
import { DeleteMemoModal } from './DeleteMemoModal';

interface MemoDetailActionsProps {
  memoId: string;
  status: string;
  documentNo?: string | null;
  subject?: string;
  canDelete?: boolean;
  canEdit?: boolean;
  signatures?: any[];
}

export function MemoDetailActions({ 
  memoId, 
  status, 
  documentNo,
  subject,
  canDelete = true,
  canEdit = true,
  signatures = []
}: MemoDetailActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [confirmFinalizeOpen, setConfirmFinalizeOpen] = useState(false);
  const [confirmCancelOpen, setConfirmCancelOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  const handleFinalize = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/memos/${memoId}/finalize`, { method: 'POST' });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to finalize');
      }
      setConfirmFinalizeOpen(false);
      showToast('ออกเลขเอกสารเรียบร้อยแล้ว', 'success');
      router.refresh();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error finalizing memo', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/memos/${memoId}/cancel`, { method: 'POST' });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to cancel');
      }
      setConfirmCancelOpen(false);
      showToast('ยกเลิกเอกสารเรียบร้อยแล้ว', 'success');
      router.refresh();
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error cancelling memo', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/memos/${memoId}/duplicate`, { method: 'POST' });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to duplicate');
      }
      const data = await res.json();
      router.push(`/memos/${data.id}/edit`);
    } catch (err: unknown) {
      showToast(err instanceof Error ? err.message : 'Error duplicating memo', 'error');
      setLoading(false);
    }
  };

  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveTemplateName, setSaveTemplateName] = useState('');

  const handleSaveAsTemplate = () => {
    if (!signatures || signatures.length === 0) {
      showToast('ไม่มีรายชื่อผู้เซ็นให้บันทึกเป็นเทมเพลต', 'error');
      return;
    }
    setSaveTemplateName('');
    setIsSaveModalOpen(true);
  };

  const submitSaveTemplate = async () => {
    if (!saveTemplateName || saveTemplateName.trim() === '') return;

    setLoading(true);
    try {
      const res = await fetch('/api/signature-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: saveTemplateName,
          items: signatures
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save template');
      }

      showToast('บันทึกเป็นเทมเพลตเรียบร้อยแล้ว', 'success');
      setIsSaveModalOpen(false);
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSuccess = (deletionType: 'hard' | 'soft') => {
    showToast(
      deletionType === 'hard' ? 'ลบฉบับร่างเรียบร้อยแล้ว' : 'นำเอกสารออกจากรายการปกติเรียบร้อยแล้ว',
      'success'
    );
    setTimeout(() => {
      router.push('/memos');
    }, 600);
  };

  const handleDeleteError = (errorMsg: string) => {
    showToast(errorMsg, 'error');
  };

  useEffect(() => {
    // Function to scan and hide any third-party browser extension overlays, ad-skipper buttons, etc.
    const cleanExtensionOverlays = () => {
      const hiddenElements: { el: HTMLElement; prevDisplay: string; prevVisibility: string }[] = [];
      
      try {
        // Enforce hiding for all script, style, and template tags
        document.querySelectorAll('script, style, noscript, template').forEach((node) => {
          (node as HTMLElement).style.setProperty('display', 'none', 'important');
        });

        const allNodes = document.querySelectorAll('body *');
        allNodes.forEach((node) => {
          const el = node as HTMLElement;
          const tag = el.tagName?.toUpperCase();
          if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'TEMPLATE') return;
          if (el.closest('.memo-document') || el.closest('.memo-page-sheet') || el.closest('.memo-document-container')) return;

          const text = (el.innerText || el.textContent || '').toLowerCase();
          const idClass = (el.id + ' ' + (typeof el.className === 'string' ? el.className : '')).toLowerCase();
          const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();

          const isAdSkip = 
            text === 'ad-skip' || 
            text === 'ad skip' || 
            text === 'adskip' ||
            text === 'ad-skipping' ||
            text === 'ad skipping' ||
            text === 'skip ad' ||
            text === 'ad-skipping activated' ||
            text === 'ad skipping activated' ||
            ariaLabel === 'skip ad' ||
            idClass.includes('ad-skip') ||
            idClass.includes('adskip') ||
            idClass.includes('ad_skip') ||
            idClass.includes('adskipper');

          if (isAdSkip) {
            el.style.setProperty('display', 'none', 'important');
            el.style.setProperty('visibility', 'hidden', 'important');
            el.style.setProperty('opacity', '0', 'important');
            el.style.setProperty('position', 'absolute', 'important');
            el.style.setProperty('pointer-events', 'none', 'important');
            el.style.setProperty('width', '0', 'important');
            el.style.setProperty('height', '0', 'important');
            return;
          }

          const style = window.getComputedStyle(el);
          const isFloating = (style.position === 'fixed' || (style.position === 'absolute' && !el.closest('main')));

          if (isFloating && !el.closest('.memo-document')) {
            hiddenElements.push({
              el,
              prevDisplay: el.style.display,
              prevVisibility: el.style.visibility
            });
            el.style.setProperty('display', 'none', 'important');
            el.style.setProperty('visibility', 'hidden', 'important');
            el.style.setProperty('opacity', '0', 'important');
          }
        });
      } catch (err) {
        console.error('Error cleaning extension overlays:', err);
      }

      return hiddenElements;
    };

    let restoredList: { el: HTMLElement; prevDisplay: string; prevVisibility: string }[] = [];

    const handleBeforePrint = () => {
      restoredList = cleanExtensionOverlays();
    };

    const handleAfterPrint = () => {
      restoredList.forEach(({ el, prevDisplay, prevVisibility }) => {
        if (prevDisplay) el.style.display = prevDisplay;
        else el.style.removeProperty('display');

        if (prevVisibility) el.style.visibility = prevVisibility;
        else el.style.removeProperty('visibility');

        el.style.removeProperty('opacity');
      });
      restoredList = [];
    };

    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);

    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  const handlePrint = async () => {
    if (typeof document !== 'undefined') {
      // Force hide scripts and styles immediately
      document.querySelectorAll('script, style, noscript, template').forEach((node) => {
        (node as HTMLElement).style.setProperty('display', 'none', 'important');
      });

      const allElements = document.querySelectorAll('body *');
      const hiddenByScript: { el: HTMLElement; prevDisplay: string; prevVisibility: string }[] = [];

      allElements.forEach((node) => {
        const el = node as HTMLElement;
        const tag = el.tagName?.toUpperCase();
        if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT' || tag === 'TEMPLATE') return;
        if (el.closest('.memo-document') || el.closest('.memo-page-sheet') || el.closest('.memo-document-container')) return;

        const text = (el.innerText || el.textContent || '').toLowerCase();
        const idClass = (el.id + ' ' + (typeof el.className === 'string' ? el.className : '')).toLowerCase();
        const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
        
        const isAdSkip = 
          text === 'ad-skip' || 
          text === 'ad skip' || 
          text === 'adskip' ||
          text === 'ad-skipping' ||
          text === 'ad skipping' ||
          text === 'skip ad' ||
          text === 'ad-skipping activated' ||
          text === 'ad skipping activated' ||
          ariaLabel === 'skip ad' ||
          idClass.includes('ad-skip') ||
          idClass.includes('adskip') ||
          idClass.includes('ad_skip') ||
          idClass.includes('adskipper');

        if (isAdSkip) {
          el.style.setProperty('display', 'none', 'important');
          el.style.setProperty('visibility', 'hidden', 'important');
          el.style.setProperty('opacity', '0', 'important');
          el.style.setProperty('position', 'absolute', 'important');
          el.style.setProperty('pointer-events', 'none', 'important');
          el.style.setProperty('width', '0', 'important');
          el.style.setProperty('height', '0', 'important');
          return;
        }

        const style = window.getComputedStyle(el);
        const isFloating = (style.position === 'fixed' || (style.position === 'absolute' && !el.closest('main')));

        if (isFloating && !el.closest('.memo-document')) {
          hiddenByScript.push({
            el,
            prevDisplay: el.style.display,
            prevVisibility: el.style.visibility
          });
          el.style.setProperty('display', 'none', 'important');
          el.style.setProperty('visibility', 'hidden', 'important');
          el.style.setProperty('opacity', '0', 'important');
        }
      });

      if (document.fonts) {
        try {
          await document.fonts.ready;
        } catch {
          // Continue
        }
      }

      window.print();

      setTimeout(() => {
        hiddenByScript.forEach(({ el, prevDisplay, prevVisibility }) => {
          if (prevDisplay) {
            el.style.display = prevDisplay;
          } else {
            el.style.removeProperty('display');
          }
          if (prevVisibility) {
            el.style.visibility = prevVisibility;
          } else {
            el.style.removeProperty('visibility');
          }
          el.style.removeProperty('opacity');
        });
      }, 1500);
    } else {
      window.print();
    }
  };

  return (
    <>
      <div className="flex flex-wrap gap-3 mb-6 print:hidden">
        <button 
          onClick={handlePrint} 
          className="flex items-center gap-2 bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <Printer size={18} /> พิมพ์ / บันทึก PDF
        </button>

        {canEdit && status !== 'CANCELLED' && (
          <button 
            onClick={() => router.push(`/memos/${memoId}/edit`)} 
            className="flex items-center gap-2 bg-blue-100 hover:bg-blue-200 text-blue-700 px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Edit size={18} /> แก้ไข
          </button>
        )}

        {status === 'DRAFT' && (
          <button 
            onClick={() => setConfirmFinalizeOpen(true)} 
            disabled={loading} 
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            <CheckCircle size={18} /> ออกเลขเอกสาร
          </button>
        )}

        <button 
          onClick={handleDuplicate} 
          disabled={loading} 
          className="flex items-center gap-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          <Copy size={18} /> ทำสำเนา
        </button>

        {signatures && signatures.length > 0 && (
          <button 
            onClick={handleSaveAsTemplate} 
            disabled={loading} 
            className="flex items-center gap-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            <BookmarkPlus size={18} /> เซฟเป็นเทมเพลตลายเซ็น
          </button>
        )}

        {status === 'FINAL' && (
          <button 
            onClick={() => setConfirmCancelOpen(true)} 
            disabled={loading} 
            className="flex items-center gap-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-700 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            <XCircle size={18} /> ยกเลิกเอกสาร
          </button>
        )}

        {/* Delete button: Only for DRAFT and CANCELLED, NEVER for FINAL */}
        {canDelete && status !== 'FINAL' && (
          <button 
            onClick={() => setIsDeleteOpen(true)} 
            disabled={loading} 
            className="flex items-center gap-2 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 cursor-pointer"
            title={status === 'DRAFT' ? 'ลบแบบร่างถาวร' : 'นำออกจากรายการปกติ'}
            aria-label={status === 'DRAFT' ? 'ลบแบบร่างถาวร' : 'นำออกจากรายการปกติ'}
          >
            <Trash2 size={18} /> {status === 'DRAFT' ? 'ลบแบบร่าง' : 'นำออกจากรายการ'}
          </button>
        )}
      </div>

      {/* Delete Modal */}
      <DeleteMemoModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onSuccess={handleDeleteSuccess}
        onError={handleDeleteError}
        memoId={memoId}
        documentNo={documentNo}
        status={status}
        subject={subject}
      />

      {/* Confirm Finalize Modal */}
      {confirmFinalizeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md p-6 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-3 text-green-600 dark:text-green-400 font-bold text-lg">
              <CheckCircle className="w-6 h-6 shrink-0" />
              <span>ยืนยันการออกเลขเอกสาร</span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              เมื่อออกเลขแล้วจะไม่สามารถแก้ไขแผนกได้ และเลขเอกสารจะถูกออกและบันทึกถาวร ยืนยันการออกเลขเอกสารนี้หรือไม่?
            </p>
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                disabled={loading}
                onClick={() => setConfirmFinalizeOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleFinalize}
                className="px-5 py-2 text-sm font-bold text-white bg-green-600 hover:bg-green-700 rounded-xl shadow-xs transition disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>ยืนยันออกเลข</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Cancel Modal */}
      {confirmCancelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md p-6 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-3 text-yellow-600 dark:text-yellow-400 font-bold text-lg">
              <XCircle className="w-6 h-6 shrink-0" />
              <span>ยืนยันการยกเลิกเอกสาร</span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              สถานะเอกสารจะถูกเปลี่ยนเป็น CANCELLED ถาวร คุณแน่ใจหรือไม่ว่าต้องการยกเลิกเอกสารนี้?
            </p>
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                disabled={loading}
                onClick={() => setConfirmCancelOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition disabled:opacity-50"
              >
                ย้อนกลับ
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleCancel}
                className="px-5 py-2 text-sm font-bold text-white bg-yellow-600 hover:bg-yellow-700 rounded-xl shadow-xs transition disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>ยืนยันยกเลิก</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
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

      {/* Save Template Modal */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-sm p-6 border border-gray-200 dark:border-slate-800 flex flex-col gap-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center">
                <BookmarkPlus size={20} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">บันทึกเป็นเทมเพลต</h3>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                ตั้งชื่อเทมเพลตชุดลายเซ็นนี้
              </label>
              <input
                type="text"
                autoFocus
                value={saveTemplateName}
                onChange={(e) => setSaveTemplateName(e.target.value)}
                placeholder="เช่น หัวหน้าแผนกบุคคล"
                className="w-full px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-slate-800 text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    submitSaveTemplate();
                  }
                }}
              />
            </div>
            
            <div className="flex items-center justify-end gap-3 mt-4">
              <button
                type="button"
                onClick={() => setIsSaveModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                disabled={loading}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={submitSaveTemplate}
                disabled={!saveTemplateName.trim() || loading}
                className="px-5 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
