'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardPageShell from '@/components/dashboard/DashboardPageShell';
import { usaNumberService, UsaNumberItem, userService } from '@/lib/api';
import { formatMoney } from '@/lib/utils';
import { useAppStore } from '@/store/appStore';
import {
  RiWalletLine,
  RiSearchLine,
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

const MARKETPLACE_PAGE_SIZE = 10;

/* ─── page ──────────────────────────────────────────────── */

export default function UsaNumbersPage() {
  const { addToast, user, setUser } = useAppStore();
  const router = useRouter();
  const [available, setAvailable] = useState<UsaNumberItem[]>([]);
  const [ownedCount, setOwnedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [marketPage, setMarketPage] = useState(1);
  const [purchasingNumberId, setPurchasingNumberId] = useState<number | null>(null);

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
      setOwnedCount(mineList.length);
    } catch (err: any) {
      addToast(err.message || 'Failed to load', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setMarketPage(1); }, [search]);

  /* ── actions ── */
  const handleBuy = async (item: UsaNumberItem) => {
    if (purchasingNumberId !== null) return;
    if (!user) return;
    if (Number(user.balance) < Number(item.sell_price)) {
      addToast(`Insufficient balance. This number costs ${formatMoney(item.sell_price)}.`, 'error');
      return;
    }

    setPurchasingNumberId(item.id);
    try {
      const purchaseRes = await usaNumberService.purchase(item.id, '');
      setUser((await userService.getProfile()).data);
      addToast('Purchase successful! Redirecting to Number History.', 'success');
      const focusId = purchaseRes?.data?.id ?? item.id;
      router.push(`/dashboard/user/numbers-history?section=usa&focus=${focusId}`);
    } catch (e: any) {
      addToast(e.message || 'Purchase failed', 'error');
      setPurchasingNumberId(null);
    }
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
  const marketTotalPages = Math.max(1, Math.ceil(serviceGroups.length / MARKETPLACE_PAGE_SIZE));
  const pagedServiceGroups = useMemo(() => {
    const start = (marketPage - 1) * MARKETPLACE_PAGE_SIZE;
    return serviceGroups.slice(start, start + MARKETPLACE_PAGE_SIZE);
  }, [marketPage, serviceGroups]);

  useEffect(() => {
    if (marketPage > marketTotalPages) {
      setMarketPage(marketTotalPages);
    }
  }, [marketPage, marketTotalPages]);

  return (
    <DashboardPageShell
      title="USA Numbers Beta"
      breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'USA Numbers Beta' }]}
      noPadding={true}
    >
      <style>{`
        .unb-page { padding: 28px 32px; max-width: 1200px; margin: 0 auto; width: 100%; }
        .unb-hero { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; flex-wrap: wrap; margin-bottom: 24px; }
        .unb-hero-left { flex: 1; min-width: 280px; }
        .unb-beta-badge { display: inline-flex; align-items: center; gap: 6px; background: #EFF6FF; color: #2563EB; border: 1px solid #BFDBFE; border-radius: 999px; font-size: 11px; font-weight: 700; padding: 3px 10px; letter-spacing: .08em; text-transform: uppercase; margin-bottom: 10px; }
        .unb-badge-dot { width: 7px; height: 7px; border-radius: 50%; background: #2563EB; display: inline-block; }
        .unb-hero h1 { font-size: 26px; font-weight: 800; color: #111827; line-height: 1.2; margin: 0 0 8px; }
        .unb-hero p { font-size: 13.5px; color: #6B7280; line-height: 1.7; margin: 0; }
        .unb-hero strong { font-weight: 700; color: #111827; }
        .unb-bal-card { background: #fff; border: 1px solid #E5E7EB; border-radius: 16px; padding: 18px 22px; display: flex; align-items: center; gap: 16px; box-shadow: 0 2px 12px rgba(0,0,0,.06); min-width: 240px; }
        .unb-bal-icon { width: 44px; height: 44px; border-radius: 12px; background: #EFF6FF; color: #2563EB; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .unb-bal-label { font-size: 11px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: .08em; margin: 0 0 2px; }
        .unb-bal-amt { font-size: 22px; font-weight: 800; color: #111827; margin: 0; }
        .unb-topup-btn { margin-left: auto; background: #111827; color: #fff; border: none; border-radius: 10px; padding: 10px 18px; font-size: 13px; font-weight: 700; cursor: pointer; white-space: nowrap; transition: background .18s; font-family: inherit; }
        .unb-topup-btn:hover { background: #2563EB; }
        .unb-stat-row { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-bottom: 28px; }
        .unb-stat-card { background: #fff; border: 1px solid #E5E7EB; border-radius: 16px; padding: 22px 24px; box-shadow: 0 2px 8px rgba(0,0,0,.04); }
        .unb-stat-kicker { display: inline-flex; align-items: center; gap: 4px; background: #ECFDF5; color: #059669; border-radius: 999px; padding: 2px 8px; font-size: 10px; font-weight: 700; margin-bottom: 8px; }
        .unb-stat-kicker-dot { width: 6px; height: 6px; background: #10B981; border-radius: 50%; display: inline-block; }
        .unb-stat-num { font-size: 36px; font-weight: 800; color: #111827; line-height: 1; margin: 0 0 2px; }
        .unb-stat-lbl { font-size: 11.5px; color: #9CA3AF; text-transform: uppercase; letter-spacing: .07em; font-weight: 700; margin: 0; }
        .unb-history-card { background: linear-gradient(135deg, #111827, #1F2937); color: #fff; border-radius: 16px; padding: 22px 24px; display: flex; flex-direction: column; gap: 12px; justify-content: space-between; }
        .unb-history-card h3 { margin: 0; font-size: 18px; font-weight: 800; }
        .unb-history-card p { margin: 0; color: rgba(255,255,255,.78); line-height: 1.6; }
        .unb-history-link { align-self: flex-start; background: #fff; color: #111827; border-radius: 10px; padding: 10px 14px; font-weight: 700; font-size: 13px; text-decoration: none; }
        .unb-mkt-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; flex-wrap: wrap; gap: 12px; }
        .unb-mkt-header h2 { font-size: 18px; font-weight: 800; color: #111827; margin: 0 0 2px; }
        .unb-mkt-header p { font-size: 12.5px; color: #9CA3AF; margin: 0; }
        .unb-search { display: flex; align-items: center; gap: 8px; background: #fff; border: 1px solid #E5E7EB; border-radius: 10px; padding: 9px 14px; width: 220px; box-shadow: 0 1px 4px rgba(0,0,0,.04); }
        .unb-search input { border: none; outline: none; font-size: 13px; color: #374151; background: transparent; flex: 1; font-family: inherit; }
        .unb-mkt-meta { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 12px; }
        .unb-pagination { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .unb-page-btn { background: #fff; border: 1px solid #E5E7EB; color: #374151; border-radius: 10px; padding: 8px 12px; font-size: 12px; font-weight: 700; cursor: pointer; }
        .unb-page-btn:disabled { opacity: .45; cursor: not-allowed; }
        .unb-page-pill { background: #EFF6FF; color: #2563EB; border: 1px solid #BFDBFE; border-radius: 999px; padding: 8px 12px; font-size: 12px; font-weight: 700; }
        .unb-mkt-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; margin-bottom: 12px; }
        .unb-mkt-card { background: #fff; border: 1px solid #E5E7EB; border-radius: 16px; padding: 20px; box-shadow: 0 1px 6px rgba(0,0,0,.04); transition: border-color .2s, box-shadow .2s; }
        .unb-mkt-card:hover { border-color: #2563EB; box-shadow: 0 4px 20px rgba(37,99,235,.1); }
        .unb-mkt-card.is-disabled { opacity: .55; pointer-events: none; filter: grayscale(.25); }
        .unb-mkt-card.is-disabled:hover { border-color: #E5E7EB; box-shadow: 0 1px 6px rgba(0,0,0,.04); }
        .unb-mkt-card.is-unavailable { border-color: #FCA5A5; background: #FEF2F2; opacity: .72; pointer-events: none; }
        .unb-mkt-card.is-unavailable:hover { border-color: #FCA5A5; box-shadow: 0 1px 6px rgba(0,0,0,.04); }
        .unb-mkt-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
        .unb-svc-icon { width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 20px; }
        .unb-mkt-price { font-size: 16px; font-weight: 800; color: #111827; }
        .unb-mkt-name { font-size: 14px; font-weight: 700; color: #111827; margin-bottom: 4px; }
        .unb-mkt-cat { font-size: 11.5px; color: #6B7280; margin-bottom: 14px; }
        .unb-mkt-badge { font-size: 10.5px; color: #6B7280; background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 999px; padding: 2px 8px; display: inline-block; margin-bottom: 12px; }
        .unb-mkt-badge.is-unavailable { color: #DC2626; background: #FEE2E2; border-color: #FCA5A5; }
        .unb-buy-btn { width: 100%; background: #EFF6FF; color: #2563EB; border: 1px solid #BFDBFE; border-radius: 9px; padding: 9px; font-size: 12.5px; font-weight: 700; cursor: pointer; transition: all .18s; font-family: inherit; }
        .unb-buy-btn.is-unavailable { background: #FEE2E2; color: #DC2626; border-color: #FCA5A5; }
        .unb-buy-btn:hover:not(:disabled) { background: #2563EB; color: #fff; border-color: #2563EB; }
        .unb-buy-btn:disabled { opacity: .45; cursor: not-allowed; }
        .unb-empty-mkt { grid-column: 1/-1; text-align: center; padding: 40px 24px; color: #9CA3AF; font-size: 14px; }
        .unb-empty { text-align: center; padding: 36px 24px; color: #9CA3AF; font-size: 14px; }
        .unb-skel { background: #F3F4F6; border-radius: 12px; animation: unb-skel 1.2s ease-in-out infinite; }
        @keyframes unb-skel { 0%,100%{opacity:1} 50%{opacity:.4} }
        .unb-note { margin-top: 22px; padding: 16px 18px; border-radius: 14px; background: #F9FAFB; border: 1px solid #E5E7EB; color: #4B5563; line-height: 1.6; display: flex; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
        .unb-note strong { color: #111827; }
        @media (max-width: 900px) {
          .unb-hero { flex-direction: column; }
          .unb-search { width: 100%; }
          .unb-stat-row { grid-template-columns: 1fr; }
        }
        @media (max-width: 600px) {
          .unb-page { padding: 16px; }
          .unb-mkt-grid { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="unb-page">
        <div className="unb-hero">
          <div className="unb-hero-left">
            <div className="unb-beta-badge">
              <span className="unb-badge-dot" />
              BETA
            </div>
            <h1>USA Numbers Beta</h1>
            <p>
              Buy a USA virtual number here, then open <strong>Number History</strong> to fetch and view the OTP.
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

        <div className="unb-stat-row">
          <div className="unb-stat-card">
            <div className="unb-stat-kicker">
              <span className="unb-stat-kicker-dot" />
              LIVE
            </div>
            <p className="unb-stat-num">{loading ? '—' : available.length.toLocaleString()}</p>
            <p className="unb-stat-lbl">Available Numbers</p>
          </div>
          <div className="unb-history-card">
            <div>
              <h3>Your OTP lives in Number History</h3>
              <p>
                Purchased numbers are redirected there, and the OTP is fetched from the response and shown in the history card.
                You currently own {ownedCount} number{ownedCount === 1 ? '' : 's'}.
              </p>
            </div>
            <Link href="/dashboard/user/numbers-history?section=usa" className="unb-history-link">
              Open Number History
            </Link>
          </div>
        </div>

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

        <div className="unb-mkt-meta">
          <div className="unb-page-pill">
            {serviceGroups.length} service groups
          </div>
          {marketTotalPages > 1 && (
            <div className="unb-pagination">
              <button
                className="unb-page-btn"
                onClick={() => setMarketPage(page => Math.max(1, page - 1))}
                disabled={marketPage <= 1}
              >
                Prev
              </button>
              <span className="unb-page-pill">
                Page {marketPage} of {marketTotalPages}
              </span>
              <button
                className="unb-page-btn"
                onClick={() => setMarketPage(page => Math.min(marketTotalPages, page + 1))}
                disabled={marketPage >= marketTotalPages}
              >
                Next
              </button>
            </div>
          )}
        </div>

        <div className="unb-mkt-grid">
          {loading ? (
            [1, 2, 3, 4].map(k => (
              <div key={k} className="unb-skel" style={{ height: 180 }} />
            ))
          ) : pagedServiceGroups.length === 0 ? (
            <div className="unb-empty-mkt">
              {search ? `No services matching "${search}"` : 'No numbers available right now.'}
            </div>
          ) : (
            pagedServiceGroups.map(({ service_name, category, count, cheapest }) => {
              const { icon, color, bg } = getServiceVisual(service_name);
              const isPurchasing = purchasingNumberId === cheapest.id;
              const purchaseInProgress = purchasingNumberId !== null;
              const cardClassName = [
                'unb-mkt-card',
                isPurchasing ? 'is-unavailable' : '',
                purchaseInProgress && !isPurchasing ? 'is-disabled' : '',
              ].filter(Boolean).join(' ');
              return (
                <div key={service_name} className={cardClassName} aria-busy={isPurchasing}>
                  <div className="unb-mkt-top">
                    <div className="unb-svc-icon" style={{ background: bg, color }}>
                      {icon}
                    </div>
                    <span className="unb-mkt-price">{formatMoney(cheapest.sell_price)}</span>
                  </div>
                  <p className="unb-mkt-name">{service_name}</p>
                  <p className="unb-mkt-cat">{category}</p>
                  <span className={`unb-mkt-badge${isPurchasing ? ' is-unavailable' : ''}`}>
                    {isPurchasing ? 'Not Available' : `${count} in stock`}
                  </span>
                  <button
                    className={`unb-buy-btn${isPurchasing ? ' is-unavailable' : ''}`}
                    onClick={() => handleBuy(cheapest)}
                    disabled={purchaseInProgress}
                  >
                    {isPurchasing ? 'Not Available' : purchaseInProgress ? 'Please wait...' : 'Buy With Balance'}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {marketTotalPages > 1 && (
          <div className="unb-mkt-meta" style={{ marginTop: 10 }}>
            <span className="unb-page-pill">
              Showing {Math.min((marketPage - 1) * MARKETPLACE_PAGE_SIZE + 1, serviceGroups.length)}-
              {Math.min(marketPage * MARKETPLACE_PAGE_SIZE, serviceGroups.length)} of {serviceGroups.length}
            </span>
          </div>
        )}

        <div className="unb-note">
          <span>
            Bought a number already? Open <strong>Number History</strong> to fetch the OTP and keep the beta page clean.
          </span>
          <Link href="/dashboard/user/numbers-history?section=usa">Go to history</Link>
        </div>
      </div>
    </DashboardPageShell>
  );
}
