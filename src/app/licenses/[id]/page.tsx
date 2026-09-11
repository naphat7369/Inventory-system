import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { Key, Pencil, ArrowLeft, Mail, Calendar, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { deleteLicense } from '@/app/actions';
import { SlotManagementSection } from './SlotManagementSection';

export default async function LicenseDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();

  const license = await prisma.license.findUnique({
    where: { id },
    include: {
      property: true,
      assignments: {
        include: {
          user: {
            select: { id: true, username: true, fullName: true }
          },
          asset: {
            select: { id: true, assetId: true, name: true }
          }
        },
        orderBy: { createdAt: 'asc' }
      }
    }
  });

  if (!license) notFound();

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <Link href="/licenses" className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors w-fit">
          <ArrowLeft size={20} /> Back to Licenses
        </Link>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Key className="text-blue-600" /> {license.name}
          </h1>
          <div className="flex items-center gap-4 mt-2 text-gray-500 dark:text-gray-400">
            {license.property && <span className="flex items-center gap-1"><ShieldCheck size={16}/> {license.property.name}</span>}
            <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${license.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
              {license.status}
            </span>
          </div>
        </div>
        
        {session?.role === 'ADMIN' && (
          <div className="flex gap-4">
            <Link 
              href={`/licenses/${license.id}/edit`} 
              className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-900 transition-colors"
            >
              <Pencil size={20} /> Edit
            </Link>
            <form action={deleteLicense.bind(null, license.id)}>
              <button 
                type="submit" 
                className="flex items-center gap-2 bg-red-50 text-red-600 px-4 py-2 rounded-lg font-medium hover:bg-red-100 transition-colors border border-red-200"
              >
                Delete
              </button>
            </form>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
          <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1 flex items-center gap-2"><Mail size={16}/> Account Email</h3>
          <p className="font-medium text-lg">{license.accountEmail || '-'}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
          <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1 flex items-center gap-2"><Key size={16}/> Product Key</h3>
          <p className="font-mono text-sm bg-gray-50 dark:bg-slate-800/50 p-2 rounded border border-gray-100 overflow-x-auto">{license.productKey || '-'}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
          <h3 className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1 flex items-center gap-2"><Calendar size={16}/> Expiration</h3>
          <p className="font-medium text-lg">
            {license.expirationDate ? new Date(license.expirationDate).toLocaleDateString() : 'Lifetime'}
          </p>
        </div>
      </div>

      {/* Slot Management Section Component */}
      <SlotManagementSection
        licenseId={license.id}
        totalSlots={license.totalSlots}
        initialAssignments={license.assignments as any}
        isAdmin={session?.role === 'ADMIN'}
      />
    </div>
  );
}
