'use me';
'use client';

import React, { useEffect, useState } from 'react';
import { PackageCheck, RefreshCw, PieChart as PieIcon, Table } from 'lucide-react';
import { getQuantityAssetsStock } from '../borrows/actions';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';

export function QuantityAssetStock() {
  const [items, setItems] = useState<any[]>([]);
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
    async function loadStock() {
      setLoading(true);
      try {
        const res = await getQuantityAssetsStock();
        if (res.success && res.data) {
          setItems(res.data);
        }
      } catch (err) {
        console.error('Failed to load quantity assets stock:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStock();
  }, []);

  if (loading) {
    return (
      <div className="bg-bg border border-border p-6 rounded-none md:rounded-sm flex items-center justify-center min-h-[140px] mb-8">
        <div className="flex items-center gap-2 text-text/50 font-mono text-sm">
          <RefreshCw className="w-4 h-4 animate-spin text-accent-primary" />
          <span>[ Loading consumable stock overview... ]</span>
        </div>
      </div>
    );
  }

  if (items.length === 0) return null;

  // Chart data formatted for Donut Chart (Total Quantity by Item)
  const chartData = items.map((item) => ({
    name: `${item.name} (คงเหลือ ${item.available}/${item.total})`,
    value: item.total,
    available: item.available,
    borrowed: item.borrowed,
  }));

  return (
    <div className="bg-bg border border-border rounded-none md:rounded-sm overflow-hidden mb-8 shadow-xs">
      {/* Header with View Toggle */}
      <div className="p-6 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <PackageCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h2 className="font-display uppercase tracking-widest text-sm text-text font-bold">
            Quantity Borrowables Inventory Stock (สถิติตรวจสอบสต็อกอุปกรณ์แบบนับจำนวน)
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
        {/* CHART VIEW MODE - Interactive Pie/Donut Chart Style matching InteractivePieChart */}
        {viewMode === 'CHART' ? (
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {items.map((item) => {
              const percentAvailable = Math.round((item.available / item.total) * 100);
              const isLowStock = item.available === 0;

              return (
                <div
                  key={item.id}
                  className={`p-4 border rounded-none md:rounded-sm space-y-2 transition ${
                    isLowStock
                      ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800'
                      : 'bg-gray-50/50 dark:bg-slate-900/50 border-border hover:border-indigo-500/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-text text-sm">{item.name}</h3>
                      <p className="text-xs font-mono text-text/50">[{item.assetId}]</p>
                    </div>
                    {isLowStock ? (
                      <span className="text-[10px] bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold px-2 py-0.5 rounded-xs uppercase">
                        Out of stock
                      </span>
                    ) : (
                      <span className="text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold px-2 py-0.5 rounded-xs">
                        {percentAvailable}% คงเหลือ
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-xs text-text/70">
                      <span>จำนวนทั้งหมด:</span>
                      <span className="font-semibold text-text">{item.total} ชิ้น</span>
                    </div>
                    <div className="flex justify-between text-xs text-text/70">
                      <span>ยืมไปแล้ว:</span>
                      <span className="font-semibold text-indigo-600 dark:text-indigo-400">{item.borrowed} ชิ้น</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold text-text">
                      <span>คงเหลือพร้อมยืม:</span>
                      <span className={isLowStock ? 'text-rose-600' : 'text-emerald-600 dark:text-emerald-400'}>
                        {item.available} ชิ้น
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
                    <div
                      className={`h-full transition-all ${
                        isLowStock ? 'bg-rose-500' : 'bg-indigo-600 dark:bg-indigo-400'
                      }`}
                      style={{ width: `${percentAvailable}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
