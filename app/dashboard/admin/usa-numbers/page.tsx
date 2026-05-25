'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { AdminUsaNumber, adminService } from '@/lib/api/admin.service';
import { formatMoney } from '@/lib/utils';
import { useAppStore } from '@/store/appStore';
import {
  RiDeleteBinLine,
  RiFlashlightLine,
  RiLinkM,
  RiPriceTag3Line,
  RiSave3Line,
  RiSearchLine,
  RiTableLine,
  RiUploadCloud2Line,
} from 'react-icons/ri';

type UsaDraft = {
  phone_number: string;
  service_name: string;
  category: string;
  redirect_url: string;
  sell_price: string;
  cost_price: string;
  notes: string;
};

function parseBulkRows(input: string) {
  return input
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(',').map((part) => part.trim());
      const [
        phone_number = '',
        service_name = 'USA Number',
        category = 'WhatsApp',
        sell_price = '',
        cost_price = '',
        redirect_url = '',
        ...rest
      ] = parts;

      return {
        phone_number,
        service_name,
        category,
        sell_price: Number(sell_price),
        cost_price: Number(cost_price || 0),
        redirect_url,
        notes: rest.join(', '),
      };
    });
}

const emptyPagination = { total: 0, page: 1, limit: 20, pages: 1 };

export default function AdminUsaNumbersPage() {
  const { addToast, hasHydrated, user } = useAppStore();
  const [items, setItems] = useState<AdminUsaNumber[]>([]);
  const [drafts, setDrafts] = useState<Record<number, UsaDraft>>({});
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(emptyPagination);
  const [loading, setLoading] = useState(true);
  const [submittingSingle, setSubmittingSingle] = useState(false);
  const [submittingBulk, setSubmittingBulk] = useState(false);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [singleForm, setSingleForm] = useState<UsaDraft>({
    phone_number: '',
    service_name: 'USA Number',
    category: 'WhatsApp',
    redirect_url: '',
    sell_price: '',
    cost_price: '',
    notes: '',
  });
  const [bulkText, setBulkText] = useState('');

  const canLoad = hasHydrated && user?.role === 'admin';

  const fetchNumbers = useCallback(async (nextPage = page, nextSearch = search, nextStatus = status) => {
    if (!canLoad) return;
    setLoading(true);
    try {
      const res = await adminService.getUsaNumbers({ page: nextPage, limit: 20, search: nextSearch, status: nextStatus });
      const nextItems = Array.isArray(res?.data) ? res.data : [];
      setItems(nextItems);
      setPagination(res?.pagination || { ...emptyPagination, page: nextPage });
      setPage(nextPage);
      setDrafts((prev) => {
        const nextDrafts = { ...prev };
        for (const item of nextItems) {
          nextDrafts[item.id] = {
            phone_number: item.phone_number || '',
            service_name: item.service_name || 'USA Number',
            category: item.category || 'WhatsApp',
            redirect_url: item.redirect_url || '',
            sell_price: String(item.sell_price ?? ''),
            cost_price: String(item.cost_price ?? ''),
            notes: item.notes || '',
          };
        }
        return nextDrafts;
      });
    } catch (error: any) {
      setItems([]);
      addToast(error.message || 'Failed to load USA inventory', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast, canLoad, page, search, status]);

  useEffect(() => {
    fetchNumbers(1, search, status);
  }, [fetchNumbers, search, status]);

  const stats = useMemo(() => {
    const available = items.filter((item) => item.status === 'available').length;
    const sold = items.filter((item) => item.status === 'sold').length;
    const linked = items.filter((item) => item.has_redirect).length;
    return { available, sold, linked };
  }, [items]);

  const updateDraft = (numberId: number, key: keyof UsaDraft, value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [numberId]: {
        phone_number: prev[numberId]?.phone_number || '',
        service_name: prev[numberId]?.service_name || 'USA Number',
        category: prev[numberId]?.category || 'WhatsApp',
        redirect_url: prev[numberId]?.redirect_url || '',
        sell_price: prev[numberId]?.sell_price || '',
        cost_price: prev[numberId]?.cost_price || '',
        notes: prev[numberId]?.notes || '',
        [key]: value,
      },
    }));
  };

  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingSingle(true);
    try {
      await adminService.createUsaNumber({
        phone_number: singleForm.phone_number,
        service_name: singleForm.service_name,
        category: singleForm.category,
        redirect_url: singleForm.redirect_url,
        sell_price: Number(singleForm.sell_price),
        cost_price: Number(singleForm.cost_price || 0),
        notes: singleForm.notes,
      });
      addToast('USA number uploaded', 'success');
      setSingleForm({
        phone_number: '',
        service_name: 'USA Number',
        category: 'WhatsApp',
        redirect_url: '',
        sell_price: '',
        cost_price: '',
        notes: '',
      });
      fetchNumbers(1, search, status);
    } catch (error: any) {
      addToast(error.message || 'Single upload failed', 'error');
    } finally {
      setSubmittingSingle(false);
    }
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rows = parseBulkRows(bulkText);
    if (rows.length === 0) {
      addToast('Add at least one CSV row first', 'error');
      return;
    }

    setSubmittingBulk(true);
    try {
      const res = await adminService.bulkCreateUsaNumbers(rows);
      addToast(`${res.data.created} USA number(s) uploaded`, 'success');
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

  const handleSave = async (numberId: number) => {
    const draft = drafts[numberId];
    if (!draft) return;

    setSavingId(numberId);
    try {
      await adminService.updateUsaNumber({
        numberId,
        phone_number: draft.phone_number,
        service_name: draft.service_name,
        category: draft.category,
        redirect_url: draft.redirect_url,
        sell_price: Number(draft.sell_price),
        cost_price: Number(draft.cost_price || 0),
        notes: draft.notes,
      });
      addToast('USA number updated', 'success');
      fetchNumbers(page, search, status);
    } catch (error: any) {
      addToast(error.message || 'Failed to update USA number', 'error');
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (numberId: number) => {
    setDeletingId(numberId);
    try {
      await adminService.deleteUsaNumber(numberId);
      addToast('USA number deleted', 'success');
      fetchNumbers(page, search, status);
    } catch (error: any) {
      addToast(error.message || 'Failed to delete USA number', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AdminLayout>
      <div className="admin-content" style={{ padding: '32px' }}>
        <section className="hero-card">
          <div className="hero-copy">
            <div className="eyebrow">USA Number Operations</div>
            <div className="headline-row">
              <h1>USA Number Manager</h1>
              <span className="hero-pill">Inventory Control</span>
            </div>
            <p>
              Upload USA numbers one by one or in bulk, assign name and category, attach the OTP redirect link,
              and adjust pricing whenever stock changes.
            </p>
            <div className="hero-notes">
              <span>Structured uploads</span>
              <span>Editable pricing</span>
              <span>OTP redirect tracking</span>
            </div>
          </div>
          <div className="hero-grid">
            <div className="mini-kpi"><RiPriceTag3Line size={18} /><span>{pagination.total} total rows</span></div>
            <div className="mini-kpi"><RiFlashlightLine size={18} /><span>{stats.available} ready to sell</span></div>
            <div className="mini-kpi"><RiLinkM size={18} /><span>{stats.linked} with OTP links</span></div>
          </div>
        </section>

        <section className="stats-grid">
          <article className="stat-card">
            <div className="stat-label">Available</div>
            <div className="stat-value">{stats.available}</div>
          </article>
          <article className="stat-card">
            <div className="stat-label">Sold</div>
            <div className="stat-value">{stats.sold}</div>
          </article>
          <article className="stat-card">
            <div className="stat-label">Average Price</div>
            <div className="stat-value">{formatMoney(items.length ? items.reduce((sum, item) => sum + Number(item.sell_price || 0), 0) / items.length : 0)}</div>
          </article>
        </section>

        <section className="workspace-grid">
          <article className="workspace-card">
            <div className="panel-head">
              <div>
                <div className="panel-kicker">Single Upload</div>
                <h2>Add one USA number</h2>
              </div>
              <div className="panel-badge"><RiUploadCloud2Line size={16} /> Instant</div>
            </div>

            <form onSubmit={handleSingleSubmit} className="stack">
              <input value={singleForm.phone_number} onChange={(e) => setSingleForm((s) => ({ ...s, phone_number: e.target.value }))} placeholder="Phone number" className="form-input" />
              <div className="split">
                <input value={singleForm.service_name} onChange={(e) => setSingleForm((s) => ({ ...s, service_name: e.target.value }))} placeholder="Name" className="form-input" />
                <input value={singleForm.category} onChange={(e) => setSingleForm((s) => ({ ...s, category: e.target.value }))} placeholder="Category" className="form-input" />
              </div>
              <input value={singleForm.redirect_url} onChange={(e) => setSingleForm((s) => ({ ...s, redirect_url: e.target.value }))} placeholder="Redirect URL for OTP query" className="form-input" />
              <div className="split">
                <input value={singleForm.sell_price} onChange={(e) => setSingleForm((s) => ({ ...s, sell_price: e.target.value }))} placeholder="Sell price" type="number" min="0" step="0.01" className="form-input" />
                <input value={singleForm.cost_price} onChange={(e) => setSingleForm((s) => ({ ...s, cost_price: e.target.value }))} placeholder="Cost price" type="number" min="0" step="0.01" className="form-input" />
              </div>
              <textarea value={singleForm.notes} onChange={(e) => setSingleForm((s) => ({ ...s, notes: e.target.value }))} placeholder="Notes" className="form-input form-textarea" rows={4} />
              <button className="btn-primary panel-btn" type="submit" disabled={submittingSingle}>
                <RiSave3Line size={16} />
                {submittingSingle ? 'Uploading...' : 'Upload USA Number'}
              </button>
            </form>
          </article>

          <article className="workspace-card">
            <div className="panel-head">
              <div>
                <div className="panel-kicker">Bulk Upload</div>
                <h2>Paste many rows</h2>
              </div>
              <div className="panel-badge"><RiTableLine size={16} /> CSV Rows</div>
            </div>

            <div className="bulk-hint">
              Format each line as `phone_number,name,category,sell_price,cost_price,redirect_url,notes`
            </div>

            <form onSubmit={handleBulkSubmit} className="stack">
              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={'+12025550123,WhatsApp Fresh,WhatsApp,4200,3000,https://example.com/otp/123,fast stock\n+12025550124,WhatsApp Aged,WhatsApp,4500,3200,https://example.com/otp/124,aged account'}
                className="form-input form-textarea bulk-area"
                rows={12}
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
              <h2>USA Numbers</h2>
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
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by phone, name, category, note" className="toolbar-input" />
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
                  <th>Name</th>
                  <th>Category</th>
                  <th>Pricing</th>
                  <th>OTP Link</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="empty-row">Loading inventory...</td></tr>
                ) : items.length === 0 ? (
                  <tr><td colSpan={7} className="empty-row">No USA numbers found.</td></tr>
                ) : items.map((item) => {
                  const draft = drafts[item.id];
                  return (
                    <tr key={item.id}>
                      <td className="number-cell">
                        <input
                          value={draft?.phone_number || ''}
                          onChange={(e) => updateDraft(item.id, 'phone_number', e.target.value)}
                          className="table-input"
                        />
                        <textarea
                          value={draft?.notes || ''}
                          onChange={(e) => updateDraft(item.id, 'notes', e.target.value)}
                          className="table-input table-textarea note-area"
                          rows={2}
                          placeholder="Notes"
                        />
                      </td>
                      <td>
                        <input
                          value={draft?.service_name || ''}
                          onChange={(e) => updateDraft(item.id, 'service_name', e.target.value)}
                          className="table-input"
                        />
                      </td>
                      <td>
                        <input
                          value={draft?.category || ''}
                          onChange={(e) => updateDraft(item.id, 'category', e.target.value)}
                          className="table-input"
                        />
                      </td>
                      <td>
                        <div className="price-stack">
                          <input
                            value={draft?.sell_price || ''}
                            onChange={(e) => updateDraft(item.id, 'sell_price', e.target.value)}
                            className="table-input"
                            type="number"
                            min="0"
                            step="0.01"
                          />
                          <input
                            value={draft?.cost_price || ''}
                            onChange={(e) => updateDraft(item.id, 'cost_price', e.target.value)}
                            className="table-input"
                            type="number"
                            min="0"
                            step="0.01"
                          />
                          <small>{formatMoney(Number(item.sell_price || 0))} current</small>
                        </div>
                      </td>
                      <td>
                        <textarea
                          value={draft?.redirect_url || ''}
                          onChange={(e) => updateDraft(item.id, 'redirect_url', e.target.value)}
                          className="table-input table-textarea"
                          rows={3}
                        />
                      </td>
                      <td>
                        <span className={`status-pill ${item.status}`}>{item.status}</span>
                        <div className="meta-text">{item.sold_to_username ? `Buyer: ${item.sold_to_username}` : `Uploader: ${item.uploaded_by_username}`}</div>
                      </td>
                      <td>
                        <div className="action-stack">
                          <button className="btn-secondary compact" type="button" onClick={() => handleSave(item.id)} disabled={savingId === item.id}>
                            <RiSave3Line size={15} />
                            {savingId === item.id ? 'Saving...' : 'Save'}
                          </button>
                          <button className="btn-danger compact" type="button" onClick={() => handleDelete(item.id)} disabled={deletingId === item.id || item.status !== 'available'}>
                            <RiDeleteBinLine size={15} />
                            {deletingId === item.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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

        <style jsx>{`
          .hero-card, .workspace-card, .stat-card {
            background: #fff;
            border: 1px solid var(--color-border);
            border-radius: 24px;
            box-shadow: 0 14px 34px rgba(15, 23, 42, 0.05);
          }
          .hero-card {
            display: grid;
            grid-template-columns: 1.4fr 1fr;
            gap: 24px;
            padding: 28px 30px;
            margin-bottom: 24px;
            background:
              radial-gradient(circle at top right, rgba(37, 99, 235, 0.10), transparent 26%),
              linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
          }
          .hero-grid, .stats-grid, .workspace-grid {
            display: grid;
            gap: 18px;
          }
          .hero-grid {
            align-content: center;
          }
          .hero-copy {
            display: flex;
            flex-direction: column;
            gap: 14px;
          }
          .headline-row {
            display: flex;
            align-items: center;
            gap: 12px;
            flex-wrap: wrap;
          }
          .hero-pill {
            display: inline-flex;
            align-items: center;
            min-height: 32px;
            padding: 0 14px;
            border-radius: 999px;
            background: rgba(37, 99, 235, 0.10);
            color: var(--color-primary);
            border: 1px solid rgba(37, 99, 235, 0.12);
            font-size: 0.78rem;
            font-weight: 800;
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }
          .hero-notes {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
          }
          .hero-notes span {
            display: inline-flex;
            align-items: center;
            min-height: 34px;
            padding: 0 12px;
            border-radius: 999px;
            background: rgba(15, 23, 42, 0.04);
            color: var(--color-text);
            font-size: 0.78rem;
            font-weight: 700;
          }
          .stats-grid {
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            margin-bottom: 24px;
          }
          .workspace-grid {
            grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
            margin-bottom: 24px;
          }
          .workspace-card, .stat-card {
            padding: 24px;
          }
          .mini-kpi, .panel-badge {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            padding: 12px 14px;
            border-radius: 18px;
            background: rgba(37, 99, 235, 0.08);
            color: var(--color-text);
            font-weight: 700;
            border: 1px solid rgba(37, 99, 235, 0.08);
          }
          .panel-head, .inventory-topbar, .pager, .action-stack {
            display: flex;
            gap: 16px;
          }
          .panel-head, .inventory-topbar, .pager {
            justify-content: space-between;
            align-items: flex-start;
          }
          .eyebrow, .panel-kicker, .stat-label {
            font-size: 0.72rem;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            font-weight: 800;
            color: var(--color-primary);
          }
          h1, h2 {
            margin: 8px 0 10px;
            color: var(--color-text);
          }
          p {
            color: var(--color-text-faint);
            line-height: 1.7;
            margin: 0;
          }
          .stat-value {
            font-size: 1.8rem;
            margin-top: 8px;
            font-weight: 800;
          }
          .stat-card {
            background: linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
          }
          .stack, .price-stack, .action-stack {
            flex-direction: column;
          }
          .split, .toolbar, .pager-actions {
            display: flex;
            gap: 12px;
          }
          .form-input, .toolbar-input, .table-input {
            width: 100%;
            border: 1px solid var(--color-border);
            border-radius: 16px;
            padding: 12px 14px;
            background: #fff;
            color: var(--color-text);
            box-shadow: inset 0 1px 0 rgba(255,255,255,0.84);
          }
          .form-textarea, .table-textarea {
            resize: vertical;
          }
          .bulk-hint, .meta-text, small {
            color: var(--color-text-faint);
            font-size: 0.85rem;
          }
          .inventory-card {
            overflow: hidden;
            background: linear-gradient(180deg, #ffffff 0%, #fcfdff 100%);
          }
          .table-shell {
            overflow-x: auto;
            margin-top: 18px;
            border: 1px solid rgba(15, 23, 42, 0.06);
            border-radius: 20px;
          }
          .inventory-table {
            width: 100%;
            border-collapse: collapse;
            background: #fff;
          }
          .inventory-table th, .inventory-table td {
            padding: 14px 12px;
            border-top: 1px solid var(--color-border);
            vertical-align: top;
            text-align: left;
          }
          .inventory-table th {
            background: rgba(15, 23, 42, 0.025);
            font-size: 0.76rem;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: var(--color-text-faint);
          }
          .number-cell {
            min-width: 220px;
          }
          .number-cell span {
            display: block;
            margin-top: 8px;
          }
          .note-area {
            margin-top: 8px;
          }
          .status-pill {
            display: inline-flex;
            padding: 6px 10px;
            border-radius: 999px;
            font-size: 0.78rem;
            text-transform: capitalize;
            font-weight: 700;
            background: rgba(15, 23, 42, 0.08);
          }
          .status-pill.available {
            background: rgba(16, 185, 129, 0.12);
            color: #047857;
          }
          .status-pill.sold {
            background: rgba(59, 130, 246, 0.12);
            color: #1d4ed8;
          }
          .status-pill.cancelled {
            background: rgba(244, 63, 94, 0.12);
            color: #be123c;
          }
          .btn-primary, .btn-secondary, .btn-danger {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            border-radius: 14px;
            padding: 11px 14px;
            border: 1px solid transparent;
            cursor: pointer;
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
          .btn-danger {
            background: rgba(239, 68, 68, 0.08);
            color: #dc2626;
            border-color: rgba(239, 68, 68, 0.15);
          }
          .compact {
            width: 100%;
          }
          .empty-row {
            text-align: center;
            color: var(--color-text-faint);
          }
          .search-shell {
            position: relative;
            min-width: 260px;
          }
          .search-shell :global(svg) {
            position: absolute;
            top: 50%;
            left: 12px;
            transform: translateY(-50%);
            color: var(--color-text-faint);
          }
          .search-shell .toolbar-input {
            padding-left: 38px;
          }
          @media (max-width: 960px) {
            .hero-card {
              grid-template-columns: 1fr;
            }
            .inventory-topbar, .toolbar, .split, .pager {
              flex-direction: column;
            }
          }
        `}</style>
      </div>
    </AdminLayout>
  );
}
