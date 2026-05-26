'use client';

import React, { useState, useEffect } from 'react';
import AdminLayout from '@/components/admin/AdminLayout';
import { adminService } from '@/lib/api/admin.service';
import { useAppStore } from '@/store/appStore';
import { formatMoney } from '@/lib/utils';
import UserAvatar from '@/components/ui/UserAvatar';
import { RiExchangeFundsLine, RiTimeLine } from 'react-icons/ri';
import AdminPagination from '@/components/admin/AdminPagination';

type FundingTransaction = {
  id: number;
  amount: number | string;
  description: string;
  created_at: string;
  user_name?: string;
  user_username?: string;
};

export default function AdminFundingPage() {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<FundingTransaction[]>([]);
  const [search, setSearch] = useState('');
  const { addToast } = useAppStore();

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const limit = 20;

  useEffect(() => {
    const loadTransactions = async () => {
      setLoading(true);
      try {
        const response = await adminService.getTransactions({ page, limit, type: 'credit' });
        setTransactions((response.data || []) as FundingTransaction[]);
        if (response.pagination) {
          setTotalPages(response.pagination.pages);
          setTotalItems(response.pagination.total);
        }
      } catch {
        addToast('Failed to load funding history', 'error');
      } finally {
        setLoading(false);
      }
    };

    void loadTransactions();
  }, [addToast, page]);


  const filtered = transactions.filter(t => 
    t.user_name?.toLowerCase().includes(search.toLowerCase()) || 
    t.user_username?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout>
      <div className="admin-content" style={{ padding: '32px' }}>
        <div className="admin-header" style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: '1.875rem', fontWeight: 800, margin: '0 0 8px' }}>Funding History</h1>
            <p style={{ color: 'var(--color-text-faint)', margin: 0, fontWeight: 500 }}>Global record of all user wallet top-ups and balance additions.</p>
          </div>
          <div className="search-box">
            <input 
              type="text" 
              placeholder="Search by username..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field search-input"
              style={{ width: 280, borderRadius: 12, padding: '10px 16px' }}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '100px 0' }}>
            <div className="spinner" style={{ margin: '0 auto 24px' }} />
            <p style={{ fontWeight: 600, color: 'var(--color-text-faint)' }}>Fetching global records...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ 
            background: 'var(--color-bg-2)', border: '1px dashed var(--color-border)', 
            borderRadius: 24, padding: '80px 24px', textAlign: 'center' 
          }}>
            <p style={{ margin: 0, color: 'var(--color-text-faint)', fontWeight: 600 }}>
              {search ? `No funding records matching "${search}"` : 'No funding records found yet.'}
            </p>
          </div>
        ) : (
          <div className="stat-card" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--color-border)' }}>
            <div style={{ width: '100%', overflowX: 'auto' }}>
              <table style={{ minWidth: '800px', width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--color-bg-hover)', borderBottom: '1px solid var(--color-border)' }}>
                    <th style={thStyle}>User</th>
                    <th style={thStyle}>Amount</th>
                    <th style={thStyle}>Description / Source</th>
                    <th style={thStyle}>Date & Time</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((tx) => (
                    <tr key={tx.id} style={{ borderBottom: '1px solid var(--color-border)' }} className="row-hover">
                      <td style={{ padding: '18px 24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <UserAvatar seed={tx.user_username || 'user'} size={32} />
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>{tx.user_name}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-faint)' }}>@{tx.user_username}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '18px 24px' }}>
                        <div style={{
                          display: 'inline-flex', alignItems: 'center', gap: 8,
                          fontWeight: 900, color: '#10B981', background: 'rgba(16, 185, 129, 0.08)',
                          padding: '8px 16px', borderRadius: '14px', fontSize: '0.9rem',
                          border: '1.2px solid rgba(16, 185, 129, 0.2)'
                        }}>
                          <RiExchangeFundsLine size={16} />
                          +{formatMoney(tx.amount)}
                        </div>
                      </td>
                      <td style={{ padding: '18px 24px', fontSize: '0.85rem', fontWeight: 500, color: 'var(--color-text-muted)' }}>
                        {tx.description}
                      </td>
                      <td style={{ padding: '18px 24px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: 'var(--color-text-faint)' }}>
                          <RiTimeLine size={14} />
                          {new Date(tx.created_at).toLocaleString()}
                        </div>
                      </td>
                    </tr>
                  ))}
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


        <style jsx>{`
          .spinner { animation: spin 1s linear infinite; border: 3px solid var(--color-primary-dim); border-top-color: var(--color-primary); border-radius: 50%; width: 40px; height: 40px; }
          @keyframes spin { to { transform: rotate(360deg); } }
          .row-hover:hover { background: var(--color-bg-hover); }

          @media (max-width: 1024px) {
            .admin-content { padding: 20px 16px !important; }
            .admin-header { flex-direction: column; align-items: flex-start !important; }
            .search-box { width: 100%; }
            .search-input { width: 100% !important; max-width: 100% !important; }
          }
        `}</style>
      </div>
    </AdminLayout>
  );
}

const thStyle: React.CSSProperties = {
  padding: '16px 24px',
  textAlign: 'left',
  fontSize: '0.7rem',
  fontWeight: 800,
  color: 'var(--color-text-faint)',
  textTransform: 'uppercase',
  letterSpacing: '0.05em'
};
