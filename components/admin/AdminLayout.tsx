'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/appStore';
import AdminSidebar from './AdminSidebar';
import AdminTopbar from './AdminTopbar';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user, hasHydrated } = useAppStore();
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (hasHydrated) {
      if (!user) {
        router.replace('/login');
      } else if (user.role !== 'admin') {
        router.replace('/dashboard/user');
      } else {
        setAuthorized(true);
      }
    }
  }, [user, hasHydrated, router]);

  if (!hasHydrated || !authorized) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="admin-container" style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--color-bg)' }}>
      {/* Sidebar Overlay (Mobile) */}
      {mobileMenuOpen && (
        <div 
          className="mobile-sidebar-overlay"
          onClick={() => setMobileMenuOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000, 
            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)'
          }}
        />
      )}

      {/* Sidebar - Responsive */}
      <div 
        className={`sidebar-wrapper ${mobileMenuOpen ? 'mobile-open' : ''}`}
        style={{ 
          width: '260px', flexShrink: 0, height: '100vh', 
          borderRight: '1px solid var(--color-border)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          background: 'var(--color-bg-2)'
        }}
      >
        <AdminSidebar onClose={() => setMobileMenuOpen(false)} />
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        <AdminTopbar 
          title="Admin Control Center" 
          onMenuClick={() => setMobileMenuOpen(true)} 
        />
        
        <div style={{ flex: 1, overflowY: 'auto', background: 'var(--color-bg)' }}>
          {children}
        </div>
      </div>

      <style jsx>{`
        .sidebar-wrapper {
          z-index: 1001;
        }

        @media (max-width: 1024px) {
          .sidebar-wrapper {
            position: fixed;
            left: 0;
            top: 0;
            transform: translateX(-100%);
          }
          .sidebar-wrapper.mobile-open {
            transform: translateX(0);
          }
        }

        .mobile-sidebar-overlay {
          display: none;
        }

        @media (max-width: 1024px) {
          .mobile-sidebar-overlay {
            display: block;
          }
        }
      `}</style>
    </div>
  );
}
