import { getSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { getRenewalContracts } from '@/app/actions';
import { RenewalsClient } from './RenewalsClient';

export default async function RenewalsPage() {
  const session = await getSession();

  if (!session || session.role !== 'ADMIN') {
    redirect('/');
  }

  const contracts = await getRenewalContracts();

  return <RenewalsClient initialContracts={contracts} />;
}
