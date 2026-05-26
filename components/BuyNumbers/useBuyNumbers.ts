'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/appStore';
import { smsService, userService, SmsCountry, SmsService, AvailabilityInfo } from '@/lib/api';
import { formatMoney } from '@/lib/utils';

export function useBuyNumbers(defaultCountry: string) {
  const router = useRouter();
  const { addToast, user, setUser } = useAppStore();
  
  // Data lists
  const [countries, setCountries] = useState<SmsCountry[]>([]);
  const [services, setServices] = useState<SmsService[]>([]);
  
  // Selections
  const [selectedCountryId, setSelectedCountryId] = useState<number | null>(null);
  const [selectedServiceCode, setSelectedServiceCode] = useState<string>('');
  const [priceInfo, setPriceInfo] = useState<AvailabilityInfo | null>(null);
  
  // UI states
  const [search, setSearch] = useState('');
  const [dropOpen, setDropOpen] = useState(false);
  const [countryDropOpen, setCountryDropOpen] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [checkingPrice, setCheckingPrice] = useState(false);
  const [accordionOpen, setAccordionOpen] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  
  // PIN states
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);

  // 1. Initial fetch: Countries and Services
  useEffect(() => {
    const init = async () => {
      try {
        const [countriesRes, servicesRes] = await Promise.all([
          smsService.getCountries(),
          smsService.getSmsBowerServices()
        ]);
        
        setCountries(countriesRes.data);
        setServices(servicesRes.data);
        
        // Find default country ID (robust match)
        const def = countriesRes.data.find(c => 
          c.eng.toLowerCase() === defaultCountry.toLowerCase() ||
          c.eng.toLowerCase().includes(defaultCountry.toLowerCase()) ||
          (defaultCountry === 'USA' && c.eng.toLowerCase().includes('united states'))
        );
        if (def) setSelectedCountryId(def.id);
        else if (countriesRes.data.length > 0) setSelectedCountryId(countriesRes.data[0].id);

      } catch (err: any) {
        addToast(err.message || 'Failed to load services', 'error');
      } finally {
        setFetching(false);
      }
    };
    init();
  }, [addToast, defaultCountry]);

  // 2. Fetch price/availability when both selections are made
  useEffect(() => {
    const loadAvailability = async () => {
      if (selectedCountryId === null || !selectedServiceCode) {
        setPriceInfo(null);
        return;
      }

      setCheckingPrice(true);
      try {
        const response = await smsService.getAvailability(selectedServiceCode, selectedCountryId);
        setPriceInfo(response.data);
      } catch {
        setPriceInfo({ available: false, price: null, count: 0 });
        addToast('Could not fetch price for this selection.', 'error');
      } finally {
        setCheckingPrice(false);
      }
    };

    void loadAvailability();
  }, [selectedCountryId, selectedServiceCode, addToast]);

  const country = countries.find(c => c.id === selectedCountryId);
  const filteredServices = services.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));
  const chosenService = services.find(s => s.code === selectedServiceCode);

  const handleBuy = () => {
    if (!selectedServiceCode || !selectedCountryId || !country || !chosenService) { 
      addToast('Please select a country and service first.', 'error'); 
      return; 
    }
    
    if (!priceInfo?.available || priceInfo.price === null) {
      addToast('This service is currently unavailable for ' + country.eng, 'error');
      return;
    }

    const totalCost = priceInfo.price * quantity;
    if (!user || user.balance < totalCost) { 
      addToast(`Insufficient balance. This costs ${formatMoney(totalCost)}, you have ${formatMoney(user?.balance)}.`, 'error'); 
      return; 
    }

    setPinModalOpen(true);
  };

  const handlePinSuccess = async (pin: string) => {
    setPinLoading(true);
    try {
      // If user doesn't have a PIN, set it first
      if (!user?.hasPin) {
        await userService.updatePin(pin);
        addToast('Transaction PIN set successfully!', 'success');
      }

      await smsService.buyNumber({
        serviceCode: selectedServiceCode,
        serviceName: chosenService!.name,
        countryId: selectedCountryId!,
        countryName: country!.eng,
        maxPrice: priceInfo!.price!,
        pin,
        quantity
      });
      
      setSelectedServiceCode('');
      setPurchaseError(null);
      setPinModalOpen(false);
      setQuantity(1);
      
      const profileRes = await userService.getProfile();
      setUser(profileRes.data);

      addToast(`${quantity} X ${chosenService!.name} number(s) purchased successfully!`, 'success');
      router.push('/dashboard/user/numbers-history');
    } catch (error: any) {
      setPurchaseError(error.message || 'Purchase failed');
      addToast(error.message || 'Purchase failed', 'error');
    } finally {
      setPinLoading(false);
    }
  };

  return {
    // Data
    countries, services, filteredServices, country, chosenService, priceInfo, user,
    // State
    search, setSearch,
    dropOpen, setDropOpen,
    countryDropOpen, setCountryDropOpen,
    purchaseError, setPurchaseError,
    loading, fetching, checkingPrice,
    accordionOpen, setAccordionOpen,
    pinModalOpen, setPinModalOpen,
    pinLoading,
    selectedCountryId, setSelectedCountryId,
    selectedServiceCode, setSelectedServiceCode,
    quantity, setQuantity,
    // Actions
    handleBuy, handlePinSuccess,
    incrementQuantity: () => setQuantity(q => Math.min(20, q + 1)),
    decrementQuantity: () => setQuantity(q => Math.max(1, q - 1))
  };
}
