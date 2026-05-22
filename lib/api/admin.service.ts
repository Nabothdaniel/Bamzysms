import apiClient, { decryptSensitive } from './client';

export interface AdminUser {
  id: number;
  name: string;
  username: string;
  phone?: string;
  balance: number;
  role: 'user' | 'admin';
  has_recovery_key: boolean;
  created_at: string;
}

export interface AdminUserPayload {
  userId?: number;
  name: string;
  username?: string;
  phone?: string;
  role: 'user' | 'admin';
  password?: string;
  balance?: number;
}

export interface AdminSettings {
  price_markup_multiplier: string;
  usd_to_ngn_rate: string;
  [key: string]: string;
}

export interface PricingOverride {
  id: number;
  service_code: string;
  multiplier: number | null;
  fixed_price: number | null;
  updated_at: string;
}

export interface AdminManualNumber {
  id: number;
  phone_number: string;
  country_id: number;
  country_name: string;
  service_code: string;
  service_name: string;
  cost_price: number;
  sell_price: number;
  notes?: string | null;
  has_otp?: boolean;
  status: 'available' | 'sold' | 'cancelled';
  upload_batch?: string | null;
  uploaded_by_username: string;
  sold_to_username?: string | null;
  sold_at?: string | null;
  created_at: string;
}

export interface ManualNumberCancellationRequest {
  id: number;
  manual_number_id: number;
  user_id: number;
  username: string;
  phone_number: string;
  country_name: string;
  reason: string;
  status: 'pending' | 'reviewed' | 'resolved';
  admin_note?: string | null;
  created_at: string;
}

export interface AdminUsaNumber {
  id: number;
  phone_number: string;
  service_name: string;
  category: string;
  redirect_url: string;
  cost_price: number;
  sell_price: number;
  notes?: string | null;
  otp_code?: string | null;
  has_redirect?: boolean;
  status: 'available' | 'sold' | 'cancelled';
  uploaded_by_username: string;
  sold_to_username?: string | null;
  sold_at?: string | null;
  created_at: string;
}

export const adminService = {
  // Get paginated users
  getUsers: (params: { page: number; limit: number; search?: string; role?: string }): Promise<{ 
    status: string; 
    data: AdminUser[];
    pagination: { total: number; page: number; limit: number; pages: number }
  }> =>
    apiClient.get(`/admin/users?page=${params.page}&limit=${params.limit}&search=${params.search || ''}&role=${params.role || ''}`),

  // Create a user
  createUser: (payload: AdminUserPayload): Promise<{ status: string; message: string; data: AdminUser }> =>
    apiClient.post('/admin/users', payload),

  // Update a user
  updateUser: (payload: AdminUserPayload): Promise<{ status: string; message: string; data: AdminUser }> =>
    apiClient.put('/admin/users', payload),

  // Delete a user
  deleteUser: (userId: number): Promise<{ status: string; message: string }> =>
    apiClient.delete(`/admin/users?userId=${userId}`),

  // Top-up / debit a user balance
  topUpUser: (payload: { userId: number; amount: number; type?: 'credit' | 'debit'; note?: string }): Promise<{ status: string; message: string }> =>
    apiClient.post('/admin/user/topup', payload),

  // Update a user's balance
  updateUserBalance: (userId: number, balance: number): Promise<{ status: string; message: string }> =>
    apiClient.post('/admin/user/balance', { userId, balance }),

  // Sudo Reset Password
  sudoResetPassword: (userId: number, password: string): Promise<{ status: string; message: string }> =>
    apiClient.post('/admin/user/reset-password', { userId, password }),

  // Get paginated transactions (for history/funding pages)
  getTransactions: (params: { page: number; limit: number; type?: 'credit' | 'debit' }): Promise<{ 
    status: string; 
    data: any[];
    pagination: { total: number; page: number; limit: number; pages: number }
  }> =>
    apiClient.get(`/admin/transactions?page=${params.page}&limit=${params.limit}${params.type ? `&type=${params.type}` : ''}`),


  // Get system settings (markup, etc.)
  getSettings: (): Promise<{ status: string; data: AdminSettings }> =>
    apiClient.get('/admin/settings'),

  // Update system settings
  updateSettings: (settings: Partial<AdminSettings>): Promise<{ status: string; message: string }> =>
    apiClient.post('/admin/settings', settings),

  // Get provider (SMSBower) balance
  getProviderBalance: (): Promise<{ status: string; balance: number }> =>
    apiClient.get('/admin/provider-balance'),

  // Pricing Overrides
  getPricingOverrides: (): Promise<{ status: string; data: PricingOverride[] }> =>
    apiClient.get('/admin/pricing/overrides'),

  updatePricingOverride: (data: { serviceCode: string; countryId?: number; multiplier?: number; fixedPrice?: number }): Promise<{ status: string; message: string }> =>
    apiClient.post('/admin/pricing/update', data),

  bulkUpdatePricingOverrides: (data: { countryId: number; overrides: { serviceCode: string; fixedPrice: number }[] }): Promise<{ status: string; message: string }> =>
    apiClient.post('/admin/pricing/bulk-update', data),

  deletePricingOverride: (serviceCode: string, countryId: number = 0): Promise<{ status: string; message: string }> =>
    apiClient.delete(`/admin/pricing/delete?serviceCode=${serviceCode}&countryId=${countryId}`),

  // Paginated Audit Logs
  getSystemLogs: (params: { page: number; limit: number }): Promise<{ 
    status: string; 
    data: any[];
    pagination: { total: number; page: number; limit: number; pages: number }
  }> =>
    apiClient.get(`/admin/logs?page=${params.page}&limit=${params.limit}`),

  // Analytics
  getAnalytics: (): Promise<{ status: string; data: any }> =>
    apiClient.get('/admin/analytics'),

  // Paginated Services for Price Management
  getPaginatedServices: (params: { page: number; limit: number; search?: string; countryId?: number }): Promise<{ 
    status: string; 
    data: any[]; 
    pagination: { total: number; page: number; limit: number; pages: number } 
  }> =>
    apiClient.get(`/admin/pricing/services?page=${params.page}&limit=${params.limit}&search=${params.search || ''}&countryId=${params.countryId || 0}`),


  // Get countries list
  getCountries: (): Promise<{ status: string; data: any[] }> =>
    apiClient.get('/admin/countries'),

  getManualNumbers: (params: { page: number; limit: number; search?: string; status?: string }): Promise<{
    status: string;
    data: AdminManualNumber[];
    pagination: { total: number; page: number; limit: number; pages: number };
  }> =>
    apiClient.get(`/admin/manual-numbers?page=${params.page}&limit=${params.limit}&search=${encodeURIComponent(params.search || '')}&status=${params.status || ''}`),

  createManualNumber: (payload: {
    phone_number: string;
    country_id?: number;
    country_name: string;
    cost_price?: number;
    sell_price: number;
    notes?: string;
    otp_code?: string;
  }): Promise<{ status: string; message: string; data: { id: number } }> =>
    apiClient.post('/admin/manual-numbers', payload),

  bulkCreateManualNumbers: (rows: Array<{
    phone_number: string;
    country_id?: number;
    country_name: string;
    cost_price?: number;
    sell_price: number;
    notes?: string;
    otp_code?: string;
  }>): Promise<{ status: string; message: string; data: { created: number; failed: number; errors: { row: number; message: string }[]; batch: string } }> =>
    apiClient.post('/admin/manual-numbers/bulk', { rows }),

  updateManualNumberOtp: (numberId: number, otp_code: string): Promise<{ status: string; message: string }> =>
    apiClient.post('/admin/manual-numbers/otp', { numberId, otp_code }),

  getManualNumberCancellationRequests: (params: { page: number; limit: number; status?: string }): Promise<{
    status: string;
    data: ManualNumberCancellationRequest[];
    pagination: { total: number; page: number; limit: number; pages: number };
  }> =>
    apiClient.get(`/admin/manual-numbers/cancellation-requests?page=${params.page}&limit=${params.limit}&status=${params.status || ''}`),

  getUsaNumbers: (params: { page: number; limit: number; search?: string; status?: string }): Promise<{
    status: string;
    data: AdminUsaNumber[];
    pagination: { total: number; page: number; limit: number; pages: number };
  }> =>
    apiClient.get(`/admin/usa-numbers?page=${params.page}&limit=${params.limit}&search=${encodeURIComponent(params.search || '')}&status=${params.status || ''}`),

  createUsaNumber: (payload: {
    phone_number: string;
    service_name: string;
    category: string;
    redirect_url: string;
    cost_price?: number;
    sell_price: number;
    notes?: string;
  }): Promise<{ status: string; message: string; data: { id: number } }> =>
    apiClient.post('/admin/usa-numbers', payload),

  bulkCreateUsaNumbers: (rows: Array<{
    phone_number: string;
    service_name: string;
    category: string;
    redirect_url: string;
    cost_price?: number;
    sell_price: number;
    notes?: string;
  }>): Promise<{ status: string; message: string; data: { created: number; failed: number; errors: { row: number; message: string }[]; batch: string } }> =>
    apiClient.post('/admin/usa-numbers/bulk', { rows }),

  updateUsaNumber: (payload: {
    numberId: number;
    phone_number: string;
    service_name: string;
    category: string;
    redirect_url: string;
    cost_price?: number;
    sell_price: number;
    notes?: string;
  }): Promise<{ status: string; message: string }> =>
    apiClient.post('/admin/usa-numbers/update', payload),

  deleteUsaNumber: (numberId: number): Promise<{ status: string; message: string }> =>
    apiClient.delete(`/admin/usa-numbers?numberId=${numberId}`),

  // Refresh dynamic exchange rate
  refreshExchangeRate: (): Promise<{ status: string; rate: number }> =>
    apiClient.post('/admin/exchange-rate/refresh', {}),

  // Get provider status
  getProviderStatus: (): Promise<{ status: string; data: any }> =>
    apiClient.get('/admin/provider/status'),

  // Reset a user's recovery key
  resetUserRecoveryKey: async (userId: number): Promise<{ status: string; data: { recovery_key: string }; message: string }> => {
    const res: any = await apiClient.post('/admin/user/reset-recovery-key', { userId });
    if (res.status === 'success' && res.data?.recovery_key) {
      res.data.recovery_key = await decryptSensitive(res.data.recovery_key);
    }
    return res;
  },

  // Reveal a user's recovery key
  revealUserRecoveryKey: async (userId: number): Promise<{ status: string; data: { recovery_key: string } }> => {
    const res: any = await apiClient.post('/admin/user/reveal-recovery-key', { userId });
    if (res.status === 'success' && res.data?.recovery_key) {
      res.data.recovery_key = await decryptSensitive(res.data.recovery_key);
    }
    return res;
  },
};
