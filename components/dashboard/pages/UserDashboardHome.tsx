'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import Topbar from '@/components/dashboard/Topbar';
import WelcomeModal from '@/components/dashboard/WelcomeModal';
import {
  RiWalletLine, RiShoppingCartLine, RiAddLine,
  RiArrowRightLine, RiInboxLine, RiBankLine, RiHistoryLine,
} from 'react-icons/ri';
import { useAppStore } from '@/store/appStore';
import { userService, smsService } from '@/lib/api';
import { getDashboardBasePath, getDashboardPath } from '@/lib/dashboard-paths';

export default function UserDashboardHome() {
  const { user, login } = useAppStore();
  const [recentPurchases, setRecentPurchases] = useState<any[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const dashboardBasePath = getDashboardBasePath(user?.role);

  useEffect(() => {
    userService.getProfile().then(res => {
      login(res.data);
    }).catch(err => console.error('Failed to fetch profile', err));

    smsService.getPurchases().then(res => setRecentPurchases(res.data.slice(0, 5)));
    userService.getTransactions().then(res => setRecentTransactions(res.data.slice(0, 5)));
  }, [login]);

  return (
    <DashboardLayout>
      <WelcomeModal />
      <Topbar title="Dashboard" />

      <main style={{ padding: '20px 16px', maxWidth: 1100 }}>
        <div className="breadcrumb">
          <Link href={dashboardBasePath}>Dashboard</Link>
          <span>/</span>
          <span>Home</span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 12,
          marginBottom: 20,
        }}
          className="stat-grid"
        >
          <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14, flexShrink: 0,
              background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7C3AED',
            }}>
              <RiWalletLine size={24} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: 'var(--color-text-faint)', fontSize: '0.75rem', fontWeight: 600, marginBottom: 4 }}>
                Wallet Balance
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.4rem' }}>
                ₦{user?.balance?.toLocaleString() ?? '0'}
              </div>
            </div>
            <Link href={getDashboardPath(user?.role, 'fund-wallet')} style={{ textDecoration: 'none', flexShrink: 0 }}>
              <button className="btn-primary" style={{ padding: '8px 14px', fontSize: '0.78rem', gap: 4 }}>
                <RiAddLine size={13} /> Recharge
              </button>
            </Link>
          </div>

          <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14, flexShrink: 0,
              background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981',
            }}>
              <RiBankLine size={24} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: 'var(--color-text-faint)', fontSize: '0.75rem', fontWeight: 600, marginBottom: 4 }}>
                Virtual Account Number
              </div>
              <div style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '1.2rem', color: 'var(--color-text)' }}>
                {user?.phone ? `0${user.phone.slice(-9)}` : '7049283741'}
              </div>
            </div>
            <Link href={getDashboardPath(user?.role, 'fund-wallet')} style={{ textDecoration: 'none', flexShrink: 0 }}>
              <button className="btn-primary" style={{ padding: '8px 14px', fontSize: '0.78rem' }}>
                Details
              </button>
            </Link>
          </div>

          <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14, flexShrink: 0,
              background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F59E0B',
            }}>
              <RiShoppingCartLine size={24} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: 'var(--color-text-faint)', fontSize: '0.75rem', fontWeight: 600, marginBottom: 4 }}>
                SMS Numbers Ready
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.4rem' }}>
                {recentPurchases.filter(p => p.status === 'received').length}
              </div>
            </div>
            <Link href={getDashboardPath(user?.role, 'numbers-history')} style={{ textDecoration: 'none', flexShrink: 0 }}>
              <button className="btn-ghost" style={{ padding: '8px 12px', fontSize: '0.78rem' }}>
                <RiArrowRightLine size={16} />
              </button>
            </Link>
          </div>

          <div className="stat-card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14, flexShrink: 0,
              background: 'var(--color-primary-dim)', border: '1px solid rgba(0,229,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)',
            }}>
              <RiHistoryLine size={24} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: 'var(--color-text-faint)', fontSize: '0.75rem', fontWeight: 600, marginBottom: 4 }}>
                Total Wallet Top-up
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.4rem' }}>
                ₦{recentTransactions.filter(t => t.type === 'credit').reduce((acc, t) => acc + parseFloat(t.amount), 0).toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="history-grid">
          <div className="stat-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem' }}>
                Recent Numbers
              </h3>
              <Link href={getDashboardPath(user?.role, 'numbers-history')} style={{ color: 'var(--color-primary)', fontSize: '0.75rem', fontWeight: 600, textDecoration: 'none' }}>
                View All
              </Link>
            </div>
            {recentPurchases.length === 0 ? (
              <EmptyState message="No Recent Numbers Yet." />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {recentPurchases.map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '8px 0', borderBottom: '1px solid var(--color-bg)' }}>
                    <span>{p.phone_number}</span>
                    <span style={{ color: p.status === 'received' ? '#10B981' : '#F59E0B', fontWeight: 600 }}>{p.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="stat-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem' }}>
                Recent Transactions
              </h3>
              <Link href={getDashboardPath(user?.role, 'transactions')} style={{ color: 'var(--color-primary)', fontSize: '0.75rem', fontWeight: 600, textDecoration: 'none' }}>
                View All
              </Link>
            </div>
            {recentTransactions.length === 0 ? (
              <EmptyState message="No Recent Transactions Yet." />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {recentTransactions.map(t => (
                  <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '8px 0', borderBottom: '1px solid var(--color-bg)' }}>
                    <span>{t.description}</span>
                    <span style={{ fontWeight: 700 }}>{t.type === 'credit' ? '+' : '-'}₦{parseFloat(t.amount).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <style>{`
        @media (max-width: 600px) {
          .stat-grid { grid-template-columns: 1fr !important; }
          .history-grid { grid-template-columns: 1fr !important; }
          main { padding: 16px 12px !important; }
        }
      `}</style>
    </DashboardLayout>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 16px', gap: 8 }}>
      <RiInboxLine size={32} color="var(--color-text-faint)" style={{ opacity: 0.4 }} />
      <p style={{ color: 'var(--color-text-faint)', fontSize: '0.8rem' }}>{message}</p>
    </div>
  );
}
