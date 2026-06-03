import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usaNumberService, UsaNumberItem, userService } from '@/lib/api';
import { useAppStore } from '@/store/appStore';

export type PurchaseStepState = {
  id: number;
  phone_number: string;
  service_name: string;
  category: string;
  redirect_url?: string;
  otp_code?: string | null;
};

export function useUsaNumbers() {
  const { addToast, user, setUser } = useAppStore();
  const [available, setAvailable] = useState<UsaNumberItem[]>([]);
  const [mine, setMine] = useState<UsaNumberItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNumber, setSelectedNumber] = useState<UsaNumberItem | null>(null);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);
  const [revealedOwned, setRevealedOwned] = useState<Record<number, boolean>>({});
  const [fetchingOtpId, setFetchingOtpId] = useState<number | null>(null);
  const [latestResult, setLatestResult] = useState<{ phone: string; otp: string } | null>(null);
  const [activeStep, setActiveStep] = useState<PurchaseStepState | null>(null);
  
  // Auto-refresh is now internal/silent
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [availableRes, mineRes] = await Promise.all([
        usaNumberService.getAvailable(),
        usaNumberService.getMine(),
      ]);

      const availableRows = Array.isArray(availableRes?.data) ? availableRes.data : [];
      const mineRows = Array.isArray(mineRes?.data) ? mineRes.data : [];
      setAvailable(availableRows);
      setMine(mineRows);
    } catch (error: any) {
      if (!silent) addToast(error.message || 'Failed to load USA numbers', 'error');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefreshOtp = useCallback(async (numberId: number, silent = false) => {
    if (!silent) setFetchingOtpId(numberId);
    try {
      const res = await usaNumberService.refreshOtp(numberId);
      const otp = res?.data?.otp_code || '';
      
      if (otp) {
        const target = mine.find((item) => item.id === numberId) || activeStep;

        setLatestResult({
          phone: target?.phone_number || 'USA number',
          otp,
        });

        if (activeStep?.id === numberId) {
          setActiveStep((prev) => prev ? { ...prev, otp_code: otp } : prev);
        }

        if (!silent) addToast('OTP retrieved successfully', 'success');
        await fetchData(true);
      }
    } catch (error: any) {
      if (!silent) addToast(error.message || 'Failed to fetch OTP', 'error');
    } finally {
      if (!silent) setFetchingOtpId(null);
    }
  }, [addToast, fetchData, activeStep, mine]);

  // Sync active step with mine list
  useEffect(() => {
    if (activeStep) {
      const refreshed = mine.find((item) => item.id === activeStep.id);
      if (
        refreshed &&
        (
          refreshed.phone_number !== activeStep.phone_number ||
          refreshed.service_name !== activeStep.service_name ||
          refreshed.category !== activeStep.category ||
          refreshed.redirect_url !== activeStep.redirect_url ||
          refreshed.otp_code !== activeStep.otp_code
        )
      ) {
        setActiveStep({
          id: refreshed.id,
          phone_number: refreshed.phone_number,
          service_name: refreshed.service_name,
          category: refreshed.category,
          redirect_url: refreshed.redirect_url,
          otp_code: refreshed.otp_code,
        });
      }
      return;
    }

    // Default to the most recent purchase that doesn't have an OTP yet
    const pending = [...mine].reverse().find((item) => !item.otp_code);
    if (pending) {
      setActiveStep({
        id: pending.id,
        phone_number: pending.phone_number,
        service_name: pending.service_name,
        category: pending.category,
        redirect_url: pending.redirect_url,
        otp_code: pending.otp_code,
      });
    }
  }, [mine, activeStep]);

  // Internal Polling Logic
  useEffect(() => {
    let interval: NodeJS.Timeout;
    const pendingItems = mine.filter(item => !item.otp_code);
    
    if (autoRefresh && pendingItems.length > 0) {
      interval = setInterval(() => {
        // Poll for the active one or all pending ones sequentially
        pendingItems.forEach(item => {
          handleRefreshOtp(item.id, true);
        });
      }, 5000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, mine, handleRefreshOtp]);

  const handleBuyClick = (item: UsaNumberItem) => {
    if (!user) return;
    if (Number(user.balance) < Number(item.sell_price)) {
      addToast(`Insufficient balance. This number costs NGN ${item.sell_price.toLocaleString()}.`, 'error');
      return;
    }
    setSelectedNumber(item);
    setPinModalOpen(true);
  };

  const handlePinSuccess = async (pin: string) => {
    if (!selectedNumber) return;

    setPinLoading(true);
    try {
      if (!user?.hasPin) {
        await userService.updatePin(pin);
        addToast('Transaction PIN set successfully!', 'success');
      }

      const purchaseRes = await usaNumberService.purchase(selectedNumber.id, pin);
      const profileRes = await userService.getProfile();

      setUser(profileRes.data);
      
      const newNumber = purchaseRes?.data;
      
      setLatestResult({
        phone: newNumber?.phone_number || selectedNumber.phone_number,
        otp: '',
      });
      setActiveStep({
        id: newNumber?.id || selectedNumber.id,
        phone_number: newNumber?.phone_number || selectedNumber.phone_number,
        service_name: newNumber?.service_name || selectedNumber.service_name,
        category: newNumber?.category || selectedNumber.category,
        redirect_url: newNumber?.redirect_url || selectedNumber.redirect_url,
        otp_code: '',
      });
      
      addToast(`USA number ${selectedNumber.phone_number} purchased successfully`, 'success');
      setPinModalOpen(false);
      setSelectedNumber(null);
      await fetchData(true);
      
      // Automatic redirect under the hood if it's a direct service link? 
      // User said "redirect should happen under the hood". 
      // If there's a redirect_url, we could potentially open it, but "under the hood" usually means silent.
      // Maybe it means the logic of checking the redirect_url for OTP should be silent.
      
    } catch (error: any) {
      addToast(error.message || 'Purchase failed', 'error');
    } finally {
      setPinLoading(false);
    }
  };

  return {
    available,
    mine,
    loading,
    selectedNumber,
    setSelectedNumber,
    pinModalOpen,
    setPinModalOpen,
    pinLoading,
    revealedOwned,
    setRevealedOwned,
    fetchingOtpId,
    latestResult,
    activeStep,
    fetchData,
    handleBuyClick,
    handlePinSuccess,
    handleRefreshOtp,
  };
}
