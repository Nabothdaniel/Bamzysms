'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  RiDashboardLine, RiMoneyDollarCircleLine, RiSettings4Line, 
  RiGroupLine, RiLogoutBoxRLine, RiShieldUserLine,
  RiHistoryLine, RiExchangeFundsLine, RiSimCardLine
} from 'react-icons/ri';
import { useAppStore } from '@/store/appStore';

const NAV_ITEMS = [
  { name: 'Dashboard', href: '/dashboard/admin/dashboard', icon: RiDashboardLine },
  { name: 'User Management', href: '/dashboard/admin/users', icon: RiGroupLine },
  { name: 'Funding History', href: '/dashboard/admin/funding', icon: RiExchangeFundsLine },
  { name: 'Price Management', href: '/dashboard/admin/prices', icon: RiMoneyDollarCircleLine },
  { name: 'Telegram Inventory', href: '/dashboard/admin/telegram-numbers', icon: RiSimCardLine },
  { name: 'USA Numbers', href: '/dashboard/admin/usa-numbers', icon: RiSimCardLine },
  { name: 'Global Settings', href: '/dashboard/admin/settings', icon: RiSettings4Line },
  { name: 'System Logs', href: '/dashboard/admin/logs', icon: RiHistoryLine },
];

interface AdminSidebarProps {
  onClose?: () => void;
}

export default function AdminSidebar({ onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const { logout } = useAppStore();

  const handleNavClick = (href: string) => {
    if (onClose) onClose();
  };

  const handleLogout = () => {
    logout(); // redirect to /login is handled inside logout()
    if (onClose) onClose();
  };

  return (
    <aside className="sidebar" style={{ 
      background: 'var(--color-bg-2)', 
      borderRight: '1px solid var(--color-border)',
      width: '260px',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div className="sidebar-header" style={{ padding: '32px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: 'var(--color-primary)' }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'var(--color-primary-dim)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <RiShieldUserLine size={24} />
          </div>
          <span style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.01em', color: 'var(--color-text)' }}>
            BAMZY<span style={{ color: 'var(--color-primary)' }}>ADMIN</span>
          </span>
        </div>
      </div>

      <nav className="sidebar-nav" style={{ padding: '0 16px', flex: 1 }}>
        <div style={{ 
          fontSize: '0.65rem', 
          color: 'var(--color-text-faint)', 
          fontWeight: 800, 
          padding: '0 12px 12px', 
          textTransform: 'uppercase', 
          letterSpacing: '0.1em' 
        }}>
          Control Panel
        </div>
        
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.href} 
              href={item.href}
              onClick={() => handleNavClick(item.href)}
              className={`nav-item ${isActive ? 'active' : ''}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                borderRadius: '12px', color: isActive ? 'var(--color-primary)' : 'var(--color-text-muted)',
                background: isActive ? 'var(--color-primary-dim)' : 'transparent',
                transition: 'all 0.2s', marginBottom: '4px', textDecoration: 'none', 
                fontSize: '0.9rem', fontWeight: isActive ? 700 : 500
              }}
            >
              <item.icon size={20} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div style={{ padding: '24px 16px', borderTop: '1px solid var(--color-border)' }}>
        <button 
          onClick={handleLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', width: '100%',
            background: 'rgba(239,68,68,0.05)', border: 'none', cursor: 'pointer',
            color: '#EF4444', fontSize: '0.9rem', textAlign: 'left', borderRadius: '12px',
            fontWeight: 600, transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.1)'}
          onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.background = 'rgba(239,68,68,0.05)'}
        >
          <RiLogoutBoxRLine size={20} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
