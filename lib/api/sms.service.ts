import apiClient from './client';
import type { PaginatedMeta, SmsPurchase } from '@/types';

// NOTE: SMS Bower implementation has been removed as per user request.
// Only history and generic types remain if needed for other parts of the system.

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
  // Methods removed: getSmsBowerServices, getCountries, getAvailability, buyNumber, revealPlainNumber, getSmsStatus, setActivationStatus
  
  // User's purchase history (paginated) - Keep if needed for migration/reference
  getPurchases: (limit = 20, offset = 0): Promise<{ status: string; data: SmsPurchase[]; meta: PaginatedMeta }> =>
    apiClient.get(`/sms/purchases?limit=${limit}&offset=${offset}`),

  // Hide a purchase from history
  hidePurchase: (id: number): Promise<{ status: string; message: string }> =>
    apiClient.post('/sms/hide', { id }),
};
