'use client';

import { useEffect, useState } from 'react';
import { userService } from '@/lib/api';
import { Transaction } from '@/types';

export function useTransactions(filter?: (transaction: Transaction) => boolean) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  useEffect(() => {
    let isMounted = true;

    const loadTransactions = async () => {
      try {
        const response = await userService.getTransactions();
        if (!isMounted) {
          return;
        }

        const nextTransactions = filter ? response.data.filter(filter) : response.data;
        setTransactions(nextTransactions);
        setError(null);
      } catch {
        if (isMounted) {
          setError('Failed to fetch transactions.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadTransactions();

    return () => {
      isMounted = false;
    };
  }, [filter]);

  return {
    error,
    loading,
    transactions,
  };
}
