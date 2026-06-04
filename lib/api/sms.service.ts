import apiClient from './client';
import type { PaginatedMeta, SmsPurchase } from '@/types';

export interface SmsService {
  code: string;
  name: string;
}

export interface SmsCountry {
  id: number;
  eng: string;
  flag: string;
  flagUrl?: string;
}

export interface AvailabilityInfo {
  available: boolean;
  price: number | null;
  count: number;
}

export const smsService = {
  getSmsBowerServices: (): Promise<{ status: string; data: SmsService[] }> =>
    apiClient.get('/services'),

  getCountries: (): Promise<{ status: string; data: SmsCountry[] }> =>
    apiClient.get('/countries'),

  getAvailability: (service: string, country: number): Promise<{ status: string; data: AvailabilityInfo }> =>
    apiClient.get(`/available?service=${service}&country=${country}`),

  buyNumber: (payload: {
    serviceCode: string;
    serviceName: string;
    countryId: number;
    countryName: string;
    maxPrice: number;
    pin: string;
    quantity?: number;
  }): Promise<{ status: string; message?: string }> =>
    apiClient.post('/sms/buy', payload),

  // Legacy SMS helpers used by the dashboard history page.
  getSmsStatus: (activationId: number): Promise<{ status: string; data: { smsStatus: string; code?: string | null } }> =>
    apiClient.get(`/sms/status?id=${activationId}`),

  revealPlainNumber: (activationId: number): Promise<{ status: string; data: { phoneNumber: string; otpCode: string } }> =>
    apiClient.post('/sms/reveal', { activationId }),

  setActivationStatus: (activationId: number, status: number): Promise<{ status: string; message?: string }> =>
    apiClient.post('/sms/set-status', { activationId, status }),

  // User purchase history (paginated).
  getPurchases: (limit = 20, offset = 0): Promise<{ status: string; data: SmsPurchase[]; meta: PaginatedMeta }> =>
    apiClient.get(`/sms/purchases?limit=${limit}&offset=${offset}`),

  // Hide a purchase from history.
  hidePurchase: (id: number): Promise<{ status: string; message: string }> =>
    apiClient.post('/sms/hide', { id }),
};
