'use client';

import React from 'react';
import { RiShoppingCartLine, RiInformationLine, RiAddLine, RiSubtractLine } from 'react-icons/ri';
import PinModal from '@/components/ui/PinModal';
import Tooltip from '@/components/ui/Tooltip';
import { formatMoney } from '@/lib/utils';

import { useBuyNumbers } from './useBuyNumbers';
import { BuyNumbersProps, FAQItem } from './types';
import { StatusBanner } from './components/StatusBanner';
import { CountryDropdown } from './components/CountryDropdown';
import { ServiceDropdown } from './components/ServiceDropdown';
import { FAQAccordion } from './components/FAQAccordion';

const FAQ_SECTIONS: FAQItem[] = [
  {
    id: 'issues',
    title: 'Read If You\'re Encountering Any Issues',
    content: 'If your number is not receiving OTP, please wait 2–3 minutes and try again. Ensure your wallet has sufficient balance. Contact support via WhatsApp or Telegram if the issue persists.',
  },
  {
    id: 'before',
    title: 'Read Before You Buy Numbers',
    content: 'Numbers are one-time use only. Once you receive an OTP, the number expires. Prices vary per service and country. Ensure you have sufficient balance before purchasing. No refunds after a number is assigned.',
  },
];

export default function BuyNumbers({ defaultCountry = 'USA', lockCountry = false }: BuyNumbersProps) {
  const logic = useBuyNumbers(defaultCountry);

  if (logic.fetching) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-faint)' }}>
        Loading services...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <PinModal
        isOpen={logic.pinModalOpen}
        onClose={() => logic.setPinModalOpen(false)}
        onSuccess={logic.handlePinSuccess}
        isLoading={logic.pinLoading}
        title={!logic.user?.hasPin ? "Set Your Transaction PIN" : "Confirm Purchase"}
        description={!logic.user?.hasPin 
          ? "You haven't set a transaction PIN yet. Please create a 4-digit PIN to secure your purchases."
          : `Please enter your 4-digit transaction PIN to purchase ${logic.quantity} x ${logic.chosenService?.name} number(s) for ${formatMoney((logic.priceInfo?.price || 0) * logic.quantity)}.`
        }
      />

      <div className="stat-card">
        <h2 className="font-display font-bold text-base mb-5">
          Buy {logic.country?.eng || 'SMS'} Number
        </h2>

        {logic.purchaseError && (
          <StatusBanner message={logic.purchaseError} onClose={() => logic.setPurchaseError(null)} />
        )}

        <div className="flex flex-col gap-3.5">
          <CountryDropdown
            countries={logic.countries}
            selectedCountryId={logic.selectedCountryId}
            selectedCountry={logic.country}
            isOpen={logic.countryDropOpen}
            setIsOpen={logic.setCountryDropOpen}
            onSelect={logic.setSelectedCountryId}
            disabled={lockCountry}
          />

          <ServiceDropdown
            services={logic.services}
            filteredServices={logic.filteredServices}
            selectedServiceCode={logic.selectedServiceCode}
            chosenService={logic.chosenService}
            isOpen={logic.dropOpen}
            setIsOpen={logic.setDropOpen}
            search={logic.search}
            setSearch={logic.setSearch}
            onSelect={logic.setSelectedServiceCode}
          />

          {logic.selectedServiceCode && logic.selectedCountryId !== null && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[var(--color-primary-dim)] border border-[var(--color-primary-glow)] min-h-[42px]">
              {logic.checkingPrice ? (
                <span style={{ fontSize: '0.875rem', color: 'var(--color-text-faint)' }}>Checking availability...</span>
              ) : logic.priceInfo?.available ? (
                <Tooltip content="Live pricing includes provider cost and platform service fee.">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <RiInformationLine size={15} color="var(--color-primary)" />
                    <span style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
                      Price per number: 
                      <strong style={{ color: 'var(--color-primary)', marginLeft: 4 }}>{formatMoney(logic.priceInfo.price)}</strong>
                      <span style={{ marginLeft: 8, fontSize: '0.75rem', opacity: 0.6 }}>({logic.priceInfo.count} available)</span>
                    </span>
                  </div>
                </Tooltip>
              ) : (
                <span style={{ fontSize: '0.875rem', color: '#EF4444' }}>This service is currently out of stock for this country.</span>
              )}
            </div>
          )}

          {logic.priceInfo?.available && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--color-bg-1)] border border-[var(--color-border)]">
              <label className="text-sm font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Quantity</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <button 
                  onClick={logic.decrementQuantity}
                  disabled={logic.quantity <= 1}
                  style={{ 
                    width: 32, height: 32, borderRadius: 8, border: '1px solid var(--color-border)',
                    background: 'var(--color-bg-2)', color: 'var(--color-text)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: logic.quantity <= 1 ? 'not-allowed' : 'pointer',
                    opacity: logic.quantity <= 1 ? 0.4 : 1,
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => logic.quantity > 1 && (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                >
                  <RiSubtractLine size={16} />
                </button>
                
                <div style={{ width: 30, textAlign: 'center', fontWeight: 800, fontSize: '1.1rem', color: 'var(--color-primary)', fontFamily: 'var(--font-display)' }}>
                  {logic.quantity}
                </div>

                <button 
                  onClick={logic.incrementQuantity}
                  disabled={logic.quantity >= 20}
                  style={{ 
                    width: 32, height: 32, borderRadius: 8, border: '1px solid var(--color-border)',
                    background: 'var(--color-bg-2)', color: 'var(--color-text)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: logic.quantity >= 20 ? 'not-allowed' : 'pointer',
                    opacity: logic.quantity >= 20 ? 0.4 : 1,
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => logic.quantity < 20 && (e.currentTarget.style.borderColor = 'var(--color-primary)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                >
                  <RiAddLine size={16} />
                </button>
              </div>
            </div>
          )}

          <button
            onClick={logic.handleBuy}
            disabled={logic.loading || !logic.selectedServiceCode || logic.checkingPrice || !logic.priceInfo?.available}
            className="btn-primary p-3.5 w-full text-sm disabled:opacity-50 gap-2 mt-1"
          >
            {logic.loading ? 'Processing...' : <><RiShoppingCartLine size={18} /> Buy {logic.quantity > 1 ? `${logic.quantity} Numbers` : 'Number'}</>}
          </button>
        </div>
      </div>

      <FAQAccordion
        items={FAQ_SECTIONS}
        openId={logic.accordionOpen}
        setOpenId={logic.setAccordionOpen}
      />
    </div>
  );
}
