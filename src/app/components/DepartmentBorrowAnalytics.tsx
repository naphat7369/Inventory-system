'use me';
'use client';

import React, { useEffect, useState } from 'react';
import { Building, RefreshCw, PieChart as PieIcon, Table } from 'lucide-react';
import { getDepartmentBorrowStats } from '../borrows/actions';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';

export function DepartmentBorrowAnalytics() {
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'CHART' | 'TABLE'>('CHART');

  const COLORS = [
    '#E24A22', // Safety Orange
    '#4C6246', // Utility Green
    '#1C1C1A', // Near Black
    '#D4D6CF', // Steel Gray
    '#F26A42', // Lighter Orange
    '#6B8265', // Lighter Green
    '#4A4A48', // Lighter Black
  ];

  useEffect(() => {
    async function loadStats() {
      setLoading(true);
      try {
        const res = await getDepartmentBorrowStats();
        if (res.success && res.data) {
          setStats(res.data);
        }
      } catch (err) {
        console.error('Failed to load department borrow stats:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="bg-bg border border-border p-6 rounded-none md:rounded-sm flex items-center justify-center min-h-[160px]">
        <div className="flex items-center gap-2 text-text/50 font-mono text-sm">
          <RefreshCw className="w-4 h-4 animate-spin text-accent-primary" />
          <span>[ Loading department analytics... ]</span>
        </div>
      </div>
    );
  }

  // Format data for PieChart matching InteractivePieChart
  const chartData = stats.map((item) => ({
    name: `${item.department} (ยืมรวม ${item.totalBorrows} / กำลังยืม ${item.activeBorrows})`,
    value: item.totalBorrows,
    active: item.activeBorrows,
  }));

  return (
    <div className="bg-bg border border-border rounded-none md:rounded-sm overflow-hidden mb-8 shadow-xs">
      {/* Header with View Toggle */}
      <div className="p-6 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Building className="w-5 h-5 text-accent-primary" />
          <h2 className="font-display uppercase tracking-widest text-sm text-text font-bold">
            Department Borrowing Statistics (สถิติการยืมอุปกรณ์แยกตามแผนก/หน่วยงาน)
          </h2>
        </div>

        {/* View Mode Toggle Buttons */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0">
          <button
            onClick={() => setViewMode('CHART')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
              viewMode === 'CHART'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <PieIcon className="w-3.5 h-3.5" />
            <span>📊 กราฟสถิติ</span>
          </button>
          <button
            onClick={() => setViewMode('TABLE')}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition flex items-center gap-1.5 ${
              viewMode === 'TABLE'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            <span>📋 ตารางข้อมูล</span>
          </button>
        </div>
      </div>

      <div className="p-6">
        {stats.length === 0 ? (
          <div className="text-text/50 font-mono text-sm py-4 text-center">
            [ ไม่พบประวัติรายการยืมอุปกรณ์แยกตามแผนก ]
          </div>
        ) : viewMode === 'CHART' ? (
          /* CHART VIEW MODE - Interactive Pie/Donut Chart Style matching InteractivePieChart */
          <div className="flex-1 min-h-[280px] w-full">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                  stroke="none"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#F8F9F5',
                    borderColor: '#D4D6CF',
                    borderRadius: '4px',
                    color: '#1C1C1A',
                    fontFamily: 'var(--font-inter)',
                    fontSize: '12px',
                  }}
                  itemStyle={{ color: '#1C1C1A' }}
                />
                <Legend
                  verticalAlign="bottom"
                  height={36}
                  iconType="circle"
                  wrapperStyle={{ fontFamily: 'var(--font-inter)', fontSize: '12px', color: '#1C1C1A' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          /* TABLE VIEW MODE */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.map((item, idx) => (
              <div
                key={idx}
                className="bg-gray-50/50 dark:bg-slate-900/50 p-4 border border-border rounded-none md:rounded-sm space-y-2 hover:border-accent-primary/50 transition"
              >
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <span className="font-bold text-text text-sm flex items-center gap-1.5">
                    <Building className="w-4 h-4 text-blue-600" />
                    {item.department}
                  </span>
                  <span className="text-xs font-mono bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-xs">
                    {item.totalBorrows} รายการ
                  </span>
                </div>

                <div className="text-xs space-y-1 pt-1">
                  <div className="flex justify-between text-text/70">
                    <span>กำลังยืมอยู่:</span>
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                      {item.activeBorrows} รายการ
                    </span>
                  </div>
                  <div className="text-text/60">
                    <span className="font-medium text-text/80">อุปกรณ์ที่ถูกยืมบ่อย:</span>
                    <p className="text-[11px] text-text/70 mt-0.5 line-clamp-2">
                      {item.topItems}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
