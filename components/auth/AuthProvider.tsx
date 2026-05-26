'use client';

import React, { useEffect, useRef } from 'react';
import { useAppStore } from '@/store/appStore';
import { userService } from '@/lib/api';
import PageLoader from '@/components/ui/PageLoader';
import { useRealtime } from '@/hooks/useRealtime';

/**
 * AuthProvider handles session restoration after a hard reload.
 * Once Zustand has rehydrated from localStorage, we do ONE background
 * profile refresh so local state stays in sync with the database.
 */
export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, hasHydrated } = useAppStore();
  const hasFetchedRef = useRef(false); // prevent double-fetch in StrictMode / dep loops

  // Initialize custom real-time event stream
  useRealtime();

  useEffect(() => {
    // Wait for Zustand to rehydrate from localStorage first
    if (!hasHydrated) return;
    // Only run once per mount — setUser/login are stable but user object
    // changes after setUser, which would re-trigger without this guard.
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    const token =
      typeof window !== 'undefined'
        ? localStorage.getItem('bamzysms-token') ||
          sessionStorage.getItem('bamzysms-token')
        : null;

    if (!token) return; // No token → nothing to restore

    const restoreSession = async () => {
      try {
        const response = await userService.getProfile();
        if (response.data) {
          setUser(response.data);
        }
      } catch {
        // The API client already handles invalid-token logout.
        // For non-auth failures we keep the persisted session state.
      }
    };

    void restoreSession();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated]); // intentionally omit login/setUser/user — they're stable or would loop

  if (!hasHydrated) {
    return <PageLoader />;
  }

  return <>{children}</>;
}
