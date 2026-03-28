'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  Shield,
  Users,
  Building2,
  KeyRound,
  Cpu,
  Plug,
  CreditCard,
  ClipboardCheck,
  ScrollText,
  Lock,
  DatabaseZap,
  Activity,
  LayoutDashboard,
  ArrowLeft,
} from 'lucide-react';

const ADMIN_ROLES = ['super_admin', 'admin', 'org_admin'];

const ADMIN_NAV = [
  { label: 'Overview',        href: '/admin',                  icon: LayoutDashboard },
  { label: 'Users',           href: '/admin/users',            icon: Users },
  { label: 'Organizations',   href: '/admin/organizations',    icon: Building2 },
  { label: 'Roles',           href: '/admin/roles',            icon: KeyRound },
  { label: 'AI Models',       href: '/admin/ai-models',        icon: Cpu },
  { label: 'Integrations',    href: '/admin/integrations',     icon: Plug },
  { label: 'Billing',         href: '/admin/billing',          icon: CreditCard },
  { label: 'Compliance',      href: '/admin/compliance',       icon: ClipboardCheck },
  { label: 'Audit Logs',      href: '/admin/audit-logs',       icon: ScrollText },
  { label: 'Security',        href: '/admin/security',         icon: Lock },
  { label: 'Data Governance', href: '/admin/data-governance',  icon: DatabaseZap },
  { label: 'System Health',   href: '/admin/system-health',    icon: Activity },
];

const ROLE_LABEL: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  org_admin: 'Org Admin',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  const role = (session?.user as any)?.role ?? '';
  const isAdmin = ADMIN_ROLES.includes(role);

  // Redirect non-admins away
  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') { router.replace('/login'); return; }
    if (status === 'authenticated' && !isAdmin) { router.replace('/home'); }
  }, [status, isAdmin, router]);

  if (status === 'loading' || (status === 'authenticated' && !isAdmin)) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-950">
        <div className="text-gray-500 text-sm">Checking permissions…</div>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Admin Sidebar ─────────────────────────────────────────────── */}
      <aside className="flex flex-col w-56 flex-shrink-0 h-full border-r border-red-900/40 bg-gray-950">
        {/* Header */}
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-red-900/40 bg-red-950/30">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600 flex-shrink-0">
            <Shield className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-xs font-bold text-red-400 uppercase tracking-wider">Admin Console</p>
            <p className="text-[10px] text-red-600">{ROLE_LABEL[role] ?? role}</p>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {ADMIN_NAV.map(item => {
            const isActive = item.href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-red-600/20 text-red-400 font-medium'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
                )}
              >
                <item.icon className={cn('h-4 w-4 flex-shrink-0', isActive ? 'text-red-400' : 'text-gray-500')} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Back to app */}
        <div className="p-2 border-t border-red-900/40">
          <Link
            href="/home"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-800 hover:text-gray-200 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 flex-shrink-0" />
            Back to App
          </Link>
        </div>
      </aside>

      {/* ── Admin Content ──────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden bg-gray-950">
        {/* Admin top banner */}
        <div className="flex items-center gap-3 px-6 py-2.5 border-b border-red-900/40 bg-red-950/20 flex-shrink-0">
          <Shield className="h-3.5 w-3.5 text-red-500" />
          <span className="text-xs font-semibold text-red-400 uppercase tracking-wider">Admin Console</span>
          <span className="text-gray-700 text-xs">·</span>
          <span className="text-xs text-gray-500">Changes here affect the entire platform</span>
          <div className="ml-auto">
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-red-600/20 text-red-400 border border-red-700/40 px-2 py-0.5 rounded-full">
              <Shield className="h-2.5 w-2.5" />
              {ROLE_LABEL[role] ?? role}
            </span>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
