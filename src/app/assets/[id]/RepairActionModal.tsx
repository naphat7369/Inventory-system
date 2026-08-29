'use client';

import { useState } from 'react';
import { Wrench, X } from 'lucide-react';
import { createRepairLog } from '@/app/actions';
import { useRouter } from 'next/navigation';

export function RepairActionModal({ assetId, status, existingActiveRepair }: { assetId: string, status: string, existingActiveRepair: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  if (status !== 'Available' && status !== 'In-use') return null;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    
    const formData = new FormData(e.currentTarget);
    const reason = formData.get('reason') as string;
    const technician = formData.get('technician') as string;

    if (!reason || reason.trim() === '') {
      setError('Reason is required.');
      setIsSubmitting(false);
      return;
    }

    try {
      await createRepairLog(assetId, reason, technician);
      setIsOpen(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => {
          if (existingActiveRepair) {
            alert('This asset already has an active repair log. Cannot send to repair again.');
          } else {
            setIsOpen(true);
          }
        }}
        className="flex items-center gap-2 bg-[#E24A22] text-white px-4 py-2 rounded-sm font-medium hover:opacity-90 transition-opacity"
      >
        <Wrench size={20} /> Send to Repair
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#F8F9F5] rounded-sm shadow-xl w-full max-w-md overflow-hidden border border-[#D4D6CF]">
            <div className="bg-white p-4 border-b border-[#D4D6CF] flex justify-between items-center">
              <h2 className="font-bold text-lg text-[#1C1C1A]">Send Asset to Repair</h2>
              <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-gray-900">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-sm text-sm">{error}</div>}
              
              <div>
                <label htmlFor="reason" className="block text-sm font-medium text-[#1C1C1A] mb-1">
                  Reason for Repair <span className="text-[#E24A22]">*</span>
                </label>
                <textarea 
                  id="reason" 
                  name="reason" 
                  required
                  rows={3}
                  className="w-full border border-[#D4D6CF] rounded-sm p-3 focus:outline-none focus:ring-1 focus:ring-[#1C1C1A] bg-white resize-none font-[family-name:var(--font-inter)]"
                  placeholder="Describe the issue..."
                />
              </div>

              <div>
                <label htmlFor="technician" className="block text-sm font-medium text-[#1C1C1A] mb-1">
                  Technician / Vendor (Optional)
                </label>
                <input 
                  type="text" 
                  id="technician" 
                  name="technician" 
                  className="w-full border border-[#D4D6CF] rounded-sm p-3 focus:outline-none focus:ring-1 focus:ring-[#1C1C1A] bg-white font-[family-name:var(--font-inter)]"
                  placeholder="e.g. IT Dept or FixIt Shop"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 mt-4 border-t border-[#D4D6CF]">
                <button 
                  type="button" 
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-[#1C1C1A] font-medium hover:bg-gray-100 rounded-sm transition-colors border border-[#D4D6CF] bg-white"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#E24A22] text-white font-medium rounded-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isSubmitting ? 'Sending...' : 'Confirm Sending'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
