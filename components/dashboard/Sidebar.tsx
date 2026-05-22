'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  RiDashboardLine, RiWalletLine, RiShoppingBag3Line,
  RiPhoneLine, RiGlobalLine, RiUserSharedLine,
  RiQuestionLine, RiHistoryLine, RiExchangeLine,
  RiLogoutBoxLine, RiSignalTowerFill, RiShieldKeyholeLine,
  RiExchangeFundsLine, RiSendPlaneLine,
} from 'react-icons/ri';
import { useAppStore } from '@/store/appStore';
import UserAvatar from '@/components/ui/UserAvatar';

const NAV_ITEMS = [
  { href: '/dashboard/user', icon: <RiDashboardLine size={18} />, label: 'Dashboard' },
  { href: '/dashboard/user/fund-wallet', icon: <RiWalletLine size={18} />, label: 'Fund Wallet' },
  { href: 'https://Bamzystore.org/', icon: <RiShoppingBag3Line size={18} />, label: 'Buy Logs' },
  { href: '/dashboard/user/usa-numbers', icon: <RiPhoneLine size={18} />, label: 'USA Numbers' },
  { href: '/dashboard/user/usa-numbers-beta', icon: <RiPhoneLine size={18} />, label: 'USA Numbers Beta' },
  { href: '/dashboard/user/all-countries', icon: <RiGlobalLine size={18} />, label: 'All Countries Numbers' },
  { href: '/dashboard/user/telegram-numbers', icon: <RiSendPlaneLine size={18} />, label: 'Telegram Numbers' },
  { href: '/dashboard/user/refer', icon: <RiUserSharedLine size={18} />, label: 'Refer & Earn' },
  { href: '/dashboard/user/security', icon: <RiShieldKeyholeLine size={18} />, label: 'Security & API' },
  { href: '/dashboard/user/faqs', icon: <RiQuestionLine size={18} />, label: 'FAQs' },
];

const HISTORY_ITEMS = [
  { href: '/dashboard/user/numbers-history', icon: <RiHistoryLine size={18} />, label: 'Numbers History' },
  { href: '/dashboard/user/funding', icon: <RiExchangeFundsLine size={18} />, label: 'Funding History' },
  { href: '/dashboard/user/transactions', icon: <RiExchangeLine size={18} />, label: 'Transaction History' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { logout, user, setSidebarOpen } = useAppStore();

  const handleLogout = () => {
    logout(); // redirect to /login is handled inside logout()
  };

  // Close sidebar on mobile after nav click
  const handleNavClick = () => {
    if (window.innerWidth < 900) setSidebarOpen(false);
  };

  return (
    <aside style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Brand */}
      <div style={{
        padding: '20px 16px 16px',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex', alignItems: 'center', gap: 10,
        flexShrink: 0,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
          background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 12px var(--color-primary-glow)',
        }}>
          <RiSignalTowerFill size={18} color="#fff" />
        </div>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1rem' }}>
          bamzy<span style={{ color: 'var(--color-primary)' }}>SMS</span>
        </span>
      </div>

      {/* User info */}
      {user && (
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-border)', flexShrink: 0 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px', borderRadius: 10,
            background: 'var(--color-bg-hover)',
            border: '1px solid var(--color-border)',
          }}>
            <UserAvatar seed={user.username || user.name || 'user'} size={34} style={{ border: 'none' }} />
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.name}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-faint)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                @{user.username}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} style={{ textDecoration: 'none', position: 'relative' }} onClick={handleNavClick}>
              <div className={`sidebar-item ${pathname === item.href ? 'active' : ''}`}>
                {item.icon}
                {item.label}
                {item.href === '/dashboard/user/security' && user && !user.recovery_key_saved && (
                  <div style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    width: 8, height: 8, borderRadius: '50%', background: '#F59E0B',
                    boxShadow: '0 0 6px rgba(245, 158, 11, 0.6)'
                  }} />
                )}
              </div>
            </Link>
          ))}
        </div>

        <div className="sidebar-group-label">History</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {HISTORY_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }} onClick={handleNavClick}>
              <div className={`sidebar-item ${pathname === item.href ? 'active' : ''}`}>
                {item.icon}
                {item.label}
              </div>
            </Link>
          ))}
        </div>

        <div className="sidebar-group-label">Account</div>
        <button onClick={handleLogout} className="sidebar-item" style={{ color: '#EF4444' }}>
          <RiLogoutBoxLine size={18} />
          Logout
        </button>
      </nav>
    </aside>
  );
}
