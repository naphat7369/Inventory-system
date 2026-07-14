import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { Key, Pencil, ArrowLeft, Trash2, UserPlus, Mail, Calendar, ShieldCheck, User } from 'lucide-react';
import Link from 'next/link';
import { getSession } from '@/lib/auth';
import { assignLicenseSlot, removeLicenseSlot, deleteLicense } from '@/app/actions';

export default async function LicenseDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSession();

  const license = await prisma.license.findUnique({
    where: { id },
    include: {
      property: true,
      assignments: {
        orderBy: { createdAt: 'asc' }
      }
    }
  });

  if (!license) notFound();

  const usedSlots = license.assignments.length;
  const availableSlots = license.totalSlots - usedSlots;
  const isFull = availableSlots <= 0;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <Link href="/licenses" className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors w-fit">
          <ArrowLeft size={20} /> Back to Licenses
        </Link>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Key className="text-blue-600" /> {license.name}
          </h1>
          <div className="flex items-center gap-4 mt-2 text-gray-500">
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
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-gray-500 text-sm font-medium mb-1 flex items-center gap-2"><Mail size={16}/> Account Email</h3>
          <p className="font-medium text-lg">{license.accountEmail || '-'}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-gray-500 text-sm font-medium mb-1 flex items-center gap-2"><Key size={16}/> Product Key</h3>
          <p className="font-mono text-sm bg-gray-50 p-2 rounded border border-gray-100 overflow-x-auto">{license.productKey || '-'}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-gray-500 text-sm font-medium mb-1 flex items-center gap-2"><Calendar size={16}/> Expiration</h3>
          <p className="font-medium text-lg">
            {license.expirationDate ? new Date(license.expirationDate).toLocaleDateString() : 'Lifetime'}
          </p>
        </div>
      </div>

      {/* Slot Management Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50">
          <div>
            <h2 className="text-xl font-bold">Slot Management</h2>
            <p className="text-gray-500 text-sm">Assign available slots to team members</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold flex items-end gap-1">
              <span className={isFull ? 'text-red-600' : 'text-blue-600'}>{usedSlots}</span>
              <span className="text-gray-400 text-lg">/ {license.totalSlots}</span>
            </div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Slots Used</p>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 order-2 lg:order-1">
            <h3 className="font-semibold mb-4 text-gray-700 flex items-center gap-2">
              <User size={18} /> Assigned Users
            </h3>
            
            {license.assignments.length === 0 ? (
              <div className="text-center p-8 bg-gray-50 border border-dashed border-gray-300 rounded-xl text-gray-500">
                No users assigned yet. Use the form to assign a slot.
              </div>
            ) : (
              <div className="space-y-3">
                {license.assignments.map((assignment, idx) => (
                  <div key={assignment.id} className="flex justify-between items-center p-4 bg-gray-50 border border-gray-200 rounded-xl">
                    <div className="flex items-center gap-4">
                      <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-sm">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-semibold">{assignment.assignedTo}</p>
                        {assignment.assignedEmail && <p className="text-sm text-gray-500">{assignment.assignedEmail}</p>}
                      </div>
                    </div>
                    
                    {session?.role === 'ADMIN' && (
                      <form action={removeLicenseSlot.bind(null, assignment.id)}>
                        <button type="submit" className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors" title="Remove Assignment">
                          <Trash2 size={18} />
                        </button>
                      </form>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {session?.role === 'ADMIN' && (
            <div className="lg:col-span-1 order-1 lg:order-2">
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
                <h3 className="font-semibold mb-4 text-blue-900 flex items-center gap-2">
                  <UserPlus size={18} /> Assign New Slot
                </h3>
                
                {isFull ? (
                  <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
                    All {license.totalSlots} slots are currently assigned. Remove an existing user to free up a slot.
                  </div>
                ) : (
                  <form action={assignLicenseSlot} className="space-y-4">
                    <input type="hidden" name="licenseId" value={license.id} />
                    <div>
                      <label className="block text-sm font-medium text-blue-900 mb-1">Name <span className="text-red-500">*</span></label>
                      <input type="text" name="assignedTo" required placeholder="User's name" className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-blue-900 mb-1">Email (Optional)</label>
                      <input type="email" name="assignedEmail" placeholder="user@example.com" className="w-full px-3 py-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                    </div>
                    <button type="submit" className="w-full bg-blue-600 text-white font-medium py-2 rounded-lg hover:bg-blue-700 transition-colors">
                      Assign Slot
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
