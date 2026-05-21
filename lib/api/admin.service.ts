import apiClient from './client';

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  phone: string;
  balance: number;
  role: 'user' | 'admin';
  created_at: string;
}

export interface AdminSettings {
  price_markup_multiplier: string;
  usd_to_ngn_rate: string;
  [key: string]: string;
}

export interface UsaNumberEntry {
  id: number;
  phone_number: string;
  receive_code_link: string;
  status: 'active' | 'inactive';
  uploaded_by: number;
  uploaded_by_name?: string | null;
  uploaded_by_email?: string | null;
  created_at: string;
  updated_at: string;
}

export interface UploadUsaNumberPayload {
  phoneNumber: string;
  receiveCodeLink: string;
}

export const adminService = {
  // Get all users
  getUsers: (): Promise<{ status: string; data: AdminUser[] }> =>
    apiClient.get('/admin/users'),

  // Update a user's balance
  updateUserBalance: (userId: number, balance: number): Promise<{ status: string; message: string }> =>
    apiClient.post('/admin/user/balance', { userId, balance }),

  // Get system settings (markup, etc.)
  getSettings: (): Promise<{ status: string; data: AdminSettings }> =>
    apiClient.get('/admin/settings'),

  // Update system settings
  updateSettings: (settings: Partial<AdminSettings>): Promise<{ status: string; message: string }> =>
    apiClient.post('/admin/settings', settings),

  // Get provider (SMSBower) balance
  getProviderBalance: (): Promise<{ status: string; balance: number }> =>
    apiClient.get('/admin/provider-balance'),

  // Get uploaded USA numbers
  getUsaNumbers: (): Promise<{ status: string; data: UsaNumberEntry[] }> =>
    apiClient.get('/admin/usa-numbers'),

  // Upload one or many USA numbers
  uploadUsaNumbers: (
    payload: UploadUsaNumberPayload[] | UploadUsaNumberPayload
  ): Promise<{
    status: string;
    message: string;
    data?: {
      created: Array<{ id: number; phoneNumber: string; receiveCodeLink: string }>;
      skipped: Array<{ phoneNumber: string; reason: string }>;
      errors: string[];
    };
    errors?: string[];
    skipped?: Array<{ phoneNumber: string; reason: string }>;
  }> =>
    Array.isArray(payload)
      ? apiClient.post('/admin/usa-numbers', { numbers: payload })
      : apiClient.post('/admin/usa-numbers', payload),
};
