'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardPageShell from '@/components/dashboard/DashboardPageShell';
import PinModal from '@/components/ui/PinModal';
import { usaNumberService, UsaNumberItem, userService } from '@/lib/api';
import { useAppStore } from '@/store/appStore';
import { formatMoney } from '@/lib/utils';
import {
  RiArrowRightLine,
  RiEyeLine,
  RiEyeOffLine,
  RiFileCopyLine,
  RiFlashlightLine,
  RiHistoryLine,
  RiPriceTag3Line,
  RiRocketLine,
  RiTimeLine,
  RiWalletLine,
} from 'react-icons/ri';

export default function UsaNumbersBetaPage() {
  const { addToast, user, setUser } = useAppStore();
  const [available, setAvailable] = useState<UsaNumberItem[]>([]);
  const [mine, setMine] = useState<UsaNumberItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNumber, setSelectedNumber] = useState<UsaNumberItem | null>(null);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);
  const [lastPurchaseOtp, setLastPurchaseOtp] = useState<{ phone: string; otp: string } | null>(null);
  const [revealedOwned, setRevealedOwned] = useState<Record<number, boolean>>({});

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [availableRes, mineRes] = await Promise.all([
        usaNumberService.getAvailable(),
        usaNumberService.getMine(),
      ]);
      setAvailable(Array.isArray(availableRes?.data) ? availableRes.data : []);
      setMine(Array.isArray(mineRes?.data) ? mineRes.data : []);
    } catch (error: any) {
      addToast(error.message || 'Failed to load USA numbers beta', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleBuyClick = (item: UsaNumberItem) => {
    if (!user) return;
    if (Number(user.balance) < Number(item.sell_price)) {
      addToast(`Insufficient balance. This number costs ${formatMoney(item.sell_price)}.`, 'error');
      return;
    }
    setSelectedNumber(item);
    setPinModalOpen(true);
  };

  const handlePinSuccess = async (pin: string) => {
    if (!selectedNumber) return;

    setPinLoading(true);
    try {
      if (!user?.hasPin) {
        await userService.updatePin(pin);
        addToast('Transaction PIN set successfully!', 'success');
      }

      const purchaseRes = await usaNumberService.purchase(selectedNumber.id, pin);
      const profileRes = await userService.getProfile();
      setUser(profileRes.data);
      setLastPurchaseOtp({
        phone: selectedNumber.phone_number,
        otp: purchaseRes?.data?.otp_code || '',
      });
      addToast(`USA number ${selectedNumber.phone_number} purchased successfully`, 'success');
      setPinModalOpen(false);
      setSelectedNumber(null);
      fetchData();
    } catch (error: any) {
      addToast(error.message || 'Purchase failed', 'error');
    } finally {
      setPinLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    addToast('Copied!', 'success');
  };

  return (
    <DashboardPageShell
      title="USA Numbers"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'USA Numbers' },
        { label: 'Beta' },
      ]}
      maxWidth={1200}
      contentStyle={{ padding: '24px 20px 36px', maxWidth: 1200, margin: '0 auto' }}
    >
      <PinModal
        isOpen={pinModalOpen}
        onClose={() => {
          setPinModalOpen(false);
          setSelectedNumber(null);
        }}
        onSuccess={handlePinSuccess}
        isLoading={pinLoading}
        title={!user?.hasPin ? 'Set Your Transaction PIN' : 'Confirm USA Number Purchase'}
        description={
          !user?.hasPin
            ? "You haven't set a transaction PIN yet. Create one to secure USA number purchases."
            : `Enter your 4-digit PIN to buy ${selectedNumber?.phone_number || 'this number'} for ${formatMoney(selectedNumber?.sell_price || 0)}.`
        }
      />

      <section className="overview-card">
        <div className="overview-copy">
          <div className="hero-kicker">Premium access lane</div>
          <div className="title-row">
            <h1>USA Numbers</h1>
            <span className="beta-pill">Beta</span>
          </div>
          <p>
            Buy curated USA numbers with wallet balance, reveal OTP updates quickly, and keep recent purchases in a
            cleaner workspace that matches the rest of your dashboard.
          </p>
          <div className="overview-actions">
            <div className="wallet-chip">
              <RiWalletLine size={16} />
              Wallet Balance: {formatMoney(user?.balance)}
            </div>
            <Link href="/dashboard/user/numbers-history" className="inline-link">
              Open full history <RiArrowRightLine size={15} />
            </Link>
          </div>
        </div>

        <div className="otp-spotlight">
          <div className="spotlight-kicker">Latest OTP</div>
          <div className="spotlight-number">{lastPurchaseOtp?.phone || 'Your next USA purchase appears here'}</div>
          <div className="spotlight-otp">{lastPurchaseOtp?.otp || '------'}</div>
          <div className="spotlight-note">Fresh codes surface here right after a successful purchase.</div>
        </div>
      </section>

      <section className="summary-grid">
        <article className="summary-card">
          <div className="summary-icon primary"><RiPriceTag3Line size={20} /></div>
          <div className="summary-label">Available now</div>
          <div className="summary-value">{available.length}</div>
        </article>
        <article className="summary-card">
          <div className="summary-icon emerald"><RiFlashlightLine size={20} /></div>
          <div className="summary-label">Owned by you</div>
          <div className="summary-value">{mine.length}</div>
        </article>
        <article className="summary-card">
          <div className="summary-icon amber"><RiHistoryLine size={20} /></div>
          <div className="summary-label">Purchase flow</div>
          <div className="summary-caption">Buy with wallet, track OTP, revisit full history anytime.</div>
        </article>
      </section>

        <section className="market-shell">
          <div className="section-head">
            <div>
              <div className="section-kicker">Live List</div>
              <h2>Available USA Numbers</h2>
            </div>
            <button className="btn-secondary" type="button" onClick={fetchData}>Refresh List</button>
          </div>

          {loading ? (
            <div className="empty-state">Loading USA numbers beta...</div>
          ) : available.length === 0 ? (
            <div className="empty-state">No USA numbers are available right now.</div>
          ) : (
            <div className="market-grid">
              {available.map((item) => (
                <article key={item.id} className="market-card">
                  <div className="market-card-head">
                    <div>
                      <div className="country-chip">{item.category || 'USA'}</div>
                      <div className="market-number">{item.phone_number}</div>
                      <div className="service-name">{item.service_name || 'USA Number'}</div>
                    </div>
                    <div className="price-tag">{formatMoney(item.sell_price)}</div>
                  </div>
                  <p>{item.notes || 'OTP will be fetched automatically from the redirect link after purchase.'}</p>
                  <button className="btn-primary buy-btn" type="button" onClick={() => handleBuyClick(item)}>
                    <RiRocketLine size={16} />
                    Buy With Balance
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="history-shell">
          <div className="section-head">
            <div>
              <div className="section-kicker">Owned Numbers</div>
              <h2>Your USA Numbers Beta</h2>
            </div>
            <Link href="/dashboard/user/numbers-history" className="btn-secondary">
              Open Full History
            </Link>
          </div>

          {mine.length === 0 ? (
            <div className="empty-state">You have not purchased any USA beta numbers yet.</div>
          ) : (
            <div className="owned-grid">
              {mine.slice(0, 4).map((item) => {
                const isVisible = !!revealedOwned[item.id];
                return (
                  <article key={item.id} className="owned-card">
                    <div className="owned-head">
                      <div>
                        <div className="country-chip">{item.category || 'USA'}</div>
                        <div className="market-number">
                          {isVisible ? item.phone_number : `${item.phone_number.slice(0, 5)}•••••${item.phone_number.slice(-2)}`}
                        </div>
                        <div className="service-name">{item.service_name || 'USA Number'}</div>
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
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <style jsx>{`
          .overview-card {
            display: grid;
            grid-template-columns: minmax(0, 1.35fr) minmax(300px, 0.9fr);
            gap: 24px;
            padding: 30px;
            border-radius: 28px;
            border: 1px solid var(--color-border);
            background:
              radial-gradient(circle at top right, rgba(37, 99, 235, 0.10), transparent 28%),
              linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
            box-shadow: 0 16px 38px rgba(15, 23, 42, 0.06);
            margin-bottom: 24px;
          }
          .overview-copy {
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            gap: 18px;
          }
          .hero-kicker, .section-kicker, .otp-label, .spotlight-kicker, .summary-label {
            font-size: 0.72rem;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            font-weight: 800;
            color: var(--color-primary);
          }
          .title-row {
            display: flex;
            align-items: center;
            gap: 12px;
            flex-wrap: wrap;
          }
          .beta-pill {
            display: inline-flex;
            align-items: center;
            min-height: 32px;
            padding: 0 14px;
            border-radius: 999px;
            background: linear-gradient(135deg, rgba(37, 99, 235, 0.16) 0%, rgba(14, 165, 233, 0.18) 100%);
            color: var(--color-primary);
            font-size: 0.78rem;
            font-weight: 800;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            border: 1px solid rgba(37, 99, 235, 0.16);
          }
          .overview-card h1, .section-head h2 {
            margin: 8px 0 10px;
            font-size: clamp(1.8rem, 3vw, 2.35rem);
            line-height: 1.05;
          }
          .overview-card p {
            color: var(--color-text-faint);
            line-height: 1.7;
            max-width: 640px;
          }
          .overview-actions {
            display: flex;
            align-items: center;
            flex-wrap: wrap;
            gap: 12px;
          }
          .wallet-chip, .country-chip, .price-tag, .btn-primary, .btn-secondary, .btn-ghost, .copy-btn, .inline-link {
            display: inline-flex;
            align-items: center;
            gap: 8px;
          }
          .wallet-chip {
            padding: 10px 14px;
            border-radius: 999px;
            background: var(--color-primary-dim);
            color: var(--color-primary);
            font-weight: 700;
          }
          .inline-link {
            min-height: 40px;
            padding: 0 14px;
            border-radius: 999px;
            text-decoration: none;
            color: var(--color-text);
            background: rgba(15, 23, 42, 0.04);
            font-weight: 700;
          }
          .otp-spotlight {
            display: flex;
            flex-direction: column;
            gap: 14px;
            justify-content: center;
            padding: 24px;
            border-radius: 24px;
            background: linear-gradient(180deg, rgba(37, 99, 235, 0.08) 0%, rgba(14, 165, 233, 0.03) 100%);
            border: 1px solid rgba(37, 99, 235, 0.10);
          }
          .spotlight-number {
            font-size: 1rem;
            font-weight: 800;
            color: var(--color-text);
          }
          .spotlight-otp, .mono-strong {
            font-family: monospace;
            font-weight: 800;
            color: var(--color-primary);
            font-size: 1.2rem;
          }
          .spotlight-note, .summary-caption {
            color: var(--color-text-faint);
            line-height: 1.7;
            font-size: 0.9rem;
          }
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 18px;
            margin-bottom: 10px;
          }
          .summary-card {
            background: var(--color-bg-2);
            border: 1px solid var(--color-border);
            border-radius: 24px;
            padding: 22px;
            box-shadow: 0 10px 26px rgba(15, 23, 42, 0.04);
          }
          .summary-icon {
            width: 46px;
            height: 46px;
            border-radius: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 18px;
          }
          .summary-icon.primary {
            color: var(--color-primary);
            background: var(--color-primary-dim);
          }
          .summary-icon.emerald {
            color: #047857;
            background: rgba(16, 185, 129, 0.10);
          }
          .summary-icon.amber {
            color: #b45309;
            background: rgba(245, 158, 11, 0.12);
          }
          .summary-value {
            margin-top: 8px;
            font-size: 1.85rem;
            font-weight: 800;
            color: var(--color-text);
          }
          .market-shell, .history-shell {
            margin-top: 28px;
            padding: 26px;
            border-radius: 26px;
            border: 1px solid var(--color-border);
            background: var(--color-bg-2);
            box-shadow: 0 12px 30px rgba(15, 23, 42, 0.04);
          }
          .section-head, .market-card-head, .owned-head, .owned-meta, .otp-inline {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
          }
          .market-grid, .owned-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 18px;
            margin-top: 18px;
          }
          .market-card, .owned-card {
            border-radius: 22px;
            border: 1px solid var(--color-border);
            background: linear-gradient(180deg, #ffffff, #fbfdff);
            padding: 22px;
            box-shadow: inset 0 1px 0 rgba(255,255,255,0.9), 0 6px 18px rgba(15, 23, 42, 0.03);
          }
          .country-chip {
            padding: 6px 10px;
            border-radius: 999px;
            background: rgba(37, 99, 235, 0.08);
            color: var(--color-primary);
            font-size: 0.78rem;
            font-weight: 700;
          }
          .market-number {
            margin-top: 12px;
            font-size: 1.1rem;
            font-weight: 800;
          }
          .service-name {
            margin-top: 4px;
            font-size: 0.88rem;
            color: var(--color-text-faint);
          }
          .price-tag {
            padding: 10px 12px;
            border-radius: 16px;
            background: rgba(16, 185, 129, 0.08);
            color: #047857;
            font-weight: 800;
          }
          .small {
            padding: 8px 10px;
            font-size: 0.85rem;
          }
          .market-card p {
            margin: 14px 0;
            color: var(--color-text-faint);
            line-height: 1.6;
          }
          .btn-primary, .btn-secondary, .btn-ghost, .copy-btn {
            border: 1px solid transparent;
            border-radius: 14px;
            padding: 10px 14px;
            cursor: pointer;
            text-decoration: none;
            justify-content: center;
          }
          .btn-primary {
            background: var(--color-primary);
            color: #fff;
            width: 100%;
          }
          .btn-secondary {
            background: #fff;
            color: var(--color-text);
            border-color: var(--color-border);
          }
          .btn-ghost, .copy-btn {
            background: rgba(15, 23, 42, 0.04);
            color: var(--color-text);
            min-width: auto;
          }
          .owned-toggle {
            min-width: auto;
          }
          .otp-panel {
            padding: 14px;
            border-radius: 14px;
            background: var(--color-bg);
            margin-top: 14px;
          }
          .subtle-meta {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            color: var(--color-text-faint);
            font-size: 0.85rem;
          }
          .empty-state {
            margin-top: 18px;
            padding: 28px;
            border-radius: 20px;
            border: 1px dashed var(--color-border);
            color: var(--color-text-faint);
            text-align: center;
            background: rgba(255, 255, 255, 0.65);
          }
          @media (max-width: 960px) {
            .overview-card,
            .summary-grid {
              grid-template-columns: 1fr;
            }
            .section-head {
              flex-direction: column;
              align-items: flex-start;
            }
          }
        `}</style>
    </DashboardPageShell>
  );
}
