import apiClient from './client';

export interface UsaNumberItem {
  id: number;
  phone_number: string;
  service_name: string;
  category: string;
  sell_price: number;
  notes?: string | null;
  otp_code?: string | null;
  sold_at?: string | null;
  created_at: string;
}

export const usaNumberService = {
  getAvailable: (): Promise<{ status: string; data: UsaNumberItem[] }> =>
    apiClient.get('/usa-numbers/available?limit=200'),

  getMine: (): Promise<{ status: string; data: UsaNumberItem[] }> =>
    apiClient.get('/usa-numbers/mine'),

  purchase: (numberId: number, pin: string): Promise<{ status: string; message: string; data: any }> =>
    apiClient.post('/usa-numbers/purchase', { numberId, pin }),

  refreshOtp: (numberId: number): Promise<{ status: string; message: string; data: { otp_code: string } }> =>
    apiClient.post('/usa-numbers/refresh-otp', { numberId }),
};
