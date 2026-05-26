export interface ToastMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface User {
  id: number;
  username: string;
  name: string;
  phone?: string;
  balance: number;
  smsUnits: number;
  referralCode: string;
  role: 'user' | 'admin';
  hasPin: boolean;
  recovery_key_saved: boolean;
  whatsapp_notifications: boolean;
  whatsapp_number?: string;
}

export interface Notification {
  id: number;
  event_type: string;
  payload: string; // JSON string
  is_read: boolean;
  created_at: string;
}

export interface Transaction {
  id: number;
  amount: number | string;
  type: 'credit' | 'debit';
  description: string;
  status?: 'pending' | 'completed' | 'failed';
  created_at: string;
}

export interface SmsPurchase {
  id: number;
  activation_id?: number;
  phone_number: string;
  service_name?: string;
  country_name?: string;
  activation_cost?: number | string;
  otp_code?: string | null;
  status: 'pending' | 'received' | 'completed' | 'cancelled' | 'expired';
  created_at: string;
  updated_at?: string;
}

export interface PaginatedMeta {
  total?: number;
  page?: number;
  per_page?: number;
  limit?: number;
  offset?: number;
}

export interface TelegramNumber {
  id: number;
  phone_number: string;
  country_id: number;
  country_name: string;
  service_code: string;
  service_name: string;
  sell_price: number;
  notes?: string | null;
  otp_code?: string;
  sold_at?: string | null;
  created_at: string;
}

export interface VirtualAccount {
  bankCode: string;
  accountNumber: string;
  accountName: string;
  bankName: string;
  Reserved_Account_Id?: string;
}

export interface AppState {
  // UI
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  toggleMobileMenu: () => void;

  // Sidebar
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  // Auth
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User, token?: string) => void;
  logout: () => void;
  setUser: (user: User) => void;
  updateUserBalance: (balance: number) => void;

  // Payments
  virtualAccounts: VirtualAccount[];
  setVirtualAccounts: (accounts: VirtualAccount[]) => void;

  // Toasts
  toasts: ToastMessage[];
  addToast: (message: string, type: ToastMessage['type']) => void;
  removeToast: (id: string) => void;

  // Notifications
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Notification) => void;
  setNotifications: (notifications: Notification[], unreadCount: number) => void;
  markRead: (id?: number) => void;

  // Active nav (landing)
  activeSection: string;
  setActiveSection: (section: string) => void;

  // Welcome modal
  welcomeModalSeen: boolean;
  setWelcomeModalSeen: () => void;

  // Privacy
  balanceHidden: boolean;
  setBalanceHidden: (hidden: boolean) => void;

  // Hydration
  hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;
}
