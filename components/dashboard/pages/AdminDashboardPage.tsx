'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import DashboardLayout from '@/components/dashboard/DashboardLayout';
import Topbar from '@/components/dashboard/Topbar';
import { useAppStore } from '@/store/appStore';
import {
  adminService,
  type UploadUsaNumberPayload,
  type UsaNumberEntry,
} from '@/lib/api/admin.service';
import { getDashboardBasePath, getDashboardPath } from '@/lib/dashboard-paths';
import {
  RiAdminLine,
  RiBankLine,
  RiFileList3Line,
  RiInboxArchiveLine,
  RiLinksLine,
  RiArrowRightUpLine,
  RiUploadCloud2Line,
} from 'react-icons/ri';

function parseBulkEntries(raw: string): UploadUsaNumberPayload[] {
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/\s*[|,]\s*/);
      const phoneNumber = parts[0]?.trim() ?? '';
      const receiveCodeLink = parts.slice(1).join(',').trim();

      return { phoneNumber, receiveCodeLink };
    })
    .filter((entry) => entry.phoneNumber || entry.receiveCodeLink);
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { user, addToast } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [submittingSingle, setSubmittingSingle] = useState(false);
  const [submittingBulk, setSubmittingBulk] = useState(false);
  const [numbers, setNumbers] = useState<UsaNumberEntry[]>([]);
  const [singleForm, setSingleForm] = useState({
    phoneNumber: '',
    receiveCodeLink: '',
  });
  const [bulkText, setBulkText] = useState('');
  const [lastUploadSummary, setLastUploadSummary] = useState<{
    created: number;
    skipped: number;
    errors: string[];
  } | null>(null);

  const userDashboardPath = getDashboardBasePath('user');
  const adminDashboardPath = getDashboardBasePath(user?.role);
  const previewBulkCount = useMemo(() => parseBulkEntries(bulkText).length, [bulkText]);

  const loadNumbers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminService.getUsaNumbers();
      setNumbers(res.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load USA numbers.';
      addToast(message, 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (!user) return;
    if (user.role !== 'admin') {
      router.replace(userDashboardPath);
      return;
    }

    loadNumbers();
  }, [loadNumbers, router, user, userDashboardPath]);

  const handleSingleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingSingle(true);
    setLastUploadSummary(null);

    try {
      const res = await adminService.uploadUsaNumbers(singleForm);
      addToast(res.message, 'success');
      setSingleForm({ phoneNumber: '', receiveCodeLink: '' });
      setLastUploadSummary({
        created: res.data?.created.length ?? 0,
        skipped: res.data?.skipped.length ?? 0,
        errors: res.data?.errors ?? [],
      });
      await loadNumbers();
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Single upload failed.', 'error');
    } finally {
      setSubmittingSingle(false);
    }
  };

  const handleBulkUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const entries = parseBulkEntries(bulkText);

    if (!entries.length) {
      addToast('Paste at least one number and receive-code link.', 'info');
      return;
    }

    setSubmittingBulk(true);
    setLastUploadSummary(null);

    try {
      const res = await adminService.uploadUsaNumbers(entries);
      addToast(res.message, 'success');
      setBulkText('');
      setLastUploadSummary({
        created: res.data?.created.length ?? 0,
        skipped: res.data?.skipped.length ?? 0,
        errors: res.data?.errors ?? [],
      });
      await loadNumbers();
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Bulk upload failed.', 'error');
    } finally {
      setSubmittingBulk(false);
    }
  };

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <DashboardLayout>
      <Topbar title="Admin Dashboard" />

      <main style={{ padding: '20px 16px', maxWidth: 1240 }}>
        <div className="breadcrumb">
          <Link href={adminDashboardPath}>Dashboard</Link>
          <span>/</span>
          <span>Admin</span>
        </div>

        <section
          className="stat-card"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 16,
            marginBottom: 18,
            flexWrap: 'wrap',
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
              Upload USA numbers and receive-code links
            </h1>
            <p style={{ color: 'var(--color-text-faint)', maxWidth: 700, lineHeight: 1.6 }}>
              Admins can add one USA number at a time or upload many in bulk. These entries stay on the
              admin side only for now.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(150px, 1fr))',
              gap: 12,
              width: 'min(100%, 360px)',
            }}
          >
            <div className="stat-card" style={{ padding: '14px 16px' }}>
              <div style={{ color: 'var(--color-text-faint)', fontSize: '0.76rem', marginBottom: 6 }}>
                Uploaded Numbers
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 800 }}>
                {numbers.length}
              </div>
            </div>
            <div className="stat-card" style={{ padding: '14px 16px' }}>
              <div style={{ color: 'var(--color-text-faint)', fontSize: '0.76rem', marginBottom: 6 }}>
                Bulk Preview
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', fontWeight: 800 }}>
                {previewBulkCount}
              </div>
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
          className="admin-grid"
        >
          <Link
            href={getDashboardPath('admin', 'funding')}
            style={{
              textDecoration: 'none',
              color: 'inherit',
            }}
          >
            <div className="stat-card" style={{ height: '100%' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 12,
                      background: 'rgba(16,185,129,0.12)',
                      color: '#10B981',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <RiBankLine size={19} />
                  </div>
                  <div>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', marginBottom: 4 }}>
                      Funding controls
                    </h2>
                    <p style={{ color: 'var(--color-text-faint)', fontSize: '0.82rem' }}>
                      Manage provider balance checks, pricing settings, and wallet adjustments.
                    </p>
                  </div>
                </div>
                <RiArrowRightUpLine size={18} color="var(--color-primary)" />
              </div>
            </div>
          </Link>

          <div className="stat-card">
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', marginBottom: 6 }}>
              Inventory workflow
            </h2>
            <p style={{ color: 'var(--color-text-faint)', fontSize: '0.82rem', lineHeight: 1.6 }}>
              Upload new USA numbers here after you confirm funding settings on the dedicated funding page.
            </p>
          </div>
        </section>

        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 16,
            marginBottom: 18,
          }}
          className="admin-grid"
        >
          <form className="stat-card" onSubmit={handleSingleUpload}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: 'rgba(14,165,233,0.12)',
                  color: '#0EA5E9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <RiLinksLine size={18} />
              </div>
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', marginBottom: 4 }}>
                  Single entry
                </h2>
                <p style={{ color: 'var(--color-text-faint)', fontSize: '0.82rem' }}>
                  Add one phone number and one receive-code link.
                </p>
              </div>
            </div>

            <div style={{ display: 'grid', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 8 }}>
                  Phone Number
                </label>
                <input
                  className="input-field"
                  placeholder="+1 202 555 0101"
                  value={singleForm.phoneNumber}
                  onChange={(e) => setSingleForm((prev) => ({ ...prev, phoneNumber: e.target.value }))}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 8 }}>
                  Receive Code Link
                </label>
                <input
                  className="input-field"
                  placeholder="https://..."
                  value={singleForm.receiveCodeLink}
                  onChange={(e) => setSingleForm((prev) => ({ ...prev, receiveCodeLink: e.target.value }))}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={submittingSingle}
              style={{ marginTop: 18, width: '100%', justifyContent: 'center' }}
            >
              <RiUploadCloud2Line size={17} />
              {submittingSingle ? 'Uploading...' : 'Upload Single Entry'}
            </button>
          </form>

          <form className="stat-card" onSubmit={handleBulkUpload}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: 'rgba(16,185,129,0.12)',
                  color: '#10B981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <RiFileList3Line size={18} />
              </div>
              <div>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', marginBottom: 4 }}>
                  Bulk upload
                </h2>
                <p style={{ color: 'var(--color-text-faint)', fontSize: '0.82rem' }}>
                  Paste one entry per line: `number | link` or `number, link`.
                </p>
              </div>
            </div>

            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: 8 }}>
              Bulk Entries
            </label>
            <textarea
              className="input-field"
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={['+12025550101 | https://receive-code-link-1', '+12025550102 | https://receive-code-link-2'].join('\n')}
              style={{ minHeight: 210, resize: 'vertical', lineHeight: 1.6 }}
            />

            <button
              type="submit"
              className="btn-primary"
              disabled={submittingBulk}
              style={{ marginTop: 18, width: '100%', justifyContent: 'center' }}
            >
              <RiInboxArchiveLine size={17} />
              {submittingBulk ? 'Uploading...' : `Upload ${previewBulkCount || ''} Bulk Entries`.trim()}
            </button>
          </form>
        </section>

        {lastUploadSummary && (
          <section className="stat-card" style={{ marginBottom: 18 }}>
            <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', marginBottom: 12 }}>
              Last Upload Summary
            </h3>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ padding: '10px 12px', borderRadius: 12, background: 'rgba(16,185,129,0.12)', color: '#10B981', fontWeight: 700 }}>
                Created: {lastUploadSummary.created}
              </div>
              <div style={{ padding: '10px 12px', borderRadius: 12, background: 'rgba(245,158,11,0.12)', color: '#F59E0B', fontWeight: 700 }}>
                Skipped: {lastUploadSummary.skipped}
              </div>
              <div style={{ padding: '10px 12px', borderRadius: 12, background: 'rgba(239,68,68,0.12)', color: '#EF4444', fontWeight: 700 }}>
                Errors: {lastUploadSummary.errors.length}
              </div>
            </div>
            {lastUploadSummary.errors.length > 0 && (
              <div style={{ marginTop: 14, display: 'grid', gap: 8 }}>
                {lastUploadSummary.errors.map((error) => (
                  <div key={error} style={{ fontSize: '0.84rem', color: '#FCA5A5' }}>
                    {error}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        <section className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', marginBottom: 4 }}>
                Uploaded USA numbers
              </h3>
              <p style={{ color: 'var(--color-text-faint)', fontSize: '0.82rem' }}>
                Current inventory available in the admin panel.
              </p>
            </div>
            <Link href={getDashboardPath(user?.role, '')} className="btn-ghost" style={{ textDecoration: 'none' }}>
              Back to dashboard
            </Link>
          </div>

          {loading ? (
            <p style={{ color: 'var(--color-text-faint)' }}>Loading numbers...</p>
          ) : numbers.length === 0 ? (
            <p style={{ color: 'var(--color-text-faint)' }}>No USA numbers uploaded yet.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>
                    <th style={{ padding: '12px 10px' }}>Phone Number</th>
                    <th style={{ padding: '12px 10px' }}>Receive Code Link</th>
                  </tr>
                </thead>
                <tbody>
                  {numbers.map((entry) => (
                    <tr key={entry.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '12px 10px', fontWeight: 700 }}>{entry.phone_number}</td>
                      <td style={{ padding: '12px 10px' }}>
                        <a href={entry.receive_code_link} target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary)' }}>
                          {entry.receive_code_link}
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <style>{`
          @media (max-width: 900px) {
            .admin-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </main>
    </DashboardLayout>
  );
}
