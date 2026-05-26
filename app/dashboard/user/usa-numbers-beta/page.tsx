'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import DashboardPageShell from '@/components/dashboard/DashboardPageShell';
import PinModal from '@/components/ui/PinModal';
import { usaNumberService, UsaNumberItem, userService } from '@/lib/api';
import { useAppStore } from '@/store/appStore';
import { formatMoney } from '@/lib/utils';
import {
  RiArrowRightLine,
  RiCheckLine,
  RiExternalLinkLine,
  RiEyeLine,
  RiEyeOffLine,
  RiFileCopyLine,
  RiFlashlightLine,
  RiHistoryLine,
  RiLoader4Line,
  RiPriceTag3Line,
  RiRocketLine,
  RiTimeLine,
  RiWalletLine,
} from 'react-icons/ri';

type PurchaseStepState = {
  id: number;
  phone_number: string;
  service_name: string;
  category: string;
  redirect_url?: string;
  otp_code?: string | null;
};

export default function UsaNumbersBetaPage() {
  const { addToast, user, setUser } = useAppStore();
  const [available, setAvailable] = useState<UsaNumberItem[]>([]);
  const [mine, setMine] = useState<UsaNumberItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNumber, setSelectedNumber] = useState<UsaNumberItem | null>(null);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);
  const [revealedOwned, setRevealedOwned] = useState<Record<number, boolean>>({});
  const [fetchingOtpId, setFetchingOtpId] = useState<number | null>(null);
  const [latestResult, setLatestResult] = useState<{ phone: string; otp: string } | null>(null);
  const [activeStep, setActiveStep] = useState<PurchaseStepState | null>(null);
  const ownedSectionRef = useRef<HTMLElement | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [availableRes, mineRes] = await Promise.all([
        usaNumberService.getAvailable(),
        usaNumberService.getMine(),
      ]);

      const availableRows = Array.isArray(availableRes?.data) ? availableRes.data : [];
      const mineRows = Array.isArray(mineRes?.data) ? mineRes.data : [];
      setAvailable(availableRows);
      setMine(mineRows);
    } catch (error: any) {
      addToast(error.message || 'Failed to load USA numbers beta', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (activeStep) {
      const refreshed = mine.find((item) => item.id === activeStep.id);
      if (
        refreshed &&
        (
          refreshed.phone_number !== activeStep.phone_number ||
          refreshed.service_name !== activeStep.service_name ||
          refreshed.category !== activeStep.category ||
          refreshed.redirect_url !== activeStep.redirect_url ||
          refreshed.otp_code !== activeStep.otp_code
        )
      ) {
        setActiveStep({
          id: refreshed.id,
          phone_number: refreshed.phone_number,
          service_name: refreshed.service_name,
          category: refreshed.category,
          redirect_url: refreshed.redirect_url,
          otp_code: refreshed.otp_code,
        });
      }
      return;
    }

    const pending = mine.find((item) => !item.otp_code);
    if (pending) {
      setActiveStep({
        id: pending.id,
        phone_number: pending.phone_number,
        service_name: pending.service_name,
        category: pending.category,
        redirect_url: pending.redirect_url,
        otp_code: pending.otp_code,
      });
    }
  }, [mine, activeStep]);

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
      setLatestResult({
        phone: purchaseRes?.data?.phone_number || selectedNumber.phone_number,
        otp: '',
      });
      setActiveStep({
        id: purchaseRes?.data?.id || selectedNumber.id,
        phone_number: purchaseRes?.data?.phone_number || selectedNumber.phone_number,
        service_name: purchaseRes?.data?.service_name || selectedNumber.service_name,
        category: purchaseRes?.data?.category || selectedNumber.category,
        redirect_url: purchaseRes?.data?.redirect_url || selectedNumber.redirect_url,
        otp_code: '',
      });
      addToast(`USA number ${selectedNumber.phone_number} purchased successfully`, 'success');
      setPinModalOpen(false);
      setSelectedNumber(null);
      await fetchData();
      window.setTimeout(() => {
        ownedSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
    } catch (error: any) {
      addToast(error.message || 'Purchase failed', 'error');
    } finally {
      setPinLoading(false);
    }
  };

  const handleRefreshOtp = async (numberId: number) => {
    setFetchingOtpId(numberId);
    try {
      const res = await usaNumberService.refreshOtp(numberId);
      const otp = res?.data?.otp_code || '';
      const target = mine.find((item) => item.id === numberId) || activeStep;

      setLatestResult({
        phone: target?.phone_number || 'USA number',
        otp,
      });

      if (activeStep?.id === numberId) {
        setActiveStep((prev) => prev ? { ...prev, otp_code: otp } : prev);
      }

      addToast(otp ? 'OTP retrieved successfully' : 'No code yet. Try again in a moment.', otp ? 'success' : 'info');
      await fetchData();
    } catch (error: any) {
      addToast(error.message || 'Failed to fetch OTP', 'error');
    } finally {
      setFetchingOtpId(null);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    addToast('Copied!', 'success');
  };

  const activeOwnedNumber = useMemo(() => {
    if (!activeStep) return null;
    return mine.find((item) => item.id === activeStep.id) || null;
  }, [activeStep, mine]);

  return (
    <DashboardPageShell
      title="USA Numbers"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'USA Numbers' },
        { label: 'Beta' },
      ]}
      maxWidth={1240}
      contentStyle={{ padding: '24px 20px 40px', maxWidth: 1240, margin: '0 auto' }}
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
          <div className="hero-kicker">Guided flow</div>
          <div className="title-row">
            <h1>USA Numbers</h1>
            <span className="beta-pill">Beta</span>
          </div>
          <p>
            Buy a number, enter it inside the service you want, then come back here to fetch the code. The layout is
            now focused on that exact path so it feels calmer and easier to use.
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

        <div className="spotlight-card">
          <div className="spotlight-kicker">Latest code</div>
          <div className="spotlight-number">{latestResult?.phone || activeStep?.phone_number || 'Your next USA purchase appears here'}</div>
          <div className="spotlight-otp">{latestResult?.otp || activeStep?.otp_code || '------'}</div>
          <div className="spotlight-note">When your code arrives, it shows here first and also stays in your owned numbers list.</div>
        </div>
      </section>

      <section className="step-shell">
        <div className="step-head">
          <div>
            <div className="section-kicker">Step By Step</div>
            <h2>How the USA beta flow works</h2>
          </div>
        </div>

        <div className="step-grid">
          <article className={`step-card ${activeStep ? 'done' : ''}`}>
            <span className="step-index">01</span>
            <h3>Buy your number</h3>
            <p>Pick any available USA number below and confirm the wallet payment with your PIN.</p>
          </article>
          <article className={`step-card ${activeStep ? 'active' : ''}`}>
            <span className="step-index">02</span>
            <h3>Input it in the service</h3>
            <p>Use the number in WhatsApp or the assigned service, then return here when the app asks for the code.</p>
          </article>
          <article className={`step-card ${activeStep?.otp_code ? 'done' : activeStep ? 'active' : ''}`}>
            <span className="step-index">03</span>
            <h3>Fetch your code</h3>
            <p>Tap the confirmation button and we will request the code from the saved link and show it like before.</p>
          </article>
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
          <div className="summary-label">Current status</div>
          <div className="summary-caption">{activeStep ? 'You have an active number waiting for a code.' : 'No number is waiting right now.'}</div>
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
                <p>{item.notes || 'Buy first, use the number in the service, then come back here to fetch the code.'}</p>
                <button className="btn-primary buy-btn" type="button" onClick={() => handleBuyClick(item)}>
                  <RiRocketLine size={16} />
                  Buy With Balance
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="history-shell" ref={ownedSectionRef}>
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
              const isActive = activeOwnedNumber?.id === item.id;

              return (
                <article key={item.id} className={`owned-card ${isActive ? 'owned-card-active' : ''}`}>
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

                  {isActive && (
                    <div className="owned-step-panel">
                      <div className="owned-step-copy">
                        <div className="owned-step-title">Next step</div>
                        <p>
                          Input this number in {item.category || item.service_name || 'the service'}, then return here and click
                          <strong> I have inputed the number</strong> to fetch the code.
                        </p>
                      </div>

                      <div className="owned-step-tags">
                        <span>{item.category || 'USA'}</span>
                        <span>{item.service_name || 'USA Number'}</span>
                        {item.otp_code ? <span className="success-tag"><RiCheckLine size={14} /> Code received</span> : <span>Waiting for code</span>}
                      </div>

                      <div className="owned-step-actions">
                        {!!item.redirect_url && (
                          <a href={item.redirect_url} target="_blank" rel="noreferrer" className="btn-secondary service-link">
                            <RiExternalLinkLine size={16} />
                            Open Service
                          </a>
                        )}
                        {!item.otp_code && (
                          <button
                            className="btn-primary inline-fetch"
                            type="button"
                            onClick={() => handleRefreshOtp(item.id)}
                            disabled={fetchingOtpId === item.id}
                          >
                            {fetchingOtpId === item.id ? <RiLoader4Line size={16} className="spin" /> : <RiCheckLine size={16} />}
                            {fetchingOtpId === item.id ? 'Checking for code...' : 'I have inputed the number'}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <style jsx>{`
        .overview-card,
        .step-shell,
        .summary-card,
        .market-shell,
        .history-shell {
          border: 1px solid var(--color-border);
          background: var(--color-bg-2);
          box-shadow: 0 14px 34px rgba(15, 23, 42, 0.05);
        }
        .overview-card,
        .step-shell,
        .market-shell,
        .history-shell {
          border-radius: 28px;
          padding: 30px;
        }
        .overview-card {
          display: grid;
          grid-template-columns: minmax(0, 1.3fr) minmax(320px, 0.88fr);
          gap: 24px;
          background:
            radial-gradient(circle at top right, rgba(37, 99, 235, 0.12), transparent 28%),
            linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
        }
        .overview-copy {
          display: flex;
          flex-direction: column;
          gap: 18px;
          max-width: 720px;
        }
        .hero-kicker, .section-kicker, .summary-label, .spotlight-kicker, .otp-label {
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-weight: 800;
          color: var(--color-primary);
        }
        .title-row, .overview-actions, .section-head, .market-card-head, .owned-head, .owned-meta, .otp-inline, .step-head, .action-buttons, .action-tags {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .title-row, .section-head, .step-head {
          justify-content: space-between;
          flex-wrap: wrap;
        }
        h1, h2, h3 {
          color: var(--color-text);
        }
        h1 {
          font-size: clamp(2rem, 3vw, 2.6rem);
          line-height: 1.05;
        }
        h2 {
          font-size: clamp(1.5rem, 2.4vw, 2rem);
          margin-top: 8px;
        }
        h3 {
          font-size: 1.05rem;
          margin-top: 10px;
        }
        p {
          color: var(--color-text-faint);
          line-height: 1.7;
        }
        .beta-pill {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 34px;
          padding: 0 16px;
          border-radius: 999px;
          background: linear-gradient(135deg, rgba(37, 99, 235, 0.16), rgba(14, 165, 233, 0.22));
          color: var(--color-primary);
          border: 1px solid rgba(37, 99, 235, 0.12);
          font-size: 0.78rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.7);
        }
        .wallet-chip, .inline-link, .country-chip, .price-tag, .btn-primary, .btn-secondary, .btn-ghost, .copy-btn {
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
          min-height: 42px;
          padding: 0 14px;
          border-radius: 999px;
          text-decoration: none;
          color: var(--color-text);
          background: rgba(15, 23, 42, 0.04);
          font-weight: 700;
        }
        .spotlight-card {
          border-radius: 24px;
          padding: 24px;
          background: linear-gradient(180deg, rgba(37, 99, 235, 0.08) 0%, rgba(14, 165, 233, 0.04) 100%);
          border: 1px solid rgba(37, 99, 235, 0.1);
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 12px;
        }
        .spotlight-number {
          font-size: 1rem;
          font-weight: 800;
          color: var(--color-text);
        }
        .spotlight-otp, .mono-strong {
          font-family: monospace;
          font-size: 1.2rem;
          font-weight: 800;
          color: var(--color-primary);
        }
        .spotlight-note, .summary-caption {
          font-size: 0.92rem;
          color: var(--color-text-faint);
        }
        .step-shell {
          margin-top: 24px;
          background: linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
        }
        .step-grid {
          margin-top: 20px;
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
        }
        .step-card {
          min-height: 180px;
          border-radius: 24px;
          padding: 22px;
          border: 1px solid rgba(15, 23, 42, 0.08);
          background: linear-gradient(180deg, #ffffff, #fafcff);
        }
        .step-card.active {
          border-color: rgba(37, 99, 235, 0.2);
          box-shadow: 0 10px 26px rgba(37, 99, 235, 0.08);
        }
        .step-card.done {
          background: linear-gradient(180deg, rgba(37, 99, 235, 0.08), rgba(14, 165, 233, 0.03));
        }
        .step-index {
          display: inline-flex;
          min-width: 42px;
          height: 42px;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: rgba(37, 99, 235, 0.08);
          color: var(--color-primary);
          font-weight: 800;
        }
        .owned-step-tags {
          flex-wrap: wrap;
        }
        .owned-step-tags span {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          min-height: 36px;
          padding: 0 12px;
          border-radius: 999px;
          background: rgba(15, 23, 42, 0.05);
          color: var(--color-text);
          font-size: 0.86rem;
          font-weight: 700;
        }
        .success-tag {
          color: #047857 !important;
          background: rgba(16, 185, 129, 0.1) !important;
        }
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
          margin-top: 24px;
        }
        .summary-card {
          border-radius: 24px;
          padding: 22px;
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
          background: rgba(16, 185, 129, 0.1);
        }
        .summary-icon.amber {
          color: #b45309;
          background: rgba(245, 158, 11, 0.12);
        }
        .summary-value {
          margin-top: 8px;
          font-size: 1.9rem;
          font-weight: 800;
        }
        .market-shell, .history-shell {
          margin-top: 24px;
        }
        .market-grid, .owned-grid {
          margin-top: 20px;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(290px, 1fr));
          gap: 18px;
        }
        .market-card, .owned-card {
          border-radius: 22px;
          border: 1px solid var(--color-border);
          background: linear-gradient(180deg, #ffffff, #fbfdff);
          padding: 22px;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.9), 0 6px 18px rgba(15, 23, 42, 0.03);
        }
        .owned-card-active {
          border-color: rgba(37, 99, 235, 0.18);
          box-shadow: 0 10px 26px rgba(37, 99, 235, 0.08);
        }
        .owned-step-panel {
          margin-top: 14px;
          padding: 16px;
          border-radius: 18px;
          border: 1px solid rgba(37, 99, 235, 0.12);
          background: linear-gradient(180deg, rgba(37, 99, 235, 0.06), rgba(14, 165, 233, 0.03));
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .owned-step-copy {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .owned-step-title {
          font-size: 0.72rem;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          font-weight: 800;
          color: var(--color-primary);
        }
        .owned-step-copy p strong {
          color: var(--color-text);
        }
        .owned-step-actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
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
        }
        .btn-primary, .btn-secondary, .btn-ghost, .copy-btn {
          justify-content: center;
          min-height: 46px;
          padding: 11px 16px;
          border-radius: 16px;
          border: 1px solid transparent;
          cursor: pointer;
          text-decoration: none;
          font-weight: 700;
        }
        .btn-primary {
          background: var(--color-primary);
          color: #fff;
        }
        .btn-secondary {
          background: #fff;
          color: var(--color-text);
          border-color: var(--color-border);
        }
        .btn-ghost, .copy-btn {
          background: rgba(15, 23, 42, 0.04);
          color: var(--color-text);
        }
        .btn-primary:focus-visible, .btn-secondary:focus-visible, .btn-ghost:focus-visible, .copy-btn:focus-visible, .inline-link:focus-visible, .service-link:focus-visible {
          outline: none;
          box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.14);
        }
        .buy-btn, .service-link, .inline-fetch {
          width: 100%;
        }
        .otp-panel {
          margin-top: 14px;
          padding: 14px;
          border-radius: 16px;
          background: var(--color-bg);
        }
        .subtle-meta {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: var(--color-text-faint);
          font-size: 0.85rem;
        }
        .inline-fetch {
          margin-top: 12px;
        }
        .empty-state {
          margin-top: 18px;
          padding: 30px;
          border-radius: 20px;
          border: 1px dashed var(--color-border);
          color: var(--color-text-faint);
          text-align: center;
          background: rgba(255, 255, 255, 0.72);
        }
        .spin {
          animation: spin 0.9s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @media (max-width: 1080px) {
          .overview-card,
          .step-grid,
          .summary-grid {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 768px) {
          .overview-card,
          .step-shell,
          .market-shell,
          .history-shell {
            padding: 22px;
          }
          .overview-actions,
          .section-head,
          .owned-head,
          .owned-meta,
          .otp-inline {
            flex-direction: column;
            align-items: flex-start;
          }
          .btn-primary,
          .btn-secondary,
          .service-link,
          .inline-fetch {
            width: 100%;
          }
        }
      `}</style>
    </DashboardPageShell>
  );
}
