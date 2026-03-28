import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { AdminShell } from './AdminShell';

const ADMIN_ROLES = ['super_admin', 'admin', 'org_admin'];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  const role = (session.user as { role?: string }).role ?? '';
  if (!ADMIN_ROLES.includes(role)) {
    redirect('/home');
  }

  return <AdminShell role={role}>{children}</AdminShell>;
}
