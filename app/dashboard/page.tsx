'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/appStore';
import { getDashboardBasePath } from '@/lib/dashboard-paths';

export default function DashboardEntryPage() {
  const router = useRouter();
  const { hasHydrated, isAuthenticated, user } = useAppStore();

  useEffect(() => {
    if (!hasHydrated) return;
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    router.replace(getDashboardBasePath(user?.role));
  }, [hasHydrated, isAuthenticated, router, user?.role]);

  return null;
}
