'use client';

import { useState, useEffect } from 'react';
import { X, RefreshCw, Upload, Trash2, FileText, AlertTriangle, Loader2 } from 'lucide-react';
import { renewContractAction } from '@/app/actions';

interface AttachmentUploadItem {
  file: File;
  attachmentCategory: string;
}

interface RenewActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  contract: any | null;
}

const FILE_CATEGORIES = ['เอกสารต่ออายุ', 'สัญญาฉบับใหม่', 'ใบเสนอราคาใหม่', 'ใบเสร็จ / ใบกำกับภาษี', 'เอกสารประกอบอื่นๆ'];

export function RenewActionModal({ isOpen, onClose, onSuccess, contract }: RenewActionModalProps) {
  const [newStartDate, setNewStartDate] = useState('');
  const [newEndDate, setNewEndDate] = useState('');
  const [costBaht, setCostBaht] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<AttachmentUploadItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (contract) {
      const prevEnd = new Date(contract.endDate);
      const defaultStart = new Date(prevEnd.getTime() + 24 * 60 * 60 * 1000);
      setNewStartDate(defaultStart.toISOString().split('T')[0]);

      const defaultEnd = new Date(defaultStart);
      defaultEnd.setFullYear(defaultEnd.getFullYear() + 1);
      setNewEndDate(defaultEnd.toISOString().split('T')[0]);

      setCostBaht(contract.costCents ? (contract.costCents / 100).toString() : '');
      setNotes('');
      setSelectedFiles([]);
      setErrorMsg(null);
    }
  }, [contract, isOpen]);

  if (!isOpen || !contract) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files).map((file) => ({
      file,
      attachmentCategory: 'เอกสารต่ออายุ',
    }));
    setSelectedFiles((prev) => [...prev, ...newFiles]);
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFileCategoryChange = (index: number, cat: string) => {
    setSelectedFiles((prev) =>
      prev.map((item, i) => (i === index ? { ...item, attachmentCategory: cat } : item))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!newEndDate) {
      setErrorMsg('กรุณาระบุวันที่สิ้นสุดสัญญารอบใหม่');
      return;
    }

    setIsSubmitting(true);

    try {
      let uploadedFilesData: any[] = [];

      if (selectedFiles.length > 0) {
        for (const item of selectedFiles) {
          const fileFormData = new FormData();
          fileFormData.append('files', item.file);
          fileFormData.append('attachmentCategory', item.attachmentCategory);

          const res = await fetch('/api/renewals/upload', {
            method: 'POST',
            body: fileFormData,
          });

          const json = await res.json();
          if (!res.ok) {
            throw new Error(json.error || `อัปโหลดไฟล์ "${item.file.name}" ไม่สำเร็จ`);
          }

          if (json.files && json.files.length > 0) {
            uploadedFilesData.push(...json.files);
          }
        }
      }

      const costCents = costBaht ? Math.round(parseFloat(costBaht) * 100) : undefined;

      const res = await renewContractAction(
        contract.id,
        {
          newStartDate: newStartDate || null,
          newEndDate,
          costCents,
          notes: notes.trim() || undefined,
        },
        uploadedFilesData
      );

      if (!res.success) throw new Error('ต่ออายุสัญญาไม่สำเร็จ');

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'เกิดข้อผิดพลาดในการบันทึกการต่ออายุ');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-xl p-6 border border-slate-200 dark:border-slate-800 space-y-4 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400 font-bold text-lg">
            <RefreshCw className="w-5 h-5" />
            <span>บันทึกการต่ออายุสัญญา (Renew Contract)</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-xl text-xs space-y-1">
            <p className="font-bold text-slate-900 dark:text-slate-100">{contract.title}</p>
            <p className="text-slate-500 dark:text-slate-400">
              วันหมดอายุเดิม:{' '}
              <span className="text-amber-600 dark:text-amber-400 font-bold">
                {new Date(contract.endDate).toLocaleDateString('th-TH')}
              </span>
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">วันเริ่มสัญญารอบใหม่</label>
              <input
                type="date"
                value={newStartDate}
                onChange={(e) => setNewStartDate(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                วันสิ้นสุดสัญญารอบใหม่ <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={newEndDate}
                onChange={(e) => setNewEndDate(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 dark:text-slate-100 font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">ค่าต่ออายุรอบใหม่ (บาท)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={costBaht}
              onChange={(e) => setCostBaht(e.target.value)}
              placeholder="0.00"
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 dark:text-slate-100 font-bold text-emerald-600 dark:text-emerald-400"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">หมายเหตุการต่ออายุรอบนี้</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="เช่น ต่ออายุสัญญาเรียบร้อย ใบเสร็จเลขที่ REC-9921"
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 dark:text-slate-100"
            />
          </div>

          {/* Multi-File Upload Section for Renewal Cycle */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              แนบเอกสารการต่ออายุรอบใหม่ (PDF, JPG, PNG)
            </label>
            <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-emerald-500 rounded-xl p-4 text-center bg-slate-50/50 dark:bg-slate-800/50 transition">
              <input
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileSelect}
                id="renew-file-upload"
                className="hidden"
              />
              <label htmlFor="renew-file-upload" className="cursor-pointer flex flex-col items-center justify-center gap-1">
                <Upload className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold hover:underline">
                  คลิกเพื่ออัปโหลดไฟล์เอกสารต่ออายุรอบนี้
                </span>
              </label>
            </div>

            {selectedFiles.length > 0 && (
              <div className="mt-3 space-y-2 max-h-40 overflow-y-auto pr-1">
                {selectedFiles.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between gap-3 p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs"
                  >
                    <div className="flex items-center gap-2 overflow-hidden flex-1">
                      <FileText className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span className="truncate text-slate-700 dark:text-slate-200 font-medium" title={item.file.name}>
                        {item.file.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={item.attachmentCategory}
                        onChange={(e) => handleFileCategoryChange(index, e.target.value)}
                        className="px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] font-semibold text-slate-700 dark:text-slate-200"
                      >
                        {FILE_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(index)}
                        className="p-1 text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950 rounded-lg transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  กำลังต่ออายุ...
                </>
              ) : (
                'ยืนยันการต่ออายุ'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
