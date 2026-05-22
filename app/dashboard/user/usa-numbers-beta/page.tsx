'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import Topbar from '@/components/dashboard/Topbar';
import PinModal from '@/components/ui/PinModal';
import { usaNumberService, UsaNumberItem, userService } from '@/lib/api';
import { useAppStore } from '@/store/appStore';
import { formatMoney } from '@/lib/utils';
import {
  RiEyeLine,
  RiEyeOffLine,
  RiFileCopyLine,
  RiFlashlightLine,
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
    <DashboardLayout>
      <Topbar title="USA Numbers Beta" />
      <main style={{ padding: '28px', maxWidth: 1180, margin: '0 auto' }}>
        <div className="breadcrumb">
          <Link href="/dashboard">Dashboard</Link>
          <span>/</span>
          <span>USA Numbers Beta</span>
        </div>

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

        <section className="hero-card">
          <div>
            <div className="hero-kicker">Beta Access</div>
            <h1>Available USA Numbers, Ready To Buy</h1>
            <p>
              This beta keeps things simple: we show the current list of available numbers, you buy with your wallet
              balance, and the OTP is fetched from the redirect link after purchase.
            </p>
            <div className="wallet-chip">
              <RiWalletLine size={16} />
              Wallet Balance: {formatMoney(user?.balance)}
            </div>
          </div>

          <div className="hero-side">
            <div className="hero-stat"><RiPriceTag3Line size={16} /> {available.length} available now</div>
            <div className="hero-stat"><RiFlashlightLine size={16} /> {mine.length} purchased by you</div>
            <div className="hero-side-title">Latest OTP</div>
            <div className="hero-side-number">{lastPurchaseOtp?.phone || 'Your latest USA purchase will show here'}</div>
            <div className="hero-side-otp">{lastPurchaseOtp?.otp || '------'}</div>
          </div>
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
          .hero-card {
            display: grid;
            grid-template-columns: 1.45fr 0.95fr;
            gap: 22px;
            padding: 28px;
            border-radius: 26px;
            border: 1px solid var(--color-border);
            background: linear-gradient(135deg, #ffffff 0%, #f7fbff 100%);
            box-shadow: 0 12px 36px rgba(15, 23, 42, 0.05);
            margin-bottom: 24px;
          }
          .hero-kicker, .section-kicker, .otp-label {
            font-size: 0.72rem;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            font-weight: 800;
            color: var(--color-primary);
          }
          .hero-card h1, .section-head h2 {
            margin: 8px 0 10px;
          }
          .hero-card p {
            color: var(--color-text-faint);
            line-height: 1.7;
            max-width: 640px;
          }
          .wallet-chip, .hero-stat, .country-chip, .price-tag, .btn-primary, .btn-secondary, .btn-ghost, .copy-btn {
            display: inline-flex;
            align-items: center;
            gap: 8px;
          }
          .wallet-chip, .hero-stat {
            margin-top: 14px;
            padding: 10px 14px;
            border-radius: 999px;
            background: var(--color-primary-dim);
            color: var(--color-primary);
            font-weight: 700;
          }
          .hero-side {
            display: flex;
            flex-direction: column;
            gap: 12px;
            justify-content: center;
            padding: 22px;
            border-radius: 20px;
            background: rgba(37, 99, 235, 0.05);
          }
          .hero-side-title {
            margin-top: 4px;
            font-size: 0.78rem;
            color: var(--color-text-faint);
            text-transform: uppercase;
            letter-spacing: 0.08em;
            font-weight: 700;
          }
          .hero-side-number {
            font-weight: 700;
            color: var(--color-text);
          }
          .hero-side-otp, .mono-strong {
            font-family: monospace;
            font-weight: 800;
            color: var(--color-primary);
            font-size: 1rem;
          }
          .market-shell, .history-shell {
            margin-top: 28px;
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
            border-radius: 20px;
            border: 1px solid var(--color-border);
            background: linear-gradient(180deg, #ffffff, #fbfdff);
            padding: 20px;
            box-shadow: 0 6px 18px rgba(15, 23, 42, 0.03);
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
            border-radius: 14px;
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
            border-radius: 12px;
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
            .hero-card {
              grid-template-columns: 1fr;
            }
            .section-head {
              flex-direction: column;
              align-items: flex-start;
            }
          }
        `}</style>
      </main>
    </DashboardLayout>
  );
}
