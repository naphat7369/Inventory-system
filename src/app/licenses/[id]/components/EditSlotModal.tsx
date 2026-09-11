'use client';

import React, { useState, useEffect } from 'react';
import { X, Pencil, AlertCircle, Loader2 } from 'lucide-react';
import { UserCombobox } from './UserCombobox';
import { AssetCombobox } from './AssetCombobox';
import { updateLicenseSlot } from '@/app/actions';

export interface AssignmentDetail {
  id: string;
  licenseId: string;
  userId: string | null;
  assignedTo: string;
  assignedEmail: string | null;
  department: string | null;
  phone: string | null;
  assetId: string | null;
  deviceName: string | null;
  assignedDate: string | Date | null;
  unassignedDate?: string | Date | null;
  notes: string | null;
  isActive: boolean;
  user?: { id: string; username: string; fullName: string | null } | null;
  asset?: { id: string; assetId: string; name: string } | null;
}

interface EditSlotModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignment: AssignmentDetail | null;
  onSuccess: () => void;
}

export function EditSlotModal({
  isOpen,
  onClose,
  assignment,
  onSuccess,
}: EditSlotModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form state
  const [userId, setUserId] = useState<string | null>(null);
  const [userNameDisplay, setUserNameDisplay] = useState<string | null>(null);
  const [clearUser, setClearUser] = useState(false);

  const [assignedTo, setAssignedTo] = useState('');
  const [assignedEmail, setAssignedEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [phone, setPhone] = useState('');

  const [assetId, setAssetId] = useState<string | null>(null);
  const [assetDisplay, setAssetDisplay] = useState<string | null>(null);
  const [clearAsset, setClearAsset] = useState(false);

  const [deviceName, setDeviceName] = useState('');
  const [assignedDate, setAssignedDate] = useState('');
  const [notes, setNotes] = useState('');

  // Pre-fill state when assignment changes
  useEffect(() => {
    if (assignment) {
      setUserId(assignment.userId || null);
      if (assignment.user) {
        setUserNameDisplay(
          assignment.user.fullName
            ? `${assignment.user.fullName} (@${assignment.user.username})`
            : assignment.user.username
        );
      } else if (assignment.userId) {
        setUserNameDisplay(assignment.assignedTo);
      } else {
        setUserNameDisplay(null);
      }
      setClearUser(false);

      setAssignedTo(assignment.assignedTo || '');
      setAssignedEmail(assignment.assignedEmail || '');
      setDepartment(assignment.department || '');
      setPhone(assignment.phone || '');

      setAssetId(assignment.assetId || null);
      if (assignment.asset) {
        setAssetDisplay(`${assignment.asset.assetId} (${assignment.asset.name})`);
      } else if (assignment.assetId) {
        setAssetDisplay(assignment.deviceName || assignment.assetId);
      } else {
        setAssetDisplay(null);
      }
      setClearAsset(false);

      setDeviceName(assignment.deviceName || '');

      if (assignment.assignedDate) {
        const d = new Date(assignment.assignedDate);
        setAssignedDate(d.toISOString().split('T')[0]);
      } else {
        setAssignedDate(new Date().toISOString().split('T')[0]);
      }

      setNotes(assignment.notes || '');
      setErrorMessage(null);
    }
  }, [assignment]);

  if (!isOpen || !assignment) return null;

  const handleSelectUser = (user: {
    id: string;
    username: string;
    fullName: string | null;
    department: string | null;
    phone: string | null;
  }) => {
    setUserId(user.id);
    setClearUser(false);
    const display = user.fullName ? `${user.fullName} (@${user.username})` : user.username;
    setUserNameDisplay(display);

    // If assignedTo is empty or user wants to adopt new user's name
    if (!assignedTo) {
      setAssignedTo(user.fullName || user.username);
    }
    if (user.department && !department) {
      setDepartment(user.department);
    }
    if (user.phone && !phone) {
      setPhone(user.phone);
    }
  };

  const handleClearUser = () => {
    setUserId(null);
    setUserNameDisplay(null);
    setClearUser(true);
  };

  const handleSelectAsset = (asset: {
    id: string;
    assetId: string;
    name: string;
    department: string | null;
  }) => {
    setAssetId(asset.id);
    setClearAsset(false);
    const display = `${asset.assetId} (${asset.name})`;
    setAssetDisplay(display);

    if (!deviceName) {
      setDeviceName(`${asset.assetId} - ${asset.name}`);
    }
  };

  const handleClearAsset = () => {
    setAssetId(null);
    setAssetDisplay(null);
    setClearAsset(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignedTo.trim()) {
      setErrorMessage('Assigned name is required.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('assignmentId', assignment.id);
      if (clearUser) {
        formData.append('clearUser', 'true');
      } else if (userId) {
        formData.append('userId', userId);
      }

      formData.append('assignedTo', assignedTo.trim());
      formData.append('assignedEmail', assignedEmail.trim());
      formData.append('department', department.trim());
      formData.append('phone', phone.trim());

      if (clearAsset) {
        formData.append('clearAsset', 'true');
      } else if (assetId) {
        formData.append('assetId', assetId);
      }

      formData.append('deviceName', deviceName.trim());
      if (assignedDate) formData.append('assignedDate', assignedDate);
      formData.append('notes', notes.trim());

      await updateLicenseSlot(formData);
      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update slot assignment.');
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
            <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center">
              <Pencil size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                Edit Slot Assignment
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Update member snapshot, linked accounts, or device details
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
              linkedUserId={clearUser ? null : userId}
              linkedUserName={clearUser ? null : userNameDisplay}
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
              linkedAssetId={clearAsset ? null : assetId}
              linkedAssetDisplay={clearAsset ? null : assetDisplay}
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
                  <Loader2 size={16} className="animate-spin" /> Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
