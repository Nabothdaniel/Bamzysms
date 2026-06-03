'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import DashboardPageShell from '@/components/dashboard/DashboardPageShell';
import PinModal from '@/components/ui/PinModal';
import { usaNumberService, UsaNumberItem, userService } from '@/lib/api';
import { formatMoney } from '@/lib/utils';
import { useAppStore } from '@/store/appStore';
import {
  RiFileCopyLine,
  RiEyeLine,
  RiEyeOffLine,
  RiDeleteBinLine,
  RiCheckboxCircleLine,
  RiMessage3Line,
  RiWalletLine,
  RiSearchLine,
  RiRefreshLine,
  RiArchiveLine,
  RiWhatsappLine,
  RiTelegramLine,
  RiGoogleLine,
  RiInstagramLine,
  RiTwitterXLine,
  RiSmartphoneLine,
} from 'react-icons/ri';

/* ─── helpers ──────────────────────────────────────────── */

/** Derive an icon + colour from the service_name string */
function getServiceVisual(name: string): { icon: React.ReactNode; color: string; bg: string } {
  const n = name.toLowerCase();
  if (n.includes('whatsapp')) return { icon: <RiWhatsappLine />, color: '#25D366', bg: '#F0FDF4' };
  if (n.includes('telegram')) return { icon: <RiTelegramLine />, color: '#0088CC', bg: '#EFF9FF' };
  if (n.includes('google') || n.includes('gmail'))
    return { icon: <RiGoogleLine />, color: '#EA4335', bg: '#FFF1F0' };
  if (n.includes('instagram')) return { icon: <RiInstagramLine />, color: '#E1306C', bg: '#FFF0F5' };
  if (n.includes('twitter') || n.includes('x.com'))
    return { icon: <RiTwitterXLine />, color: '#111827', bg: '#F3F4F6' };
  return { icon: <RiSmartphoneLine />, color: '#2563EB', bg: '#EFF6FF' };
}

function normalizeOtpCode(value?: string | null): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';

  const digits = raw.match(/\d+/g)?.join('');
  if (digits) return digits;

  return raw.replace(/\D/g, '');
}

function getDisplayServiceLabel(name?: string | null): string {
  const raw = String(name || '').trim();
  if (!raw) return 'Verified Number';

  const lower = raw.toLowerCase();
  if (lower.includes('whatsapp') || lower.includes('telegram') || lower.includes('google') || lower.includes('gmail') || lower.includes('instagram') || lower.includes('twitter') || lower.includes('x.com')) {
    return 'Verified Number';
  }

  return 'Verified Number';
}

/** Compute a human-readable expiry string from sold_at (numbers expire 15 min after purchase) */
function getExpiry(soldAt?: string | null): string {
  if (!soldAt) return '—';
  const expiresAt = new Date(new Date(soldAt).getTime() + 15 * 60 * 1000);
  const diff = expiresAt.getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const m = Math.floor(diff / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** Groups available numbers by service_name, returns an array of unique services */
function groupByService(items: UsaNumberItem[]): Array<{
  service_name: string;
  category: string;
  count: number;
  cheapest: UsaNumberItem;
}> {
  const map = new Map<string, UsaNumberItem[]>();
  for (const item of items) {
    const key = item.service_name;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return Array.from(map.entries()).map(([service_name, list]) => {
    list.sort((a, b) => a.sell_price - b.sell_price);
    return {
      service_name,
      category: list[0].category,
      count: list.length,
      cheapest: list[0],
    };
  });
}

type ActiveSpotlight = {
  phone_number: string;
  service_name: string;
  otp_code: string | null | undefined;
  received_at?: string;
};

/* ─── page ──────────────────────────────────────────────── */

export default function UsaNumbersPage() {
  const { addToast, user, setUser } = useAppStore();
  const [available, setAvailable] = useState<UsaNumberItem[]>([]);
  const [mine, setMine] = useState<UsaNumberItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNum, setSelectedNum] = useState<UsaNumberItem | null>(null);
  const [pinOpen, setPinOpen] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);
  const [revealedMap, setRevealedMap] = useState<Record<number, boolean>>({});
  const [refreshing, setRefreshing] = useState<Record<number, boolean>>({});
  const [spotlight, setSpotlight] = useState<ActiveSpotlight | null>(null);
  const [search, setSearch] = useState('');

  /* ── data ── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [aRes, mRes] = await Promise.all([
        usaNumberService.getAvailable(),
        usaNumberService.getMine(),
      ]);
      const availList = Array.isArray(aRes?.data) ? aRes.data : [];
      const mineList = Array.isArray(mRes?.data) ? mRes.data : [];
      setAvailable(availList);
      setMine(mineList);

      // Auto-set spotlight to the most recent number that has an OTP code
      const latest = mineList.find(m => normalizeOtpCode(m.otp_code) !== '');
      if (latest) {
        setSpotlight({
          phone_number: latest.phone_number,
          service_name: getDisplayServiceLabel(latest.service_name),
          otp_code: normalizeOtpCode(latest.otp_code),
          received_at: latest.sold_at ?? undefined,
        });
      }
    } catch (err: any) {
      addToast(err.message || 'Failed to load', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── actions ── */
  const handleBuy = (item: UsaNumberItem) => { setSelectedNum(item); setPinOpen(true); };

  const handlePinSuccess = async (pin: string) => {
    if (!selectedNum) return;
    setPinLoading(true);
    try {
      await usaNumberService.purchase(selectedNum.id, pin);
      setUser((await userService.getProfile()).data);
      addToast('Purchase successful!', 'success');
      setPinOpen(false);
      await fetchData();
    } catch (e: any) {
      addToast(e.message || 'Purchase failed', 'error');
    } finally { setPinLoading(false); }
  };

  const handleRefreshOtp = async (item: UsaNumberItem) => {
    setRefreshing(p => ({ ...p, [item.id]: true }));
    setSpotlight({ phone_number: item.phone_number, service_name: item.service_name, otp_code: '…' });

    try {
      const res = await usaNumberService.refreshOtp(item.id);
      const newCode = normalizeOtpCode(res?.data?.otp_code);

      setMine(prev => prev.map(m => m.id === item.id ? { ...m, otp_code: newCode } : m));

      if (newCode) {
        setSpotlight({
          phone_number: item.phone_number,
          service_name: getDisplayServiceLabel(item.service_name),
          otp_code: newCode,
          received_at: new Date().toISOString(),
        });
        addToast('Code refreshed!', 'success');
      } else {
        setSpotlight(null);
      }
    } catch (e: any) {
      addToast(e.message || 'Refresh failed', 'error');
      setSpotlight(null);
    } finally {
      setRefreshing(p => ({ ...p, [item.id]: false }));
    }
  };

  const handleCopy = (text: string) => {
    if (!text || text === '—') return;
    navigator.clipboard.writeText(text);
    addToast('Copied!', 'success');
  };

  /* ── derived ── */
  const filteredAvailable = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return available;
    return available.filter(a =>
      a.service_name?.toLowerCase().includes(q) || a.category?.toLowerCase().includes(q)
    );
  }, [available, search]);

  const serviceGroups = useMemo(() => groupByService(filteredAvailable), [filteredAvailable]);

  /* ── step state based on actual data ── */
  const stepState = {
    bought: mine.length > 0,
    waiting: mine.some(m => normalizeOtpCode(m.otp_code) === ''),
    fetched: mine.some(m => normalizeOtpCode(m.otp_code) !== ''),
  };

  return (
    <DashboardPageShell
      title="USA Numbers Beta"
      breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'USA Numbers Beta' }]}
      noPadding={true}
    >
      {/* ── Scoped styles — no inline S object ── */}
      <style>{`
        .unb-page         { padding: 28px 32px; max-width: 1200px; margin: 0 auto; width: 100%; }
        /* Hero */
        .unb-hero         { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; flex-wrap: wrap; margin-bottom: 28px; }
        .unb-hero-left    { flex: 1; min-width: 260px; }
        .unb-beta-badge   { display: inline-flex; align-items: center; gap: 6px; background: #EFF6FF; color: #2563EB; border: 1px solid #BFDBFE; border-radius: 999px; font-size: 11px; font-weight: 700; padding: 3px 10px; letter-spacing: .08em; text-transform: uppercase; margin-bottom: 10px; }
        .unb-badge-dot    { width: 7px; height: 7px; border-radius: 50%; background: #2563EB; display: inline-block; }
        .unb-hero h1      { font-size: 26px; font-weight: 800; color: #111827; line-height: 1.2; margin: 0 0 8px; }
        .unb-hero p       { font-size: 13.5px; color: #6B7280; line-height: 1.7; margin: 0; }
        .unb-hero strong  { font-weight: 700; color: #111827; }
        /* Balance card */
        .unb-bal-card     { background: #fff; border: 1px solid #E5E7EB; border-radius: 16px; padding: 18px 22px; display: flex; align-items: center; gap: 16px; box-shadow: 0 2px 12px rgba(0,0,0,.06); min-width: 240px; }
        .unb-bal-icon     { width: 44px; height: 44px; border-radius: 12px; background: #EFF6FF; color: #2563EB; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .unb-bal-label    { font-size: 11px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: .08em; margin: 0 0 2px; }
        .unb-bal-amt      { font-size: 22px; font-weight: 800; color: #111827; margin: 0; }
        .unb-topup-btn    { margin-left: auto; background: #111827; color: #fff; border: none; border-radius: 10px; padding: 10px 18px; font-size: 13px; font-weight: 700; cursor: pointer; white-space: nowrap; transition: background .18s; font-family: inherit; }
        .unb-topup-btn:hover { background: #2563EB; }
        /* Spotlight + stats row */
        .unb-spot-row     { display: grid; grid-template-columns: 1fr 280px; gap: 20px; margin-bottom: 28px; }
        .unb-spot-card    { background: #fff; border: 1px solid #E5E7EB; border-radius: 16px; padding: 24px 28px; box-shadow: 0 2px 12px rgba(0,0,0,.05); position: relative; overflow: hidden; }
        .unb-spot-glow    { position: absolute; top: -40px; right: -40px; width: 160px; height: 160px; border-radius: 50%; background: radial-gradient(circle, rgba(37,99,235,.08), transparent 70%); pointer-events: none; }
        .unb-live-tag     { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; color: #2563EB; letter-spacing: .06em; text-transform: uppercase; margin-bottom: 16px; }
        .unb-live-dot     { width: 8px; height: 8px; border-radius: 50%; background: #EF4444; animation: unb-pulse 1.5s ease-in-out infinite; }
        @keyframes unb-pulse { 0%,100%{opacity:1} 50%{opacity:.35} }
        .unb-spot-label   { font-size: 12px; color: #9CA3AF; text-transform: uppercase; letter-spacing: .05em; font-weight: 600; margin-bottom: 4px; }
        .unb-spot-phone   { font-size: 18px; font-weight: 700; color: #111827; margin-bottom: 20px; }
        .unb-otp-label    { font-size: 11px; color: #9CA3AF; text-transform: uppercase; letter-spacing: .05em; font-weight: 600; }
        .unb-otp-code     { font-size: 44px; font-weight: 800; color: #111827; font-family: monospace; letter-spacing: .18em; line-height: 1; }
        .unb-otp-meta     { margin-top: 20px; display: flex; align-items: center; justify-content: space-between; padding-top: 16px; border-top: 1px solid #F3F4F6; gap: 8px; flex-wrap: wrap; }
        .unb-otp-meta-txt { font-size: 12.5px; color: #6B7280; }
        .unb-otp-meta-txt strong { color: #111827; }
        .unb-copy-btn     { display: flex; align-items: center; gap: 6px; background: #F3F4F6; border: none; border-radius: 8px; padding: 8px 14px; font-size: 12px; font-weight: 600; color: #374151; cursor: pointer; transition: all .18s; font-family: inherit; }
        .unb-copy-btn:hover { background: #E0E7FF; color: #2563EB; }
        /* Stat cards */
        .unb-stat-col     { display: flex; flex-direction: column; gap: 16px; }
        .unb-stat-card    { background: #fff; border: 1px solid #E5E7EB; border-radius: 16px; padding: 22px 24px; flex: 1; box-shadow: 0 2px 8px rgba(0,0,0,.04); }
        .unb-live-chip    { display: inline-flex; align-items: center; gap: 4px; background: #ECFDF5; color: #059669; border-radius: 999px; padding: 2px 8px; font-size: 10px; font-weight: 700; margin-bottom: 8px; }
        .unb-live-chip-dot { width: 6px; height: 6px; background: #10B981; border-radius: 50%; display: inline-block; }
        .unb-stat-num     { font-size: 36px; font-weight: 800; color: #111827; line-height: 1; margin: 0 0 2px; }
        .unb-stat-lbl     { font-size: 11.5px; color: #9CA3AF; text-transform: uppercase; letter-spacing: .07em; font-weight: 700; margin: 0; }
        /* Steps */
        .unb-steps        { display: flex; align-items: center; gap: 0; margin-bottom: 32px; background: #fff; border: 1px solid #E5E7EB; border-radius: 16px; padding: 20px 32px; box-shadow: 0 1px 6px rgba(0,0,0,.04); }
        .unb-step         { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8px; }
        .unb-step-line    { flex: 0 0 60px; height: 1px; background: #E5E7EB; margin-top: -24px; }
        .unb-step-num     { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 15px; }
        .unb-step-num.done    { background: #2563EB; color: #fff; }
        .unb-step-num.active  { background: #EFF6FF; color: #2563EB; border: 2px solid #2563EB; }
        .unb-step-num.idle    { background: #F3F4F6; color: #9CA3AF; border: 2px solid #E5E7EB; }
        .unb-step-title   { font-size: 13px; font-weight: 700; color: #111827; text-align: center; }
        .unb-step-desc    { font-size: 11.5px; color: #9CA3AF; text-align: center; line-height: 1.4; }
        /* Marketplace */
        .unb-mkt-header   { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; gap: 12px; }
        .unb-mkt-header h2 { font-size: 18px; font-weight: 800; color: #111827; margin: 0 0 2px; }
        .unb-mkt-header p  { font-size: 12.5px; color: #9CA3AF; margin: 0; }
        .unb-search       { display: flex; align-items: center; gap: 8px; background: #fff; border: 1px solid #E5E7EB; border-radius: 10px; padding: 9px 14px; width: 220px; box-shadow: 0 1px 4px rgba(0,0,0,.04); }
        .unb-search input { border: none; outline: none; font-size: 13px; color: #374151; background: transparent; flex: 1; font-family: inherit; }
        .unb-mkt-grid     { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; margin-bottom: 32px; }
        .unb-mkt-card     { background: #fff; border: 1px solid #E5E7EB; border-radius: 16px; padding: 20px; cursor: pointer; box-shadow: 0 1px 6px rgba(0,0,0,.04); transition: border-color .2s, box-shadow .2s; }
        .unb-mkt-card:hover { border-color: #2563EB; box-shadow: 0 4px 20px rgba(37,99,235,.1); }
        .unb-mkt-top      { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
        .unb-svc-icon     { width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 20px; }
        .unb-mkt-price    { font-size: 16px; font-weight: 800; color: #111827; }
        .unb-mkt-name     { font-size: 14px; font-weight: 700; color: #111827; margin-bottom: 4px; }
        .unb-mkt-cat      { font-size: 11.5px; color: #6B7280; margin-bottom: 14px; }
        .unb-mkt-badge    { font-size: 10.5px; color: #6B7280; background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 999px; padding: 2px 8px; display: inline-block; margin-bottom: 12px; }
        .unb-buy-btn      { width: 100%; background: #EFF6FF; color: #2563EB; border: 1px solid #BFDBFE; border-radius: 9px; padding: 9px; font-size: 12.5px; font-weight: 700; cursor: pointer; transition: all .18s; font-family: inherit; }
        .unb-buy-btn:hover:not(:disabled)  { background: #2563EB; color: #fff; border-color: #2563EB; }
        .unb-buy-btn:disabled { opacity: .45; cursor: not-allowed; }
        .unb-empty-mkt    { grid-column: 1/-1; text-align: center; padding: 40px 24px; color: #9CA3AF; font-size: 14px; }
        /* Active numbers */
        .unb-active-hdr   { margin-bottom: 14px; }
        .unb-active-hdr h2 { font-size: 18px; font-weight: 800; color: #111827; margin: 0 0 2px; }
        .unb-active-hdr p  { font-size: 12.5px; color: #9CA3AF; margin: 0; }
        .unb-num-row      { background: #fff; border: 1px solid #E5E7EB; border-radius: 14px; padding: 16px 20px; display: flex; align-items: center; gap: 16px; margin-bottom: 12px; box-shadow: 0 1px 4px rgba(0,0,0,.04); flex-wrap: wrap; }
        .unb-num-row.has-otp  { border-left: 3px solid #2563EB; }
        .unb-num-icon     { width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .unb-num-icon.otp-ready { background: #EFF6FF; color: #2563EB; }
        .unb-num-icon.waiting   { background: #F3F4F6; color: #9CA3AF; }
        .unb-num-info     { flex: 1; min-width: 140px; }
        .unb-phone-row    { display: flex; align-items: center; gap: 6px; }
        .unb-phone        { font-size: 14px; font-weight: 700; color: #2563EB; margin: 0 0 2px; }
        .unb-eye-btn      { background: none; border: none; cursor: pointer; color: #9CA3AF; padding: 2px; display: flex; align-items: center; }
        .unb-expiry       { font-size: 11.5px; color: #9CA3AF; }
        .unb-chip         { display: inline-flex; align-items: center; gap: 5px; border-radius: 999px; padding: 4px 10px; font-size: 11px; font-weight: 700; }
        .unb-chip.verified  { background: #ECFDF5; color: #059669; }
        .unb-chip.waiting   { background: #FFF7ED; color: #D97706; }
        .unb-otp-pill     { font-family: monospace; font-size: 20px; font-weight: 800; color: #111827; background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 10px; padding: 8px 18px; }
        .unb-fetch-btn    { background: #111827; color: #fff; border: none; border-radius: 9px; padding: 9px 18px; font-size: 12.5px; font-weight: 700; cursor: pointer; font-family: inherit; transition: background .18s; white-space: nowrap; }
        .unb-fetch-btn:hover:not(:disabled) { background: #2563EB; }
        .unb-fetch-btn:disabled { opacity: .6; cursor: not-allowed; }
        .unb-icon-btn     { background: transparent; border: none; padding: 8px; cursor: pointer; border-radius: 8px; display: flex; align-items: center; transition: background .15s; }
        .unb-icon-btn.archive:hover { background: #F3F4F6; }
        .unb-icon-btn.delete:hover  { background: #FEF2F2; }
        .unb-icon-btn.archive { color: #9CA3AF; }
        .unb-icon-btn.delete  { color: #EF4444; }
        .unb-spacer       { flex: 1; }
        .unb-empty        { text-align: center; padding: 48px 24px; color: #9CA3AF; font-size: 14px; }
        .unb-loading-row  { display: flex; gap: 10px; padding: 20px 0; }
        .unb-skel         { background: #F3F4F6; border-radius: 12px; animation: unb-skel 1.2s ease-in-out infinite; }
        @keyframes unb-skel { 0%,100%{opacity:1} 50%{opacity:.4} }
        /* Responsive */
        @media (max-width: 900px) {
          .unb-spot-row   { grid-template-columns: 1fr; }
          .unb-steps      { flex-wrap: wrap; gap: 16px; padding: 16px; }
          .unb-step-line  { display: none; }
          .unb-hero       { flex-direction: column; }
          .unb-search     { width: 100%; }
        }
        @media (max-width: 600px) {
          .unb-page       { padding: 16px; }
          .unb-mkt-grid   { grid-template-columns: 1fr; }
          .unb-num-row    { flex-direction: column; align-items: flex-start; }
        }
      `}</style>

      <PinModal
        isOpen={pinOpen}
        onClose={() => setPinOpen(false)}
        onSuccess={handlePinSuccess}
        isLoading={pinLoading}
        title="Confirm Purchase"
        description={`Buy ${selectedNum?.phone_number} for ${formatMoney(selectedNum?.sell_price || 0)}`}
      />

      <div className="unb-page">

        {/* ── Hero ── */}
        <div className="unb-hero">
          <div className="unb-hero-left">
            <div className="unb-beta-badge">
              <span className="unb-badge-dot" />
              BETA
            </div>
            <h1>USA Numbers Beta</h1>
            <p>
              Secure high-tier USA virtual numbers for instant service verification.<br />
              Follow our <strong>Buy → Input → Fetch</strong> workflow to receive codes for major services in seconds.
            </p>
          </div>
          <div className="unb-bal-card">
            <div className="unb-bal-icon">
              <RiWalletLine size={22} />
            </div>
            <div>
              <p className="unb-bal-label">Current Balance</p>
              <p className="unb-bal-amt">{formatMoney(user?.balance)}</p>
            </div>
            <button className="unb-topup-btn">Top Up</button>
          </div>
        </div>

        {/* ── OTP Spotlight + Stats ── */}
        <div className="unb-spot-row">
          <div className="unb-spot-card">
            <div className="unb-spot-glow" />
            <div className="unb-live-tag">
              <span className="unb-live-dot" />
              Latest Incoming Code
            </div>
            <p className="unb-spot-label">Phone Number</p>
            <p className="unb-spot-phone">
              {spotlight?.phone_number || (mine[0]?.phone_number) || '+1 (000) 000-0000'}
            </p>
            <div>
              <p className="unb-otp-label">OTP Code</p>
              <p className="unb-otp-code">
                {spotlight?.otp_code || '— — — — — —'}
              </p>
            </div>
            <div className="unb-otp-meta">
              <span className="unb-otp-meta-txt">
                Service:{' '}
                <strong>{spotlight?.service_name || getDisplayServiceLabel(mine[0]?.service_name) || '—'}</strong>
                {spotlight?.received_at && (
                  <> · Received just now</>
                )}
              </span>
              <button
                className="unb-copy-btn"
                onClick={() => handleCopy(spotlight?.otp_code || '')}
              >
                <RiFileCopyLine size={14} /> Copy Code
              </button>
            </div>
          </div>

          <div className="unb-stat-col">
            <div className="unb-stat-card">
              <div className="unb-live-chip">
                <span className="unb-live-chip-dot" />
                LIVE
              </div>
              <p className="unb-stat-num">{loading ? '—' : available.length.toLocaleString()}</p>
              <p className="unb-stat-lbl">Available Numbers</p>
            </div>
            <div className="unb-stat-card">
              <p style={{ fontSize: 22, marginBottom: 6 }}>⭐</p>
              <p className="unb-stat-num">{loading ? '—' : mine.length}</p>
              <p className="unb-stat-lbl">Owned Numbers</p>
            </div>
          </div>
        </div>

        {/* ── Workflow Steps — state reflects actual API data ── */}
        <div className="unb-steps">
          {[
            {
              n: 1,
              title: 'Buy Number',
              desc: 'Select service & pay',
              state: stepState.bought ? 'done' : 'active',
            },
            {
              n: 2,
              title: 'Input Number',
              desc: 'Paste into your app',
              state: stepState.bought ? (stepState.fetched ? 'done' : 'active') : 'idle',
            },
            {
              n: 3,
              title: 'Fetch Code',
              desc: 'Get OTP verification',
              state: stepState.fetched ? 'done' : 'idle',
            },
          ].map((s, i, arr) => (
            <React.Fragment key={s.n}>
              <div className="unb-step">
                <div className={`unb-step-num ${s.state}`}>{s.n}</div>
                <p className="unb-step-title">{s.title}</p>
                <p className="unb-step-desc">{s.desc}</p>
              </div>
              {i < arr.length - 1 && <div className="unb-step-line" />}
            </React.Fragment>
          ))}
        </div>

        {/* ── Marketplace — driven entirely by real API data ── */}
        <div className="unb-mkt-header">
          <div>
            <h2>Marketplace</h2>
            <p>Instant delivery for any platform</p>
          </div>
          <div className="unb-search">
            <RiSearchLine size={16} color="#9CA3AF" />
            <input
              placeholder="Search service..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="unb-mkt-grid">
          {loading ? (
            [1, 2, 3, 4].map(k => (
              <div key={k} className="unb-skel" style={{ height: 180 }} />
            ))
          ) : serviceGroups.length === 0 ? (
            <div className="unb-empty-mkt">
              {search ? `No services matching "${search}"` : 'No numbers available right now.'}
            </div>
          ) : (
            serviceGroups.map(({ service_name, category, count, cheapest }) => {
              const { icon, color, bg } = getServiceVisual(service_name);
              return (
                <div key={service_name} className="unb-mkt-card">
                  <div className="unb-mkt-top">
                    <div className="unb-svc-icon" style={{ background: bg, color }}>
                      {icon}
                    </div>
                    <span className="unb-mkt-price">{formatMoney(cheapest.sell_price)}</span>
                  </div>
                  <p className="unb-mkt-name">{service_name}</p>
                  <p className="unb-mkt-cat">{category}</p>
                  <span className="unb-mkt-badge">{count} in stock</span>
                  <button
                    className="unb-buy-btn"
                    onClick={() => handleBuy(cheapest)}
                  >
                    Buy With Balance
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* ── Active Numbers — all from mine[] ── */}
        <div className="unb-active-hdr">
          <h2>Your Active Numbers</h2>
          <p>Numbers ready for verification</p>
        </div>

        {loading ? (
          <div className="unb-empty">Loading your numbers…</div>
        ) : mine.length === 0 ? (
          <div className="unb-empty">
            <RiMessage3Line size={36} style={{ marginBottom: 10, opacity: 0.3 }} />
            <p>No active numbers yet. Buy one from the marketplace above.</p>
          </div>
        ) : (
          mine.map(item => {
            const otpCode = normalizeOtpCode(item.otp_code);
            const hasOtp = otpCode !== '';
            const revealed = !!revealedMap[item.id];
            const masked = `${item.phone_number.slice(0, 6)}****${item.phone_number.slice(-2)}`;
            const isRefreshing = refreshing[item.id];

            return (
              <div key={item.id} className={`unb-num-row${hasOtp ? ' has-otp' : ''}`}>
                <div className={`unb-num-icon ${hasOtp ? 'otp-ready' : 'waiting'}`}>
                  {hasOtp
                    ? <RiCheckboxCircleLine size={18} />
                    : <RiMessage3Line size={18} />
                  }
                </div>

                <div className="unb-num-info">
                  <div className="unb-phone-row">
                    <p className="unb-phone">{revealed ? item.phone_number : masked}</p>
                    <button
                      className="unb-eye-btn"
                      onClick={() => setRevealedMap(p => ({ ...p, [item.id]: !p[item.id] }))}
                    >
                      {revealed ? <RiEyeOffLine size={14} /> : <RiEyeLine size={14} />}
                    </button>
                    <button
                      className="unb-eye-btn"
                      onClick={() => handleCopy(item.phone_number)}
                      title="Copy number"
                    >
                      <RiFileCopyLine size={13} />
                    </button>
                  </div>
                  <p className="unb-expiry">
                    {getDisplayServiceLabel(item.service_name)} · Expires in: {getExpiry(item.sold_at)}
                  </p>
                </div>

                <span className={`unb-chip ${hasOtp ? 'verified' : 'waiting'}`}>
                  {hasOtp
                    ? <><RiCheckboxCircleLine size={12} /> Verified</>
                    : <><RiRefreshLine size={12} /> Checking…</>
                  }
                </span>

                <span className="unb-spacer" />

                {hasOtp && (
                  <div className="unb-otp-pill">{otpCode}</div>
                )}

                <button
                  className="unb-fetch-btn"
                  disabled={isRefreshing}
                  onClick={() => {
                    setSpotlight({
                      phone_number: item.phone_number,
                      service_name: getDisplayServiceLabel(item.service_name),
                      otp_code: normalizeOtpCode(item.otp_code),
                    });
                    handleRefreshOtp(item);
                  }}
                >
                  {isRefreshing ? 'Fetching…' : 'Fetch Now'}
                </button>

                <button className="unb-icon-btn archive" title="Archive">
                  <RiArchiveLine size={18} />
                </button>
                <button className="unb-icon-btn delete" title="Delete">
                  <RiDeleteBinLine size={18} />
                </button>
              </div>
            );
          })
        )}

      </div>
    </DashboardPageShell>
  );
}
