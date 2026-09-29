'use client';

import { useActionState, useEffect, useState } from 'react';
import { login, initAdmin } from '@/app/actions';
import { Package } from 'lucide-react';

export default function LoginPage() {
  const [sessionEndReason, setSessionEndReason] = useState<'expired' | 'closed' | null>(null);
  const [state, formAction, isPending] = useActionState(async (prevState: any, formData: FormData) => {
    return await login(formData);
  }, null);

  useEffect(() => {
    // Initialize default admin on first load if no users exist
    initAdmin();
    window.sessionStorage.setItem('inventory-session:active-tab', 'active');
    const reason = new URLSearchParams(window.location.search).get('reason');
    setSessionEndReason(reason === 'session-closed' ? 'closed' : reason === 'session-expired' ? 'expired' : null);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-800/50 px-4">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-gray-100 dark:border-slate-800 p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-gray-900 rounded-xl flex items-center justify-center mb-4 text-white">
            <Package size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">E-Approve System</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-center text-sm">
            Sign in to access your assets.
          </p>
        </div>

        {state?.error && (
          <div className="bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 border border-red-100 dark:border-red-900/40 p-4 rounded-lg mb-6 text-sm font-medium">
            {state.error}
          </div>
        )}

        {sessionEndReason && !state?.error && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
            {sessionEndReason === 'closed'
              ? 'เซสชันสิ้นสุดแล้ว กรุณาเข้าสู่ระบบอีกครั้ง'
              : 'Session หมดอายุเนื่องจากไม่มีการใช้งาน กรุณาเข้าสู่ระบบอีกครั้ง'}
          </div>
        )}

        <form action={formAction} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
            <input 
              type="text" 
              name="username" 
              required 
              className="w-full px-4 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="admin"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
            <input 
              type="password" 
              name="password" 
              required 
              className="w-full px-4 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="••••••••"
            />
          </div>
          
          <button 
            type="submit" 
            disabled={isPending}
            className="w-full bg-blue-600 text-white font-medium py-2.5 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-70 disabled:cursor-not-allowed mt-2"
          >
            {isPending ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
