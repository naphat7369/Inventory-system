'use client';

import { useState } from 'react';
import {
  X,
  FileText,
  Download,
  Eye,
  Trash2,
  Calendar,
  DollarSign,
  Building,
  Clock,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Paperclip,
} from 'lucide-react';
import { deleteRenewalAttachment } from '@/app/actions';
import { DocumentPreviewModal } from './DocumentPreviewModal';

interface RenewalDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  contract: any | null;
  onOpenRenewModal: (contract: any) => void;
}

export function RenewalDetailModal({
  isOpen,
  onClose,
  onRefresh,
  contract,
  onOpenRenewModal,
}: RenewalDetailModalProps) {
  const [selectedPreviewAtt, setSelectedPreviewAtt] = useState<any | null>(null);
  const [isDeletingAtt, setIsDeletingAtt] = useState<string | null>(null);

  if (!isOpen || !contract) return null;

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบไฟล์แนบนี้?')) return;
    setIsDeletingAtt(attachmentId);
    try {
      const res = await deleteRenewalAttachment(attachmentId);
      if (res.success) {
        onRefresh();
      } else {
        alert(res.error || 'ลบไฟล์แนบไม่สำเร็จ');
      }
    } catch (err: any) {
      alert(err?.message || 'เกิดข้อผิดพลาดในการลบไฟล์');
    } finally {
      setIsDeletingAtt(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-xs font-bold rounded-full">
            <AlertTriangle className="w-3.5 h-3.5" />
            หมดอายุแล้ว (Expired)
          </span>
        );
      case 'EXPIRING_SOON':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-xs font-bold rounded-full">
            <Clock className="w-3.5 h-3.5" />
            ใกล้หมดอายุ (Expiring Soon)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5" />
            ปกติ (Active)
          </span>
        );
    }
  };

  const formatDateStr = (dateVal: any) => {
    if (!dateVal) return '-';
    const d = new Date(dateVal);
    return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatMoney = (costCents: number | null | undefined) => {
    if (costCents === null || costCents === undefined) return '-';
    return (costCents / 100).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' บาท';
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-4xl p-6 border border-slate-200 dark:border-slate-800 space-y-5 my-8">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">{contract.title}</h2>
              {getStatusBadge(contract.status)}
            </div>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body Content */}
          <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
            {/* Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/60">
              <div>
                <span className="text-xs text-slate-400 font-medium block mb-1">เลขที่สัญญา / อ้างอิง</span>
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 font-mono">
                  {contract.contractNo || '-'}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-medium block mb-1">ประเภทสัญญา</span>
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{contract.category}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-medium block mb-1">ผู้ให้บริการ / คู่สัญญา</span>
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{contract.vendor || '-'}</span>
              </div>
              <div>
                <span className="text-xs text-slate-400 font-medium block mb-1">มูลค่า / ค่าต่ออายุ</span>
                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                  {formatMoney(contract.costCents)}
                </span>
              </div>
            </div>

            {/* Dates & Alerts */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-slate-400 font-medium block">วันที่เริ่มสัญญา</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{formatDateStr(contract.startDate)}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 rounded-xl">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-slate-400 font-medium block">วันที่หมดอายุ</span>
                  <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                    {formatDateStr(contract.endDate)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 rounded-xl">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs text-slate-400 font-medium block">ระยะเตือนล่วงหน้า</span>
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400">{contract.alertAdvanceDays} วัน</span>
                </div>
              </div>
            </div>

            {contract.notes && (
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-700 dark:text-slate-300">
                <span className="font-bold text-slate-900 dark:text-slate-100 block mb-1">หมายเหตุเพิ่มเติม:</span>
                <p>{contract.notes}</p>
              </div>
            )}

            {/* Attachments Section */}
            <div>
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-3">
                <Paperclip className="w-4 h-4 text-indigo-500" />
                ไฟล์แนบเอกสารทั้งหมด ({contract.attachments?.length || 0})
              </h3>

              {contract.attachments && contract.attachments.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {contract.attachments.map((att: any) => (
                    <div
                      key={att.id}
                      className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-xl text-xs"
                    >
                      <div className="flex items-center gap-3 overflow-hidden pr-2">
                        <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                        <div className="overflow-hidden">
                          <p className="font-bold text-slate-900 dark:text-slate-100 truncate" title={att.fileName}>
                            {att.fileName}
                          </p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                            <span className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 rounded-sm font-semibold text-slate-700 dark:text-slate-200">
                              {att.attachmentCategory}
                            </span>
                            {att.fileSize && <span>{(att.fileSize / 1024).toFixed(0)} KB</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => setSelectedPreviewAtt(att)}
                          className="px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-semibold rounded-lg hover:bg-indigo-100 transition text-xs flex items-center gap-1"
                          title="พรีวิวเอกสาร"
                        >
                          <Eye className="w-3.5 h-3.5" /> พรีวิว
                        </button>
                        <a
                          href={`/api/renewals/files/${att.id}?download=true`}
                          download={att.fileName}
                          className="p-1.5 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-100 transition"
                          title="ดาวน์โหลด"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => handleDeleteAttachment(att.id)}
                          disabled={isDeletingAtt === att.id}
                          className="p-1.5 bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 rounded-lg hover:bg-rose-100 transition"
                          title="ลบไฟล์แนบ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
                  ยังไม่มีไฟล์แนบในสัญญานี้
                </p>
              )}
            </div>

            {/* Renewal History Timeline */}
            <div>
              <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-3">
                <RefreshCw className="w-4 h-4 text-emerald-500" />
                ประวัติการต่ออายุสัญญา (Renewal History Log)
              </h3>

              {contract.histories && contract.histories.length > 0 ? (
                <div className="relative border-l-2 border-emerald-500 ml-3 pl-4 space-y-4">
                  {contract.histories.map((h: any) => (
                    <div
                      key={h.id}
                      className="relative bg-slate-50 dark:bg-slate-800/50 p-4 border border-slate-200 dark:border-slate-700/60 rounded-xl text-xs space-y-2"
                    >
                      <div className="absolute -left-[23px] top-4 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900" />
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                          ต่ออายุเมื่อ: {formatDateStr(h.createdAt)}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">โดย: {h.renewedBy || 'ADMIN'}</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700 dark:text-slate-300 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[10px]">รอบสัญญาก่อนหน้า:</span>
                          <span className="font-medium">
                            {formatDateStr(h.previousStartDate)} - {formatDateStr(h.previousEndDate)}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">รอบสัญญาใหม่:</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            {formatDateStr(h.newStartDate)} - {formatDateStr(h.newEndDate)}
                          </span>
                        </div>
                      </div>

                      {h.costCents !== null && (
                        <div className="text-xs text-slate-700 dark:text-slate-300 pt-1">
                          <span className="text-slate-400">ค่าต่ออายุรอบนี้: </span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatMoney(h.costCents)}</span>
                        </div>
                      )}

                      {h.notes && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                          {h.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-200 dark:border-slate-800 text-center">
                  ยังไม่มีประวัติการต่ออายุสัญญา
                </p>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-between items-center pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => {
                onClose();
                onOpenRenewModal(contract);
              }}
              className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition"
            >
              <RefreshCw className="w-4 h-4" />
              ต่ออายุสัญญานี้ (Renew)
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      </div>

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        isOpen={!!selectedPreviewAtt}
        onClose={() => setSelectedPreviewAtt(null)}
        attachment={selectedPreviewAtt}
      />
    </>
  );
}
