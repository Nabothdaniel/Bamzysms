'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import Topbar from '@/components/dashboard/Topbar';
import { useAppStore } from '@/store/appStore';
import {
  adminService,
  type AdminSettings,
  type AdminUser,
} from '@/lib/api/admin.service';
import { getDashboardBasePath, getDashboardPath } from '@/lib/dashboard-paths';
import {
  RiAdminLine,
  RiArrowRightUpLine,
  RiBankLine,
  RiCoinsLine,
  RiMoneyDollarCircleLine,
  RiRefreshLine,
  RiSaveLine,
  RiUserStarLine,
  RiWallet3Line,
} from 'react-icons/ri';

function formatCurrency(value: number) {
  return `₦${Number.isFinite(value) ? value.toLocaleString() : '0'}`;
}

export default function AdminFundingPage() {
  const router = useRouter();
  const { user, addToast } = useAppStore();
  const userDashboardPath = getDashboardBasePath('user');
  const adminDashboardPath = getDashboardBasePath(user?.role);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingBalance, setSavingBalance] = useState(false);
  const [providerBalance, setProviderBalance] = useState<number | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [settings, setSettings] = useState<AdminSettings>({
    price_markup_multiplier: '',
    usd_to_ngn_rate: '',
  });
  const [selectedUserId, setSelectedUserId] = useState('');
  const [balanceInput, setBalanceInput] = useState('');

  const selectedUser = useMemo(
    () => users.find((entry) => String(entry.id) === selectedUserId) ?? null,
    [selectedUserId, users]
  );

  const walletTotals = useMemo(
    () => users.reduce((sum, entry) => sum + Number(entry.balance || 0), 0),
    [users]
  );

  const loadFundingData = useCallback(async (silent = false) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const [providerRes, usersRes, settingsRes] = await Promise.all([
        adminService.getProviderBalance(),
        adminService.getUsers(),
        adminService.getSettings(),
      ]);

      setProviderBalance(Number(providerRes.balance ?? 0));
      setUsers(usersRes.data);
      setSettings({
        price_markup_multiplier: settingsRes.data.price_markup_multiplier ?? '',
        usd_to_ngn_rate: settingsRes.data.usd_to_ngn_rate ?? '',
      });
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed to load funding data.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (!user) return;
    if (user.role !== 'admin') {
      router.replace(userDashboardPath);
      return;
    }

    loadFundingData();
  }, [loadFundingData, router, user, userDashboardPath]);

  useEffect(() => {
    if (!selectedUser) return;
    setBalanceInput(String(selectedUser.balance ?? 0));
  }, [selectedUser]);

  const handleSettingsSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);

    try {
      await adminService.updateSettings({
        price_markup_multiplier: settings.price_markup_multiplier,
        usd_to_ngn_rate: settings.usd_to_ngn_rate,
      });
      addToast('Funding settings updated successfully.', 'success');
      await loadFundingData(true);
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed to update settings.', 'error');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleBalanceSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedUserId) {
      addToast('Select a user before saving.', 'info');
      return;
    }

    const nextBalance = Number(balanceInput);
    if (!Number.isFinite(nextBalance) || nextBalance < 0) {
      addToast('Enter a valid wallet balance.', 'error');
      return;
    }

    setSavingBalance(true);

    try {
      await adminService.updateUserBalance(Number(selectedUserId), nextBalance);
      addToast('User balance updated.', 'success');
      await loadFundingData(true);
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Failed to update user balance.', 'error');
    } finally {
      setSavingBalance(false);
    }
  };

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <DashboardLayout>
      <Topbar title="Admin Funding" />

      <main style={{ padding: '20px 16px', maxWidth: 1240 }}>
        <div className="breadcrumb">
          <Link href={adminDashboardPath}>Dashboard</Link>
          <span>/</span>
          <span>Funding</span>
        </div>

        <section
          className="stat-card"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 16,
            alignItems: 'center',
            flexWrap: 'wrap',
            marginBottom: 18,
          }}
        >
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 10px',
                borderRadius: 999,
                background: 'rgba(0,229,255,0.08)',
                color: 'var(--color-primary)',
                fontSize: '0.78rem',
                fontWeight: 700,
                marginBottom: 12,
              }}
            >
              <RiAdminLine size={15} />
              Admin Only
            </div>

            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', marginBottom: 8 }}>
              Funding controls and wallet operations
            </h1>
            <p style={{ color: 'var(--color-text-faint)', maxWidth: 700, lineHeight: 1.6 }}>
              Review your upstream provider balance, keep pricing settings current, and adjust customer
              wallet balances from one place.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => loadFundingData(true)}
              disabled={refreshing}
            >
              <RiRefreshLine size={16} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            <Link href={getDashboardPath('admin')} className="btn-primary" style={{ textDecoration: 'none' }}>
              Back to admin
            </Link>
          </div>
        </section>

        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: 14,
            marginBottom: 18,
          }}
          className="admin-funding-stats"
        >
          <div className="stat-card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(14,165,233,0.12)', color: '#0EA5E9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <RiBankLine size={20} />
              </div>
              <div style={{ color: 'var(--color-text-faint)', fontSize: '0.8rem' }}>Provider Balance</div>
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.4rem' }}>
              {providerBalance === null ? '...' : formatCurrency(providerBalance)}
            </div>
          </div>

          <div className="stat-card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(16,185,129,0.12)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <RiWallet3Line size={20} />
              </div>
              <div style={{ color: 'var(--color-text-faint)', fontSize: '0.8rem' }}>User Wallet Total</div>
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.4rem' }}>
              {formatCurrency(walletTotals)}
            </div>
          </div>

          <div className="stat-card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(245,158,11,0.12)', color: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <RiCoinsLine size={20} />
              </div>
              <div style={{ color: 'var(--color-text-faint)', fontSize: '0.8rem' }}>USD to NGN</div>
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.4rem' }}>
              {settings.usd_to_ngn_rate || '0'}
            </div>
          </div>

          <div className="stat-card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: 'rgba(124,58,237,0.12)', color: '#A78BFA', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <RiMoneyDollarCircleLine size={20} />
              </div>
              <div style={{ color: 'var(--color-text-faint)', fontSize: '0.8rem' }}>Markup Multiplier</div>
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.4rem' }}>
              {settings.price_markup_multiplier || '0'}
            </div>
          </div>
        </section>

        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 16,
            marginBottom: 18,
          }}
          className="admin-funding-grid"
        >
          <form className="stat-card" onSubmit={handleSettingsSave}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(0,229,255,0.12)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <RiCoinsLine size={18} />
              </div>
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', marginBottom: 4 }}>
                  Pricing settings
                </h2>
                <p style={{ color: 'var(--color-text-faint)', fontSize: '0.82rem' }}>
                  Update the markup and exchange rate used to price numbers.
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 8 }}>
                  Price Markup Multiplier
                </label>
                <input
                  className="input-field"
                  inputMode="decimal"
                  value={settings.price_markup_multiplier}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, price_markup_multiplier: e.target.value }))
                  }
                  placeholder="1.5"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 8 }}>
                  USD to NGN Rate
                </label>
                <input
                  className="input-field"
                  inputMode="decimal"
                  value={settings.usd_to_ngn_rate}
                  onChange={(e) => setSettings((prev) => ({ ...prev, usd_to_ngn_rate: e.target.value }))}
                  placeholder="1600"
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={savingSettings}
              style={{ marginTop: 18, width: '100%', justifyContent: 'center' }}
            >
              <RiSaveLine size={17} />
              {savingSettings ? 'Saving...' : 'Save Funding Settings'}
            </button>
          </form>

          <form className="stat-card" onSubmit={handleBalanceSave}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(16,185,129,0.12)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <RiUserStarLine size={18} />
              </div>
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', marginBottom: 4 }}>
                  Wallet adjustment
                </h2>
                <p style={{ color: 'var(--color-text-faint)', fontSize: '0.82rem' }}>
                  Set a user&apos;s wallet to an exact amount and record an admin adjustment.
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 8 }}>
                  Select User
                </label>
                <select
                  className="input-field"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                >
                  <option value="">Choose a user</option>
                  {users.map((entry) => (
                    <option key={entry.id} value={entry.id}>
                      {entry.name} ({entry.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 8 }}>
                  New Wallet Balance
                </label>
                <input
                  className="input-field"
                  inputMode="decimal"
                  value={balanceInput}
                  onChange={(e) => setBalanceInput(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>

            {selectedUser && (
              <div
                style={{
                  marginTop: 14,
                  padding: '12px 14px',
                  borderRadius: 12,
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-bg-hover)',
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 6 }}>{selectedUser.name}</div>
                <div style={{ color: 'var(--color-text-faint)', fontSize: '0.82rem', marginBottom: 4 }}>
                  Current Balance: {formatCurrency(Number(selectedUser.balance || 0))}
                </div>
                <div style={{ color: 'var(--color-text-faint)', fontSize: '0.82rem' }}>
                  Phone: {selectedUser.phone || 'N/A'}
                </div>
              </div>
            )}

            <button
              type="submit"
              className="btn-primary"
              disabled={savingBalance}
              style={{ marginTop: 18, width: '100%', justifyContent: 'center' }}
            >
              <RiWallet3Line size={17} />
              {savingBalance ? 'Updating...' : 'Update User Balance'}
            </button>
          </form>
        </section>

        <section
          style={{
            display: 'grid',
            gridTemplateColumns: '1.3fr 0.7fr',
            gap: 16,
          }}
          className="admin-funding-bottom"
        >
          <div className="stat-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <div>
                <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', marginBottom: 4 }}>
                  User wallet overview
                </h3>
                <p style={{ color: 'var(--color-text-faint)', fontSize: '0.82rem' }}>
                  Quick view of current user balances loaded from the admin API.
                </p>
              </div>
              <span style={{ color: 'var(--color-text-faint)', fontSize: '0.82rem' }}>
                {users.length} user{users.length === 1 ? '' : 's'}
              </span>
            </div>

            {loading ? (
              <p style={{ color: 'var(--color-text-faint)' }}>Loading funding data...</p>
            ) : users.length === 0 ? (
              <p style={{ color: 'var(--color-text-faint)' }}>No users found yet.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>
                      <th style={{ padding: '12px 10px' }}>User</th>
                      <th style={{ padding: '12px 10px' }}>Role</th>
                      <th style={{ padding: '12px 10px' }}>Balance</th>
                      <th style={{ padding: '12px 10px' }}>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.slice(0, 12).map((entry) => (
                      <tr key={entry.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                        <td style={{ padding: '12px 10px' }}>
                          <div style={{ fontWeight: 700 }}>{entry.name}</div>
                          <div style={{ color: 'var(--color-text-faint)', fontSize: '0.8rem' }}>{entry.email}</div>
                        </td>
                        <td style={{ padding: '12px 10px', textTransform: 'capitalize' }}>{entry.role}</td>
                        <td style={{ padding: '12px 10px', fontWeight: 700 }}>
                          {formatCurrency(Number(entry.balance || 0))}
                        </td>
                        <td style={{ padding: '12px 10px', color: 'var(--color-text-faint)' }}>
                          {new Date(entry.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="stat-card">
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', marginBottom: 14 }}>
              Related admin tools
            </h3>

            <div style={{ display: 'grid', gap: 12 }}>
              <Link
                href={getDashboardPath('admin')}
                style={{
                  textDecoration: 'none',
                  padding: '14px',
                  borderRadius: 14,
                  border: '1px solid var(--color-border)',
                  background: 'var(--color-bg-hover)',
                  color: 'var(--color-text)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>USA Number Uploads</div>
                    <div style={{ color: 'var(--color-text-faint)', fontSize: '0.82rem' }}>
                      Manage admin-only USA number inventory.
                    </div>
                  </div>
                  <RiArrowRightUpLine size={18} />
                </div>
              </Link>

              <div
                style={{
                  padding: '14px',
                  borderRadius: 14,
                  border: '1px solid var(--color-border)',
                  background: 'rgba(0,229,255,0.04)',
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 6 }}>Funding notes</div>
                <div style={{ color: 'var(--color-text-faint)', fontSize: '0.82rem', lineHeight: 1.6 }}>
                  Changes here affect live pricing and wallet balances. Review values before saving.
                </div>
              </div>
            </div>
          </div>
        </section>

        <style>{`
          @media (max-width: 1100px) {
            .admin-funding-stats { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
            .admin-funding-bottom { grid-template-columns: 1fr !important; }
          }

          @media (max-width: 900px) {
            .admin-funding-grid { grid-template-columns: 1fr !important; }
          }

          @media (max-width: 640px) {
            .admin-funding-stats { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </main>
    </DashboardLayout>
  );
}
