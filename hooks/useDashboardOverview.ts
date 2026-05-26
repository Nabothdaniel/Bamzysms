'use client';

import { useCallback, useEffect, useState } from 'react';
import { paymentService, smsService, userService } from '@/lib/api';
import { manualNumberService } from '@/lib/api/manual-number.service';
import { SmsPurchase, TelegramNumber, Transaction } from '@/types';
import { useAppStore } from '@/store/appStore';

export function useDashboardOverview() {
  const { addToast, setUser, virtualAccounts, setVirtualAccounts } = useAppStore();
  const [recentPurchases, setRecentPurchases] = useState<SmsPurchase[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [telegramPurchases, setTelegramPurchases] = useState<TelegramNumber[]>([]);

  const refreshProfile = useCallback(async () => {
    const response = await userService.getProfile();
    setUser(response.data);
    return response.data;
  }, [setUser]);

  const loadOverviewData = useCallback(async () => {
    try {
      await refreshProfile();

      const [purchasesResponse, transactionsResponse, telegramResponse] = await Promise.all([
        smsService.getPurchases(),
        userService.getTransactions(),
        manualNumberService.getMyTelegramNumbers(),
      ]);

      setRecentPurchases(purchasesResponse.data.slice(0, 5));
      setRecentTransactions(transactionsResponse.data.slice(0, 5));
      setTelegramPurchases(telegramResponse.data || []);
    } catch {
      addToast('Failed to load dashboard overview.', 'error');
    }
  }, [addToast, refreshProfile]);

  const loadVirtualAccounts = useCallback(async () => {
    if (virtualAccounts.length > 0) {
      return;
    }

    try {
      const response = await paymentService.getVirtualAccount();
      if (response.status !== 'success' || response.bankAccounts.length === 0) {
        return;
      }

      const sortedAccounts = [...response.bankAccounts].sort((firstAccount, secondAccount) =>
        firstAccount.bankName.localeCompare(secondAccount.bankName)
      );
      setVirtualAccounts(sortedAccounts);
    } catch {
      addToast('Failed to load virtual account.', 'error');
    }
  }, [addToast, setVirtualAccounts, virtualAccounts.length]);

  useEffect(() => {
    void loadOverviewData();
    void loadVirtualAccounts();
  }, [loadOverviewData, loadVirtualAccounts]);

  return {
    recentPurchases,
    recentTransactions,
    telegramPurchases,
    refreshProfile,
  };
}
