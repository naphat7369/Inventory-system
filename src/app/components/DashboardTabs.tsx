'use me';
'use client';

import React, { useState } from 'react';
import { Package, Boxes, Building, Activity, Clock } from 'lucide-react';

interface DashboardTabsProps {
  overviewComponent: React.ReactNode;
  quantityStockComponent: React.ReactNode;
  departmentStatsComponent: React.ReactNode;
  recentActivityComponent: React.ReactNode;
}

export function DashboardTabs({
  overviewComponent,
  quantityStockComponent,
  departmentStatsComponent,
  recentActivityComponent,
}: DashboardTabsProps) {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'QUANTITY_STOCK' | 'DEPARTMENT_STATS' | 'RECENT_ACTIVITY'>('OVERVIEW');

  const tabs = [
    {
      id: 'OVERVIEW',
      label: 'ภาพรวมสินทรัพย์หลัก',
      sublabel: 'Asset Overview & Status',
      icon: Package,
    },
    {
      id: 'QUANTITY_STOCK',
      label: 'สต็อกอุปกรณ์นับจำนวน',
      sublabel: 'Quantity Borrowables Stock',
      icon: Boxes,
    },
    {
      id: 'DEPARTMENT_STATS',
      label: 'สถิติยืมแยกตามแผนก',
      sublabel: 'Department Borrowing Stats',
      icon: Building,
    },
    {
      id: 'RECENT_ACTIVITY',
      label: 'ประวัติทำรายการล่าสุด',
      sublabel: 'Recent Audit & Activity Log',
      icon: Clock,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Topic Tabs Bar */}
      <div className="bg-bg border border-border p-2 rounded-none md:rounded-sm shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`p-3 text-left rounded-none md:rounded-sm transition border flex items-center gap-2.5 ${
                  isActive
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-gray-50/50 dark:bg-slate-900/50 text-text/80 border-border hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div
                  className={`p-2 rounded-sm shrink-0 ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="overflow-hidden">
                  <div className="font-bold text-xs leading-tight truncate">{tab.label}</div>
                  <div className={`text-[9px] uppercase font-mono tracking-wider truncate ${isActive ? 'text-indigo-100' : 'text-text/50'}`}>
                    {tab.sublabel}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Render Topic Content Based on Active Tab */}
      <div className="transition-all duration-200">
        {activeTab === 'OVERVIEW' && overviewComponent}
        {activeTab === 'QUANTITY_STOCK' && quantityStockComponent}
        {activeTab === 'DEPARTMENT_STATS' && departmentStatsComponent}
        {activeTab === 'RECENT_ACTIVITY' && recentActivityComponent}
      </div>
    </div>
  );
}
