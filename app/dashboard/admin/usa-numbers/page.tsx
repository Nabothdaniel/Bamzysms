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
        redirect_url = '',
        ...rest
      ] = parts;

      return {
        phone_number,
        service_name,
        category,
        sell_price: Number(sell_price),
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
        notes: singleForm.notes,
      });
      addToast('USA number uploaded', 'success');
      setSingleForm({
        phone_number: '',
        service_name: 'USA Number',
        category: 'WhatsApp',
        redirect_url: '',
        sell_price: '',
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
      addToast('Add at least one row first', 'error');
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
      <div className="admin-content">
        <section className="hero-card">
          <div className="hero-copy">
            <div className="eyebrow">USA Number Operations</div>
            <div className="headline-row">
              <h1>USA Number Manager</h1>
              <span className="hero-pill">Clean Upload Flow</span>
            </div>
            <p>
              Keep this page simple: one selling price, one redirect link, and a roomy workspace for uploading,
              checking, and correcting USA number stock.
            </p>
            <div className="hero-notes">
              <span>One price only</span>
              <span>Step-by-step upload</span>
              <span>Easy inventory edits</span>
            </div>
          </div>

          <div className="hero-grid">
            <div className="mini-kpi"><RiPriceTag3Line size={18} /><span>{pagination.total} total rows</span></div>
            <div className="mini-kpi"><RiFlashlightLine size={18} /><span>{stats.available} ready to sell</span></div>
            <div className="mini-kpi"><RiLinkM size={18} /><span>{stats.linked} with links</span></div>
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
            <div className="stat-label">Average sell price</div>
            <div className="stat-value">
              {formatMoney(items.length ? items.reduce((sum, item) => sum + Number(item.sell_price || 0), 0) / items.length : 0)}
            </div>
          </article>
        </section>

        <section className="flow-shell">
          <article className="workspace-card">
            <div className="panel-head">
              <div>
                <div className="panel-kicker">Step 1</div>
                <h2>Add one USA number</h2>
                <p className="panel-copy">Fill the essentials only: phone, service, category, selling price, redirect link, and note.</p>
              </div>
              <div className="panel-badge"><RiUploadCloud2Line size={16} /> Single Upload</div>
            </div>

            <form onSubmit={handleSingleSubmit} className="stack">
              <div className="field-grid wide">
                <label className="field">
                  <span className="field-label">Phone number</span>
                  <input
                    value={singleForm.phone_number}
                    onChange={(e) => setSingleForm((s) => ({ ...s, phone_number: e.target.value }))}
                    placeholder="+12025550123"
                    className="form-input"
                    type="tel"
                    autoComplete="off"
                  />
                </label>

                <label className="field">
                  <span className="field-label">Sell price</span>
                  <input
                    value={singleForm.sell_price}
                    onChange={(e) => setSingleForm((s) => ({ ...s, sell_price: e.target.value }))}
                    placeholder="4200"
                    className="form-input"
                    type="number"
                    min="0"
                    step="0.01"
                  />
                </label>
              </div>

              <div className="field-grid">
                <label className="field">
                  <span className="field-label">Service name</span>
                  <input
                    value={singleForm.service_name}
                    onChange={(e) => setSingleForm((s) => ({ ...s, service_name: e.target.value }))}
                    placeholder="WhatsApp Fresh"
                    className="form-input"
                    autoComplete="off"
                  />
                </label>

                <label className="field">
                  <span className="field-label">Category</span>
                  <input
                    value={singleForm.category}
                    onChange={(e) => setSingleForm((s) => ({ ...s, category: e.target.value }))}
                    placeholder="WhatsApp"
                    className="form-input"
                    autoComplete="off"
                  />
                </label>
              </div>

              <label className="field">
                <span className="field-label">Redirect link</span>
                <input
                  value={singleForm.redirect_url}
                  onChange={(e) => setSingleForm((s) => ({ ...s, redirect_url: e.target.value }))}
                  placeholder="https://example.com/otp/123"
                  className="form-input"
                  type="url"
                  autoComplete="off"
                />
                <span className="field-hint">This is the link the system checks when the user comes back for the code.</span>
              </label>

              <label className="field">
                <span className="field-label">Internal note</span>
                <textarea
                  value={singleForm.notes}
                  onChange={(e) => setSingleForm((s) => ({ ...s, notes: e.target.value }))}
                  placeholder="Fast stock, aged account, or any reminder for the team"
                  className="form-input form-textarea"
                  rows={4}
                />
              </label>

              <button className="btn-primary panel-btn" type="submit" disabled={submittingSingle}>
                <RiSave3Line size={16} />
                {submittingSingle ? 'Uploading...' : 'Upload USA Number'}
              </button>
            </form>
          </article>

          <article className="workspace-card">
            <div className="panel-head">
              <div>
                <div className="panel-kicker">Step 2</div>
                <h2>Paste bulk rows</h2>
                <p className="panel-copy">Use one simple line format so the page stays clean and fast to review.</p>
              </div>
              <div className="panel-badge"><RiTableLine size={16} /> Bulk Upload</div>
            </div>

            <div className="bulk-guide">
              <span className="bulk-guide-label">Row format</span>
              <code>phone_number,name,category,sell_price,redirect_url,notes</code>
            </div>

            <form onSubmit={handleBulkSubmit} className="stack">
              <label className="field">
                <span className="field-label">Rows</span>
                <textarea
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder={'+12025550123,WhatsApp Fresh,WhatsApp,4200,https://example.com/otp/123,fast stock\n+12025550124,WhatsApp Aged,WhatsApp,4500,https://example.com/otp/124,aged account'}
                  className="form-input form-textarea bulk-area"
                  rows={11}
                />
              </label>

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
              <div className="panel-kicker">Step 3</div>
              <h2>Review inventory</h2>
              <p className="panel-copy">Search, fix, and save inventory rows without extra clutter.</p>
            </div>

            <form
              className="toolbar"
              onSubmit={(e) => {
                e.preventDefault();
                fetchNumbers(1, search, status);
              }}
            >
              <label className="search-shell">
                <RiSearchLine size={16} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by phone, name, category, note"
                  className="toolbar-input"
                  type="search"
                />
              </label>

              <select value={status} onChange={(e) => setStatus(e.target.value)} className="toolbar-input toolbar-select">
                <option value="">All statuses</option>
                <option value="available">Available</option>
                <option value="sold">Sold</option>
                <option value="cancelled">Cancelled</option>
              </select>

              <button className="btn-secondary toolbar-btn" onClick={() => fetchNumbers(1, search, status)} type="button">
                Apply
              </button>
            </form>
          </div>

          <div className="table-shell">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>Number</th>
                  <th>Service</th>
                  <th>Category</th>
                  <th>Sell Price</th>
                  <th>Redirect Link</th>
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
                      <td className="price-cell">
                        <input
                          value={draft?.sell_price || ''}
                          onChange={(e) => updateDraft(item.id, 'sell_price', e.target.value)}
                          className="table-input"
                          type="number"
                          min="0"
                          step="0.01"
                        />
                        <small>{formatMoney(Number(item.sell_price || 0))} current</small>
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
          .admin-content {
            padding: 32px;
            display: flex;
            flex-direction: column;
            gap: 24px;
          }
          .hero-card, .workspace-card, .stat-card {
            background: #fff;
            border: 1px solid var(--color-border);
            border-radius: 28px;
            box-shadow: 0 16px 38px rgba(15, 23, 42, 0.05);
          }
          .hero-card {
            display: grid;
            grid-template-columns: minmax(0, 1.45fr) minmax(280px, 0.9fr);
            gap: 24px;
            padding: 32px;
            background:
              radial-gradient(circle at top right, rgba(37, 99, 235, 0.12), transparent 28%),
              linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
          }
          .hero-copy {
            display: flex;
            flex-direction: column;
            gap: 14px;
            max-width: 760px;
          }
          .headline-row, .hero-notes, .panel-head, .inventory-topbar, .pager, .pager-actions, .toolbar {
            display: flex;
            gap: 14px;
          }
          .headline-row, .inventory-topbar, .pager {
            justify-content: space-between;
            align-items: flex-start;
          }
          .hero-grid, .stats-grid, .flow-shell, .stack, .action-stack {
            display: grid;
            gap: 18px;
          }
          .hero-grid {
            align-content: center;
          }
          .stats-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
          .flow-shell {
            grid-template-columns: 1fr;
          }
          .workspace-card, .stat-card {
            padding: 28px;
          }
          .inventory-card {
            overflow: hidden;
            background: linear-gradient(180deg, #ffffff 0%, #fcfdff 100%);
          }
          .eyebrow, .panel-kicker, .stat-label, .field-label, .bulk-guide-label {
            font-size: 0.72rem;
            text-transform: uppercase;
            letter-spacing: 0.12em;
            font-weight: 800;
            color: var(--color-primary);
          }
          h1, h2 {
            margin: 8px 0 0;
            color: var(--color-text);
          }
          h1 {
            font-size: clamp(2rem, 3vw, 2.7rem);
          }
          p, .panel-copy, .field-hint, .bulk-guide code, .meta-text, small {
            color: var(--color-text-faint);
            line-height: 1.7;
            margin: 0;
          }
          .hero-pill, .hero-notes span, .mini-kpi, .panel-badge, .bulk-guide {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            border-radius: 999px;
            font-weight: 700;
          }
          .hero-pill {
            min-height: 36px;
            padding: 0 16px;
            background: linear-gradient(135deg, rgba(37, 99, 235, 0.16), rgba(14, 165, 233, 0.18));
            color: var(--color-primary);
            border: 1px solid rgba(37, 99, 235, 0.14);
            font-size: 0.8rem;
            letter-spacing: 0.08em;
            text-transform: uppercase;
          }
          .hero-notes {
            flex-wrap: wrap;
          }
          .hero-notes span, .mini-kpi, .panel-badge {
            min-height: 42px;
            padding: 0 14px;
            background: rgba(37, 99, 235, 0.08);
            border: 1px solid rgba(37, 99, 235, 0.08);
          }
          .stat-card {
            background: linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
          }
          .stat-value {
            margin-top: 8px;
            font-size: 1.9rem;
            font-weight: 800;
          }
          .panel-head {
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 20px;
          }
          .field-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 16px;
          }
          .field-grid.wide {
            grid-template-columns: minmax(0, 1.5fr) minmax(220px, 0.7fr);
          }
          .field {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .field-hint {
            font-size: 0.86rem;
          }
          .form-input, .toolbar-input, .table-input {
            width: 100%;
            border: 1px solid var(--color-border);
            border-radius: 18px;
            padding: 14px 16px;
            background: #fff;
            color: var(--color-text);
            box-shadow: inset 0 1px 0 rgba(255,255,255,0.84);
          }
          .form-input:focus, .toolbar-input:focus, .table-input:focus {
            outline: none;
            border-color: var(--color-primary);
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
          }
          .form-textarea, .table-textarea {
            resize: vertical;
          }
          .bulk-guide {
            width: fit-content;
            max-width: 100%;
            padding: 10px 14px;
            margin-bottom: 18px;
            background: rgba(15, 23, 42, 0.04);
            border: 1px solid rgba(15, 23, 42, 0.06);
            flex-wrap: wrap;
          }
          .bulk-guide code {
            font-family: monospace;
          }
          .bulk-area {
            min-height: 240px;
          }
          .btn-primary, .btn-secondary, .btn-danger {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            min-height: 46px;
            border-radius: 16px;
            padding: 12px 16px;
            border: 1px solid transparent;
            cursor: pointer;
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
          .btn-danger {
            background: rgba(239, 68, 68, 0.08);
            color: #dc2626;
            border-color: rgba(239, 68, 68, 0.15);
          }
          .btn-primary:focus-visible, .btn-secondary:focus-visible, .btn-danger:focus-visible {
            outline: none;
            box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.16);
          }
          .panel-btn, .compact, .toolbar-btn {
            width: fit-content;
          }
          .table-shell {
            overflow-x: auto;
            margin-top: 18px;
            border: 1px solid rgba(15, 23, 42, 0.06);
            border-radius: 22px;
          }
          .inventory-table {
            width: 100%;
            min-width: 1080px;
            border-collapse: collapse;
            background: #fff;
          }
          .inventory-table th, .inventory-table td {
            padding: 16px 14px;
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
            min-width: 240px;
          }
          .price-cell {
            min-width: 150px;
          }
          .note-area {
            margin-top: 10px;
          }
          .status-pill {
            display: inline-flex;
            padding: 7px 12px;
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
          .action-stack {
            grid-template-columns: 1fr;
          }
          .empty-row {
            text-align: center;
            color: var(--color-text-faint);
          }
          .search-shell {
            position: relative;
            min-width: min(100%, 320px);
            flex: 1;
          }
          .search-shell :global(svg) {
            position: absolute;
            top: 50%;
            left: 14px;
            transform: translateY(-50%);
            color: var(--color-text-faint);
          }
          .search-shell .toolbar-input {
            padding-left: 40px;
          }
          .toolbar-select {
            min-width: 180px;
          }
          @media (max-width: 1100px) {
            .hero-card, .stats-grid {
              grid-template-columns: 1fr;
            }
          }
          @media (max-width: 960px) {
            .admin-content {
              padding: 20px;
            }
            .field-grid, .field-grid.wide, .inventory-topbar, .toolbar, .pager {
              grid-template-columns: 1fr;
              flex-direction: column;
            }
            .panel-btn, .toolbar-btn {
              width: 100%;
            }
            .stats-grid {
              grid-template-columns: 1fr;
            }
          }
        `}</style>
      </div>
    </AdminLayout>
  );
}
