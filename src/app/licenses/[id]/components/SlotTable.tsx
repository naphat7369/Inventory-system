'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Pencil, UserMinus, Laptop, ExternalLink, Calendar, Mail, Phone, AlertTriangle, Loader2 } from 'lucide-react';
import { AssignmentDetail } from './EditSlotModal';

interface SlotTableProps {
  assignments: AssignmentDetail[];
  isAdmin: boolean;
  onEdit: (assignment: AssignmentDetail) => void;
  onUnassign: (assignmentId: string) => Promise<void>;
}

export function SlotTable({
  assignments,
  isAdmin,
  onEdit,
  onUnassign,
}: SlotTableProps) {
  const [unassigningId, setUnassigningId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const handleConfirmUnassign = async (id: string) => {
    try {
      setUnassigningId(id);
      await onUnassign(id);
      setConfirmId(null);
    } catch (err: any) {
      alert(err.message || 'Failed to unassign slot.');
    } finally {
      setUnassigningId(null);
    }
  };

  if (assignments.length === 0) {
    return (
      <div className="text-center p-12 bg-gray-50/50 dark:bg-slate-800/30 border border-dashed border-gray-200 dark:border-slate-800 rounded-xl">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No license slot assignments found in this view.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto border border-gray-200 dark:border-slate-800 rounded-xl">
        <table className="w-full text-left text-sm divide-y divide-gray-200 dark:divide-slate-800">
          <thead className="bg-gray-50 dark:bg-slate-800/60 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
            <tr>
              <th className="py-3.5 px-4 w-12 text-center">#</th>
              <th className="py-3.5 px-4">User</th>
              <th className="py-3.5 px-4">Department</th>
              <th className="py-3.5 px-4">Device / Asset</th>
              <th className="py-3.5 px-4">Assigned Date</th>
              <th className="py-3.5 px-4 text-center">Status</th>
              <th className="py-3.5 px-4">Notes</th>
              {isAdmin && <th className="py-3.5 px-4 text-right w-24">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900">
            {assignments.map((assignment, idx) => (
              <tr
                key={assignment.id}
                className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors ${
                  !assignment.isActive ? 'opacity-65 bg-gray-50/30 dark:bg-slate-900/40' : ''
                }`}
              >
                <td className="py-3.5 px-4 text-center font-bold text-gray-400 text-xs">
                  {idx + 1}
                </td>
                <td className="py-3.5 px-4">
                  <div className="font-semibold text-gray-900 dark:text-gray-100">
                    {assignment.assignedTo}
                  </div>
                  <div className="flex flex-col gap-0.5 mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    {assignment.assignedEmail && (
                      <span className="flex items-center gap-1">
                        <Mail size={12} className="shrink-0 text-gray-400" />
                        {assignment.assignedEmail}
                      </span>
                    )}
                    {assignment.phone && (
                      <span className="flex items-center gap-1">
                        <Phone size={12} className="shrink-0 text-gray-400" />
                        {assignment.phone}
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-3.5 px-4">
                  {assignment.department ? (
                    <span className="inline-block px-2.5 py-0.5 text-xs font-medium bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-md border border-gray-200 dark:border-slate-700">
                      {assignment.department}
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="py-3.5 px-4">
                  {assignment.assetId ? (
                    <Link
                      href={`/assets/${assignment.assetId}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-lg border border-blue-200 dark:border-blue-900/50 transition-colors group"
                      title="View linked inventory asset"
                    >
                      <Laptop size={13} className="text-blue-500 shrink-0" />
                      <span className="truncate max-w-[180px]">
                        {assignment.deviceName || assignment.asset?.name || assignment.assetId}
                      </span>
                      <ExternalLink size={11} className="opacity-60 group-hover:opacity-100 shrink-0" />
                    </Link>
                  ) : assignment.deviceName ? (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-xs text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-slate-800 rounded border border-gray-200 dark:border-slate-700">
                      <Laptop size={12} className="text-gray-400 shrink-0" />
                      <span className="truncate max-w-[180px]">{assignment.deviceName}</span>
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="py-3.5 px-4 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  {assignment.assignedDate ? (
                    <span className="flex items-center gap-1">
                      <Calendar size={13} className="text-gray-400" />
                      {new Date(assignment.assignedDate).toLocaleDateString('th-TH')}
                    </span>
                  ) : (
                    '-'
                  )}
                  {!assignment.isActive && assignment.unassignedDate && (
                    <div className="text-[11px] text-gray-400 mt-0.5">
                      Ended: {new Date(assignment.unassignedDate).toLocaleDateString('th-TH')}
                    </div>
                  )}
                </td>
                <td className="py-3.5 px-4 text-center whitespace-nowrap">
                  <span
                    className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                      assignment.isActive
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-400 border border-gray-200 dark:border-slate-700'
                    }`}
                  >
                    {assignment.isActive ? 'Active' : 'Archived'}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-xs text-gray-500 dark:text-gray-400 max-w-[150px] truncate">
                  {assignment.notes || '-'}
                </td>
                {isAdmin && (
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => onEdit(assignment)}
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        title="Edit slot details"
                      >
                        <Pencil size={15} />
                      </button>
                      {assignment.isActive && (
                        <button
                          type="button"
                          onClick={() => setConfirmId(assignment.id)}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                          title="Unassign this slot (archives to history)"
                        >
                          <UserMinus size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {assignments.map((assignment, idx) => (
          <div
            key={assignment.id}
            className={`p-4 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl space-y-3 shadow-2xs ${
              !assignment.isActive ? 'opacity-70 bg-gray-50/50' : ''
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">
                    {assignment.assignedTo}
                  </p>
                </div>
                {assignment.assignedEmail && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 ml-7">
                    {assignment.assignedEmail}
                  </p>
                )}
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  assignment.isActive
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                    : 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-gray-400'
                }`}
              >
                {assignment.isActive ? 'Active' : 'Archived'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-gray-100 dark:border-slate-800">
              <div>
                <span className="text-gray-400">Department:</span>
                <p className="font-medium text-gray-700 dark:text-gray-300">
                  {assignment.department || '-'}
                </p>
              </div>
              <div>
                <span className="text-gray-400">Assigned:</span>
                <p className="font-medium text-gray-700 dark:text-gray-300">
                  {assignment.assignedDate
                    ? new Date(assignment.assignedDate).toLocaleDateString('th-TH')
                    : '-'}
                </p>
              </div>
            </div>

            {(assignment.deviceName || assignment.assetId) && (
              <div className="text-xs pt-1 border-t border-gray-100 dark:border-slate-800 flex items-center gap-1.5">
                <Laptop size={13} className="text-gray-400 shrink-0" />
                {assignment.assetId ? (
                  <Link
                    href={`/assets/${assignment.assetId}`}
                    className="text-blue-600 hover:underline font-medium truncate"
                  >
                    {assignment.deviceName || assignment.assetId}
                  </Link>
                ) : (
                  <span className="text-gray-700 dark:text-gray-300 truncate">
                    {assignment.deviceName}
                  </span>
                )}
              </div>
            )}

            {isAdmin && (
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => onEdit(assignment)}
                  className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 px-2.5 py-1 rounded bg-blue-50 dark:bg-blue-950/40"
                >
                  <Pencil size={12} /> Edit
                </button>
                {assignment.isActive && (
                  <button
                    type="button"
                    onClick={() => setConfirmId(assignment.id)}
                    className="flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 px-2.5 py-1 rounded bg-red-50 dark:bg-red-950/40"
                  >
                    <UserMinus size={12} /> Unassign
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Unassign Confirmation Modal */}
      {confirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center mx-auto">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                Unassign License Slot?
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                This will free up 1 slot and archive this member assignment to history. The record will be preserved for auditing.
              </p>
            </div>
            <div className="flex justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmId(null)}
                disabled={unassigningId !== null}
                className="px-4 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleConfirmUnassign(confirmId)}
                disabled={unassigningId !== null}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm disabled:opacity-50"
              >
                {unassigningId === confirmId ? (
                  <>
                    <Loader2 size={13} className="animate-spin" /> Unassigning...
                  </>
                ) : (
                  'Confirm Unassign'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
