'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import Topbar from '@/components/dashboard/Topbar';
import { manualNumberService, TelegramNumberItem, userService } from '@/lib/api';
import { useAppStore } from '@/store/appStore';
import { formatMoney } from '@/lib/utils';
import { RiArrowRightLine, RiEyeLine, RiEyeOffLine, RiFileCopyLine, RiMessage2Line, RiSearchLine, RiSendPlaneFill, RiTimeLine, RiWalletLine } from 'react-icons/ri';

export default function TelegramNumbersPage() {
  const { addToast, user, setUser } = useAppStore();
  const [available, setAvailable] = useState<TelegramNumberItem[]>([]);
  const [mine, setMine] = useState<TelegramNumberItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedNumber, setSelectedNumber] = useState<TelegramNumberItem | null>(null);
  const [cancelReason, setCancelReason] = useState<Record<number, string>>({});
  const [submittingCancelId, setSubmittingCancelId] = useState<number | null>(null);
  const [lastPurchaseOtp, setLastPurchaseOtp] = useState<{ phone: string; otp: string } | null>(null);
  const [revealedOwned, setRevealedOwned] = useState<Record<number, boolean>>({});

  const fetchData = useCallback(async (nextSearch = '') => {
    setLoading(true);
    try {
      const [availableRes, mineRes] = await Promise.all([
        manualNumberService.getAvailableTelegram(nextSearch),
        manualNumberService.getMyTelegramNumbers(),
      ]);
      setAvailable(Array.isArray(availableRes?.data) ? availableRes.data : []);
      setMine(Array.isArray(mineRes?.data) ? mineRes.data : []);
    } catch (error: any) {
      addToast(error.message || 'Failed to load Telegram numbers', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleBuyClick = async (item: TelegramNumberItem) => {
    if (!user) return;
    if (user.balance < Number(item.sell_price)) {
      addToast(`Insufficient balance. This number costs ${formatMoney(item.sell_price)}.`, 'error');
      return;
    }

    try {
      const purchaseRes = await manualNumberService.purchaseTelegram(item.id, '');
      const profileRes = await userService.getProfile();
      setUser(profileRes.data);
      setSelectedNumber(item);
      setLastPurchaseOtp({
        phone: item.phone_number,
        otp: purchaseRes?.data?.otp_code || '',
      });
      addToast(`Telegram number ${item.phone_number} purchased successfully`, 'success');
      await fetchData(search);
    } catch (error: any) {
      addToast(error.message || 'Purchase failed', 'error');
    }
  };

  const handleCancellationRequest = async (item: TelegramNumberItem) => {
    const reason = (cancelReason[item.id] || '').trim();
    if (!reason) {
      addToast('Please enter a cancellation reason first.', 'error');
      return;
    }

    setSubmittingCancelId(item.id);
    try {
      await manualNumberService.requestTelegramCancellation(item.id, reason);
      addToast('Cancellation request sent to admin.', 'success');
      setCancelReason((prev) => ({ ...prev, [item.id]: '' }));
    } catch (error: any) {
      addToast(error.message || 'Failed to send cancellation request', 'error');
    } finally {
      setSubmittingCancelId(null);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    addToast('Copied!', 'success');
  };

  return (
    <DashboardLayout>
      <Topbar title="Telegram Numbers" />
      <main style={{ padding: '28px', maxWidth: 1180, margin: '0 auto' }}>
        <div className="breadcrumb">
          <Link href="/dashboard">Dashboard</Link>
          <span>/</span>
          <span>Telegram Numbers</span>
        </div>


        <section className="hero-card">
          <div className="hero-copy">
            <div className="hero-kicker">Telegram Numbers</div>
            <h1>Pick A Number, Pay, And Move On</h1>
            <p>Choose any available number below, complete the purchase instantly, and check your OTP in the table after purchase.</p>
            <div className="wallet-chip">
              <RiWalletLine size={16} />
              Wallet Balance: {formatMoney(user?.balance)}
            </div>
          </div>

          <div className="hero-side">
            <div className="hero-side-title">Latest OTP</div>
            <div className="hero-side-number">{lastPurchaseOtp?.phone || 'Your last purchase shows here'}</div>
            <div className="hero-side-otp">{lastPurchaseOtp?.otp || '------'}</div>
          </div>
        </section>

        <section className="market-shell">
          <div className="market-topbar">
            <div>
              <div className="section-kicker">Purchase</div>
              <h2>Available Telegram Numbers</h2>
            </div>
            <form
              className="search-shell"
              onSubmit={(e) => {
                e.preventDefault();
                fetchData(search);
              }}
            >
              <RiSearchLine size={16} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by number or country"
                className="search-input"
              />
              <button className="btn-secondary search-btn" onClick={() => fetchData(search)} type="button">Search</button>
            </form>
          </div>

          {loading ? (
            <div className="empty-state">Loading Telegram numbers...</div>
          ) : available.length === 0 ? (
            <div className="empty-state">No Telegram numbers are available right now.</div>
          ) : (
            <div className="market-grid">
              {available.map((item) => (
                <article key={item.id} className="market-card">
                  <div className="market-card-head">
                    <div>
                      <div className="country-chip">{item.country_name}</div>
                      <div className="market-number">{item.phone_number}</div>
                    </div>
                    <div className="price-tag">{formatMoney(item.sell_price)}</div>
                  </div>
                  <p>{item.notes || 'Ready for Telegram activation.'}</p>
                  <button className="btn-primary buy-btn" type="button" onClick={() => handleBuyClick(item)}>
                    <RiSendPlaneFill size={16} />
                    Buy Number
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="history-shell">
          <div className="history-head">
            <div>
              <div className="section-kicker">Owned Numbers</div>
              <h2>Recent Telegram Purchases</h2>
              <p className="history-copy">Use this page to buy quickly. Full Telegram history now lives in Number History.</p>
            </div>
            <Link href="/dashboard/user/numbers-history" className="btn-secondary history-link">
              Open Full History <RiArrowRightLine size={16} />
            </Link>
          </div>

          {mine.length === 0 ? (
            <div className="empty-state">You have not purchased any Telegram numbers yet.</div>
          ) : (
            <div className="owned-grid">
              {mine.slice(0, 3).map((item) => {
                const isVisible = !!revealedOwned[item.id];
                return (
                  <article key={item.id} className="owned-card">
                    <div className="owned-head">
                      <div>
                        <div className="country-chip">{item.country_name}</div>
                        <div className="market-number">{isVisible ? item.phone_number : `${item.phone_number.slice(0, 5)}•••••${item.phone_number.slice(-2)}`}</div>
                      </div>
                      <button
                        className="btn-ghost owned-toggle"
                        type="button"
                        onClick={() => setRevealedOwned((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
                      >
                        {isVisible ? <RiEyeOffLine size={16} /> : <RiEyeLine size={16} />}
                        {isVisible ? 'Hide' : 'Show'}
                      </button>
                    </div>

                    <div className="owned-meta">
                      <div className="subtle-meta">
                        <RiTimeLine size={14} />
                        {item.sold_at ? new Date(item.sold_at).toLocaleDateString() : '—'}
                      </div>
                      <div className="price-tag small">{formatMoney(item.sell_price)}</div>
                    </div>

                    <div className="otp-panel">
                      <span className="otp-label">OTP</span>
                      <div className="otp-inline">
                        <span className="mono-strong">{item.otp_code || 'Waiting...'}</span>
                        {item.otp_code && (
                          <button className="copy-btn" type="button" onClick={() => handleCopy(item.otp_code || '')}>
                            <RiFileCopyLine size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="support-cell">
                      <textarea
                        value={cancelReason[item.id] || ''}
                        onChange={(e) => setCancelReason((prev) => ({ ...prev, [item.id]: e.target.value }))}
                        className="request-input"
                        rows={2}
                        placeholder="Need cancellation? State reason."
                      />
                      <button className="btn-secondary request-btn" type="button" onClick={() => handleCancellationRequest(item)} disabled={submittingCancelId === item.id}>
                        <RiMessage2Line size={14} />
                        {submittingCancelId === item.id ? 'Sending...' : 'Request'}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <style jsx>{`
          .history-copy {
            margin-top: 8px;
            color: var(--color-text-faint);
            max-width: 560px;
          }
          .history-link {
            display: inline-flex;
            align-items: center;
            gap: 8px;
          }
          .owned-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 18px;
          }
          .owned-card {
            border-radius: 20px;
            border: 1px solid var(--color-border);
            background: linear-gradient(180deg, #ffffff, #fbfdff);
            padding: 20px;
            box-shadow: 0 6px 18px rgba(15, 23, 42, 0.03);
          }
          .owned-head {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            align-items: flex-start;
          }
          .owned-toggle {
            padding: 8px 12px;
            min-width: auto;
          }
          .owned-meta {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin: 14px 0;
            gap: 10px;
          }
          .price-tag.small {
            padding: 8px 10px;
            font-size: 0.85rem;
          }
          .otp-panel {
            padding: 14px;
            border-radius: 14px;
            background: var(--color-bg);
            margin-bottom: 14px;
          }
          .otp-label {
            display: inline-block;
            margin-bottom: 6px;
            font-size: 0.72rem;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            font-weight: 800;
            color: var(--color-text-faint);
          }
          .hero-card {
            display: grid;
            grid-template-columns: 1.45fr 0.95fr;
            gap: 22px;
            margin-bottom: 24px;
            padding: 28px 30px;
            border-radius: 24px;
            background:
              radial-gradient(circle at left center, rgba(37, 99, 235, 0.16), transparent 24%),
              radial-gradient(circle at right center, rgba(14, 165, 233, 0.16), transparent 26%),
              linear-gradient(135deg, #ffffff 0%, #f3f8ff 100%);
            border: 1px solid rgba(37, 99, 235, 0.1);
            box-shadow: 0 18px 40px rgba(37, 99, 235, 0.08);
          }
          .hero-kicker, .section-kicker {
            font-size: 0.72rem;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            font-weight: 800;
            color: var(--color-primary);
          }
          .hero-copy h1, .market-topbar h2, .history-head h2 {
            margin: 10px 0 12px;
            font-size: 1.8rem;
            font-weight: 800;
            color: var(--color-text);
          }
          .hero-copy p {
            margin: 0;
            max-width: 680px;
            color: var(--color-text-faint);
            line-height: 1.7;
          }
          .wallet-chip {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            margin-top: 18px;
            padding: 10px 14px;
            border-radius: 14px;
            background: var(--color-primary-dim);
            color: var(--color-primary);
            font-weight: 800;
          }
          .hero-side {
            padding: 22px;
            border-radius: 20px;
            background: linear-gradient(135deg, #0f4cde 0%, #1f7bf2 100%);
            color: #fff;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
          .hero-side-title {
            font-size: 0.78rem;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: rgba(255,255,255,0.72);
            font-weight: 800;
          }
          .hero-side-number {
            margin-top: 12px;
            font-size: 1.05rem;
            font-weight: 700;
          }
          .hero-side-otp {
            margin-top: 14px;
            font-size: 2rem;
            font-weight: 900;
            letter-spacing: 0.14em;
            color: #8ff7ff;
          }
          .market-shell, .history-shell {
            background: #ffffff;
            border: 1px solid var(--color-border);
            border-radius: 24px;
            padding: 24px;
            box-shadow: 0 10px 30px rgba(15, 23, 42, 0.04);
            margin-bottom: 24px;
          }
          .market-topbar, .history-head {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            gap: 16px;
            flex-wrap: wrap;
            margin-bottom: 18px;
          }
          .search-shell {
            display: flex;
            align-items: center;
            gap: 10px;
            flex-wrap: wrap;
          }
          .search-input, .request-input {
            border: 1px solid var(--color-border);
            background: #fff;
            color: var(--color-text);
            border-radius: 14px;
            padding: 13px 14px;
            outline: none;
            font-weight: 600;
          }
          .search-input {
            min-width: 260px;
          }
          .request-input {
            width: 100%;
            resize: vertical;
          }
          .search-btn, .request-btn {
            border-radius: 12px;
            font-weight: 800;
          }
          .market-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 18px;
          }
          .market-card {
            border-radius: 20px;
            border: 1px solid var(--color-border);
            background: linear-gradient(180deg, #ffffff, #fbfdff);
            padding: 20px;
            box-shadow: 0 6px 18px rgba(15, 23, 42, 0.03);
          }
          .market-card-head {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 14px;
          }
          .country-chip {
            display: inline-flex;
            align-items: center;
            padding: 6px 12px;
            border-radius: 999px;
            background: var(--color-primary-dim);
            color: var(--color-primary);
            font-size: 0.72rem;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.08em;
          }
          .market-number {
            margin-top: 10px;
            font-size: 1.25rem;
            font-weight: 800;
            color: var(--color-text);
          }
          .price-tag {
            font-size: 1rem;
            font-weight: 900;
            color: var(--color-primary);
            padding: 10px 12px;
            border-radius: 14px;
            background: rgba(37, 99, 235, 0.08);
          }
          .market-card p {
            margin: 14px 0 16px;
            color: var(--color-text-faint);
            line-height: 1.6;
            min-height: 48px;
          }
          .buy-btn {
            width: 100%;
            justify-content: center;
            gap: 8px;
          }
          .history-card {
            background: #fff;
            border: 1px solid var(--color-border);
            border-radius: 20px;
            overflow: hidden;
          }
          .history-table-shell {
            overflow-x: auto;
          }
          .history-table {
            width: 100%;
            min-width: 980px;
            border-collapse: collapse;
            text-align: left;
          }
          .history-table th {
            padding: 16px 20px;
            font-size: 0.8rem;
            font-weight: 700;
            color: var(--color-text-faint);
            background: var(--color-bg-2);
            border-bottom: 1px solid var(--color-border);
            text-transform: uppercase;
          }
          .history-table td {
            padding: 16px 20px;
            border-bottom: 1px solid var(--color-border);
            vertical-align: top;
          }
          .mono-strong {
            font-family: monospace;
            font-weight: 700;
          }
          .otp-inline {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            color: var(--color-primary);
          }
          .copy-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 28px;
            height: 28px;
            border: none;
            border-radius: 8px;
            background: var(--color-primary-dim);
            color: var(--color-primary);
            cursor: pointer;
          }
          .subtle-meta {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            color: var(--color-text-faint);
            font-size: 0.8rem;
            font-weight: 700;
          }
          .support-cell {
            display: flex;
            flex-direction: column;
            gap: 8px;
            min-width: 220px;
          }
          .empty-state {
            border: 1px dashed var(--color-border);
            border-radius: 20px;
            padding: 32px 20px;
            text-align: center;
            color: var(--color-text-faint);
            font-weight: 600;
          }
          @media (max-width: 980px) {
            .hero-card {
              grid-template-columns: 1fr;
            }
          }
          @media (max-width: 720px) {
            .search-shell {
              width: 100%;
            }
            .search-input {
              min-width: 0;
              width: 100%;
            }
          }
        `}</style>
      </main>
    </DashboardLayout>
  );
}
