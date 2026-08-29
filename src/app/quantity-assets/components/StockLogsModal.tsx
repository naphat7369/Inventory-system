'use me';
'use client';

import React, { useEffect, useState } from 'react';
import { X, History, User, Clock, RefreshCw, AlertCircle, FileText, Tag, ChevronRight } from 'lucide-react';
import { getQuantityStockLogs } from '@/app/actions';
import { formatBangkokDateTime } from '@/lib/datetime';

interface StockLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  asset: {
    id: string;
    assetId: string;
    name: string;
  } | null;
}

export function StockLogsModal({ isOpen, onClose, asset }: StockLogsModalProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && asset) {
      loadLogs();
    }
  }, [isOpen, asset]);

  const loadLogs = async () => {
    if (!asset) return;
    setLoading(true);
    setError('');

    try {
      const res = await getQuantityStockLogs(asset.id);
      if (res.success && res.data) {
        setLogs(res.data);
      } else {
        setError(res.error || 'ไม่สามารถโหลดประวัติสต็อกได้');
      }
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการโหลดประวัติ');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !asset) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-slate-800 my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5 text-indigo-600 dark:text-indigo-400 font-bold text-lg">
            <History className="w-5 h-5" />
            <span>ประวัติการปรับปรุงสต็อก (Stock Adjustment Audit Log)</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Target Asset Header Badge */}
          <div className="p-4 bg-indigo-50/60 dark:bg-indigo-950/40 rounded-2xl border border-indigo-100 dark:border-indigo-900 flex items-center justify-between">
            <div>
              <div className="font-extrabold text-indigo-950 dark:text-indigo-200 text-base">{asset.name}</div>
              <div className="text-xs font-mono text-indigo-600 dark:text-indigo-400 mt-0.5">
                [{asset.assetId}]
              </div>
            </div>
            <span className="text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 font-bold px-3 py-1 rounded-full">
              {logs.length} รายการบันทึก
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-slate-400 space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-600" />
              <p className="text-xs font-mono">กำลังดึงประวัติการปรับปรุงสต็อก...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-center gap-3 text-rose-700 dark:text-rose-300 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-2 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
              <FileText className="w-8 h-8 mx-auto opacity-30" />
              <p className="text-sm">ยังไม่มีประวัติการปรับปรุงสต็อกย้อนหลังสำหรับอุปกรณ์นี้</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
              {logs.map((log) => {
                const oldVal = log.oldValue ? JSON.parse(log.oldValue) : null;
                const newVal = log.newValue ? JSON.parse(log.newValue) : null;

                return (
                  <div
                    key={log.id}
                    className="p-4 bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 rounded-2xl space-y-2 transition hover:border-indigo-400/50"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 dark:border-slate-700/60 pb-2">
                      <div className="flex items-center gap-2 text-xs font-mono text-slate-600 dark:text-slate-300">
                        <Clock className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{formatBangkokDateTime(log.createdAt)}</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-200">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>โดยคุณ <span className="text-indigo-600 dark:text-indigo-400">{log.username}</span></span>
                        <span className="text-[10px] bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded-full font-mono">
                          {log.action}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium pt-1">
                      {log.details || 'ไม่มีรายละเอียดบันทึกเพิ่มเติม'}
                    </div>

                    {oldVal && newVal && (
                      <div className="flex flex-wrap gap-2 pt-1 text-[11px] font-mono">
                        <span className="bg-slate-200/70 dark:bg-slate-700/70 px-2 py-0.5 rounded-md text-slate-700 dark:text-slate-300">
                          สต็อกรวมเดิม: {oldVal.totalQuantity} ➔ ใหม่: {newVal.totalQuantity} ชิ้น
                        </span>
                        <span className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-md">
                          พร้อมยืมเดิม: {oldVal.availableQuantity} ➔ ใหม่: {newVal.availableQuantity} ชิ้น
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm rounded-xl transition"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
