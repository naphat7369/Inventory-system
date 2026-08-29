import { getUsers } from '@/app/actions';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { UsersClient } from './UsersClient';

export default async function UsersPage() {
  const session = await getSession();
  if (session?.role !== 'ADMIN') redirect('/assets');

  const users = await getUsers();

  return <UsersClient users={users} currentUserId={session?.id ? String(session.id) : ''} />;
}
