'use client';

import React, { useEffect, useState, useCallback } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { adminService } from '@/lib/api/admin.service';
import {
  RiWalletLine, RiCpuLine,
  RiLineChartLine, RiUserStarLine, RiTimerFlashLine,
  RiQuestionLine, RiLoader4Line,
} from 'react-icons/ri';
import { useAppStore } from '@/store/appStore';
import Tooltip from '@/components/ui/Tooltip';
import { formatMoney, formatNumber } from '@/lib/utils';

// ─── Default shape so cards always render ────────────────────────────────────
const DEFAULT_STATS = {
  providerBalance: null as number | null,  // null = not loaded yet
  revenue:         0,
  orders:          0,
  totalOrders:     0,
  reversedOrders:  0,
  refundedRevenue: 0,
  successRate:     0,
  users:           0,
  conversionRate:  1600,
  daily:           [] as any[],
};

// Small skeleton shimmer for individual values still loading
function Shimmer() {
  return (
    <div style={{
      height: '1.6rem', width: '110px', borderRadius: 6,
      background: 'linear-gradient(90deg, var(--color-bg-hover) 25%, var(--color-border) 50%, var(--color-bg-hover) 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
    }} />
  );
}

export default function AdminDashboard() {
  const { addToast, hasHydrated, user } = useAppStore();

  // ── State ────────────────────────────────────────────────────────────────
  const [stats,           setStats]           = useState(DEFAULT_STATS);
  const [globalSettings,  setGlobalSettings]  = useState<any>(null);
  const [providerStatus,  setProviderStatus]  = useState<{ status: string; error?: string } | null>(null);

  // Individual loading flags — lets cards render immediately with skeletons
  const [loadingAnalytics,  setLoadingAnalytics]  = useState(true);
  const [loadingBalance,    setLoadingBalance]    = useState(true);
  const [loadingSettings,   setLoadingSettings]   = useState(true);
  const [loadingStatus,     setLoadingStatus]     = useState(true);

  const canLoadAdminData = hasHydrated && user?.role === 'admin';
  // True while waiting for hydration only
  const waitingForHydration = !hasHydrated;

  // ── Fetch helpers — each resolves independently, never throws upward ──────
  const fetchAnalytics = useCallback(async () => {
    setLoadingAnalytics(true);
    try {
      const res = await adminService.getAnalytics();
      if (res?.data?.totals) {
        setStats(prev => ({
          ...prev,
          revenue:      parseFloat(res.data.totals.revenue      ?? 0),
          orders:       parseInt  (res.data.totals.orders       ?? 0, 10),
          totalOrders:  parseInt  (res.data.totals.total_orders ?? 0, 10),
          reversedOrders: parseInt(res.data.totals.reversed_orders ?? 0, 10),
          refundedRevenue: parseFloat(res.data.totals.refunded_revenue ?? 0),
          successRate:  parseFloat(res.data.totals.success_rate ?? 0),
          users:        parseInt  (res.data.totals.users        ?? 0, 10),
          daily:        res.data.daily ?? [],
        }));
      }
    } catch (e) {
      console.warn('[AdminDashboard] Analytics fetch failed:', e);
    } finally {
      setLoadingAnalytics(false);
    }
  }, []);

  const fetchBalance = useCallback(async () => {
    setLoadingBalance(true);
    try {
      // const res = await adminService.getProviderBalance();
      // setStats(prev => ({ ...prev, providerBalance: res?.balance ?? 0 }));
    } catch (e) {
      console.warn('[AdminDashboard] Provider balance fetch failed:', e);
      // Don't toast — it's handled by the card's skeleton → null display
    } finally {
      setLoadingBalance(false);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    setLoadingSettings(true);
    try {
      const res = await adminService.getSettings();
      if (res?.data) {
        setGlobalSettings(res.data);
        setStats(prev => ({
          ...prev,
          conversionRate: parseFloat(res.data.usd_to_ngn_rate ?? '1600'),
        }));
      }
    } catch (e) {
      console.warn('[AdminDashboard] Settings fetch failed:', e);
    } finally {
      setLoadingSettings(false);
    }
  }, []);

  const fetchStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      // const res = await adminService.getProviderStatus();
      // if (res?.data) {
      //   setProviderStatus({
      //     status: res.data.provider ?? 'unknown',
      //     error:  res.data.error   ?? undefined,
      //   });
      // }
    } catch (e) {
      console.warn('[AdminDashboard] Provider status fetch failed:', e);
      setProviderStatus({ status: 'error', error: 'Could not reach provider' });
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  const fetchAll = useCallback(() => {
    if (!canLoadAdminData) return;
    // Fire all independently — no allSettled needed, each manages itself
    fetchAnalytics();
    fetchBalance();
    fetchSettings();
    fetchStatus();
  }, [canLoadAdminData, fetchAnalytics, fetchBalance, fetchSettings, fetchStatus]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const maxDaily = stats.daily.length
    ? Math.max(...stats.daily.map((d: any) => parseFloat(d.daily_revenue)))
    : 0;

  // ── Convenience flag: all fetches done ───────────────────────────────────
  const allLoaded = !loadingAnalytics && !loadingBalance && !loadingSettings;

  return (
    <AdminLayout>
      <div className="admin-content" style={{ padding: '32px' }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 20 }}>
          <div>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 800, margin: '0 0 8px', color: 'var(--color-text)' }}>Admin Overview</h1>
            <p style={{ color: 'var(--color-text-faint)', margin: 0, fontWeight: 500 }}>System health and platform statistics.</p>
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {/* Provider status badge */}
            {loadingStatus ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.5, fontSize: '0.8rem' }}>
                <RiLoader4Line size={14} style={{ animation: 'spin 1s linear infinite' }} /> Checking provider…
              </div>
            ) : providerStatus ? (
              <div
                title={providerStatus.error}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: '12px',
                  background: providerStatus.status === 'online' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                  color:      providerStatus.status === 'online' ? '#10B981' : '#EF4444',
                  fontSize: '0.8rem', fontWeight: 700, border: '1px solid currentColor',
                }}
              >
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'currentColor', animation: providerStatus.status === 'online' ? 'pulse 2s infinite' : 'none' }} />
                Provider: {providerStatus.status === 'online' ? 'Online' : 'Offline'}
              </div>
            ) : null}

            <button
              onClick={fetchAll}
              disabled={waitingForHydration}
              className="btn-secondary"
              style={{ padding: '8px 12px' }}
              title="Refresh"
            >
              <RiTimerFlashLine size={18} style={{ animation: (!allLoaded && !waitingForHydration) ? 'spin 1s linear infinite' : 'none' }} />
            </button>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────────
            Stat Cards — always rendered; show shimmer while loading
        ───────────────────────────────────────────────────────────────── */}
        <div
          className="stats-grid"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}
        >
          {/* Provider Balance */}
          <div className="stat-card" style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg-2)', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--color-primary-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}>
                <RiWalletLine size={24} />
              </div>
              <span className="badge" style={{ background: 'var(--color-primary-dim)', color: 'var(--color-primary)', fontWeight: 700 }}>Provider</span>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-faint)', fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: 6 }}>
              SMSBower Balance
              <Tooltip content="The live USD balance available with your upstream provider for buying activations.">
                <span style={{ display: 'inline-flex', color: 'var(--color-text-faint)', cursor: 'help' }}><RiQuestionLine size={14} /></span>
              </Tooltip>
            </div>
            {loadingBalance
              ? <Shimmer />
              : <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-text)' }}>
                  {stats.providerBalance === null ? '—' : formatMoney(stats.providerBalance, 'USD')}
                </div>
            }
          </div>

          {/* Total Revenue */}
          <div className="stat-card" style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg-2)', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10B981' }}>
                <RiLineChartLine size={24} />
              </div>
              <span className="badge" style={{ background: 'rgba(16,185,129,0.05)', color: '#10B981', fontWeight: 700 }}>Revenue</span>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-faint)', fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: 6 }}>
              Net Sales (NGN)
              <Tooltip content="Purchase revenue after refunded and reversed transactions have been deducted.">
                <span style={{ display: 'inline-flex', color: 'var(--color-text-faint)', cursor: 'help' }}><RiQuestionLine size={14} /></span>
              </Tooltip>
            </div>
            {loadingAnalytics
              ? <Shimmer />
              : <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-text)' }}>{formatMoney(stats.revenue)}</div>
            }
          </div>

          {/* Success Rate */}
          <div className="stat-card" style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg-2)', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F59E0B' }}>
                <RiCpuLine size={24} />
              </div>
              <span className="badge" style={{ background: 'rgba(245,158,11,0.05)', color: '#F59E0B', fontWeight: 700 }}>Efficiency</span>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-faint)', fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: 6 }}>
              Activation Success Rate
              <Tooltip content="The share of activation requests that ended successfully.">
                <span style={{ display: 'inline-flex', color: 'var(--color-text-faint)', cursor: 'help' }}><RiQuestionLine size={14} /></span>
              </Tooltip>
            </div>
            {loadingAnalytics
              ? <Shimmer />
              : <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-text)' }}>{stats.successRate}%</div>
            }
          </div>

          {/* User Count */}
          <div className="stat-card" style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg-2)', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(37,99,235,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)' }}>
                <RiUserStarLine size={24} />
              </div>
              <span className="badge" style={{ background: 'rgba(37,99,235,0.05)', color: 'var(--color-primary)', fontWeight: 700 }}>Growth</span>
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--color-text-faint)', fontWeight: 600, marginBottom: '8px' }}>Total Customers</div>
            {loadingAnalytics
              ? <Shimmer />
              : <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--color-text)' }}>{stats.users}</div>
            }
          </div>
        </div>

        {/* ── Charts Section ── */}
        <div className="charts-section" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>

          {/* Revenue Bar Chart */}
          <div className="stat-card" style={{ border: '1px solid var(--color-border)', background: 'var(--color-bg-2)', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <RiLineChartLine color="var(--color-primary)" />
              Revenue Trend (Last 7 Days)
            </h3>

            <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: '12px', padding: '0 10px 20px', minHeight: '200px', overflowX: 'auto' }}>
              {loadingAnalytics ? (
                // Skeleton bars
                Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} style={{ flex: 1, minWidth: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: '100%',
                      height: `${20 + Math.random() * 60}%`,
                      background: 'var(--color-bg-hover)',
                      borderRadius: '6px 6px 2px 2px',
                      animation: 'shimmer 1.4s infinite',
                      backgroundSize: '200% 100%',
                      backgroundImage: 'linear-gradient(90deg, var(--color-bg-hover) 25%, var(--color-border) 50%, var(--color-bg-hover) 75%)',
                    }} />
                    <div style={{ height: 8, width: 24, borderRadius: 4, background: 'var(--color-bg-hover)' }} />
                  </div>
                ))
              ) : !stats.daily.length ? (
                <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-faint)', fontSize: '0.9rem' }}>
                  No sales data for the last 7 days.
                </div>
              ) : (
                stats.daily.map((d: any, i: number) => {
                  const height = maxDaily > 0 ? (parseFloat(d.daily_revenue) / maxDaily) * 100 : 5;
                  return (
                    <div key={i} style={{ flex: 1, minWidth: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: '100%', height: `${Math.max(height, 5)}%`, minHeight: 4,
                        background: 'linear-gradient(to top, var(--color-primary), var(--color-secondary))',
                        borderRadius: '6px 6px 2px 2px', position: 'relative', transition: 'height 0.8s ease-out',
                      }}>
                        <div className="chart-tooltip" style={{
                          position: 'absolute', top: -30, left: '50%', transform: 'translateX(-50%)',
                          background: '#000', color: '#fff', fontSize: '0.65rem', padding: '4px 6px',
                          borderRadius: '4px', whiteSpace: 'nowrap', opacity: 0, transition: 'opacity 0.2s',
                          pointerEvents: 'none', fontWeight: 700,
                        }}>
                          {formatMoney(parseFloat(d.daily_revenue))}
                        </div>
                      </div>
                      <span style={{ fontSize: '0.65rem', color: 'var(--color-text-faint)', fontWeight: 700 }}>
                        {new Date(d.date).toLocaleDateString(undefined, { weekday: 'short' })}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Sales Distribution */}
          <div className="stat-card" style={{ border: '1px solid var(--color-border)' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <RiTimerFlashLine color="var(--color-primary)" />
              Sales Distribution
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600 }}>
                  <span>Activations</span>
                  <span>{loadingAnalytics ? '…' : `${stats.orders} settled / ${stats.totalOrders} total`}</span>
                </div>
                <div style={{ height: 6, width: '100%', background: 'var(--color-bg-hover)', borderRadius: 3 }}>
                  <div style={{ height: '100%', width: `${stats.successRate}%`, background: '#10B981', borderRadius: 3, transition: 'width 0.8s ease-out' }} />
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-faint)', fontWeight: 500 }}>
                  {loadingSettings ? 'Loading rate…' : `Global Rate: ${formatNumber(stats.conversionRate)} NGN/USD`}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-faint)', fontWeight: 500 }}>
                  {loadingSettings ? 'Loading multiplier…' : `Multiplier: ${Number(globalSettings?.price_markup_multiplier ?? 1.5).toFixed(2)}x`}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-faint)', fontWeight: 500 }}>
                  {loadingAnalytics ? 'Loading reversals…' : `Refunded: ${formatMoney(stats.refundedRevenue)} across ${formatNumber(stats.reversedOrders)} reversal(s)`}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <style jsx>{`
        .stat-card:hover .chart-tooltip { opacity: 1 !important; }

        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }

        @media (max-width: 1024px) {
          .admin-content    { padding: 20px 16px !important; }
          .charts-section   { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </AdminLayout>
  );
}
