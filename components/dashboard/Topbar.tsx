'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  RiMenu2Line, RiNotificationLine, RiUserLine,
  RiCoinLine, RiUserSettingsLine, RiShoppingCartLine, RiLogoutBoxLine,
  RiSignalTowerFill,
} from 'react-icons/ri';
import { useAppStore } from '@/store/appStore';
import { getDashboardPath } from '@/lib/dashboard-paths';

export default function Topbar({ title }: { title?: string }) {
  const { toggleSidebar, user, logout } = useAppStore();
  const router = useRouter();
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);
  const accountRole = user?.role === 'admin' ? 'admin' : 'user';
  const quickLinks = [
    { icon: <RiUserSettingsLine size={15} />, label: 'Profile', href: getDashboardPath('user', 'profile') },
    { icon: <RiShoppingCartLine size={15} />, label: 'Buy Numbers', href: getDashboardPath('user', 'usa-numbers') },
  ];

  if (accountRole === 'admin') {
    quickLinks.unshift({
      icon: <RiSignalTowerFill size={15} />,
      label: 'Admin Dashboard',
      href: getDashboardPath('admin'),
    });
  }

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDropOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLogout = () => {
    setDropOpen(false);
    logout();
    router.push('/login');
  };

  return (
    <header className="topbar">
      {/* Left — hamburger */}
      <button
        onClick={toggleSidebar}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex', padding: 6, borderRadius: 8 }}
        aria-label="Toggle sidebar"
      >
        <RiMenu2Line size={22} />
      </button>

      {/* Center — logo on mobile, title on desktop */}
      <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
        {/* Logo shown on mobile */}
        <div className="topbar-logo">
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'linear-gradient(135deg, var(--color-primary), #0EA5E9)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <RiSignalTowerFill size={14} color="#fff" />
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '0.95rem' }}>
            bamzy<span style={{ color: 'var(--color-primary)' }}>SMS</span>
          </span>
        </div>
        {/* Title shown on desktop */}
        {title && (
          <span className="topbar-title" style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', color: 'var(--color-text)' }}>
            {title}
          </span>
        )}
      </div>

      {/* Right — balance + notifications + avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {/* Balance chip — hide on very small screens */}
        <div className="balance-chip" style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '5px 10px', borderRadius: 999,
          background: 'rgba(0,229,255,0.08)',
          border: '1px solid rgba(0,229,255,0.15)',
          fontSize: '0.78rem', fontWeight: 600,
          color: 'var(--color-primary)',
          fontFamily: 'var(--font-display)',
        }}>
          <RiCoinLine size={13} />
          ₦{user?.balance?.toLocaleString() ?? '0'}
        </div>

        {/* Notifications */}
        <button style={{
          width: 34, height: 34, borderRadius: 9, border: '1px solid var(--color-border)',
          background: 'none', cursor: 'pointer', color: 'var(--color-text-muted)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <RiNotificationLine size={17} />
        </button>

        {/* Avatar + Dropdown */}
        <div ref={dropRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setDropOpen(!dropOpen)}
            style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--color-primary), #7C3AED)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.78rem', fontWeight: 700, color: '#000',
              fontFamily: 'var(--font-display)', cursor: 'pointer',
              border: dropOpen ? '2px solid var(--color-primary)' : '2px solid transparent',
              boxShadow: '0 0 10px var(--color-primary-glow)',
              transition: 'border 0.2s', flexShrink: 0,
            }}
            aria-label="User menu"
          >
            {user?.name ? user.name.charAt(0).toUpperCase() : <RiUserLine size={15} />}
          </button>

          {dropOpen && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 10px)', right: 0,
              minWidth: 210, zIndex: 200,
              background: 'var(--color-bg-card)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
              overflow: 'hidden',
              animation: 'fadeUp 0.15s ease',
            }}>
              {/* User info */}
              <div style={{
                padding: '12px 14px',
                borderBottom: '1px solid var(--color-border)',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, var(--color-primary), #7C3AED)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: '0.82rem', color: '#000',
                  fontFamily: 'var(--font-display)',
                }}>
                  {user?.name?.charAt(0).toUpperCase() ?? 'U'}
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user?.name ?? 'User'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--color-text-faint)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user?.email ?? ''}
                  </div>
                </div>
              </div>

              <div style={{ padding: '6px' }}>
                {quickLinks.map((item) => (
                  <Link key={item.label} href={item.href} style={{ textDecoration: 'none' }}
                    onClick={() => setDropOpen(false)}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 12px', borderRadius: 8, cursor: 'pointer',
                      color: 'var(--color-text-muted)', fontSize: '0.85rem',
                      transition: 'all 0.15s',
                    }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
                        (e.currentTarget as HTMLElement).style.color = 'var(--color-text)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.background = 'transparent';
                        (e.currentTarget as HTMLElement).style.color = 'var(--color-text-muted)';
                      }}
                    >
                      {item.icon}{item.label}
                    </div>
                  </Link>
                ))}

                <div style={{ height: 1, background: 'var(--color-border)', margin: '4px 0' }} />

                <button
                  onClick={handleLogout}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 12px', borderRadius: 8, cursor: 'pointer',
                    color: '#EF4444', fontSize: '0.85rem', background: 'none', border: 'none',
                    transition: 'background 0.15s', textAlign: 'left',
                  }}
                  onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.08)'}
                  onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                >
                  <RiLogoutBoxLine size={15} />
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .topbar { position: relative; }
        .topbar-logo { display: none; align-items: center; gap: 7px; }
        .topbar-title { display: block; }
        @media (max-width: 640px) {
          .topbar-logo { display: flex !important; }
          .topbar-title { display: none !important; }
          .balance-chip { display: none !important; }
        }
      `}</style>
    </header>
  );
}
