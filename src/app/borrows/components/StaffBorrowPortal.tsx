'use me';
'use client';

import React, { useState } from 'react';
import {
  Laptop,
  ArrowLeftRight,
  QrCode,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Send,
  AlertCircle,
  Calendar,
  FileText,
  Boxes,
  User as UserIcon,
  Check,
  XCircle,
} from 'lucide-react';
import { createBorrowLog } from '../actions';
import QrScannerModal from './QrScannerModal';
import { formatInTimeZone } from 'date-fns-tz';
import { formatBangkokDate, formatBangkokDateTime } from '@/lib/datetime';

interface StaffBorrowPortalProps {
  currentUser: {
    id: string;
    username: string;
    role: string;
    fullName?: string | null;
    department?: string | null;
    phone?: string | null;
  };
  availableAssets: any[];
  userLogs: any[];
  onRefresh: () => void;
}

export function StaffBorrowPortal({
  currentUser,
  availableAssets,
  userLogs,
  onRefresh,
}: StaffBorrowPortalProps) {
  // Form State
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [borrowQuantity, setBorrowQuantity] = useState(1);

  const defaultReturnDate = formatInTimeZone(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    'Asia/Bangkok',
    'yyyy-MM-dd'
  );
  const [expectedReturnDate, setExpectedReturnDate] = useState(defaultReturnDate);
  const [purpose, setPurpose] = useState('');
  const [borrowNotes, setBorrowNotes] = useState('');

  const [isQrOpen, setIsQrOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Status Filter
  const [statusFilter, setStatusFilter] = useState('ALL');

  const selectedAsset = availableAssets.find((a) => a.id === selectedAssetId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!selectedAssetId) {
      setError('กรุณาเลือกอุปกรณ์ที่ต้องการยืม');
      return;
    }

    if (!expectedReturnDate) {
      setError('กรุณากำหนดวันคืนอุปกรณ์');
      return;
    }

    setLoading(true);

    try {
      const res = await createBorrowLog({
        assetId: selectedAssetId,
        userId: currentUser.id,
        borrowerName: currentUser.fullName || currentUser.username,
        borrowerDept: currentUser.department || undefined,
        borrowerContact: currentUser.phone || undefined,
        quantity: borrowQuantity,
        expectedReturnDate,
        purpose: purpose.trim() || undefined,
        borrowNotes: borrowNotes.trim() || undefined,
      });

      if (res.success) {
        setSuccessMsg(`ส่งคำขอยืมอุปกรณ์สำเร็จ! กรุณารอการอนุมัติจาก Admin`);
        setSelectedAssetId('');
        setBorrowQuantity(1);
        setPurpose('');
        setBorrowNotes('');
        onRefresh();
      } else {
        setError(res.error || 'เกิดข้อผิดพลาดในการส่งคำขอยืม');
      }
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ');
    } finally {
      setLoading(false);
    }
  };

  const handleQrScanSuccess = (scannedCode: string) => {
    // Find asset by code
    const matchedAsset = availableAssets.find(
      (a) => a.assetId === scannedCode || a.id === scannedCode
    );
    if (matchedAsset) {
      setSelectedAssetId(matchedAsset.id);
    } else {
      setError(`ไม่พบอุปกรณ์รหัส "${scannedCode}" ที่พร้อมยืม`);
    }
  };

  const filteredLogs = userLogs.filter((log) => {
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'OVERDUE') return log.isOverdue;
    return log.status === statusFilter;
  });

  const pendingCount = userLogs.filter((l) => l.status === 'PENDING_APPROVAL').length;
  const activeCount = userLogs.filter((l) => l.status === 'BORROWED' && !l.isOverdue).length;
  const overdueCount = userLogs.filter((l) => l.isOverdue).length;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="p-6 bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 rounded-3xl text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-xs rounded-full text-xs font-bold uppercase tracking-wider">
            <UserIcon className="w-3.5 h-3.5" />
            <span>สำหรับพนักงาน (Staff Portal)</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">แบบฟอร์มขอยืมอุปกรณ์</h1>
          <p className="text-sm text-indigo-100 max-w-xl">
            ยินดีต้อนรับคุณ <span className="font-bold underline">{currentUser.username}</span> เลือกอุปกรณ์ กำหนดวันคืน และส่งคำขอให้อนุมัติเพื่อยืมอุปกรณ์ได้ทันที
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsQrOpen(true)}
          className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-sm rounded-2xl border border-white/20 transition flex items-center gap-2 shrink-0 shadow-sm"
        >
          <QrCode className="w-5 h-5 text-indigo-200" />
          <span>สแกน QR Code</span>
        </button>
      </div>

      {/* Main Full-Page Form Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2.5 text-indigo-600 dark:text-indigo-400 font-bold text-lg">
            <Send className="w-5 h-5" />
            <span>กรอกรายละเอียดคำขอยืมอุปกรณ์</span>
          </div>
          <span className="text-xs font-mono text-slate-400">
            [ ผู้ยืม: {currentUser.username} ]
          </span>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-center gap-3 text-rose-700 dark:text-rose-300 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center gap-3 text-emerald-700 dark:text-emerald-300 text-sm font-semibold">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Asset Selection */}
          <div>
            <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">
              เลือกอุปกรณ์ที่ต้องการยืม <span className="text-rose-500">*</span>
            </label>
            <div className="flex gap-3">
              <select
                value={selectedAssetId}
                onChange={(e) => {
                  setSelectedAssetId(e.target.value);
                  setBorrowQuantity(1);
                }}
                className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden dark:text-slate-100"
                required
              >
                <option value="">-- กรุณาเลือกอุปกรณ์ที่เปิดพร้อมยืม ({availableAssets.length} รายการ) --</option>
                {availableAssets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    [{asset.assetId}] {asset.name}{asset.property?.name ? ` (สาขา: ${asset.property.name})` : ''} {asset.isQuantityBased ? `(คงเหลือ ${asset.availableQuantity}/${asset.totalQuantity} ชิ้น)` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Quantity Selector for Quantity-Based Assets */}
          {selectedAsset && selectedAsset.isQuantityBased && (
            <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-2xl border border-indigo-100 dark:border-indigo-900 flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-indigo-950 dark:text-indigo-200">
                  สต็อกคงเหลือพร้อมใช้งาน: <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">{selectedAsset.availableQuantity}</span> / {selectedAsset.totalQuantity} ชิ้น
                </div>
                <div className="text-xs text-indigo-700 dark:text-indigo-300 mt-0.5">
                  ระบุจำนวนที่ต้องการยืมในช่องด้านข้าง
                </div>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">จำนวนที่ยืม:</label>
                <input
                  type="number"
                  min={1}
                  max={selectedAsset.availableQuantity || 1}
                  value={borrowQuantity}
                  onChange={(e) => setBorrowQuantity(Math.max(1, parseInt(e.target.value || '1', 10)))}
                  className="w-24 px-3 py-2 bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-700 rounded-xl text-base font-extrabold text-center text-indigo-600 dark:text-indigo-300 focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
            </div>
          )}

          {/* Expected Return Date */}
          <div>
            <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">
              กำหนดวันคืนอุปกรณ์ <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={expectedReturnDate}
              onChange={(e) => setExpectedReturnDate(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden dark:text-slate-100"
              required
            />
            <p className="text-xs text-slate-400 mt-1">
              (ระบบตั้งค่าวันคืนเริ่มต้นไว้ที่ 7 วัน กำหนดคืนเวลา 23:59 น.)
            </p>
          </div>

          {/* Purpose & Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">
                วัตถุประสงค์ในการยืม <span className="text-slate-400">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="เช่น ใช้งานปฏิบัติงานนอกสถานที่, ประชุมเสนอโครงการ"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">
                หมายเหตุเพิ่มเติม <span className="text-slate-400">(Optional)</span>
              </label>
              <input
                type="text"
                placeholder="เช่น ต้องการสายเชื่อมต่อเพิ่มเติม"
                value={borrowNotes}
                onChange={(e) => setBorrowNotes(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-2xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden dark:text-slate-100"
              />
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-base rounded-2xl shadow-lg shadow-indigo-600/25 transition flex items-center justify-center gap-2.5 disabled:opacity-50"
            >
              <Send className="w-5 h-5" />
              <span>{loading ? 'กำลังยื่นคำขอยืม...' : 'ส่งคำขอยืมอุปกรณ์ (Submit Borrow Request)'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Staff Request History & Status Tracker Section */}
      <div className="space-y-4 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              ติดตามสถานะคำขอยืมของคุณ (My Borrow Requests)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              แสดงคำขอทั้งหมดของบัญชี {currentUser.username}
            </p>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
            {[
              { id: 'ALL', label: 'ทั้งหมด' },
              { id: 'PENDING_APPROVAL', label: 'รออนุมัติ 🔔' },
              { id: 'BORROWED', label: 'กำลังยืมอยู่' },
              { id: 'OVERDUE', label: 'เกินกำหนดคืน ⚠️' },
              { id: 'RETURNED', label: 'คืนแล้ว' },
              { id: 'REJECTED', label: 'ถูกปฏิเสธ' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition whitespace-nowrap ${
                  statusFilter === tab.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Requests Table */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="px-5 py-3.5">อุปกรณ์</th>
                  <th className="px-5 py-3.5">วันที่ยืม</th>
                  <th className="px-5 py-3.5">วันกำหนดคืน</th>
                  <th className="px-5 py-3.5">สถานะอนุมัติ</th>
                  <th className="px-5 py-3.5">หมายเหตุ/เหตุผล</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                      ยังไม่มีประวัติหรือคำขอยืมอุปกรณ์ตามเงื่อนไขที่เลือก
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => {
                    const isPending = log.status === 'PENDING_APPROVAL';
                    const isBorrowed = log.status === 'BORROWED';
                    const isReturned = log.status === 'RETURNED';
                    const isRejected = log.status === 'REJECTED';
                    const isOverdue = log.isOverdue;

                    return (
                      <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                        <td className="px-5 py-4">
                          <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                            <span>{log.asset?.name || 'ไม่ทราบชื่ออุปกรณ์'}</span>
                            {log.quantity && log.quantity > 1 && (
                              <span className="text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-bold px-2 py-0.5 rounded-full">
                                x{log.quantity} ชิ้น
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400 font-mono mt-0.5">
                            [{log.asset?.assetId}]
                          </div>
                        </td>

                        <td className="px-5 py-4 text-xs font-mono text-slate-600 dark:text-slate-300">
                          {formatBangkokDate(log.borrowDate)}
                        </td>

                        <td className="px-5 py-4 text-xs font-mono">
                          <span className={isOverdue ? 'text-rose-600 font-bold' : 'text-slate-600 dark:text-slate-300'}>
                            {formatBangkokDate(log.expectedReturnDate)}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          {isPending && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-xs font-bold rounded-full">
                              <Clock className="w-3.5 h-3.5" /> รออนุมัติ
                            </span>
                          )}
                          {isBorrowed && !isOverdue && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-full">
                              <Laptop className="w-3.5 h-3.5" /> กำลังยืมอยู่
                            </span>
                          )}
                          {isOverdue && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-xs font-bold rounded-full">
                              <AlertTriangle className="w-3.5 h-3.5" /> เกินกำหนดคืน
                            </span>
                          )}
                          {isReturned && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-full">
                              <CheckCircle2 className="w-3.5 h-3.5" /> คืนแล้ว
                            </span>
                          )}
                          {isRejected && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-xs font-bold rounded-full">
                              <XCircle className="w-3.5 h-3.5" /> ไม่อนุมัติ
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4 text-xs text-slate-500 dark:text-slate-400">
                          {isRejected && log.rejectReason && (
                            <span className="text-rose-600 dark:text-rose-400 font-semibold">
                              เหตุผลที่ปฏิเสธ: {log.rejectReason}
                            </span>
                          )}
                          {log.purpose && !isRejected && <span>วัตถุประสงค์: {log.purpose}</span>}
                          {!log.purpose && !isRejected && <span>-</span>}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* QR Code Modal */}
      <QrScannerModal
        isOpen={isQrOpen}
        onClose={() => setIsQrOpen(false)}
        onScanSuccess={handleQrScanSuccess}
      />
    </div>
  );
}
