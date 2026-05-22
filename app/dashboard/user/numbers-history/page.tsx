'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import Topbar from '@/components/dashboard/Topbar';
import EmptyHistory from '@/components/dashboard/EmptyHistory';
import PageLoader from '@/components/ui/PageLoader';
import { smsService } from '@/lib/api';
import { manualNumberService, TelegramNumberItem } from '@/lib/api/manual-number.service';
import { usaNumberService, UsaNumberItem } from '@/lib/api/usa-number.service';
import { RiRefreshLine } from 'react-icons/ri';
import { useAppStore } from '@/store/appStore';
import HistoryViewSwitcher from '@/components/dashboard/history/HistoryViewSwitcher';
import HistorySkeleton from '@/components/dashboard/history/HistorySkeleton';
import HistoryTable from '@/components/dashboard/history/HistoryTable';
import HistoryGrid from '@/components/dashboard/history/HistoryGrid';
import TutorialBanner from '@/components/dashboard/TutorialBanner';
import { formatMoney } from '@/lib/utils';

const NOTIFICATION_SOUND = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';
const PAGE_SIZE = 12;

export default function NumbersHistoryPage() {
  const { addToast } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [telegramLoading, setTelegramLoading] = useState(true);
  const [telegramItems, setTelegramItems] = useState<TelegramNumberItem[]>([]);
  const [usaLoading, setUsaLoading] = useState(true);
  const [usaItems, setUsaItems] = useState<UsaNumberItem[]>([]);
  const [telegramVisibility, setTelegramVisibility] = useState<Record<number, boolean>>({});
  const [usaVisibility, setUsaVisibility] = useState<Record<number, boolean>>({});
  const [refreshingUsaOtpId, setRefreshingUsaOtpId] = useState<number | null>(null);
  const [telegramCancelReason, setTelegramCancelReason] = useState<Record<number, string>>({});
  const [submittingTelegramCancelId, setSubmittingTelegramCancelId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Pagination / Infinite Scroll States
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [revealedData, setRevealedData] = useState<{ [key: number]: { phone: string; otp: string } }>({});

  const pollingRef = useRef<{ [key: number]: NodeJS.Timeout }>({});

  const fetchHistory = useCallback(async (isLoadMore = false, newOffset = 0, silent = false) => {
    if (!silent && !isLoadMore) setLoading(true);
    if (isLoadMore) setIsLoadingMore(true);

    try {
      const res = await smsService.getPurchases(PAGE_SIZE, newOffset);
      const fetchedItems = res?.data || [];
      if (isLoadMore) {
        setItems(prev => [...(prev || []), ...fetchedItems]);
      } else {
        setItems(fetchedItems);
      }
      setTotal(res?.meta?.total || 0);
      setHasMore(res?.meta?.hasMore || false);
      setOffset(newOffset);
    } catch (err) {
      console.error('Failed to fetch history', err);
      addToast('Failed to load history', 'error');
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  }, [addToast]);

  const fetchTelegramHistory = useCallback(async () => {
    setTelegramLoading(true);
    try {
      const res = await manualNumberService.getMyTelegramNumbers();
      setTelegramItems(res?.data || []);
    } catch (err) {
      console.error('Failed to fetch Telegram history', err);
      addToast('Failed to load Telegram history', 'error');
    } finally {
      setTelegramLoading(false);
    }
  }, [addToast]);

  const fetchUsaHistory = useCallback(async () => {
    setUsaLoading(true);
    try {
      const res = await usaNumberService.getMine();
      setUsaItems(res?.data || []);
    } catch (err) {
      console.error('Failed to fetch USA history', err);
      addToast('Failed to load USA number beta history', 'error');
    } finally {
      setUsaLoading(false);
    }
  }, [addToast]);

  const startPolling = useCallback((dbId: number, activationId: number) => {
    const poll = async () => {
      try {
        const res = await smsService.getSmsStatus(activationId);
        const { smsStatus } = res.data;

        if (smsStatus === 'OK' || smsStatus === 'CANCEL' || smsStatus === 'WAIT_RETRY') {
          // Refresh list if status changed
          fetchHistory(false, 0, true);

          if (smsStatus === 'OK') {
            addToast(`OTP Received!`, 'success');
            new Audio(NOTIFICATION_SOUND).play().catch(() => { });
            delete pollingRef.current[dbId];
            return;
          }
          if (smsStatus === 'CANCEL') {
            delete pollingRef.current[dbId];
            return;
          }
        }
        pollingRef.current[dbId] = setTimeout(poll, 10000);
      } catch (err) {
        pollingRef.current[dbId] = setTimeout(poll, 15000);
      }
    };
    pollingRef.current[dbId] = setTimeout(poll, 5000);
  }, [addToast, fetchHistory]);

  useEffect(() => {
    fetchHistory();
    fetchTelegramHistory();
    fetchUsaHistory();
    return () => {
      // eslint-disable-next-line react-hooks/exhaustive-deps
      Object.values(pollingRef.current).forEach(clearTimeout);
    };
  }, [fetchHistory, fetchTelegramHistory, fetchUsaHistory]);

  // Handle active status polling
  useEffect(() => {
    (items || []).forEach(p => {
      if (p.status === 'pending' && !pollingRef.current[p.id]) {
        startPolling(p.id, p.activation_id);
      }
    });
  }, [items, startPolling]);

  const handleRevealClick = async (dbId: number) => {
    await revealDirectly(dbId);
  };
    
  const revealDirectly = async (dbId: number) => {
    try {
      const res = await smsService.revealPlainNumber(dbId);
      setRevealedData(prev => ({
        ...prev,
        [dbId]: { phone: res.data.phoneNumber, otp: res.data.otpCode }
      }));
    } catch (err: any) {
      addToast(err.message || 'Failed to reveal information', 'error');
    }
  };



  const handleUnreveal = (dbId: number) => {
    setRevealedData(prev => {
      const next = { ...prev };
      delete next[dbId];
      return next;
    });
  };

  const handleHide = async (id: number) => {
    if (!confirm('Hide this from your history?')) return;
    try {
      await smsService.hidePurchase(id);
      setItems(prev => prev.filter(item => item.id !== id));
      addToast('Removed from history', 'success');
    } catch (err) {
      addToast('Failed to hide', 'error');
    }
  };

  const handleCancel = async (activationId: number) => {
    if (!confirm('Cancel this activation?')) return;
    try {
      await smsService.setActivationStatus(activationId, 8);
      fetchHistory(false, 0, true);
      addToast('Cancelled', 'success');
    } catch (err: any) {
      addToast(err.message || 'Failed', 'error');
    }
  };

  const handleConfirm = async (activationId: number) => {
    try {
      await smsService.setActivationStatus(activationId, 6);
      fetchHistory(false, 0, true);
      addToast('Confirmed', 'success');
    } catch (err: any) {
      addToast(err.message || 'Failed', 'error');
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    addToast('Copied!', 'success');
  };

  const handleTelegramCancellationRequest = async (item: TelegramNumberItem) => {
    const reason = (telegramCancelReason[item.id] || '').trim();
    if (!reason) {
      addToast('Please enter a cancellation reason first.', 'error');
      return;
    }

    setSubmittingTelegramCancelId(item.id);
    try {
      await manualNumberService.requestTelegramCancellation(item.id, reason);
      addToast('Cancellation request sent to admin.', 'success');
      setTelegramCancelReason((prev) => ({ ...prev, [item.id]: '' }));
    } catch (error: any) {
      addToast(error.message || 'Failed to send cancellation request', 'error');
    } finally {
      setSubmittingTelegramCancelId(null);
    }
  };

  const handleRefreshUsaOtp = async (item: UsaNumberItem) => {
    setRefreshingUsaOtpId(item.id);
    try {
      const res = await usaNumberService.refreshOtp(item.id);
      setUsaItems((prev) =>
        prev.map((entry) =>
          entry.id === item.id ? { ...entry, otp_code: res?.data?.otp_code || entry.otp_code } : entry
        )
      );
      addToast(res.message || 'OTP refreshed.', 'success');
    } catch (error: any) {
      addToast(error.message || 'Failed to refresh USA OTP', 'error');
    } finally {
      setRefreshingUsaOtpId(null);
    }
  };

  return (
    <DashboardLayout>
      <Topbar title="Number History" />
      <main style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
          <div className="breadcrumb" style={{ marginBottom: 0 }}>
            <Link href="/dashboard">Dashboard</Link>
            <span>/</span>
            <span>Number History</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <HistoryViewSwitcher view={viewMode} onChange={(v) => {
              setViewMode(v);
              fetchHistory(false, 0); // Reset to page 1 on view change
            }} />
            <button className="btn-ghost" onClick={() => fetchHistory(false, 0)} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
              <RiRefreshLine size={16} /> Refresh
            </button>
          </div>
        </div>

        <TutorialBanner />


        {loading ? (
          <HistorySkeleton view={viewMode} />
        ) : !items || items.length === 0 ? (
          <EmptyHistory message="No history found" />
        ) : viewMode === 'table' ? (
          <HistoryTable
            items={items || []}
            onReveal={handleRevealClick}
            onUnreveal={handleUnreveal}
            onHide={handleHide}
            onCopy={handleCopy}
            revealedData={revealedData}
            pagination={{
              total,
              limit: PAGE_SIZE,
              offset,
              onPageChange: (newOffset) => fetchHistory(false, newOffset)
            }}
          />
        ) : (
          <HistoryGrid
            items={items || []}
            onReveal={handleRevealClick}
            onUnreveal={handleUnreveal}
            onHide={handleHide}
            onCopy={handleCopy}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
            revealedData={revealedData}
            hasMore={hasMore}
            onLoadMore={() => fetchHistory(true, offset + PAGE_SIZE)}
            isLoadingMore={isLoadingMore}
          />
        )}

        <section style={{ marginTop: 28 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 18, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 800, color: 'var(--color-primary)' }}>
                USA Numbers Beta
              </div>
              <h2 style={{ marginTop: 8, fontSize: '1.6rem', fontWeight: 800 }}>USA Number Beta History</h2>
            </div>
            <Link href="/dashboard/user/usa-numbers-beta" className="btn-secondary">
              Buy USA Numbers Beta
            </Link>
          </div>

          {usaLoading ? (
            <PageLoader />
          ) : usaItems.length === 0 ? (
            <EmptyHistory message="No USA number beta history found" />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18, marginBottom: 28 }}>
              {usaItems.map((item) => {
                const visible = !!usaVisibility[item.id];
                return (
                  <article key={item.id} className="stat-card" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                      <div>
                        <div className="badge badge-primary">{item.category || 'USA Beta'}</div>
                        <div style={{ marginTop: 12, fontSize: '1.1rem', fontWeight: 800 }}>
                          {visible ? item.phone_number : `${item.phone_number.slice(0, 5)}•••••${item.phone_number.slice(-2)}`}
                        </div>
                        <div style={{ marginTop: 6, color: 'var(--color-text-faint)', fontSize: '0.88rem' }}>
                          {item.service_name || 'USA Number'}
                        </div>
                      </div>
                      <button
                        className="btn-ghost"
                        style={{ minWidth: 'auto', padding: '8px 12px' }}
                        onClick={() => setUsaVisibility((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
                      >
                        {visible ? 'Hide' : 'Show'}
                      </button>
                    </div>

                    <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-faint)' }}>
                        {item.sold_at ? new Date(item.sold_at).toLocaleDateString() : '—'}
                      </div>
                      <div style={{ fontWeight: 800, color: 'var(--color-primary)' }}>{formatMoney(item.sell_price)}</div>
                    </div>

                    <div style={{ marginTop: 14, padding: 14, borderRadius: 14, background: 'var(--color-bg)' }}>
                      <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800, color: 'var(--color-text-faint)', marginBottom: 8 }}>
                        OTP From Redirect Link
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-primary)' }}>{item.otp_code || 'Waiting...'}</span>
                        {item.otp_code && (
                          <button className="btn-ghost" style={{ minWidth: 'auto', padding: 8 }} onClick={() => handleCopy(item.otp_code || '')}>
                            Copy
                          </button>
                        )}
                      </div>
                    </div>

                    <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
                      <button
                        className="btn-secondary"
                        onClick={() => handleRefreshUsaOtp(item)}
                        disabled={refreshingUsaOtpId === item.id}
                      >
                        {refreshingUsaOtpId === item.id ? 'Refreshing...' : 'Refresh OTP'}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

        </section>

        <section style={{ marginTop: 28 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 18, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 800, color: 'var(--color-primary)' }}>
                Telegram
              </div>
              <h2 style={{ marginTop: 8, fontSize: '1.6rem', fontWeight: 800 }}>Telegram Number History</h2>
            </div>
            <Link href="/dashboard/user/telegram-numbers" className="btn-secondary">
              Buy Telegram Numbers
            </Link>
          </div>

          {telegramLoading ? (
            <PageLoader />
          ) : telegramItems.length === 0 ? (
            <EmptyHistory message="No Telegram number history found" />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
              {telegramItems.map((item) => {
                const visible = !!telegramVisibility[item.id];
                return (
                  <article key={item.id} className="stat-card" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                      <div>
                        <div className="badge badge-primary">{item.country_name}</div>
                        <div style={{ marginTop: 12, fontSize: '1.1rem', fontWeight: 800 }}>
                          {visible ? item.phone_number : `${item.phone_number.slice(0, 5)}•••••${item.phone_number.slice(-2)}`}
                        </div>
                      </div>
                      <button
                        className="btn-ghost"
                        style={{ minWidth: 'auto', padding: '8px 12px' }}
                        onClick={() => setTelegramVisibility((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
                      >
                        {visible ? 'Hide' : 'Show'}
                      </button>
                    </div>

                    <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-faint)' }}>
                        {item.sold_at ? new Date(item.sold_at).toLocaleDateString() : '—'}
                      </div>
                      <div style={{ fontWeight: 800, color: 'var(--color-primary)' }}>{formatMoney(item.sell_price)}</div>
                    </div>

                    <div style={{ marginTop: 14, padding: 14, borderRadius: 14, background: 'var(--color-bg)' }}>
                      <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 800, color: 'var(--color-text-faint)', marginBottom: 8 }}>
                        OTP
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-primary)' }}>{item.otp_code || 'Waiting...'}</span>
                        {item.otp_code && (
                          <button className="btn-ghost" style={{ minWidth: 'auto', padding: 8 }} onClick={() => handleCopy(item.otp_code || '')}>
                            Copy
                          </button>
                        )}
                      </div>
                    </div>

                    <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <textarea
                        value={telegramCancelReason[item.id] || ''}
                        onChange={(e) => setTelegramCancelReason((prev) => ({ ...prev, [item.id]: e.target.value }))}
                        className="input-field"
                        rows={2}
                        placeholder="Need cancellation? State reason."
                      />
                      <button
                        className="btn-secondary"
                        onClick={() => handleTelegramCancellationRequest(item)}
                        disabled={submittingTelegramCancelId === item.id}
                      >
                        {submittingTelegramCancelId === item.id ? 'Sending...' : 'Request Cancellation'}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .pulse-border { animation: pulseBorder 2s infinite; }
        @keyframes pulseBorder { 
          0% { border-color: var(--color-primary); } 
          50% { border-color: rgba(0, 229, 255, 0.4); } 
          100% { border-color: var(--color-primary); } 
        }
        .skeleton-line {
          background: linear-gradient(90deg, var(--color-bg-2) 25%, var(--color-border) 50%, var(--color-bg-2) 75%);
          background-size: 200% 100%;
          animation: skeleton-loading 1.5s infinite;
          border-radius: 4px;
        }
        @keyframes skeleton-loading { from { background-position: 200% 0; } to { background-position: -200% 0; } }
      `}</style>
    </DashboardLayout>
  );
}
