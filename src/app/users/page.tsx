import { getUsers, createUser, deleteUser } from '@/app/actions';
import { Users, Trash2, Shield, User } from 'lucide-react';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function UsersPage() {
  const session = await getSession();
  if (session?.role !== 'ADMIN') redirect('/assets');

  const users = await getUsers();

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Users className="text-blue-600" /> Users & Permissions
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Add New User</h2>
            <form action={createUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input type="text" name="username" required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input type="password" name="password" required className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select name="role" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="STAFF">STAFF (View & Print only)</option>
                  <option value="ADMIN">ADMIN (Full Access)</option>
                </select>
              </div>
              <button type="submit" className="w-full bg-gray-800 text-white font-medium py-2 rounded-lg hover:bg-gray-900 transition-colors">
                Create User
              </button>
            </form>
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="p-4 font-semibold text-gray-600">Username</th>
                  <th className="p-4 font-semibold text-gray-600">Role</th>
                  <th className="p-4 font-semibold text-gray-600">Joined</th>
                  <th className="p-4 font-semibold text-gray-600 w-24">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                    <td className="p-4 font-medium flex items-center gap-2">
                      {u.role === 'ADMIN' ? <Shield size={16} className="text-purple-600" /> : <User size={16} className="text-gray-400" />}
                      {u.username}
                      {u.id === session.id && <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">You</span>}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-md text-xs font-semibold ${u.role === 'ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="p-4 text-gray-500 text-sm">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      {u.id !== session.id && (
                        <form action={deleteUser.bind(null, u.id)}>
                          <button type="submit" className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors" title="Delete User">
                            <Trash2 size={18} />
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
