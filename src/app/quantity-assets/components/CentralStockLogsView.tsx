'use me';
'use client';

import React, { useEffect, useState } from 'react';
import { History, Search, Filter, RefreshCw, AlertCircle, Building, User, FileText, CheckCircle2, Clock } from 'lucide-react';
import { getAllStockAdjustmentLogs } from '@/app/actions';
import { formatBangkokDateTime } from '@/lib/datetime';

interface CentralStockLogsViewProps {
  properties: Array<{ id: string; name: string }>;
}

export function CentralStockLogsView({ properties }: CentralStockLogsViewProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPropertyId, setSelectedPropertyId] = useState('ALL');
  const [selectedUsername, setSelectedUsername] = useState('ALL');

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getAllStockAdjustmentLogs();
      if (res.success && res.data) {
        setLogs(res.data);
      } else {
        setError(res.error || 'ไม่สามารถโหลดประวัติสต็อกรวมได้');
      }
    } catch (err: any) {
      setError(err.message || 'เกิดข้อผิดพลาดในการดึงประวัติสต็อกรวม');
    } finally {
      setLoading(false);
    }
  };

  // Distinct usernames for filter
  const usernames = [...new Set(logs.map((l) => l.username).filter(Boolean))];

  // Filtering logic
  const filteredLogs = logs.filter((log) => {
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = log.assetName?.toLowerCase().includes(q);
      const matchCode = log.assetCode?.toLowerCase().includes(q);
      const matchDetails = log.details?.toLowerCase().includes(q);
      const matchUser = log.username?.toLowerCase().includes(q);

      if (!matchName && !matchCode && !matchDetails && !matchUser) return false;
    }

    // Property filter
    if (selectedPropertyId !== 'ALL') {
      if (log.propertyId !== selectedPropertyId) return false;
    }

    // User filter
    if (selectedUsername !== 'ALL') {
      if (log.username !== selectedUsername) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls Bar */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 rounded-2xl">
              <History className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                ศูนย์รวมประวัติการปรับปรุงสต็อก (Centralized Stock Audit Log)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                ติดตามประวัติการปรับปรุงสต็อก เหตุผล วันที่ เวลา และผู้ทำรายการทั้งหมดในระบบ
              </p>
            </div>
          </div>

          <button
            onClick={loadLogs}
            disabled={loading}
            className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition flex items-center gap-2 shrink-0 self-start sm:self-auto"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>รีเฟรชประวัติ</span>
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหาชื่ออุปกรณ์, รหัส, เหตุผล..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden dark:text-slate-100 font-medium"
            />
          </div>

          {/* Property Dropdown Filter */}
          <div className="relative">
            <select
              value={selectedPropertyId}
              onChange={(e) => setSelectedPropertyId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden dark:text-slate-100 font-semibold"
            >
              <option value="ALL">🏢 กรองตามสาขา: ทั้งหมด ({properties.length} สาขา)</option>
              {properties.map((prop) => (
                <option key={prop.id} value={prop.id}>
                  สาขา: {prop.name}
                </option>
              ))}
            </select>
          </div>

          {/* User Dropdown Filter */}
          <div className="relative">
            <select
              value={selectedUsername}
              onChange={(e) => setSelectedUsername(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-hidden dark:text-slate-100 font-semibold"
            >
              <option value="ALL">👤 กรองตามผู้ทำรายการ: ทั้งหมด</option>
              {usernames.map((u) => (
                <option key={u} value={u}>
                  ผู้ปรับปรุง: {u}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Central Audit Trail Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-slate-400 space-y-2">
            <RefreshCw className="w-7 h-7 animate-spin mx-auto text-indigo-600" />
            <p className="text-xs font-mono">กำลังดึงประวัติ Audit Log การปรับสต็อกรวม...</p>
          </div>
        ) : error ? (
          <div className="p-6 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 m-6 rounded-2xl flex items-center gap-3 text-rose-700 dark:text-rose-300 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <th className="px-5 py-4">วันที่ & เวลา</th>
                  <th className="px-5 py-4">อุปกรณ์ & รหัส</th>
                  <th className="px-5 py-4">สาขา</th>
                  <th className="px-5 py-4">ผู้ปรับปรุง</th>
                  <th className="px-5 py-4">รายละเอียด & เหตุผลการปรับปรุง</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-slate-400">
                      <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <div>ไม่พบประวัติการปรับปรุงสต็อกตามเงื่อนไขตัวกรองที่เลือก</div>
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => {
                    const oldVal = log.oldValue ? JSON.parse(log.oldValue) : null;
                    const newVal = log.newValue ? JSON.parse(log.newValue) : null;

                    return (
                      <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                        <td className="px-5 py-4 text-xs font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-indigo-500" />
                            <span>{formatBangkokDateTime(log.createdAt)}</span>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="font-bold text-slate-900 dark:text-slate-100">{log.assetName}</div>
                          <div className="text-xs text-slate-400 font-mono mt-0.5">[{log.assetCode}]</div>
                        </td>

                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                            <Building className="w-3 h-3 text-indigo-500" />
                            {log.propertyName}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            <span>{log.username}</span>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                            {log.details}
                          </div>
                          {oldVal && newVal && (
                            <div className="flex flex-wrap gap-2 mt-1 text-[11px] font-mono">
                              <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md text-slate-600 dark:text-slate-400">
                                สต็อกรวม: {oldVal.totalQuantity || 1} ➔ {newVal.totalQuantity}
                              </span>
                              <span className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                                พร้อมยืม: {oldVal.availableQuantity || 1} ➔ {newVal.availableQuantity}
                              </span>
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
        )}
      </div>
    </div>
  );
}
