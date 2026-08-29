'use client';

import React, { useState, useEffect } from 'react';
import { X, QrCode, User, Building, Phone, Calendar, FileText, CheckCircle2, AlertCircle, Laptop } from 'lucide-react';
import QrScannerModal from './QrScannerModal';
import { createBorrowLog, findAssetByCode } from '../actions';
import { formatInTimeZone } from 'date-fns-tz';

interface BorrowModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableAssets: Array<{
    id: string;
    assetId: string;
    name: string;
    department?: string | null;
    isQuantityBased?: boolean;
    totalQuantity?: number;
    availableQuantity?: number;
    category?: { name: string } | null;
    property?: { name: string } | null;
  }>;
  users: Array<{
    id: string;
    username: string;
    role: string;
  }>;
  currentUser?: {
    id: string;
    username: string;
    role: string;
  } | null;
  initialAssetId?: string;
  onSuccess: () => void;
}

export default function BorrowModal({
  isOpen,
  onClose,
  availableAssets,
  users,
  currentUser,
  initialAssetId = '',
  onSuccess,
}: BorrowModalProps) {
  const [borrowerType, setBorrowerType] = useState<'USER' | 'EXTERNAL'>('USER');
  const [selectedAssetId, setSelectedAssetId] = useState(initialAssetId);
  const [borrowQuantity, setBorrowQuantity] = useState(1);
  const [selectedUserId, setSelectedUserId] = useState(currentUser?.id || '');
  const [borrowerName, setBorrowerName] = useState(currentUser?.username || '');
  const [borrowerDept, setBorrowerDept] = useState('');
  const [borrowerContact, setBorrowerContact] = useState('');

  useEffect(() => {
    if (currentUser) {
      setSelectedUserId(currentUser.id);
      if (!borrowerName) setBorrowerName(currentUser.username);
    }
  }, [currentUser]);

  const selectedAsset = availableAssets.find((a) => a.id === selectedAssetId);
  
  // Default expected return date to 7 days from now (Bangkok date string YYYY-MM-DD)
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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialAssetId) {
      setSelectedAssetId(initialAssetId);
    }
  }, [initialAssetId]);

  if (!isOpen) return null;

  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId);
    const u = users.find((item) => item.id === userId);
    if (u) {
      setBorrowerName(u.username);
    }
  };

  const handleScanSuccess = async (scannedCode: string) => {
    setError(null);
    const res = await findAssetByCode(scannedCode);
    if (res.success && res.data) {
      if (res.data.status !== 'Available') {
        setError(`อุปกรณ์ ${res.data.name} (${res.data.assetId}) อยู่ในสถานะ "${res.data.status}" ไม่สามารถยืมได้`);
        return;
      }
      setSelectedAssetId(res.data.id);
    } else {
      setError(res.error || `ไม่พบอุปกรณ์รหัส "${scannedCode}" ในระบบ`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedAssetId) {
      setError('กรุณาเลือกหรือสแกนอุปกรณ์ที่จะยืม');
      return;
    }

    if (!borrowerName.trim()) {
      setError('กรุณาระบุชื่อผู้ยืมอุปกรณ์');
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
        userId: borrowerType === 'USER' ? selectedUserId || undefined : undefined,
        borrowerName: borrowerName.trim(),
        borrowerDept: borrowerDept.trim() || undefined,
        borrowerContact: borrowerContact.trim() || undefined,
        quantity: borrowQuantity,
        expectedReturnDate,
        purpose: purpose.trim() || undefined,
        borrowNotes: borrowNotes.trim() || undefined,
      });

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.error || 'เกิดข้อผิดพลาดในการทำรายการยืม');
      }
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-xl overflow-hidden border border-slate-200 dark:border-slate-800 my-8">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-lg">
              <Laptop className="w-5 h-5" />
              <span>ทำรายการยืมอุปกรณ์</span>
            </div>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {error && (
              <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl flex items-start gap-2.5 text-rose-700 dark:text-rose-300 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Asset Selection with QR Scan */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                เลือกอุปกรณ์ที่จะยืม <span className="text-rose-500">*</span>
              </label>
              <div className="flex gap-2">
                <select
                  value={selectedAssetId}
                  onChange={(e) => {
                    setSelectedAssetId(e.target.value);
                    setBorrowQuantity(1);
                  }}
                  className="flex-1 px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden dark:text-slate-100"
                  required
                >
                  <option value="">-- เลือกอุปกรณ์พร้อมใช้งาน ({availableAssets.length} รายการ) --</option>
                  {availableAssets.map((asset) => (
                    <option key={asset.id} value={asset.id}>
                      [{asset.assetId}] {asset.name}{asset.property?.name ? ` (สาขา: ${asset.property.name})` : ''} {asset.isQuantityBased ? `(คงเหลือ ${asset.availableQuantity}/${asset.totalQuantity} ชิ้น)` : ''}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setIsQrOpen(true)}
                  className="px-3.5 py-2.5 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-xl text-sm font-medium transition flex items-center gap-1.5 shrink-0"
                >
                  <QrCode className="w-4 h-4" />
                  <span className="hidden sm:inline">สแกน QR</span>
                </button>
              </div>
            </div>

            {/* Quantity Input Field for Quantity-Based Assets */}
            {selectedAsset && selectedAsset.isQuantityBased && (
              <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-indigo-950 dark:text-indigo-200">
                    สต็อกอุปกรณ์คงเหลือ: <span className="text-indigo-600 dark:text-indigo-400 font-bold">{selectedAsset.availableQuantity}</span> / {selectedAsset.totalQuantity} ชิ้น
                  </div>
                  <div className="text-xs text-indigo-700 dark:text-indigo-300 mt-0.5">
                    ระบุจำนวนที่ต้องการยืมในช่องด้านข้าง
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">จำนวนยืม:</label>
                  <input
                    type="number"
                    min={1}
                    max={selectedAsset.availableQuantity || 1}
                    value={borrowQuantity}
                    onChange={(e) => setBorrowQuantity(Math.max(1, parseInt(e.target.value || '1', 10)))}
                    className="w-20 px-3 py-1.5 bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-700 rounded-lg text-sm font-bold text-center text-indigo-600 dark:text-indigo-300 focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>
            )}

            {/* Borrower Type Selection */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                ผู้ยืมอุปกรณ์ <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => {
                    setBorrowerType('USER');
                    setBorrowerName('');
                  }}
                  className={`py-2 px-3 text-sm rounded-xl font-medium border transition flex items-center justify-center gap-2 ${
                    borrowerType === 'USER'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>เลือกผู้ใช้ในระบบ</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBorrowerType('EXTERNAL');
                    setSelectedUserId('');
                    setBorrowerName('');
                  }}
                  className={`py-2 px-3 text-sm rounded-xl font-medium border transition flex items-center justify-center gap-2 ${
                    borrowerType === 'EXTERNAL'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Building className="w-4 h-4" />
                  <span>กรอกผู้ยืมภายนอก</span>
                </button>
              </div>

              {borrowerType === 'USER' ? (
                <select
                  value={selectedUserId}
                  onChange={(e) => handleUserSelect(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden dark:text-slate-100"
                >
                  <option value="">-- เลือกผู้ใช้ในระบบ --</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.username} ({u.role})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="space-y-3">
                  <div>
                    <input
                      type="text"
                      placeholder="ชื่อ-นามสกุล ผู้ยืม *"
                      value={borrowerName}
                      onChange={(e) => setBorrowerName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden dark:text-slate-100"
                      required={borrowerType === 'EXTERNAL'}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="แผนก / หน่วยงาน"
                      value={borrowerDept}
                      onChange={(e) => setBorrowerDept(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden dark:text-slate-100"
                    />
                    <input
                      type="text"
                      placeholder="เบอร์โทร / อีเมลติดต่อ"
                      value={borrowerContact}
                      onChange={(e) => setBorrowerContact(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden dark:text-slate-100"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Expected Return Date */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                กำหนดวันคืนอุปกรณ์ <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="date"
                  value={expectedReturnDate}
                  onChange={(e) => setExpectedReturnDate(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden dark:text-slate-100"
                  required
                />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                * ระบบกำหนดให้คืนภายในเวลา 23:59 น. (เวลาประเทศไทย) ของวันที่เลือก
              </p>
            </div>

            {/* Purpose & Notes */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  วัตถุประสงค์การยืม
                </label>
                <input
                  type="text"
                  placeholder="เช่น นำไปใช้งานจัดงานสัมมนา, ใช้งานนอกสถานที่"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  หมายเหตุเพิ่มเติม
                </label>
                <textarea
                  rows={2}
                  placeholder="ระบุรายละเอียดเพิ่มเติม (ถ้ามี)"
                  value={borrowNotes}
                  onChange={(e) => setBorrowNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-hidden dark:text-slate-100 resize-none"
                />
              </div>
            </div>

            {/* Footer buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
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
                <CheckCircle2 className="w-4 h-4" />
                <span>{loading ? 'กำลังบันทึก...' : 'บันทึกการยืม'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* QR Scanner Submodal */}
      <QrScannerModal
        isOpen={isQrOpen}
        onClose={() => setIsQrOpen(false)}
        onScanSuccess={handleScanSuccess}
      />
    </>
  );
}
