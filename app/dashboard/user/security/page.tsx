'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import Topbar from '@/components/dashboard/Topbar';
import PinModal from '@/components/ui/PinModal';
import Spinner from '@/components/ui/Spinner';
import { useAppStore } from '@/store/appStore';
import { userService } from '@/lib/api/user.service';
import {
  RiShieldKeyholeLine, RiWhatsappLine, RiHistoryLine, RiAlertLine,
  RiCheckLine, RiFileCopyLine, RiCloseLine, RiEyeLine, RiRefreshLine
} from 'react-icons/ri';

interface SecurityInfo {
  recovery_key_saved: boolean;
  has_recovery_key: boolean;
  whatsapp_notifications: boolean;
  whatsapp_number: string | null;
  recent_verifications: any[];
}

export default function SecurityPage() {
  const { user, addToast, setUser } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [securityInfo, setSecurityInfo] = useState<SecurityInfo>({
    recovery_key_saved: false,
    has_recovery_key: false,
    whatsapp_notifications: false,
    whatsapp_number: '',
    recent_verifications: []
  });

  // New UI states
  const [bannerKey, setBannerKey] = useState<string | null>(null);
  const [bannerTitle, setBannerTitle] = useState('Your Recovery Key');
  const [pinModal, setPinModal] = useState<{ open: boolean; action: 'reveal' | 'regenerate' | null }>({
    open: false,
    action: null
  });
  const [actionLoading, setActionLoading] = useState(false);

  const fetchSecurityInfo = useCallback(async () => {
    try {
      const res: any = await userService.getSecurityInfo();
      if (res.status === 'success') {
        setSecurityInfo({
          ...res.data,
          whatsapp_number: res.data?.whatsapp_number ?? '',
        });
      }
    } catch (err) {
      addToast('Failed to load security settings', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchSecurityInfo();
  }, [fetchSecurityInfo]);

  const handleUpdateWhatsapp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res: any = await userService.updateSecuritySettings({
        whatsapp_notifications: securityInfo.whatsapp_notifications,
        whatsapp_number: securityInfo.whatsapp_number || undefined
      });

      const savedSettings = res?.data ?? {};
      setSecurityInfo(prev => ({
        ...prev,
        whatsapp_notifications: !!savedSettings.whatsapp_notifications,
        whatsapp_number: savedSettings.whatsapp_number ?? ''
      }));

      addToast('WhatsApp settings updated!', 'success');
      if (user) {
        setUser({
          ...user,
          whatsapp_notifications: !!savedSettings.whatsapp_notifications,
          whatsapp_number: savedSettings.whatsapp_number || undefined
        });
      }
    } catch (err) {
      addToast('Update failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const markKeyAsSaved = async () => {
    try {
      await userService.confirmRecoveryKeySaved();
      setSecurityInfo(prev => ({ ...prev, recovery_key_saved: true }));
      if (user) setUser({ ...user, recovery_key_saved: true });
      addToast('Recovery status updated!', 'success');
      setBannerKey(null); // Close banner on save
    } catch (err) {
      addToast('Failed to update status', 'error');
    }
  };

  const handlePinSuccess = async (transactionPin: string) => {
    setActionLoading(true);
    try {
      if (pinModal.action === 'regenerate') {
        const res = await userService.regenerateRecoveryKey(transactionPin);
        if (res.status === 'success') {
          setBannerKey(res.data.recovery_key);
          setBannerTitle('New Recovery Key Generated');
          setSecurityInfo(prev => ({ ...prev, recovery_key_saved: false }));
          if (user) setUser({ ...user, recovery_key_saved: false });
          addToast('New key generated! Save it now.', 'success');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      } else if (pinModal.action === 'reveal') {
        const res = await userService.revealRecoveryKey(transactionPin);
        if (res.status === 'success') {
          setBannerKey(res.data.recovery_key);
          setBannerTitle('Your Current Recovery Key');
          addToast('Recovery key revealed', 'success');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
      setPinModal({ open: false, action: null });
    } catch (err: any) {
      addToast(err.message || 'Verification failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <DashboardLayout>
      {/* Dynamic Dropdown Banner - Moved to top for z-index priority */}
      <div className={`recovery-banner ${bannerKey ? 'active' : ''}`}>
        <div className="banner-content">
          <div className="banner-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <RiShieldKeyholeLine size={24} color="#fff" />
              <h3 style={{ margin: 0, color: '#fff', fontSize: '1rem', fontWeight: 700 }}>{bannerTitle}</h3>
            </div>
            <button className="banner-close" onClick={() => setBannerKey(null)}>
              <RiCloseLine size={24} />
            </button>
          </div>
          <div className="banner-body">
            <p style={{ margin: '0 0 16px', fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', lineHeight: 1.5 }}>
              This key grants full access to your account if you lose your password.
              <strong> Keep it in a secure, private place.</strong>
            </p>
            <div className="key-display">
              <code>{bannerKey}</code>
              <button
                className="copy-btn"
                onClick={() => {
                  navigator.clipboard.writeText(bannerKey || '');
                  addToast('Key copied!', 'success');
                }}
              >
                <RiFileCopyLine size={18} /> Copy
              </button>
            </div>
            {!securityInfo.recovery_key_saved && (
              <button className="confirm-btn" onClick={markKeyAsSaved}>
                <RiCheckLine size={18} /> I have saved it securely
              </button>
            )}
          </div>
        </div>
      </div>

      <Topbar title="Security & API" />

      <main style={{ padding: '28px', maxWidth: 800 }}>
        <div className="breadcrumb">
          <Link href="/dashboard">Dashboard</Link>
          <span>/</span>
          <span>Security</span>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {[0, 1].map((index) => (
              <div key={index} className="stat-card loading-card">
                <div className="loading-card-head">
                  <Spinner size={30} thickness={3} />
                  <div>
                    <div className="loading-line title" />
                    <div className="loading-line subtitle" />
                  </div>
                </div>
                <div className="loading-panel">
                  <div className="loading-line full" />
                  <div className="loading-line medium" />
                </div>
                <div className="loading-actions">
                  <div className="loading-pill" />
                  <div className="loading-pill secondary" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Recovery Key Card */}
            <div
              className="stat-card"
              style={{
                borderLeft: securityInfo.recovery_key_saved ? '4px solid #10B981' : '4px solid #F59E0B',
              }}
            >
              <div className="recovery-header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                  <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <RiShieldKeyholeLine size={20} /> Recovery Key Status
                  </h2>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                    Your emergency access key for when you lose your password.
                  </p>
                </div>
                {securityInfo.recovery_key_saved ? (
                  <span className="badge-secure">SECURELY SAVED</span>
                ) : (
                  <span className="badge-warning">ACTION REQUIRED</span>
                )}
              </div>

              <div style={{
                padding: '16px', background: 'var(--color-bg-hover)', borderRadius: 12,
                fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: 1.5,
                border: '1px solid var(--color-border)'
              }}>
                <RiAlertLine size={18} style={{ verticalAlign: 'middle', marginRight: 8, color: '#F59E0B' }} />
                Your recovery key is required to reset your password if you ever get locked out.
                You can reveal your current key or generate a new one at any time.
              </div>

              <div style={{ marginTop: 24, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                {securityInfo.has_recovery_key && (
                  <button
                    onClick={() => setPinModal({ open: true, action: 'reveal' })}
                    className="btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px' }}
                  >
                    <RiEyeLine size={18} /> Reveal My Key
                  </button>
                )}
                <button
                  onClick={() => setPinModal({ open: true, action: 'regenerate' })}
                  className="btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px' }}
                >
                  <RiRefreshLine size={18} /> Regenerate Key
                </button>
              </div>
            </div>

            {/* WhatsApp Integration Card */}
            <div className="stat-card">
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                <RiWhatsappLine size={22} color="#25D366" /> WhatsApp OTP Notifications
              </h2>
              <form onSubmit={handleUpdateWhatsapp} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div className="whatsapp-switch-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'var(--color-bg-hover)', borderRadius: 12 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Enable WhatsApp Delivery</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Receive your login and reset codes via WhatsApp.</div>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={securityInfo.whatsapp_notifications}
                      onChange={(e) => setSecurityInfo(prev => ({ ...prev, whatsapp_notifications: e.target.checked }))}
                    />
                    <span className="slider round"></span>
                  </label>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: 8 }}>WhatsApp Phone Number</label>
                  <input
                    type="tel"
                    className="input-field"
                    placeholder="+234..."
                    value={securityInfo.whatsapp_number || ''}
                    onChange={(e) => setSecurityInfo(prev => ({ ...prev, whatsapp_number: e.target.value }))}
                    disabled={!securityInfo.whatsapp_notifications}
                  />
                </div>

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={saving}
                  style={{ padding: '12px', width: 'fit-content', minWidth: 200 }}
                >
                  {saving ? (
                    <>
                      <Spinner size={18} thickness={2} /> Saving Settings
                    </>
                  ) : (
                    'Save WhatsApp Settings'
                  )}
                </button>
              </form>
            </div>

            {/* Verification History Card */}
            <div className="stat-card">
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                <RiHistoryLine size={20} /> Verification History
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {securityInfo.recent_verifications.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '20px', color: 'var(--color-text-faint)', fontSize: '0.9rem' }}>
                    No recent verification attempts.
                  </div>
                ) : (
                  securityInfo.recent_verifications.map((v, i) => (
                    <div key={i} className="history-item">
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'capitalize' }}>{v.type} Request</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-faint)' }}>{new Date(v.created_at).toLocaleString()}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <code style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-primary)', letterSpacing: '2px' }}>{v.otp}</code>
                        <span className={`status-badge ${new Date(v.expires_at) > new Date() ? 'active' : 'expired'}`}>
                          {new Date(v.expires_at) > new Date() ? 'ACTIVE' : 'EXPIRED'}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}
      </main>

      <PinModal
        isOpen={pinModal.open}
        onClose={() => setPinModal({ open: false, action: null })}
        onSuccess={handlePinSuccess}
        isLoading={actionLoading}
        title={pinModal.action === 'reveal' ? 'Reveal Recovery Key' : 'Regenerate Recovery Key'}
        description={`Please enter your 4-digit transaction PIN to ${pinModal.action === 'reveal' ? 'view' : 'generate a new'} recovery key.`}
      />

      <style jsx>{`
        .recovery-banner {
          position: fixed;
          top: 0;
          left: 50%;
          transform: translateX(-50%) translateY(-100%);
          width: 90%;
          max-width: 500px;
          z-index: 99999;
          transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
          border-radius: 0 0 24px 24px;
          box-shadow: 0 20px 50px rgba(0,0,0,0.3);
          overflow: hidden;
          pointer-events: none;
        }
        .recovery-banner.active {
          transform: translateX(-50%) translateY(0);
          pointer-events: auto;
        }
        .banner-content {
          padding: 24px;
        }
        .banner-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .banner-close {
          background: rgba(255,255,255,0.2);
          border: none;
          color: #fff;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .key-display {
          background: rgba(0,0,0,0.2);
          padding: 16px;
          border-radius: 12px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          border: 1px dashed rgba(255,255,255,0.3);
        }
        .key-display code {
          font-size: 1.2rem;
          font-weight: 800;
          color: #fff;
          letter-spacing: 1px;
        }
        .copy-btn {
          background: #fff;
          border: none;
          color: #D97706;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 700;
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
        }
        .confirm-btn {
          width: 100%;
          padding: 12px;
          background: #fff;
          border: none;
          color: #D97706;
          border-radius: 12px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          cursor: pointer;
        }
        .badge-secure {
          padding: 4px 12px;
          border-radius: 20px;
          background: #D1FAE5;
          color: #065F46;
          font-size: 0.75rem;
          font-weight: 700;
        }
        .badge-warning {
          padding: 4px 12px;
          border-radius: 20px;
          background: #FEF3C7;
          color: #92400E;
          font-size: 0.75rem;
          font-weight: 700;
          animation: pulse 2s infinite;
        }
        .history-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px;
          background: var(--color-bg-hover);
          border-radius: 10px;
          border: 1px solid var(--color-border);
        }
        .status-badge {
          font-size: 0.7rem;
          font-weight: 700;
        }
        .status-badge.active { color: #10B981; }
        .status-badge.expired { color: var(--color-text-faint); }
        .loading-card {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .loading-card-head {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .loading-panel {
          border: 1px solid var(--color-border);
          background: var(--color-bg-hover);
          border-radius: 14px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .loading-actions {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
        }
        .loading-line, .loading-pill {
          background: linear-gradient(90deg, rgba(209,213,219,0.55) 25%, rgba(229,231,235,0.95) 50%, rgba(209,213,219,0.55) 75%);
          background-size: 200% 100%;
          animation: skeleton-loading 1.2s ease-in-out infinite;
        }
        .loading-line {
          height: 12px;
          border-radius: 999px;
        }
        .loading-line.title { width: 190px; height: 14px; margin-bottom: 8px; }
        .loading-line.subtitle { width: 280px; max-width: 100%; }
        .loading-line.full { width: 100%; }
        .loading-line.medium { width: 72%; }
        .loading-pill {
          width: 170px;
          height: 42px;
          border-radius: 12px;
        }
        .loading-pill.secondary { width: 140px; }
        
        .switch {
          position: relative;
          display: inline-block;
          width: 44px;
          height: 24px;
        }
        .switch input { opacity: 0; width: 0; height: 0; }
        .slider {
          position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0;
          background-color: #ccc; transition: .4s; border-radius: 24px;
        }
        .slider:before {
          position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px;
          background-color: white; transition: .4s; border-radius: 50%;
        }
        input:checked + .slider { background-color: var(--color-primary); }
        input:checked + .slider:before { transform: translateX(20px); }
        
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        @keyframes skeleton-loading {
          from { background-position: 200% 0; }
          to { background-position: -200% 0; }
        }
        
        @media (max-width: 600px) {
          .stat-card { padding: 20px !important; }
          .recovery-header-row { flex-direction: column; gap: 16px; align-items: flex-start !important; }
          .whatsapp-switch-row { flex-direction: column; gap: 16px; align-items: flex-start !important; }
          main { padding: 16px !important; }
          .key-display { flex-direction: column; align-items: flex-start; gap: 12px; }
          .key-display code { font-size: 1rem; word-break: break-all; }
        }
      `}</style>
    </DashboardLayout>
  );
}
