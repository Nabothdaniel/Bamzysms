'use client';

import React, { useEffect, useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { adminService, AdminSettings } from '@/lib/api/admin.service';
import { useAppStore } from '@/store/appStore';
import { RiSave3Line, RiInformationLine, RiPulseLine, RiQuestionLine, RiNodeTree } from 'react-icons/ri';
import Skeleton from '@/components/ui/Skeleton';

export default function AdminSettingsPage() {
  const { addToast, hasHydrated, user } = useAppStore();
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!hasHydrated || user?.role !== 'admin') return;

    const loadSettings = async () => {
      try {
        const response = await adminService.getSettings();
        setSettings(response.data);
      } catch {
        addToast('Failed to load settings', 'error');
      } finally {
        setLoading(false);
      }
    };

    void loadSettings();
  }, [addToast, hasHydrated, user?.role]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    try {
      await adminService.updateSettings(settings);
      addToast('Global settings updated successfully', 'success');
    } catch (err: any) {
      addToast(err.message || 'Update failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key: string, value: string) => {
    if (!settings) return;
    setSettings({ ...settings, [key]: value });
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="admin-content" style={{ padding: '32px' }}>
          <Skeleton height={40} width={300} style={{ marginBottom: 16 }} />
          <Skeleton height={20} width={500} style={{ marginBottom: 40 }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <Skeleton height={300} style={{ borderRadius: 20 }} />
            <Skeleton height={300} style={{ borderRadius: 20 }} />
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="admin-content" style={{ padding: '32px' }}>
        <div style={{ marginBottom: '40px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <RiNodeTree size={32} color="var(--color-primary)" />
            <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0 }}>System Control Center</h1>
          </div>
          <p style={{ color: 'var(--color-text-faint)', margin: 0, fontWeight: 500, maxWidth: 700, lineHeight: 1.6 }}>
            Manage the core business logic of BamzySMS. These settings influence pricing calculations, 
            profit margins, and how the platform communicates with external services.
          </p>
        </div>

        <form onSubmit={handleUpdate}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '32px', marginBottom: '40px' }}>
            
            {/* FINANCIAL STRATEGY */}
            <div className="settings-card shadow-premium">
              <div className="card-header">
                <div className="icon-box green">
                   <RiPulseLine size={24} />
                </div>
                <div>
                  <h3 className="card-title">Profit & Currency Strategy</h3>
                  <p className="card-subtitle">Control your revenue multipliers and base rates.</p>
                </div>
              </div>

              <div className="input-group">
                <div className="field">
                  <div className="label-with-tooltip">
                    <label>Global Markup Multiplier</label>
                    <RiQuestionLine className="tooltip-trigger" />
                  </div>
                  <div className="input-with-affix">
                    <input 
                      type="number" step="0.01" className="premium-input"
                      value={settings?.price_markup_multiplier || ''}
                      onChange={(e) => handleChange('price_markup_multiplier', e.target.value)}
                      placeholder="e.g. 1.25"
                    />
                    <span className="affix">x</span>
                  </div>
                  <p className="field-desc">
                    Every service purchase cost (USD) is multiplied by this value. 
                    Example: <b>1.5</b> adds a 50% profit margin to the base cost.
                  </p>
                </div>

                <div className="field">
                  <div className="label-with-tooltip">
                    <label>Internal Exchange Rate (₦/$)</label>
                    <RiQuestionLine className="tooltip-trigger" />
                  </div>
                  <div className="input-with-affix">
                    <span className="prefix">₦</span>
                    <input 
                      type="number" className="premium-input" style={{ paddingLeft: '40px' }}
                      value={settings?.usd_to_ngn_rate || ''}
                      onChange={(e) => handleChange('usd_to_ngn_rate', e.target.value)}
                      placeholder="e.g. 1550"
                    />
                  </div>
                  <p className="field-desc">
                    The rate used to calculate costs in Naira. Update this when the market fluctuates
                    to protect your margins.
                  </p>
                </div>
              </div>
            </div>

            {/* COMMUNICATIONS */}
            <div className="settings-card shadow-premium">
              <div className="card-header">
                <div className="icon-box blue">
                   <RiInformationLine size={24} />
                </div>
                <div>
                  <h3 className="card-title">Administrative Alerts</h3>
                  <p className="card-subtitle">Keep the right people informed.</p>
                </div>
              </div>

              <div className="input-group">
                <div className="field">
                  <label>Operations Notification Email</label>
                  <input 
                    type="email" className="premium-input"
                    value={settings?.admin_email_notifications || ''}
                    onChange={(e) => handleChange('admin_email_notifications', e.target.value)}
                    placeholder="ops@bamzysms.com"
                  />
                  <p className="field-desc">
                    Critical system alerts, low provider balance warnings, and priority
                    support notifications will be routed here.
                  </p>
                </div>

                <div className="info-block">
                  <RiInformationLine className="info-icon" />
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>Security Note</div>
                    API secrets and direct provider keys are managed via secure environment 
                    variables for maximum protection against leakage.
                  </div>
                </div>
              </div>
            </div>

          </div>

          <div className="form-actions">
            <button 
              type="submit" className="btn-primary glow-btn" disabled={saving}
              style={{ padding: '16px 48px', borderRadius: '14px', fontSize: '1.05rem', fontWeight: 800 }}
            >
              {saving ? 'Synchronizing...' : <><RiSave3Line size={22} style={{ marginRight: 10 }} /> Update Core Systems</>}
            </button>
          </div>
        </form>

        <style jsx>{`
          .settings-card {
            background: var(--color-bg-2);
            border: 1px solid var(--color-border);
            border-radius: 24px;
            padding: 32px;
            display: flex;
            flex-direction: column;
            gap: 28px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          .settings-card:hover {
            border-color: var(--color-primary);
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
          }
          .card-header {
            display: flex;
            align-items: center;
            gap: 16px;
          }
          .icon-box {
            width: 48px;
            height: 48px;
            border-radius: 14px;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .icon-box.green { background: rgba(16, 185, 129, 0.1); color: #10B981; }
          .icon-box.blue { background: rgba(37, 99, 235, 0.1); color: #2563eb; }
          
          .card-title { margin: 0; fontSize: 1.15rem; fontWeight: 800; color: var(--color-text); }
          .card-subtitle { margin: 4px 0 0; fontSize: 0.85rem; color: var(--color-text-faint); fontWeight: 500; }

          .input-group { display: flex; flex-direction: column; gap: 24px; }
          .field { display: flex; flex-direction: column; gap: 10px; }
          .label-with-tooltip { display: flex; align-items: center; gap: 8px; }
          .label-with-tooltip label { font-size: 0.85rem; fontWeight: 700; color: var(--color-text); }
          .tooltip-trigger { cursor: help; color: var(--color-text-faint); fontSize: 14px; transition: color 0.2s; }
          .tooltip-trigger:hover { color: var(--color-primary); }

          .input-with-affix { position: relative; }
          .premium-input {
            width: 100%;
            background: rgba(255,255,255,0.02);
            border: 1px solid var(--color-border);
            border-radius: 12px;
            padding: 14px 16px;
            color: var(--color-text);
            font-size: 1rem;
            font-weight: 700;
            outline: none;
            transition: all 0.2s;
          }
          .premium-input:focus {
            border-color: var(--color-primary);
            background: #fff;
            color: #000;
            box-shadow: 0 0 0 4px var(--color-primary-dim);
          }
          .affix, .prefix {
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            color: var(--color-text-faint);
            font-weight: 800;
            pointer-events: none;
          }
          .affix { right: 16px; }
          .prefix { left: 16px; }

          .field-desc {
            margin: 0;
            font-size: 0.78rem;
            color: var(--color-text-faint);
            line-height: 1.5;
            font-weight: 500;
          }

          .info-block {
            padding: 18px;
            background: var(--color-bg-hover);
            border-radius: 16px;
            display: flex;
            gap: 14px;
            font-size: 0.82rem;
            line-height: 1.6;
            color: var(--color-text-muted);
            border: 1px solid var(--color-border);
          }
          .info-icon { color: var(--color-primary); flex-shrink: 0; marginTop: 2px; }

          .form-actions {
            display: flex;
            justify-content: flex-end;
            margin-top: 40px;
            padding-top: 32px;
            border-top: 1px solid var(--color-border);
          }

          @media (max-width: 1024px) {
            .admin-content { padding: 20px 16px !important; }
            form > div { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </div>
    </AdminLayout>
  );
}
