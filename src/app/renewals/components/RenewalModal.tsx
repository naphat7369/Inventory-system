'use client';

import { useState, useEffect } from 'react';
import { X, Upload, Trash2, FileText, AlertTriangle, Loader2, Sparkles } from 'lucide-react';
import { createRenewalContract, updateRenewalContract } from '@/app/actions';

interface AttachmentUploadItem {
  file: File;
  attachmentCategory: string;
}

interface RenewalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any | null;
}

const CATEGORY_OPTIONS = [
  { value: 'Service', label: 'สัญญาบริการ (Service)' },
  { value: 'MA', label: 'สัญญาบำรุงรักษา (MA)' },
  { value: 'Domain', label: 'โดเมน / โฮสติ้ง (Domain/Hosting)' },
  { value: 'Insurance', label: 'ประกันภัย / ประกันอุปกรณ์ (Insurance)' },
  { value: 'License', label: 'ซอฟต์แวร์สิทธิ์ (Software License)' },
  { value: 'Other', label: 'อื่นๆ (Other)' },
];

const FILE_CATEGORIES = ['สัญญาฉบับจริง', 'ใบเสนอราคา', 'ใบเสร็จ / ใบกำกับภาษี', 'เอกสารต่ออายุ', 'เอกสารประกอบอื่นๆ'];

export function RenewalModal({ isOpen, onClose, onSuccess, initialData }: RenewalModalProps) {
  const [contractNo, setContractNo] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Service');
  const [vendor, setVendor] = useState('');
  const [costBaht, setCostBaht] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [alertAdvanceDays, setAlertAdvanceDays] = useState(30);
  const [notes, setNotes] = useState('');

  const [selectedFiles, setSelectedFiles] = useState<AttachmentUploadItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setContractNo(initialData.contractNo || '');
      setTitle(initialData.title || '');
      setCategory(initialData.category || 'Service');
      setVendor(initialData.vendor || '');
      setCostBaht(initialData.costCents ? (initialData.costCents / 100).toString() : '');
      setStartDate(initialData.startDate ? new Date(initialData.startDate).toISOString().split('T')[0] : '');
      setEndDate(initialData.endDate ? new Date(initialData.endDate).toISOString().split('T')[0] : '');
      setAlertAdvanceDays(initialData.alertAdvanceDays || 30);
      setNotes(initialData.notes || '');
    } else {
      setContractNo('');
      setTitle('');
      setCategory('Service');
      setVendor('');
      setCostBaht('');
      setStartDate('');
      setEndDate('');
      setAlertAdvanceDays(30);
      setNotes('');
    }
    setSelectedFiles([]);
    setErrorMsg(null);
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles = Array.from(e.target.files).map((file) => ({
      file,
      attachmentCategory: 'สัญญาฉบับจริง',
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

    if (!title.trim()) {
      setErrorMsg('กรุณาระบุชื่อสัญญา/เอกสาร');
      return;
    }
    if (!endDate) {
      setErrorMsg('กรุณาระบุวันที่หมดอายุสัญญา');
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

      if (initialData) {
        const res = await updateRenewalContract(initialData.id, {
          contractNo: contractNo.trim() || undefined,
          title: title.trim(),
          category,
          vendor: vendor.trim() || undefined,
          costCents,
          startDate: startDate || null,
          endDate,
          alertAdvanceDays: Number(alertAdvanceDays),
          notes: notes.trim() || undefined,
        });

        if (!res.success) throw new Error('แก้ไขข้อมูลสัญญาไม่สำเร็จ');
      } else {
        const res = await createRenewalContract(
          {
            contractNo: contractNo.trim() || undefined,
            title: title.trim(),
            category,
            vendor: vendor.trim() || undefined,
            costCents,
            startDate: startDate || null,
            endDate,
            alertAdvanceDays: Number(alertAdvanceDays),
            notes: notes.trim() || undefined,
          },
          uploadedFilesData
        );

        if (!res.success) throw new Error('สร้างรายการสัญญาไม่สำเร็จ');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-2xl p-6 border border-slate-200 dark:border-slate-800 space-y-4 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-bold text-lg">
            <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span>{initialData ? 'แก้ไขรายการสัญญาต่ออายุ' : 'เพิ่มรายการสัญญาต่ออายุใหม่'}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                ชื่อสัญญา / เอกสารต่ออายุ <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="เช่น MA Server Dell R740, โดเมน company.com"
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                เลขที่สัญญา / เลขที่อ้างอิง
              </label>
              <input
                type="text"
                value={contractNo}
                onChange={(e) => setContractNo(e.target.value)}
                placeholder="เช่น CT-2026-0091"
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 dark:text-slate-100 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">ประเภทสัญญา</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 dark:text-slate-100 font-medium"
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                ผู้ให้บริการ / คู่สัญญา (Vendor)
              </label>
              <input
                type="text"
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                placeholder="เช่น บริษัท เอไอเอส จำกัด, GoDaddy"
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">วันที่เริ่มสัญญา</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                วันที่หมดอายุ <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 dark:text-slate-100 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">แจ้งเตือนล่วงหน้า (วัน)</label>
              <input
                type="number"
                min="1"
                max="365"
                value={alertAdvanceDays}
                onChange={(e) => setAlertAdvanceDays(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">มูลค่า / ค่าต่ออายุ (บาท)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={costBaht}
                onChange={(e) => setCostBaht(e.target.value)}
                placeholder="0.00"
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 dark:text-slate-100 font-bold text-emerald-600 dark:text-emerald-400"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">หมายเหตุเพิ่มเติม</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="รายละเอียดเงื่อนไขเพิ่มเติม"
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 dark:text-slate-100"
              />
            </div>
          </div>

          {/* Multi-File Upload Section */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              แนบไฟล์เอกสาร (PDF, JPG, PNG ขนาดไม่เกิน 10MB)
            </label>
            <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-indigo-500 rounded-xl p-4 text-center bg-slate-50/50 dark:bg-slate-800/50 transition">
              <input
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileSelect}
                id="file-upload"
                className="hidden"
              />
              <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center justify-center gap-1">
                <Upload className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline">
                  คลิกเพื่อเลือกไฟล์แนบหลายไฟล์
                </span>
                <span className="text-[11px] text-slate-400">รองรับ PDF, JPG, PNG</span>
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
                      <FileText className="w-4 h-4 text-indigo-500 shrink-0" />
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

          {/* Modal Actions */}
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
              className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                'บันทึกข้อมูล'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
