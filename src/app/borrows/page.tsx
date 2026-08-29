'use me';
'use client';

import React, { useState, useEffect } from 'react';
import {
  Laptop,
  ArrowLeftRight,
  Search,
  Plus,
  QrCode,
  Clock,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  RefreshCw,
  Calendar,
  User as UserIcon,
  Building,
  RotateCcw,
  FileText,
  Filter,
  Check,
  X,
  XCircle,
  ShieldAlert,
} from 'lucide-react';
import { getBorrowLogs, getAvailableAssets, getUsersList, getCurrentUserSession } from './actions';
import BorrowModal from './components/BorrowModal';
import ReturnModal from './components/ReturnModal';
import VoidConfirmModal from './components/VoidConfirmModal';
import ExtendReturnModal from './components/ExtendReturnModal';
import ApproveRejectModal from './components/ApproveRejectModal';
import QrScannerModal from './components/QrScannerModal';
import { StaffBorrowPortal } from './components/StaffBorrowPortal';
import { formatBangkokDate, formatBangkokDateTime } from '@/lib/datetime';

export default function BorrowsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [availableAssets, setAvailableAssets] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [isBorrowOpen, setIsBorrowOpen] = useState(false);
  const [isReturnOpen, setIsReturnOpen] = useState(false);
  const [isVoidOpen, setIsVoidOpen] = useState(false);
  const [isExtendOpen, setIsExtendOpen] = useState(false);
  const [isApproveRejectOpen, setIsApproveRejectOpen] = useState(false);
  const [approveRejectAction, setApproveRejectAction] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [isQrOpen, setIsQrOpen] = useState(false);

  // Active target record
  const [targetLog, setTargetLog] = useState<any | null>(null);
  const [prefilledAssetId, setPrefilledAssetId] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch session information indirectly or via cookie
      const [logsRes, assetsRes, usersRes, userSessionRes] = await Promise.all([
        getBorrowLogs(searchQuery, statusFilter),
        getAvailableAssets(),
        getUsersList(),
        getCurrentUserSession(),
      ]);

      if (logsRes.success && logsRes.data) {
        setLogs(logsRes.data);
      }
      if (assetsRes.success && assetsRes.data) {
        setAvailableAssets(assetsRes.data);
      }
      if (usersRes.success && usersRes.data) {
        setUsers(usersRes.data);
      }
      if (userSessionRes.success && userSessionRes.data) {
        setCurrentUser(userSessionRes.data);
      }
    } catch (err) {
      console.error('Failed to load borrows data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [searchQuery, statusFilter]);

  // If user is logged in as STAFF, show Full-Page Staff Borrow Portal directly
  if (currentUser && currentUser.role !== 'ADMIN') {
    return (
      <StaffBorrowPortal
        currentUser={currentUser}
        availableAssets={availableAssets}
        userLogs={logs}
        onRefresh={loadData}
      />
    );
  }

  // Statistics calculation
  const pendingCount = logs.filter((l) => l.status === 'PENDING_APPROVAL').length;
  const activeCount = logs.filter((l) => l.status === 'BORROWED' && !l.isOverdue).length;
  const overdueCount = logs.filter((l) => l.isOverdue).length;
  const returnedCount = logs.filter((l) => l.status === 'RETURNED').length;

  const handleOpenBorrow = (assetId?: string) => {
    setPrefilledAssetId(assetId || '');
    setIsBorrowOpen(true);
  };

  const handleQrScanSuccess = (scannedCode: string) => {
    setPrefilledAssetId(scannedCode);
    setIsBorrowOpen(true);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <ArrowLeftRight className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            <span>ยืม-คืน อุปกรณ์ (Asset Borrowing & Loans)</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            ยื่นคำขอยืมอุปกรณ์ ติดตามสถานะการอนุมัติ และบันทึกประวัติการรับคืน
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => setIsQrOpen(true)}
            className="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-medium rounded-xl transition flex items-center gap-2 border border-slate-200 dark:border-slate-700"
          >
            <QrCode className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>สแกน QR Code</span>
          </button>

          <button
            onClick={() => handleOpenBorrow()}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-md shadow-indigo-600/20 transition flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>ส่งคำขอยืมอุปกรณ์</span>
          </button>
        </div>
      </div>

      {/* Staff Quick Borrow Form Banner */}
      {currentUser && currentUser.role !== 'ADMIN' && (
        <div className="p-5 bg-gradient-to-r from-indigo-600 to-blue-600 rounded-2xl text-white shadow-md flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 bg-white/20 backdrop-blur-xs rounded-full text-xs font-bold uppercase tracking-wider">
              <span>สำหรับพนักงาน (Staff Portal)</span>
            </div>
            <h2 className="text-xl font-extrabold">แบบฟอร์มยื่นคำขอยืมอุปกรณ์</h2>
            <p className="text-xs text-indigo-100">
              สวัสดีคุณ <span className="font-bold underline">{currentUser.username}</span> คุณสามารถเลือกอุปกรณ์ที่ต้องการยืม ระบุวันคืน และยื่นคำขอให้อนุมัติได้ทันที
            </p>
          </div>
          
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setIsQrOpen(true)}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-sm rounded-xl border border-white/20 transition flex items-center gap-2"
            >
              <QrCode className="w-4 h-4" />
              <span>สแกน QR อุปกรณ์</span>
            </button>
            <button
              onClick={() => handleOpenBorrow()}
              className="px-5 py-2.5 bg-white text-indigo-700 hover:bg-indigo-50 font-bold text-sm rounded-xl shadow-sm transition flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>กรอกแบบฟอร์มขอยืมอุปกรณ์</span>
            </button>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">คำขอรออนุมัติ</p>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{pendingCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">กำลังยืมอยู่</p>
            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{activeCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Laptop className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">เกินกำหนดคืน (Overdue)</p>
            <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">{overdueCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-rose-600 dark:text-rose-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">คืนแล้วทั้งหมด</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{returnedCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหาชื่ออุปกรณ์, รหัส Asset ID, ผู้ยืม หรือแผนก..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 dark:text-slate-100"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'ALL', label: 'ทั้งหมด' },
            { id: 'PENDING_APPROVAL', label: 'รออนุมัติ 🔔' },
            { id: 'BORROWED', label: 'กำลังยืมอยู่' },
            { id: 'OVERDUE', label: 'เกินกำหนดคืน ⚠️' },
            { id: 'RETURNED', label: 'คืนแล้ว' },
            { id: 'REJECTED', label: 'ปฏิเสธ' },
            { id: 'VOIDED', label: 'ยกเลิก' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}

          <button
            onClick={() => loadData()}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition ml-1"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Borrow Logs Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold text-xs uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5">อุปกรณ์ (Asset)</th>
                <th className="px-5 py-3.5">ผู้ยืม (Borrower)</th>
                <th className="px-5 py-3.5">วันที่ยืม/ยื่นคำขอ</th>
                <th className="px-5 py-3.5">กำหนดคืน</th>
                <th className="px-5 py-3.5">วันที่คืนจริง</th>
                <th className="px-5 py-3.5">สถานะ</th>
                <th className="px-5 py-3.5 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
                      <span>กำลังโหลดข้อมูลยืม-คืน...</span>
                    </div>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-slate-400">
                    ไม่พบรายการยืม-คืนอุปกรณ์ตามเงื่อนไขที่เลือก
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const isPending = log.status === 'PENDING_APPROVAL';
                  const isBorrowed = log.status === 'BORROWED';
                  const isReturned = log.status === 'RETURNED';
                  const isRejected = log.status === 'REJECTED';
                  const isVoided = log.status === 'VOIDED';
                  const isOverdue = log.isOverdue;

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition"
                    >
                      {/* Asset Details */}
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <span>{log.asset?.name || 'ไม่ทราบชื่ออุปกรณ์'}</span>
                          {log.quantity && log.quantity > 1 && (
                            <span className="text-xs bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 font-bold px-2 py-0.5 rounded-full">
                              x{log.quantity} ชิ้น
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                          <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-sm">
                            {log.asset?.assetId}
                          </span>
                          {log.asset?.category && (
                            <span>• {log.asset.category.name}</span>
                          )}
                        </div>
                      </td>

                      {/* Borrower Details */}
                      <td className="px-5 py-4">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {log.borrowerName}
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                          {log.borrowerDept && (
                            <span className="flex items-center gap-1">
                              <Building className="w-3 h-3" />
                              {log.borrowerDept}
                            </span>
                          )}
                          {log.borrowerContact && (
                            <span>• {log.borrowerContact}</span>
                          )}
                        </div>
                      </td>

                      {/* Borrow Date / Request Created */}
                      <td className="px-5 py-4 text-xs font-medium text-slate-600 dark:text-slate-300">
                        {formatBangkokDate(log.borrowDate || log.createdAt)}
                      </td>

                      {/* Expected Return Date & Overdue Tag */}
                      <td className="px-5 py-4 text-xs">
                        <div className="font-medium text-slate-700 dark:text-slate-300">
                          {formatBangkokDate(log.expectedReturnDate)}
                        </div>
                        {log.originalReturnDate &&
                          new Date(log.originalReturnDate).getTime() !==
                            new Date(log.expectedReturnDate).getTime() && (
                            <div className="text-[10px] text-indigo-500 dark:text-indigo-400 mt-0.5">
                              (ต่อเวลามาจาก: {formatBangkokDate(log.originalReturnDate)})
                            </div>
                          )}
                      </td>

                      {/* Actual Return Date & Condition */}
                      <td className="px-5 py-4 text-xs">
                        {log.actualReturnDate ? (
                          <div>
                            <div className="font-medium text-slate-700 dark:text-slate-300">
                              {formatBangkokDate(log.actualReturnDate)}
                            </div>
                            {log.returnCondition === 'DAMAGED' ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 mt-0.5">
                                <AlertTriangle className="w-3 h-3" /> ชำรุด/ส่งซ่อม
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 mt-0.5">
                                <CheckCircle2 className="w-3 h-3" /> สภาพปกติ
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="px-5 py-4">
                        {isOverdue ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300 animate-pulse border border-rose-300 dark:border-rose-800">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>เกินกำหนดคืน</span>
                          </span>
                        ) : isPending ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            <span>รออนุมัติ</span>
                          </span>
                        ) : isBorrowed ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                            <Laptop className="w-3.5 h-3.5 shrink-0" />
                            <span>กำลังยืมอยู่</span>
                          </span>
                        ) : isReturned ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>คืนแล้ว</span>
                          </span>
                        ) : isRejected ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300">
                            <XCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>ปฏิเสธคำขอ</span>
                          </span>
                        ) : isVoided ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            <AlertOctagon className="w-3.5 h-3.5 shrink-0" />
                            <span>ยกเลิกรายการ</span>
                          </span>
                        ) : null}
                      </td>

                      {/* Action Buttons */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Admin Actions for Pending Approval */}
                          {isPending && (
                            <>
                              <button
                                onClick={() => {
                                  setTargetLog(log);
                                  setApproveRejectAction('APPROVE');
                                  setIsApproveRejectOpen(true);
                                }}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition shadow-xs flex items-center gap-1"
                                title="อนุมัติคำขอ"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>อนุมัติ</span>
                              </button>
                              <button
                                onClick={() => {
                                  setTargetLog(log);
                                  setApproveRejectAction('REJECT');
                                  setIsApproveRejectOpen(true);
                                }}
                                className="px-2.5 py-1.5 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 text-rose-600 dark:text-rose-400 text-xs font-medium rounded-lg transition border border-rose-200 dark:border-rose-800 flex items-center gap-1"
                                title="ปฏิเสธคำขอ"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>ปฏิเสธ</span>
                              </button>
                            </>
                          )}

                          {/* Admin & Borrower Actions for Active Borrow */}
                          {isBorrowed && (
                            <>
                              <button
                                onClick={() => {
                                  setTargetLog(log);
                                  setIsReturnOpen(true);
                                }}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition shadow-xs flex items-center gap-1"
                                title="ทำรายการคืน"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>รับคืน</span>
                              </button>

                              <button
                                onClick={() => {
                                  setTargetLog(log);
                                  setIsExtendOpen(true);
                                }}
                                className="px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-600 dark:text-indigo-400 text-xs font-medium rounded-lg transition flex items-center gap-1 border border-indigo-200 dark:border-indigo-800"
                                title="ต่อเวลาวันกำหนดคืน"
                              >
                                <Clock className="w-3.5 h-3.5" />
                                <span>ต่อเวลา</span>
                              </button>

                              <button
                                onClick={() => {
                                  setTargetLog(log);
                                  setIsVoidOpen(true);
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition"
                                title="ยกเลิกรายการ (Void)"
                              >
                                <AlertOctagon className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>

                        {isRejected && log.rejectReason && (
                          <div className="text-[11px] text-rose-500 dark:text-rose-400 mt-1">
                            เหตุผล: {log.rejectReason}
                          </div>
                        )}

                        {isVoided && log.voidReason && (
                          <div className="text-[11px] text-slate-400 italic mt-1">
                            {log.voidReason}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      <BorrowModal
        isOpen={isBorrowOpen}
        onClose={() => setIsBorrowOpen(false)}
        availableAssets={availableAssets}
        users={users}
        currentUser={currentUser}
        initialAssetId={prefilledAssetId}
        onSuccess={loadData}
      />

      <ReturnModal
        isOpen={isReturnOpen}
        onClose={() => {
          setIsReturnOpen(false);
          setTargetLog(null);
        }}
        borrowLog={targetLog}
        onSuccess={loadData}
      />

      <VoidConfirmModal
        isOpen={isVoidOpen}
        onClose={() => {
          setIsVoidOpen(false);
          setTargetLog(null);
        }}
        borrowLog={targetLog}
        onSuccess={loadData}
      />

      <ExtendReturnModal
        isOpen={isExtendOpen}
        onClose={() => {
          setIsExtendOpen(false);
          setTargetLog(null);
        }}
        borrowLog={targetLog}
        onSuccess={loadData}
      />

      <ApproveRejectModal
        isOpen={isApproveRejectOpen}
        onClose={() => {
          setIsApproveRejectOpen(false);
          setTargetLog(null);
        }}
        borrowLog={targetLog}
        actionType={approveRejectAction}
        onSuccess={loadData}
      />

      <QrScannerModal
        isOpen={isQrOpen}
        onClose={() => setIsQrOpen(false)}
        onScanSuccess={handleQrScanSuccess}
      />
    </div>
  );
}
