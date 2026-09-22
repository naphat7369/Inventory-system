import { getUsers } from '@/app/actions';
import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { UsersClient } from './UsersClient';
import prisma from '@/lib/prisma';

export default async function UsersPage() {
  const session = await getSession();
  if (session?.role !== 'ADMIN') redirect('/assets');

  const users = await getUsers();
  const departments = await prisma.department.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, code: true }
  });

  return (
    <UsersClient 
      users={users} 
      departments={departments}
      currentUserId={session?.id ? String(session.id) : ''} 
    />
  );
}
