'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { AdminManualNumber, ManualNumberCancellationRequest, adminService } from '@/lib/api/admin.service';
import { useAppStore } from '@/store/appStore';
import { formatMoney } from '@/lib/utils';
import {
  RiDatabase2Line,
  RiFlashlightLine,
  RiShieldKeyholeLine,
  RiChatCheckLine,
  RiUploadCloud2Line,
  RiTableLine,
  RiSearchLine,
  RiSave3Line,
  RiInboxArchiveLine,
} from 'react-icons/ri';

function parseBulkRows(input: string, globalCountry: string, globalSellPrice: number, globalCostPrice: number) {
  return input
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(',').map((part) => part.trim());
      const [phone_number = '', otp_code = '', ...rest] = parts;
      return {
        phone_number,
        country_name: globalCountry,
        sell_price: globalSellPrice,
        cost_price: globalCostPrice,
        notes: rest.join(', '),
        otp_code,
      };
    });
}

const emptyPagination = { total: 0, page: 1, limit: 20, pages: 1 };

export default function AdminTelegramNumbersPage() {
  const { addToast, hasHydrated, user } = useAppStore();
  const [items, setItems] = useState<AdminManualNumber[]>([]);
  const [cancellationRequests, setCancellationRequests] = useState<ManualNumberCancellationRequest[]>([]);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(emptyPagination);
  const [requestPagination, setRequestPagination] = useState({ total: 0, page: 1, limit: 10, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [submittingSingle, setSubmittingSingle] = useState(false);
  const [submittingBulk, setSubmittingBulk] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [otpDrafts, setOtpDrafts] = useState<Record<number, string>>({});
  const [savingOtpId, setSavingOtpId] = useState<number | null>(null);
  const [singleForm, setSingleForm] = useState({
    phone_number: '',
    country_name: '',
    sell_price: '',
    cost_price: '',
    notes: '',
    otp_code: '',
  });
  const [bulkText, setBulkText] = useState('');
  const [bulkCountry, setBulkCountry] = useState('');
  const [bulkSellPrice, setBulkSellPrice] = useState('');
  const [bulkCostPrice, setBulkCostPrice] = useState('');

  const canLoad = hasHydrated && user?.role === 'admin';

  const fetchNumbers = useCallback(async (nextPage = page, nextSearch = search, nextStatus = status) => {
    if (!canLoad) return;
    setLoading(true);
    try {
      const res = await adminService.getManualNumbers({ page: nextPage, limit: 20, search: nextSearch, status: nextStatus });
      setItems(Array.isArray(res?.data) ? res.data : []);
      setPagination(res?.pagination || { ...emptyPagination, page: nextPage });
      setPage(nextPage);
    } catch (error: any) {
      setItems([]);
      addToast(error.message || 'Failed to load Telegram inventory', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast, canLoad, page, search, status]);

  const fetchCancellationRequests = useCallback(async () => {
    if (!canLoad) return;
    setRequestsLoading(true);
    try {
      const res = await adminService.getManualNumberCancellationRequests({ page: 1, limit: 10 });
      setCancellationRequests(Array.isArray(res?.data) ? res.data : []);
      setRequestPagination(res?.pagination || { total: 0, page: 1, limit: 10, pages: 1 });
    } catch (error: any) {
      setCancellationRequests([]);
      addToast(error.message || 'Failed to load cancellation requests', 'error');
    } finally {
      setRequestsLoading(false);
    }
  }, [addToast, canLoad]);

  useEffect(() => {
    fetchNumbers(1, search, status);
    fetchCancellationRequests();
  }, [fetchCancellationRequests, fetchNumbers, search, status]);

  const stats = useMemo(() => {
    const safeItems = Array.isArray(items) ? items : [];
    const available = safeItems.filter((item) => item.status === 'available').length;
    const sold = safeItems.filter((item) => item.status === 'sold').length;
    const withOtp = safeItems.filter((item) => item.has_otp).length;
    return { available, sold, withOtp };
  }, [items]);

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingSingle(true);
    try {
      await adminService.createManualNumber({
        phone_number: singleForm.phone_number,
        country_name: singleForm.country_name,
        sell_price: Number(singleForm.sell_price),
        cost_price: Number(singleForm.cost_price || 0),
        notes: singleForm.notes,
        otp_code: singleForm.otp_code,
      });
      addToast('Telegram number uploaded', 'success');
      setSingleForm({ phone_number: '', country_name: '', sell_price: '', cost_price: '', notes: '', otp_code: '' });
      fetchNumbers(1, search, status);
    } catch (error: any) {
      addToast(error.message || 'Single upload failed', 'error');
    } finally {
      setSubmittingSingle(false);
    }
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rows = parseBulkRows(bulkText, bulkCountry, Number(bulkSellPrice) || 0, Number(bulkCostPrice) || 0);
    if (rows.length === 0) {
      addToast('Add at least one CSV row first', 'error');
      return;
    }

    setSubmittingBulk(true);
    try {
      const res = await adminService.bulkCreateManualNumbers(rows);
      addToast(`${res.data.created} Telegram number(s) uploaded`, 'success');
      if (res.data.failed > 0) {
        addToast(`${res.data.failed} row(s) failed during bulk upload`, 'info');
      }
      setBulkText('');
      fetchNumbers(1, search, status);
    } catch (error: any) {
      addToast(error.message || 'Bulk upload failed', 'error');
    } finally {
      setSubmittingBulk(false);
    }
  };

  const handleSaveOtp = async (numberId: number) => {
    setSavingOtpId(numberId);
    try {
      await adminService.updateManualNumberOtp(numberId, otpDrafts[numberId] || '');
      addToast('OTP saved securely', 'success');
      fetchNumbers(page, search, status);
    } catch (error: any) {
      addToast(error.message || 'Failed to save OTP', 'error');
    } finally {
      setSavingOtpId(null);
    }
  };

  return (
    <AdminLayout>
      <div className="admin-content" style={{ padding: '32px' }}>
        <section className="hero-card">
          <div>
            <div className="eyebrow">Telegram Operations</div>
            <h1>Inventory Control Center</h1>
            <p>
              Curate sellable Telegram numbers, attach OTP codes securely, and stay on top of buyer cancellation requests
              from one control surface.
            </p>
          </div>
          <div className="hero-grid">
            <div className="mini-kpi">
              <RiDatabase2Line size={18} />
              <span>{pagination.total} total rows</span>
            </div>
            <div className="mini-kpi">
              <RiFlashlightLine size={18} />
              <span>{stats.available} ready to sell</span>
            </div>
            <div className="mini-kpi">
              <RiShieldKeyholeLine size={18} />
              <span>{stats.withOtp} with OTP saved</span>
            </div>
          </div>
        </section>

        <section className="stats-grid">
          <article className="stat-card deluxe">
            <div className="stat-icon blue"><RiInboxArchiveLine size={22} /></div>
            <div className="stat-label">Loaded Rows</div>
            <div className="stat-value">{pagination.total}</div>
            <div className="stat-foot">All Telegram inventory records currently indexed.</div>
          </article>

          <article className="stat-card deluxe">
            <div className="stat-icon green"><RiFlashlightLine size={22} /></div>
            <div className="stat-label">Available Now</div>
            <div className="stat-value">{stats.available}</div>
            <div className="stat-foot">Numbers customers can purchase immediately.</div>
          </article>

          <article className="stat-card deluxe">
            <div className="stat-icon amber"><RiShieldKeyholeLine size={22} /></div>
            <div className="stat-label">OTP Coverage</div>
            <div className="stat-value">{stats.withOtp}</div>
            <div className="stat-foot">Inventory lines already carrying an encrypted OTP.</div>
          </article>

          <article className="stat-card deluxe">
            <div className="stat-icon rose"><RiChatCheckLine size={22} /></div>
            <div className="stat-label">Cancellation Queue</div>
            <div className="stat-value">{requestPagination.total}</div>
            <div className="stat-foot">Buyer requests waiting for admin review.</div>
          </article>
        </section>

        <section className="workspace-grid">
          <article className="workspace-card">
            <div className="panel-head">
              <div>
                <div className="panel-kicker">Upload Flow</div>
                <h2>Single Upload</h2>
              </div>
              <div className="panel-badge"><RiUploadCloud2Line size={16} /> Instant</div>
            </div>

            <form onSubmit={handleSingleSubmit} className="stack">
              <input value={singleForm.phone_number} onChange={(e) => setSingleForm((s) => ({ ...s, phone_number: e.target.value }))} placeholder="Phone number" className="form-input" />
              <input value={singleForm.country_name} onChange={(e) => setSingleForm((s) => ({ ...s, country_name: e.target.value }))} placeholder="Country name" className="form-input" />

              <div className="split">
                <input value={singleForm.sell_price} onChange={(e) => setSingleForm((s) => ({ ...s, sell_price: e.target.value }))} placeholder="Sell price" type="number" min="0" step="0.01" className="form-input" />
                <input value={singleForm.cost_price} onChange={(e) => setSingleForm((s) => ({ ...s, cost_price: e.target.value }))} placeholder="Cost price" type="number" min="0" step="0.01" className="form-input" />
              </div>

              <input value={singleForm.otp_code} onChange={(e) => setSingleForm((s) => ({ ...s, otp_code: e.target.value }))} placeholder="OTP code (optional)" className="form-input" />
              <textarea value={singleForm.notes} onChange={(e) => setSingleForm((s) => ({ ...s, notes: e.target.value }))} placeholder="Notes / quality marker" className="form-input form-textarea" rows={4} />

              <button className="btn-primary panel-btn" type="submit" disabled={submittingSingle}>
                <RiSave3Line size={16} />
                {submittingSingle ? 'Uploading...' : 'Upload Telegram Number'}
              </button>
            </form>
          </article>

          <article className="workspace-card">
            <div className="panel-head">
              <div>
                <div className="panel-kicker">Batch Intake</div>
                <h2>Bulk Upload</h2>
              </div>
              <div className="panel-badge"><RiTableLine size={16} /> CSV Rows</div>
            </div>

            <div className="bulk-hint">
              Format each line as `phone_number,otp_code`
            </div>

            <form onSubmit={handleBulkSubmit} className="stack">
              <input 
                value={bulkCountry} 
                onChange={(e) => setBulkCountry(e.target.value)} 
                placeholder="Bulk Country (e.g. Nigeria)" 
                className="form-input" 
              />
              <div className="split">
                <input 
                  value={bulkSellPrice} 
                  onChange={(e) => setBulkSellPrice(e.target.value)} 
                  placeholder="Bulk Sell Price" 
                  type="number" 
                  className="form-input" 
                />
                <input 
                  value={bulkCostPrice} 
                  onChange={(e) => setBulkCostPrice(e.target.value)} 
                  placeholder="Bulk Cost Price" 
                  type="number" 
                  className="form-input" 
                />
              </div>

              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={'+2348012345678,553311\n+12025550123,771100'}
                className="form-input form-textarea bulk-area"
                rows={8}
              />

              <button className="btn-primary panel-btn" type="submit" disabled={submittingBulk}>
                <RiUploadCloud2Line size={16} />
                {submittingBulk ? 'Uploading...' : 'Upload Bulk Rows'}
              </button>
            </form>
          </article>
        </section>

        <section className="workspace-card inventory-card">
          <div className="inventory-topbar">
            <div>
              <div className="panel-kicker">Live Inventory</div>
              <h2>Telegram Numbers</h2>
            </div>

            <form
              className="toolbar"
              onSubmit={(e) => {
                e.preventDefault();
                fetchNumbers(1, search, status);
              }}
            >
              <div className="search-shell">
                <RiSearchLine size={16} />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by number or country" className="toolbar-input" />
              </div>

              <select value={status} onChange={(e) => setStatus(e.target.value)} className="toolbar-input toolbar-select">
                <option value="">All statuses</option>
                <option value="available">Available</option>
                <option value="sold">Sold</option>
                <option value="cancelled">Cancelled</option>
              </select>

              <button className="btn-secondary" onClick={() => fetchNumbers(1, search, status)} type="button">Apply</button>
            </form>
          </div>

          <div className="table-shell">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>Number</th>
                  <th>Country</th>
                  <th>Price</th>
                  <th>OTP Vault</th>
                  <th>Status</th>
                  <th>Uploaded By</th>
                  <th>Buyer</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="empty-row">Loading inventory...</td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan={7} className="empty-row">No Telegram numbers found.</td></tr>
                ) : items.map((item) => (
                  <tr key={item.id}>
                    <td className="number-cell">
                      <strong>{item.phone_number}</strong>
                      <span>{item.notes || 'No extra note'}</span>
                    </td>
                    <td>{item.country_name}</td>
                    <td>{formatMoney(item.sell_price)}</td>
                    <td>
                      <div className="otp-stack">
                        <input
                          value={otpDrafts[item.id] ?? ''}
                          onChange={(e) => setOtpDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))}
                          placeholder={item.has_otp ? 'OTP stored securely' : 'Add OTP'}
                          className="otp-input"
                        />
                        <button className="btn-secondary otp-btn" type="button" onClick={() => handleSaveOtp(item.id)} disabled={savingOtpId === item.id}>
                          {savingOtpId === item.id ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </td>
                    <td><span className={`status-pill ${item.status}`}>{item.status}</span></td>
                    <td>{item.uploaded_by_username}</td>
                    <td>{item.sold_to_username || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="pager">
            <span>Page {pagination.page} of {pagination.pages || 1}</span>
            <div className="pager-actions">
              <button className="btn-secondary" type="button" onClick={() => fetchNumbers(Math.max(1, page - 1), search, status)} disabled={page <= 1}>Previous</button>
              <button className="btn-secondary" type="button" onClick={() => fetchNumbers(Math.min(pagination.pages || 1, page + 1), search, status)} disabled={page >= (pagination.pages || 1)}>Next</button>
            </div>
          </div>
        </section>

        <section className="workspace-card requests-card">
          <div className="panel-head">
            <div>
              <div className="panel-kicker">Support Queue</div>
              <h2>Cancellation Requests</h2>
            </div>
            <div className="panel-badge soft">{requestPagination.total} open signals</div>
          </div>

          <div className="request-list">
            {requestsLoading ? (
              <div className="request-empty">Loading cancellation requests...</div>
            ) : cancellationRequests.length === 0 ? (
              <div className="request-empty">No cancellation requests yet.</div>
            ) : cancellationRequests.map((request) => (
              <article key={request.id} className="request-card">
                <div className="request-top">
                  <div>
                    <div className="request-user">@{request.username}</div>
                    <div className="request-number">{request.phone_number} · {request.country_name}</div>
                  </div>
                  <span className={`status-pill ${request.status}`}>{request.status}</span>
                </div>
                <p>{request.reason}</p>
              </article>
            ))}
          </div>
        </section>

        <style jsx>{`
          .hero-card {
            display: grid;
            grid-template-columns: 1.4fr 1fr;
            gap: 24px;
            padding: 28px 30px;
            margin-bottom: 24px;
            border-radius: 24px;
            background:
              radial-gradient(circle at top right, rgba(37, 99, 235, 0.18), transparent 30%),
              linear-gradient(135deg, #ffffff 0%, #f4f8ff 100%);
            border: 1px solid rgba(37, 99, 235, 0.14);
            box-shadow: 0 20px 50px rgba(15, 23, 42, 0.06);
          }
          .eyebrow, .panel-kicker {
            font-size: 0.72rem;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            font-weight: 800;
            color: var(--color-primary);
          }
          .hero-card h1, .workspace-card h2 {
            margin: 8px 0 10px;
            font-size: 1.8rem;
            font-weight: 800;
            color: var(--color-text);
          }
          .hero-card p {
            margin: 0;
            max-width: 680px;
            line-height: 1.7;
            color: var(--color-text-faint);
            font-weight: 500;
          }
          .hero-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 12px;
            align-content: center;
          }
          .mini-kpi {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 14px 16px;
            border-radius: 16px;
            background: rgba(255,255,255,0.78);
            border: 1px solid rgba(15, 23, 42, 0.06);
            color: var(--color-text);
            font-weight: 700;
          }
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 18px;
            margin-bottom: 24px;
          }
          .deluxe {
            border: 1px solid var(--color-border);
            background: #ffffff;
            box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
          }
          .stat-icon {
            width: 46px;
            height: 46px;
            border-radius: 14px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 14px;
          }
          .stat-icon.blue { background: rgba(37, 99, 235, 0.1); color: #2563eb; }
          .stat-icon.green { background: rgba(16, 185, 129, 0.12); color: #10b981; }
          .stat-icon.amber { background: rgba(245, 158, 11, 0.12); color: #f59e0b; }
          .stat-icon.rose { background: rgba(244, 63, 94, 0.12); color: #f43f5e; }
          .stat-label {
            font-size: 0.78rem;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: var(--color-text-faint);
            font-weight: 800;
          }
          .stat-value {
            font-size: 2rem;
            font-weight: 800;
            margin: 8px 0 6px;
          }
          .stat-foot {
            font-size: 0.8rem;
            color: var(--color-text-faint);
            line-height: 1.5;
          }
          .workspace-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
            gap: 20px;
            margin-bottom: 24px;
          }
          .workspace-card {
            background: #ffffff;
            border: 1px solid var(--color-border);
            border-radius: 24px;
            padding: 24px;
            box-shadow: 0 10px 30px rgba(15, 23, 42, 0.04);
          }
          .panel-head {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 16px;
            margin-bottom: 18px;
          }
          .panel-head h2 {
            margin: 6px 0 0;
            font-size: 1.25rem;
          }
          .panel-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            padding: 10px 12px;
            border-radius: 14px;
            background: var(--color-primary-dim);
            color: var(--color-primary);
            font-size: 0.78rem;
            font-weight: 800;
          }
          .panel-badge.soft {
            background: rgba(15, 23, 42, 0.05);
            color: var(--color-text);
          }
          .stack {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          .split {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }
          .form-input, .toolbar-input, .otp-input {
            width: 100%;
            border: 1px solid var(--color-border);
            background: #fff;
            color: var(--color-text);
            border-radius: 14px;
            padding: 13px 14px;
            outline: none;
            font-weight: 600;
          }
          .form-input:focus, .toolbar-input:focus, .otp-input:focus {
            border-color: var(--color-primary);
            box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.08);
          }
          .form-textarea {
            resize: vertical;
          }
          .bulk-hint {
            margin-bottom: 12px;
            color: var(--color-text-faint);
            font-size: 0.82rem;
            line-height: 1.5;
          }
          .bulk-area {
            min-height: 240px;
            font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
            font-size: 0.85rem;
          }
          .panel-btn {
            width: 100%;
            justify-content: center;
            gap: 8px;
            padding: 14px 18px;
            border-radius: 14px;
            font-weight: 800;
            box-shadow: 0 12px 24px rgba(37, 99, 235, 0.14);
          }
          .inventory-card {
            margin-bottom: 24px;
            padding: 0;
            overflow: hidden;
          }
          .inventory-topbar {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            gap: 16px;
            flex-wrap: wrap;
            padding: 24px 24px 16px;
          }
          .toolbar {
            display: flex;
            gap: 10px;
            align-items: center;
            flex-wrap: wrap;
          }
          .search-shell {
            position: relative;
            display: flex;
            align-items: center;
          }
          .search-shell :global(svg) {
            position: absolute;
            left: 12px;
            color: var(--color-text-faint);
          }
          .search-shell input {
            padding-left: 38px;
          }
          .toolbar-select {
            min-width: 170px;
          }
          .table-shell {
            overflow-x: auto;
          }
          .inventory-table {
            width: 100%;
            min-width: 980px;
            border-collapse: collapse;
          }
          .inventory-table th {
            text-align: left;
            padding: 16px 20px;
            background: var(--color-bg-hover);
            color: var(--color-text-faint);
            font-size: 0.73rem;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            font-weight: 800;
          }
          .inventory-table td {
            padding: 18px 20px;
            border-top: 1px solid var(--color-border);
            vertical-align: top;
            font-size: 0.92rem;
          }
          .number-cell {
            display: flex;
            flex-direction: column;
            gap: 6px;
          }
          .number-cell span {
            color: var(--color-text-faint);
            font-size: 0.82rem;
          }
          .otp-stack {
            display: flex;
            gap: 8px;
            align-items: center;
          }
          .otp-btn {
            white-space: nowrap;
            border-radius: 12px;
            border: 1px solid rgba(37, 99, 235, 0.18);
            background: linear-gradient(135deg, #eef5ff 0%, #f8fbff 100%);
            color: #2563eb;
            font-weight: 800;
          }
          .status-pill {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            padding: 6px 12px;
            border-radius: 999px;
            font-size: 0.72rem;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.08em;
          }
          .status-pill.available, .status-pill.resolved {
            background: rgba(16, 185, 129, 0.12);
            color: #10b981;
          }
          .status-pill.sold, .status-pill.reviewed {
            background: rgba(37, 99, 235, 0.12);
            color: #2563eb;
          }
          .status-pill.cancelled, .status-pill.pending {
            background: rgba(244, 63, 94, 0.12);
            color: #f43f5e;
          }
          .empty-row, .request-empty {
            text-align: center;
            padding: 28px 20px;
            color: var(--color-text-faint);
          }
          .pager {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
            padding: 18px 24px 24px;
            color: var(--color-text-faint);
            font-size: 0.85rem;
            font-weight: 600;
          }
          .pager-actions {
            display: flex;
            gap: 8px;
          }
          .request-list {
            display: grid;
            gap: 14px;
          }
          .request-card {
            border: 1px solid var(--color-border);
            background: linear-gradient(180deg, #fff, #fbfdff);
            border-radius: 18px;
            padding: 18px;
          }
          .request-top {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 14px;
            margin-bottom: 10px;
          }
          .request-user {
            font-size: 0.85rem;
            font-weight: 800;
            color: var(--color-text);
          }
          .request-number {
            margin-top: 4px;
            color: var(--color-text-faint);
            font-size: 0.84rem;
          }
          .request-card p {
            margin: 0;
            line-height: 1.6;
            color: var(--color-text);
          }
          @media (max-width: 1024px) {
            .hero-card {
              grid-template-columns: 1fr;
            }
          }
          @media (max-width: 720px) {
            .admin-content {
              padding: 20px 16px !important;
            }
            .workspace-grid, .split {
              grid-template-columns: 1fr;
            }
            .inventory-topbar, .pager {
              padding-left: 16px;
              padding-right: 16px;
            }
          }
        `}</style>
      </div>
    </AdminLayout>
  );
}
