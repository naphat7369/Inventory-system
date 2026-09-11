'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, CheckCircle2, AlertCircle, History, Users } from 'lucide-react';
import { AssignmentDetail } from './components/EditSlotModal';
import { SlotTable } from './components/SlotTable';
import { AssignSlotModal } from './components/AssignSlotModal';
import { EditSlotModal } from './components/EditSlotModal';
import { ExportSlotsButton } from './components/ExportSlotsButton';
import { unassignLicenseSlot } from '@/app/actions';

interface SlotManagementSectionProps {
  licenseId: string;
  totalSlots: number;
  initialAssignments: AssignmentDetail[];
  isAdmin: boolean;
}

export function SlotManagementSection({
  licenseId,
  totalSlots,
  initialAssignments,
  isAdmin,
}: SlotManagementSectionProps) {
  const router = useRouter();
  const [filter, setFilter] = useState<'active' | 'history' | 'all'>('active');
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<AssignmentDetail | null>(null);

  // Single Source of Truth for Slot Usage
  const activeAssignments = initialAssignments.filter((a) => a.isActive);
  const historyAssignments = initialAssignments.filter((a) => !a.isActive);

  const usedSlots = activeAssignments.length;
  const availableSlots = Math.max(0, totalSlots - usedSlots);
  const isFull = availableSlots <= 0;
  const usedRatio = totalSlots > 0 ? (usedSlots / totalSlots) * 100 : 0;

  // Filtered list for display
  const displayedAssignments =
    filter === 'active'
      ? activeAssignments
      : filter === 'history'
      ? historyAssignments
      : initialAssignments;

  const handleUnassignAction = async (assignmentId: string) => {
    await unassignLicenseSlot(assignmentId);
    router.refresh();
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
      {/* Header & Usage Stats */}
      <div className="p-6 border-b border-gray-200 dark:border-slate-700 bg-gray-50/70 dark:bg-slate-800/40">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Users size={22} className="text-blue-600 dark:text-blue-400" />
              Slot Management
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-0.5">
              Assign available slots to team members with hybrid user & device linking
            </p>
          </div>

          <div className="flex items-center gap-4 self-end md:self-auto">
            <div className="text-right">
              <div className="text-2xl font-bold flex items-end justify-end gap-1">
                <span className={isFull ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}>
                  {usedSlots}
                </span>
                <span className="text-gray-400 text-lg font-normal">/ {totalSlots}</span>
              </div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {isFull ? 'All Slots Used' : `${availableSlots} Available Seats`}
              </p>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="w-full h-2.5 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ease-out ${
                isFull
                  ? 'bg-red-500 dark:bg-red-600'
                  : usedRatio > 80
                  ? 'bg-amber-500 dark:bg-amber-600'
                  : 'bg-blue-600 dark:bg-blue-500'
              }`}
              style={{ width: `${Math.min(usedRatio, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Control Bar: Filter Tabs & Actions */}
      <div className="p-4 border-b border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
        {/* Tabs */}
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-slate-800/80 p-1 rounded-lg self-start">
          <button
            type="button"
            onClick={() => setFilter('active')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
              filter === 'active'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
            }`}
          >
            <span>Active</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300">
              {activeAssignments.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilter('history')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
              filter === 'history'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
            }`}
          >
            <History size={12} />
            <span>History</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300">
              {historyAssignments.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
              filter === 'all'
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-2xs'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
            }`}
          >
            <span>All</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300">
              {initialAssignments.length}
            </span>
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          {/* Excel Export Button */}
          <ExportSlotsButton licenseId={licenseId} filter={filter} />

          {/* Assign Slot Button */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => setIsAssignOpen(true)}
              disabled={isFull}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white rounded-lg transition-colors shadow-2xs ${
                isFull
                  ? 'bg-gray-400 cursor-not-allowed opacity-60'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
              title={isFull ? 'No available slots remaining' : 'Assign a new slot'}
            >
              <UserPlus size={15} />
              <span>Assign Slot</span>
            </button>
          )}
        </div>
      </div>

      {/* Table Section */}
      <div className="p-4 sm:p-6">
        <SlotTable
          assignments={displayedAssignments}
          isAdmin={isAdmin}
          onEdit={(assignment) => setEditingAssignment(assignment)}
          onUnassign={handleUnassignAction}
        />
      </div>

      {/* Assign Modal */}
      <AssignSlotModal
        isOpen={isAssignOpen}
        onClose={() => setIsAssignOpen(false)}
        licenseId={licenseId}
        isFull={isFull}
        onSuccess={() => {
          router.refresh();
        }}
      />

      {/* Edit Modal */}
      <EditSlotModal
        isOpen={editingAssignment !== null}
        onClose={() => setEditingAssignment(null)}
        assignment={editingAssignment}
        onSuccess={() => {
          router.refresh();
        }}
      />
    </div>
  );
}
