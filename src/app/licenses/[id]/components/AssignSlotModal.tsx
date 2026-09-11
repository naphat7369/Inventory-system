'use client';

import React, { useState } from 'react';
import { X, UserPlus, AlertCircle, Loader2 } from 'lucide-react';
import { UserCombobox } from './UserCombobox';
import { AssetCombobox } from './AssetCombobox';
import { assignLicenseSlot } from '@/app/actions';

interface AssignSlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  licenseId: string;
  isFull: boolean;
  onSuccess: () => void;
}

export function AssignSlotModal({
  isOpen,
  onClose,
  licenseId,
  isFull,
  onSuccess,
}: AssignSlotModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form state
  const [userId, setUserId] = useState<string | null>(null);
  const [userNameDisplay, setUserNameDisplay] = useState<string | null>(null);
  const [assignedTo, setAssignedTo] = useState('');
  const [assignedEmail, setAssignedEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [phone, setPhone] = useState('');

  const [assetId, setAssetId] = useState<string | null>(null);
  const [assetDisplay, setAssetDisplay] = useState<string | null>(null);
  const [deviceName, setDeviceName] = useState('');

  const [assignedDate, setAssignedDate] = useState(() =>
    new Date().toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSelectUser = (user: {
    id: string;
    username: string;
    fullName: string | null;
    department: string | null;
    phone: string | null;
  }) => {
    setUserId(user.id);
    const display = user.fullName ? `${user.fullName} (@${user.username})` : user.username;
    setUserNameDisplay(display);

    // Auto-fill snapshot fields (can be edited)
    if (!assignedTo || assignedTo.trim() === '') {
      setAssignedTo(user.fullName || user.username);
    }
    if (user.department && (!department || department.trim() === '')) {
      setDepartment(user.department);
    }
    if (user.phone && (!phone || phone.trim() === '')) {
      setPhone(user.phone);
    }
  };

  const handleClearUser = () => {
    setUserId(null);
    setUserNameDisplay(null);
  };

  const handleSelectAsset = (asset: {
    id: string;
    assetId: string;
    name: string;
    department: string | null;
  }) => {
    setAssetId(asset.id);
    const display = `${asset.assetId} (${asset.name})`;
    setAssetDisplay(display);

    // Auto-fill deviceName snapshot (can be edited)
    if (!deviceName || deviceName.trim() === '') {
      setDeviceName(`${asset.assetId} - ${asset.name}`);
    }
    if (asset.department && (!department || department.trim() === '')) {
      setDepartment(asset.department);
    }
  };

  const handleClearAsset = () => {
    setAssetId(null);
    setAssetDisplay(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignedTo.trim()) {
      setErrorMessage('Please enter the user name.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('licenseId', licenseId);
      if (userId) formData.append('userId', userId);
      formData.append('assignedTo', assignedTo.trim());
      if (assignedEmail.trim()) formData.append('assignedEmail', assignedEmail.trim());
      if (department.trim()) formData.append('department', department.trim());
      if (phone.trim()) formData.append('phone', phone.trim());
      if (assetId) formData.append('assetId', assetId);
      if (deviceName.trim()) formData.append('deviceName', deviceName.trim());
      if (assignedDate) formData.append('assignedDate', assignedDate);
      if (notes.trim()) formData.append('notes', notes.trim());

      await assignLicenseSlot(formData);
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to assign slot. Please check slot availability.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-gray-200 dark:border-slate-800 flex justify-between items-center bg-gray-50/70 dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <UserPlus size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Assign License Slot
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Assign an available seat to a team member with full details
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {isFull && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-xl flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>
                All slots are currently assigned. Submitting may be rejected unless a slot has been freed.
              </span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Section 1: Member Information */}
          <div className="space-y-3.5 bg-gray-50/50 dark:bg-slate-800/30 p-4 rounded-xl border border-gray-100 dark:border-slate-800">
            <h3 className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
              1. Member Details
            </h3>

            {/* Quick User Picker */}
            <UserCombobox
              linkedUserId={userId}
              linkedUserName={userNameDisplay}
              onSelectUser={handleSelectUser}
              onClearUser={handleClearUser}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  placeholder="e.g. Somchai Sukkasem"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={assignedEmail}
                  onChange={(e) => setAssignedEmail(e.target.value)}
                  placeholder="somchai@company.com"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Department
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. IT Support, Sales, Marketing"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone / Contact
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 081-234-5678"
                  className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Device / Asset Details */}
          <div className="space-y-3.5 bg-gray-50/50 dark:bg-slate-800/30 p-4 rounded-xl border border-gray-100 dark:border-slate-800">
            <h3 className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
              2. Device / Installation
            </h3>

            {/* Quick Asset Picker */}
            <AssetCombobox
              linkedAssetId={assetId}
              linkedAssetDisplay={assetDisplay}
              onSelectAsset={handleSelectAsset}
              onClearAsset={handleClearAsset}
            />

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Device / Machine Name
              </label>
              <input
                type="text"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder="e.g. NB-IT-001 (ThinkPad X1) or Personal Laptop"
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Section 3: Assignment Date & Remarks */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Assigned Date
              </label>
              <input
                type="date"
                value={assignedDate}
                onChange={(e) => setAssignedDate(e.target.value)}
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Notes / Remarks
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Installed for work-from-home project"
                className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-gray-200 dark:border-slate-800 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Assigning...
                </>
              ) : (
                'Assign Slot'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
