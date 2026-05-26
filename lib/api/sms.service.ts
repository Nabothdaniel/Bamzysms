import apiClient from './client';
import type { PaginatedMeta, SmsPurchase } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SmsService {
  code: string;
  name: string;
}

export interface SmsCountry {
  id: number;
  eng: string;
  flag: string;
  flagUrl?: string; // New field for premium flag icons
}

export interface AvailabilityInfo {
  available: boolean;
  price: number | null;   // price in USD as returned by SMSBower
  count: number;
}

export interface BuyResult {
  id: number;
  activationId: number;
  phoneNumber: string;
  serviceName: string;
  countryName: string;
  price: number;
  newBalance: number;
  smsStatus: string;
}

export interface SmsStatusResult {
  smsStatus: 'WAIT_CODE' | 'WAIT_RETRY' | 'OK' | 'CANCEL';
  code: string | null;
}

// ─── API calls ────────────────────────────────────────────────────────────────

export const smsService = {
  // Live service list from SMSBower
  getSmsBowerServices: (): Promise<{ status: string; data: SmsService[] }> =>
    apiClient.get('/services'),

  // Live country list from SMSBower
  getCountries: (): Promise<{ status: string; data: SmsCountry[] }> =>
    apiClient.get('/countries'),

  // Check availability + cheapest price for a service/country pair
  getAvailability: (serviceCode: string, countryId: number): Promise<{ status: string; data: AvailabilityInfo }> =>
    apiClient.get(`/available?service=${serviceCode}&country=${countryId}`),

  // Purchase a real number from SMSBower
  buyNumber: (payload: {
    serviceCode: string;
    serviceName: string;
    countryId: number;
    countryName: string;
    maxPrice?: number;
    pin: string;
    quantity?: number;
  }): Promise<{ status: string; message: string; data: BuyResult }> =>
    apiClient.post('/sms/buy', payload),

  // Reveal plain-text phone number and OTP using PIN
  revealPlainNumber: (activationId: number, pin?: string): Promise<{ status: string; data: { phoneNumber: string; otpCode: string } }> =>
    apiClient.post('/sms/reveal', { activationId, pin }),

  // Poll OTP status for an activation
  getSmsStatus: (activationId: number): Promise<{ status: string; data: SmsStatusResult }> =>
    apiClient.get(`/sms/status?id=${activationId}`),

  // Update activation lifecycle (1=ready, 3=retry, 6=confirm, 8=cancel)
  setActivationStatus: (activationId: number, status: 1 | 3 | 6 | 8): Promise<{ status: string; response: string }> =>
    apiClient.post('/sms/set-status', { activationId, status }),

  // User's purchase history (paginated)
  getPurchases: (limit = 20, offset = 0): Promise<{ status: string; data: SmsPurchase[]; meta: PaginatedMeta }> =>
    apiClient.get(`/sms/purchases?limit=${limit}&offset=${offset}`),

  // Hide a purchase from history
  hidePurchase: (id: number): Promise<{ status: string; message: string }> =>
    apiClient.post('/sms/hide', { id }),
};
