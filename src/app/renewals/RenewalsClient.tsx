'use client';

import { useState, useTransition } from 'react';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  FileCheck,
  Paperclip,
  ShieldAlert,
  ShieldCheck,
  Building,
  DollarSign,
  X,
  Boxes,
  List,
  Layers,
} from 'lucide-react';
import { deleteRenewalContract, getRenewalContracts } from '@/app/actions';
import { RenewalModal } from './components/RenewalModal';
import { RenewalDetailModal } from './components/RenewalDetailModal';
import { RenewActionModal } from './components/RenewActionModal';

interface RenewalsClientProps {
  initialContracts: any[];
}

export function RenewalsClient({ initialContracts }: RenewalsClientProps) {
  const [contracts, setContracts] = useState<any[]>(initialContracts);
  const [activeTab, setActiveTab] = useState<string>('ALL'); // ALL, EXPIRING_SOON, EXPIRED, ACTIVE
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [isPending, startTransition] = useTransition();

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<any | null>(null);
  const [viewingContract, setViewingContract] = useState<any | null>(null);
  const [renewingContract, setRenewingContract] = useState<any | null>(null);
  const [deletingContract, setDeletingContract] = useState<any | null>(null);

  const fetchLatestData = async () => {
    startTransition(async () => {
      try {
        const latest = await getRenewalContracts();
        setContracts(latest);

        if (viewingContract) {
          const updatedViewing = latest.find((c) => c.id === viewingContract.id);
          if (updatedViewing) setViewingContract(updatedViewing);
        }
      } catch (err) {
        console.error('Failed to refresh renewal contracts:', err);
      }
    });
  };

  const handleDeleteConfirm = async () => {
    if (!deletingContract) return;

    try {
      const res = await deleteRenewalContract(deletingContract.id);
      if (res.success) {
        setDeletingContract(null);
        await fetchLatestData();
      } else {
        alert('ลบสัญญาไม่สำเร็จ');
      }
    } catch (err: any) {
      alert(err?.message || 'เกิดข้อผิดพลาดในการลบสัญญา');
    }
  };

  // Stats calculation
  const totalContracts = contracts.length;
  const expiredContracts = contracts.filter((c) => c.status === 'EXPIRED').length;
  const expiringSoonContracts = contracts.filter((c) => c.status === 'EXPIRING_SOON').length;
  const activeContracts = contracts.filter((c) => c.status === 'ACTIVE').length;

  const totalAttachments = contracts.reduce((sum, c) => sum + (c.attachments?.length || 0), 0);
  const totalValueCents = contracts.reduce((sum, c) => sum + (c.costCents || 0), 0);

  // Filter logic
  const filteredContracts = contracts.filter((c) => {
    if (activeTab !== 'ALL' && c.status !== activeTab) return false;
    if (selectedCategory !== 'ALL' && c.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchTitle = c.title.toLowerCase().includes(q);
      const matchNo = c.contractNo?.toLowerCase().includes(q) || false;
      const matchVendor = c.vendor?.toLowerCase().includes(q) || false;
      if (!matchTitle && !matchNo && !matchVendor) return false;
    }
    return true;
  });

  const calculateDaysLeft = (endDate: string) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);
    const diffTime = end.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getStatusBadge = (status: string, daysLeft: number) => {
    if (status === 'EXPIRED') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-xs font-bold rounded-full">
          <AlertTriangle className="w-3.5 h-3.5" />
          หมดอายุแล้ว ({Math.abs(daysLeft)} วันก่อน)
        </span>
      );
    }
    if (status === 'EXPIRING_SOON') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-xs font-bold rounded-full">
          <Clock className="w-3.5 h-3.5" />
          เหลือ {daysLeft} วัน
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-full">
        <CheckCircle2 className="w-3.5 h-3.5" />
        ปกติ (เหลือ {daysLeft} วัน)
      </span>
    );
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header (Exact match with /quantity-assets style) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-mono text-xs uppercase tracking-wider mb-1">
            <FileText className="w-4 h-4" />
            <span>Contract & Service Renewal Archive</span>
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            เอกสารต่ออายุ (Renewals)
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            บริหารจัดการสัญญา MA, โดเมน, ประกันภัย และค่าบริการ พร้อมระบบแจ้งเตือนวันหมดอายุอัตโนมัติและพรีวิวไฟล์
          </p>
        </div>

        <button
          onClick={() => {
            setEditingContract(null);
            setIsCreateModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-xs transition shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>เพิ่มสัญญาต่ออายุใหม่</span>
        </button>
      </div>

      {/* Main Sub-Topic Navigation Tabs (Exact match with /quantity-assets) */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab('ALL')}
          className={`px-4 py-2.5 font-bold text-sm rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'ALL'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>สัญญาทั้งหมด ({totalContracts})</span>
        </button>

        <button
          onClick={() => setActiveTab('EXPIRING_SOON')}
          className={`px-4 py-2.5 font-bold text-sm rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'EXPIRING_SOON'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>ใกล้หมดอายุ ({expiringSoonContracts})</span>
        </button>

        <button
          onClick={() => setActiveTab('EXPIRED')}
          className={`px-4 py-2.5 font-bold text-sm rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'EXPIRED'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>หมดอายุแล้ว ({expiredContracts})</span>
        </button>

        <button
          onClick={() => setActiveTab('ACTIVE')}
          className={`px-4 py-2.5 font-bold text-sm rounded-xl transition flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'ACTIVE'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>สถานะปกติ ({activeContracts})</span>
        </button>
      </div>

      {/* Summary KPI Cards (Exact match with /quantity-assets style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <FileCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">สัญญาทั้งหมด</div>
            <div className="text-2xl font-black text-slate-900 dark:text-slate-100">{totalContracts} รายการ</div>
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">ใกล้หมดอายุ</div>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400">{expiringSoonContracts} รายการ</div>
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400 rounded-xl">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">หมดอายุแล้ว</div>
            <div className="text-2xl font-black text-rose-600 dark:text-rose-400">{expiredContracts} รายการ</div>
          </div>
        </div>

        <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">สถานะปกติ</div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{activeContracts} รายการ</div>
          </div>
        </div>
      </div>

      {/* Toolbar (Exact match with /quantity-assets) */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="ค้นหาชื่อสัญญา, เลขที่, คู่สัญญา หรือประเภท..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 dark:text-slate-100"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="relative min-w-[160px]">
            <Filter className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium"
            >
              <option value="ALL">ทุกประเภทสัญญา</option>
              <option value="Service">สัญญาบริการ (Service)</option>
              <option value="MA">สัญญาบำรุงรักษา (MA)</option>
              <option value="Domain">โดเมน / โฮสติ้ง</option>
              <option value="Insurance">ประกันภัย</option>
              <option value="License">ซอฟต์แวร์สิทธิ์</option>
              <option value="Other">อื่นๆ</option>
            </select>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium px-2 hidden sm:block">
            เอกสารแนบรวม: <span className="font-bold text-indigo-600 dark:text-indigo-400">{totalAttachments} ไฟล์</span>
          </div>
        </div>
      </div>

      {/* Table (Exact match with /quantity-assets) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="px-5 py-3.5">ชื่อสัญญา / เลขที่สัญญา</th>
                <th className="px-5 py-3.5">ประเภท</th>
                <th className="px-5 py-3.5">คู่สัญญา (Vendor)</th>
                <th className="px-5 py-3.5">มูลค่า/ค่าต่ออายุ</th>
                <th className="px-5 py-3.5">วันหมดอายุ</th>
                <th className="px-5 py-3.5">สถานะ</th>
                <th className="px-5 py-3.5 text-center">ไฟล์แนบ</th>
                <th className="px-5 py-3.5 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
              {filteredContracts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                    <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <div>ไม่พบรายการสัญญาต่ออายุที่ตรงกับเงื่อนไข</div>
                  </td>
                </tr>
              ) : (
                filteredContracts.map((c) => {
                  const daysLeft = calculateDaysLeft(c.endDate);
                  const attCount = c.attachments?.length || 0;

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                      <td className="px-5 py-4">
                        <div
                          onClick={() => setViewingContract(c)}
                          className="font-bold text-slate-900 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition cursor-pointer"
                        >
                          {c.title}
                        </div>
                        {c.contractNo && (
                          <div className="text-xs text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                            <span className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-sm">
                              {c.contractNo}
                            </span>
                          </div>
                        )}
                      </td>

                      <td className="px-5 py-4">
                        <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md font-semibold text-xs border border-slate-200 dark:border-slate-700">
                          {c.category}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-slate-600 dark:text-slate-300 font-medium">
                        {c.vendor || '-'}
                      </td>

                      <td className="px-5 py-4 font-bold text-emerald-600 dark:text-emerald-400">
                        {c.costCents !== null && c.costCents !== undefined
                          ? (c.costCents / 100).toLocaleString('th-TH') + ' ฿'
                          : '-'}
                      </td>

                      <td className="px-5 py-4 font-medium text-slate-700 dark:text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {new Date(c.endDate).toLocaleDateString('th-TH', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4">{getStatusBadge(c.status, daysLeft)}</td>

                      <td className="px-5 py-4 text-center">
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md text-xs font-semibold text-slate-600 dark:text-slate-400">
                          <Paperclip className="w-3.5 h-3.5 text-indigo-500" />
                          <span>{attCount}</span>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setViewingContract(c)}
                            className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg transition flex items-center gap-1"
                            title="ดูรายละเอียดและพรีวิวไฟล์"
                          >
                            <Eye className="w-3.5 h-3.5 text-indigo-500" /> รายละเอียด
                          </button>

                          <button
                            onClick={() => setRenewingContract(c)}
                            className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 text-emerald-600 dark:text-emerald-400 text-xs font-semibold rounded-lg transition flex items-center gap-1"
                            title="ต่ออายุสัญญานี้"
                          >
                            <RefreshCw className="w-3.5 h-3.5" /> ต่ออายุ
                          </button>

                          <button
                            onClick={() => {
                              setEditingContract(c);
                              setIsCreateModalOpen(true);
                            }}
                            className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition"
                            title="แก้ไข"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setDeletingContract(c)}
                            className="p-1.5 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 rounded-lg transition"
                            title="ลบ"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
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
      <RenewalModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingContract(null);
        }}
        onSuccess={fetchLatestData}
        initialData={editingContract}
      />

      <RenewalDetailModal
        isOpen={!!viewingContract}
        onClose={() => setViewingContract(null)}
        onRefresh={fetchLatestData}
        contract={viewingContract}
        onOpenRenewModal={(contractToRenew) => setRenewingContract(contractToRenew)}
      />

      <RenewActionModal
        isOpen={!!renewingContract}
        onClose={() => setRenewingContract(null)}
        onSuccess={fetchLatestData}
        contract={renewingContract}
      />

      {/* Delete Confirmation Modal (Exact match with /quantity-assets style) */}
      {deletingContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md p-6 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 font-bold text-lg">
              <Trash2 className="w-6 h-6 shrink-0" />
              <span>ยืนยันลบรายการสัญญาต่ออายุ</span>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-300">
              คุณแน่ใจหรือไม่ว่าต้องการลบรายการสัญญา <strong className="text-slate-900 dark:text-slate-100">{deletingContract.title}</strong> และไฟล์แนบทั้งหมด?
            </p>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDeletingContract(null)}
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="px-5 py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition"
              >
                ยืนยันลบรายการ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
