'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { adminService, AdminUser } from '@/lib/api/admin.service';
import { useAppStore } from '@/store/appStore';
import { RiSearchLine, RiPhoneLine, RiWalletLine, RiRefreshLine, RiTimeLine, RiEdit2Line, RiDeleteBinLine, RiAddLine, RiExchangeFundsLine, RiCloseLine, RiLockLine, RiShieldKeyholeLine, RiFileCopyLine, RiEyeLine, RiShoppingCartLine, RiInformationLine, RiSubtractLine } from 'react-icons/ri';
import UserAvatar from '@/components/ui/UserAvatar';
import { formatMoney } from '@/lib/utils';
import AdminPagination from '@/components/admin/AdminPagination';

type RoleType = 'user' | 'admin';

export default function AdminUsersPage() {
  const { addToast, hasHydrated, user } = useAppStore();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState(''); // '' | 'user' | 'admin'
  const [busy, setBusy] = useState(false);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 20;

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [topupOpen, setTopupOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetKeyOpen, setResetKeyOpen] = useState(false);
  const [tempPassword, setTempPassword] = useState('');
  const [tempRecoveryKey, setTempRecoveryKey] = useState('');

  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);

  const [createForm, setCreateForm] = useState({
    name: '',
    username: '',
    phone: '',
    password: '',
    role: 'user' as RoleType,
    balance: '0',
  });

  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    password: '',
    role: 'user' as RoleType,
  });

  const [topupForm, setTopupForm] = useState({
    amount: '',
    type: 'credit' as 'credit' | 'debit',
    note: '',
  });

  const loadUsers = useCallback(async (isSearch = false) => {
    try {
      const currentPage = isSearch ? 1 : page;
      if (isSearch) setPage(1);

      const res: any = await adminService.getUsers({ 
        page: currentPage, 
        limit, 
        search: search.trim(),
        role: roleFilter
      });
      
      setUsers(res.data || []);
      if (res.pagination) {
        setTotalPages(res.pagination.pages);
        setTotalItems(res.pagination.total);
      }
    } catch {
      addToast('Failed to load users', 'error');
    }
  }, [addToast, page, search, roleFilter]);

  useEffect(() => {
    if (!hasHydrated || user?.role !== 'admin') return;

    const bootstrap = async () => {
      setLoading(true);
      await loadUsers();
      setLoading(false);
    };

    bootstrap();
  }, [hasHydrated, user?.role, page, roleFilter, loadUsers]); // Reload when page or role changes

  // Handle search with debounce ideally, but for now simple trigger
  useEffect(() => {
    if (!hasHydrated) return;
    const timer = setTimeout(() => {
      loadUsers(true);
    }, 500);
    return () => clearTimeout(timer);
  }, [search, hasHydrated, loadUsers]);

  const filteredUsers = useMemo(() => (users || []).filter((u) =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.phone?.includes(search)
  ), [users, search]);

  const onCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createForm.name || !createForm.username || !createForm.password) {
      addToast('Name, username and password are required', 'error');
      return;
    }

    setBusy(true);
    try {
      await adminService.createUser({
        name: createForm.name.trim(),
        username: createForm.username.trim(),
        phone: createForm.phone.trim(),
        password: createForm.password,
        role: createForm.role,
        balance: Number(createForm.balance || 0),
      });
      addToast('User created successfully', 'success');
      setCreateOpen(false);
      setCreateForm({ name: '', username: '', phone: '', password: '', role: 'user', balance: '0' });
      await loadUsers();
    } catch (err: any) {
      addToast(err.message || 'Failed to create user', 'error');
    } finally {
      setBusy(false);
    }
  };

  const openEdit = (u: AdminUser) => {
    setSelectedUser(u);
    setEditForm({ name: u.name || '', phone: u.phone || '', password: '', role: u.role });
    setEditOpen(true);
  };

  const onUpdateUser = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setBusy(true);
    try {
      await adminService.updateUser({
        userId: selectedUser.id,
        name: editForm.name.trim(),
        phone: editForm.phone.trim(),
        password: editForm.password || undefined,
        role: editForm.role,
      });
      addToast('User updated successfully', 'success');
      setEditOpen(false);
      await loadUsers();
    } catch (err: any) {
      addToast(err.message || 'Failed to update user', 'error');
    } finally {
      setBusy(false);
    }
  };

  const onDeleteUser = async (u: AdminUser) => {
    const ok = window.confirm(`Delete ${u.name} (@${u.username})? This cannot be undone.`);
    if (!ok) return;

    setBusy(true);
    try {
      await adminService.deleteUser(u.id);
      addToast('User deleted successfully', 'success');
      await loadUsers();
    } catch (err: any) {
      addToast(err.message || 'Failed to delete user', 'error');
    } finally {
      setBusy(false);
    }
  };

  const openTopup = (u: AdminUser) => {
    setSelectedUser(u);
    setTopupForm({ amount: '', type: 'credit', note: '' });
    setTopupOpen(true);
  };

  const onTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    const amount = Number(topupForm.amount);
    if (!amount || amount <= 0) {
      addToast('Enter a valid amount', 'error');
      return;
    }

    setBusy(true);
    try {
      await adminService.topUpUser({
        userId: selectedUser.id,
        amount,
        type: topupForm.type,
        note: topupForm.note.trim(),
      });
      addToast(topupForm.type === 'credit' ? 'Balance topped up' : 'Balance debited', 'success');
      setTopupOpen(false);
      await loadUsers();
    } catch (err: any) {
      addToast(err.message || 'Failed to process balance action', 'error');
    } finally {
      setBusy(false);
    }
  };

  const openReset = (u: AdminUser) => {
    setSelectedUser(u);
    const newPass = Math.random().toString(36).slice(-8);
    setTempPassword(newPass);
    setResetOpen(true);
  };

  const onConfirmReset = async () => {
    if (!selectedUser) return;
    setBusy(true);
    try {
      await adminService.sudoResetPassword(selectedUser.id, tempPassword);
      addToast(`Password reset successfully for @${selectedUser.username}`, 'success');
      setResetOpen(false);
    } catch (err: any) {
      addToast(err.message || 'Failed to reset password', 'error');
    } finally {
      setBusy(false);
    }
  };

  const openResetKey = (u: AdminUser) => {
    setSelectedUser(u);
    setTempRecoveryKey('');
    setResetKeyOpen(true);
  };

  const onRevealKey = async () => {
    if (!selectedUser) return;
    setBusy(true);
    try {
      const res = await adminService.revealUserRecoveryKey(selectedUser.id);
      setTempRecoveryKey(res.data.recovery_key);
      addToast('Current recovery key revealed', 'success');
    } catch (err: any) {
      addToast(err.message || 'Failed to reveal recovery key', 'error');
    } finally {
      setBusy(false);
    }
  };

  const onConfirmResetKey = async () => {
    if (!selectedUser) return;
    const ok = window.confirm('Are you sure you want to REGENERATE this user\'s recovery key? The old one will immediately stop working.');
    if (!ok) return;

    setBusy(true);
    try {
      const res = await adminService.resetUserRecoveryKey(selectedUser.id);
      setTempRecoveryKey(res.data.recovery_key);
      addToast('Recovery Key reset successfully', 'success');
    } catch (err: any) {
      addToast(err.message || 'Failed to reset recovery key', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminLayout>
      <div className="admin-content" style={{ padding: '32px' }}>
        <div className="admin-header" style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 800, margin: '0 0 8px', color: 'var(--color-text)' }}>User Management</h1>
            <p style={{ color: 'var(--color-text-faint)', margin: 0, fontWeight: 500 }}>Create, update, delete users and manage wallet balances.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <div className="filter-container">
              <select 
                value={roleFilter} 
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setPage(1);
                }}
                className="input-field"
                style={{ width: '160px', padding: '12px 16px', fontWeight: 600 }}
              >
                <option value="">All Roles</option>
                <option value="user">Normal Users</option>
                <option value="admin">Administrators</option>
              </select>
            </div>
            
            <div className="search-container" style={{ position: 'relative' }}>
              <RiSearchLine style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-faint)', fontSize: '1.2rem' }} />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field"
                style={{ width: '300px', padding: '12px 16px 12px 44px' }}
              />
            </div>
            <button className="btn-primary" onClick={() => setCreateOpen(true)}>
              <RiAddLine /> New User
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '100px 0', color: 'var(--color-text-faint)' }}>
            <div className="spinner" style={{ margin: '0 auto 24px', width: '40px', height: '40px', border: '3px solid var(--color-primary-glow)', borderTopColor: 'var(--color-primary)' }} />
            <p style={{ fontWeight: 600, fontSize: '1.1rem' }}>Accessing User Database...</p>
          </div>
        ) : (
          <div className="stat-card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--color-border)', background: 'var(--color-bg-2)', boxShadow: '0 10px 30px rgba(0,0,0,0.04)' }}>
            <div style={{ width: '100%', overflowX: 'auto' }}>
              <table style={{ minWidth: '980px', width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--color-bg-hover)', borderBottom: '2px solid var(--color-border)' }}>
                    <th style={thStyle}>User Profile</th>
                    <th style={thStyle}>Contact Details</th>
                    <th style={thStyle}>Wallet Balance</th>
                    <th style={thStyle}>Access Level</th>
                    <th style={thStyle}>Registration</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ padding: '64px', textAlign: 'center', color: 'var(--color-text-faint)' }}>
                        <div style={{ fontSize: '1rem', fontWeight: 600 }}>No users found matching &quot;{search}&quot;</div>
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.id} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background 0.2s' }} className="user-row">
                        <td style={{ padding: '18px 24px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                            <UserAvatar seed={u.username || u.name || 'user'} size={44} style={{ border: '1px solid var(--color-border)' }} />
                            <div>
                              <div style={{ fontWeight: 800, color: 'var(--color-text)', fontSize: '0.95rem' }}>{u.name}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-faint)', fontWeight: 600 }}>@{u.username}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '18px 24px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: 'var(--color-text-muted)', fontWeight: 500 }}>
                            <RiPhoneLine size={14} />
                            {u.phone || '—'}
                          </div>
                        </td>
                        <td style={{ padding: '18px 24px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 900, color: 'var(--color-text)', fontSize: '1.05rem' }}>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <RiWalletLine size={14} color="#10B981" />
                            </div>
                            {formatMoney(u.balance)}
                          </div>
                        </td>
                        <td style={{ padding: '18px 24px' }}>
                          <span style={{
                            padding: '6px 14px',
                            borderRadius: '10px',
                            background: u.role === 'admin' ? '#111827' : 'var(--color-primary-dim)',
                            color: u.role === 'admin' ? '#fff' : 'var(--color-primary)',
                            fontWeight: 800,
                            fontSize: '0.65rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                          }}>
                            {u.role}
                          </span>
                        </td>
                        <td style={{ padding: '18px 24px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', color: 'var(--color-text-faint)', fontWeight: 600 }}>
                            <RiTimeLine size={16} />
                            {new Date(u.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                          </div>
                        </td>
                        <td style={{ padding: '18px 24px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: 8 }}>
                            <button className="btn-ghost" style={iconBtnStyle} onClick={() => openTopup(u)} title="Top-up / debit">
                              <RiExchangeFundsLine size={16} />
                            </button>
                            <button className="btn-ghost" style={iconBtnStyle} onClick={() => openReset(u)} title="Reset Password">
                              <RiLockLine size={16} />
                            </button>
                            <button className="btn-ghost" style={iconBtnStyle} onClick={() => openResetKey(u)} title="Manage Recovery Key">
                              <RiShieldKeyholeLine size={16} />
                            </button>
                            <button className="btn-ghost" style={iconBtnStyle} onClick={() => openEdit(u)} title="Edit user">
                              <RiEdit2Line size={16} />
                            </button>
                            <button className="btn-ghost" style={{ ...iconBtnStyle, color: '#dc2626' }} onClick={() => onDeleteUser(u)} title="Delete user" disabled={busy || u.id === user?.id}>
                              <RiDeleteBinLine size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && (
          <AdminPagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={totalItems}
            limit={limit}
            onPageChange={setPage}
          />
        )}


        {createOpen && (
          <div className="modal-overlay" onClick={() => !busy && setCreateOpen(false)}>
            <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
              <button className="btn-ghost" onClick={() => setCreateOpen(false)} style={modalCloseStyle}>
                <RiCloseLine size={20} />
              </button>
              <h3 style={modalTitleStyle}>Create User</h3>
              <form onSubmit={onCreateUser} style={formStyle}>
                <input className="input-field" placeholder="Full name" value={createForm.name} onChange={(e) => setCreateForm((s) => ({ ...s, name: e.target.value }))} />
                <input className="input-field" placeholder="Username" value={createForm.username} onChange={(e) => setCreateForm((s) => ({ ...s, username: e.target.value }))} />
                <input className="input-field" placeholder="Phone" value={createForm.phone} onChange={(e) => setCreateForm((s) => ({ ...s, phone: e.target.value }))} />
                <input type="password" disabled={busy} className="input-field" placeholder="Password (min 6 chars)" value={createForm.password} onChange={(e) => setCreateForm((s) => ({ ...s, password: e.target.value }))} />
                <select className="input-field" value={createForm.role} onChange={(e) => setCreateForm((s) => ({ ...s, role: e.target.value as RoleType }))}>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
                <input type="number" min="0" step="0.01" className="input-field" placeholder="Initial balance" value={createForm.balance} onChange={(e) => setCreateForm((s) => ({ ...s, balance: e.target.value }))} />
                <button className="btn-primary" type="submit" disabled={busy}>{busy ? 'Saving...' : 'Create User'}</button>
              </form>
            </div>
          </div>
        )}

        {editOpen && selectedUser && (
          <div className="modal-overlay" onClick={() => !busy && setEditOpen(false)}>
            <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
              <button className="btn-ghost" onClick={() => setEditOpen(false)} style={modalCloseStyle}>
                <RiCloseLine size={20} />
              </button>
              <h3 style={modalTitleStyle}>Edit User</h3>
              <p style={{ marginTop: -8, marginBottom: 12, color: 'var(--color-text-faint)', fontSize: '0.85rem' }}>@{selectedUser.username}</p>
              <form onSubmit={onUpdateUser} style={formStyle}>
                <input className="input-field" placeholder="Full name" value={editForm.name} onChange={(e) => setEditForm((s) => ({ ...s, name: e.target.value }))} />
                <input className="input-field" placeholder="Phone" value={editForm.phone} onChange={(e) => setEditForm((s) => ({ ...s, phone: e.target.value }))} />
                <input type="password" disabled={busy} className="input-field" placeholder="New password (optional)" value={editForm.password} onChange={(e) => setEditForm((s) => ({ ...s, password: e.target.value }))} />
                <select className="input-field" value={editForm.role} onChange={(e) => setEditForm((s) => ({ ...s, role: e.target.value as RoleType }))}>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
                <button className="btn-primary" type="submit" disabled={busy}>{busy ? 'Saving...' : 'Update User'}</button>
              </form>
            </div>
          </div>
        )}

        {topupOpen && selectedUser && (
          <div className="modal-overlay" onClick={() => !busy && setTopupOpen(false)}>
            <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520 }}>
              <button className="btn-ghost" onClick={() => setTopupOpen(false)} style={modalCloseStyle}>
                <RiCloseLine size={20} />
              </button>
              <h3 style={modalTitleStyle}>Adjust Wallet Balance</h3>
              <p style={{ marginTop: -8, marginBottom: 12, color: 'var(--color-text-faint)', fontSize: '0.85rem' }}>
                {selectedUser.name} (@{selectedUser.username}) • Current: {formatMoney(selectedUser.balance)}
              </p>
              <form onSubmit={onTopup} style={formStyle}>
                <select className="input-field" value={topupForm.type} onChange={(e) => setTopupForm((s) => ({ ...s, type: e.target.value as 'credit' | 'debit' }))}>
                  <option value="credit">Top-up (Credit)</option>
                  <option value="debit">Debit</option>
                </select>
                <input type="number" min="0.01" step="0.01" className="input-field" placeholder="Amount" value={topupForm.amount} onChange={(e) => setTopupForm((s) => ({ ...s, amount: e.target.value }))} />
                <input className="input-field" placeholder="Note (optional)" value={topupForm.note} onChange={(e) => setTopupForm((s) => ({ ...s, note: e.target.value }))} />
                <button className="btn-primary" type="submit" disabled={busy}>{busy ? 'Processing...' : 'Apply'}</button>
              </form>
            </div>
          </div>
        )}

        {resetOpen && selectedUser && (
          <div className="modal-overlay" onClick={() => !busy && setResetOpen(false)}>
            <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440, textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <RiLockLine size={32} color="var(--color-primary)" />
              </div>
              <h3 style={modalTitleStyle}>Reset Password</h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', marginBottom: 24 }}>
                Generate a new temporary password for <strong>{selectedUser.name}</strong> (@{selectedUser.username})
              </p>

              <div style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 16, marginBottom: 24 }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-faint)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Temporary Password</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--color-primary)', letterSpacing: '0.1em' }}>{tempPassword}</div>
              </div>

              <div style={{ display: 'grid', gap: 12 }}>
                <button className="btn-primary" onClick={onConfirmReset} disabled={busy}>
                  {busy ? 'Saving...' : 'Confirm & Save New Password'}
                </button>
                <button className="btn-ghost" onClick={() => setResetOpen(false)} disabled={busy} style={{ fontWeight: 600 }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {resetKeyOpen && selectedUser && (
          <div className="modal-overlay" onClick={() => !busy && setResetKeyOpen(false)}>
            <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440, textAlign: 'center' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <RiShieldKeyholeLine size={32} color="#F59E0B" />
              </div>
              <h3 style={modalTitleStyle}>Recovery Key Management</h3>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '0.95rem', marginBottom: 24 }}>
                Manage the account recovery key for <strong>{selectedUser.name}</strong> (@{selectedUser.username}).
              </p>

              {tempRecoveryKey ? (
                <>
                  <div style={{ background: 'var(--color-bg-hover)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 16, marginBottom: 24, position: 'relative' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-faint)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 8 }}>Recovery Key (Copied to Clipboard)</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--color-primary)', letterSpacing: '0.1em' }}>{tempRecoveryKey}</div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(tempRecoveryKey);
                        addToast('Key copied!', 'success');
                      }}
                      style={{ marginTop: 8, background: 'var(--color-primary)', border: 'none', color: '#fff', padding: '8px 16px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 6, margin: '14px auto 0' }}
                    >
                      <RiFileCopyLine /> Copy Key Again
                    </button>
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--color-text-faint)', marginBottom: 24 }}>
                    Provide this key to the user. They can use it to regain access to their account.
                  </p>
                  <button className="btn-primary" onClick={() => { setResetKeyOpen(false); setTempRecoveryKey(''); }} style={{ width: '100%' }}>
                    Done
                  </button>
                </>
              ) : (
                <div style={{ display: 'grid', gap: 12 }}>
                  {selectedUser.has_recovery_key && (
                    <button
                      className="btn-primary"
                      onClick={onRevealKey}
                      disabled={busy}
                      style={{ background: 'var(--color-text)', color: '#fff' }}
                    >
                      <RiEyeLine size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                      {busy ? 'Revealing...' : 'Reveal Current Key'}
                    </button>
                  )}

                  <div style={{ padding: '8px', borderTop: '1px solid var(--color-border)', marginTop: 8 }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-faint)', marginBottom: 12 }}>{selectedUser.has_recovery_key ? 'OR generate a completely new key' : 'Generate an initial recovery key for this user'}</p>
                    <button className="btn-primary" onClick={onConfirmResetKey} disabled={busy} style={{ background: '#F59E0B', width: '100%' }}>
                      <RiRefreshLine size={18} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                      {busy ? 'Resetting...' : 'Regenerate New Key'}
                    </button>
                  </div>

                  <button className="btn-ghost" onClick={() => setResetKeyOpen(false)} disabled={busy} style={{ fontWeight: 600 }}>
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        <style jsx>{`
          .user-row:hover { background: var(--color-bg-hover) !important; }
          .spinner { animation: spin 1s linear infinite; border-radius: 50%; }
          @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
          @media (max-width: 1024px) {
            .admin-content { padding: 20px 16px !important; }
            .admin-header { flex-direction: column; align-items: flex-start !important; }
            .search-container { width: 100%; }
            .search-container input { width: 100% !important; }
          }
        `}</style>
      </div>
    </AdminLayout>
  );
}

const thStyle: React.CSSProperties = {
  padding: '20px 24px',
  textAlign: 'left',
  fontSize: '0.75rem',
  color: 'var(--color-text-faint)',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  fontWeight: 800,
};

const iconBtnStyle: React.CSSProperties = {
  minWidth: 'auto',
  padding: 10,
  border: '1px solid var(--color-border)',
  borderRadius: 10,
};

const modalCloseStyle: React.CSSProperties = {
  position: 'absolute',
  top: 12,
  right: 12,
  minWidth: 'auto',
  border: 'none',
  padding: 6,
};

const modalTitleStyle: React.CSSProperties = {
  margin: '0 0 16px',
  fontSize: '1.1rem',
  fontWeight: 800,
  color: 'var(--color-text)',
};

const formStyle: React.CSSProperties = {
  display: 'grid',
  gap: 12,
};
