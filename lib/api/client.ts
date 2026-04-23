import axios from 'axios';

const getApiUrl = () => {
  // Use env variable if present, otherwise default to local server for development
  const url = process.env.NEXT_PUBLIC_API_URL || 'https://bamzysms.com/api';
  // Strip quotes and semicolons
  return url.replace(/["';]/g, '');
};

const API_URL = getApiUrl();

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper for simple encryption using Web Crypto API
async function encryptSensitive(value: string): Promise<string> {
  try {
    const keyText = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || 'BAMZY-DEFAULT-KEY-2026';
    const encoder = new TextEncoder();

    // PHP uses hash('sha256', $key, true), so we must digest the key text
    const keyHash = await crypto.subtle.digest('SHA-256', encoder.encode(keyText));

    const data = encoder.encode(value);

    // Convert hashed key to a crypto key
    const keyBuffer = await crypto.subtle.importKey(
      'raw',
      keyHash,
      { name: 'AES-CBC' },
      false,
      ['encrypt']
    );

    const iv = crypto.getRandomValues(new Uint8Array(16));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-CBC', iv },
      keyBuffer,
      data
    );

    // Combine IV and Encrypted data, then base64 encode
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);

    return btoa(String.fromCharCode(...combined));
  } catch (e) {
    console.error('Encryption failed', e);
    return value; // Fallback to plain text if crypto fails
  }
}

// Helper for decryption using Web Crypto API
export async function decryptSensitive(encryptedBase64: string): Promise<string> {
  try {
    const keyText = process.env.NEXT_PUBLIC_ENCRYPTION_KEY || 'BAMZY-DEFAULT-KEY-2026';
    const encoder = new TextEncoder();
    const keyHash = await crypto.subtle.digest('SHA-256', encoder.encode(keyText));

    const combined = new Uint8Array(
      atob(encryptedBase64).split('').map(c => c.charCodeAt(0))
    );

    const iv = combined.slice(0, 16);
    const ciphertext = combined.slice(16);

    const keyBuffer = await crypto.subtle.importKey(
      'raw',
      keyHash,
      { name: 'AES-CBC' },
      false,
      ['decrypt']
    );

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-CBC', iv },
      keyBuffer,
      ciphertext
    );

    return new TextDecoder().decode(decrypted);
  } catch (e) {
    console.error('Decryption failed', e);
    return encryptedBase64; // Fallback to original text if decryption fails
  }
}

// Request interceptor for attaching token and encrypting sensitive data
apiClient.interceptors.request.use(
  async (config) => {
    if (typeof window !== 'undefined') {
      // 1. Attach Auth Token
      // We check both storages for iOS compatibility
      let token = sessionStorage.getItem('bamzysms-token');
      if (!token) {
        token = localStorage.getItem('bamzysms-token');
      }

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // 2. Encrypt sensitive fields
      if (config.data) {
        const sensitiveFields = [
          'password',
          'pin', 'transaction_pin',
          'old_password', 'new_password', 'current_password'
        ];
        // Note: confirm_password is intentionally excluded — each encryptSensitive() call
        // uses a fresh random IV, so encrypting both password fields separately produces
        // different ciphertexts that the backend can never match.

        for (const field of sensitiveFields) {
          if (config.data[field]) {
            config.data[field] = await encryptSensitive(config.data[field]);
          }
        }
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // Check if we are on a route that requires authentication
    const isPublicRoute = typeof window !== 'undefined' &&
      (window.location.pathname === '/login' ||
        window.location.pathname === '/register' ||
        window.location.pathname === '/');

    // Auto-logout on 401 (expired/invalid JWT)
    if (error.response?.status === 401 && typeof window !== 'undefined' && !isPublicRoute) {
      console.warn('API returned 401 - Session expired or invalid. Redirecting to login.');

      // Only clear if we actually have a token (to prevent logout loops)
      const token = localStorage.getItem('bamzysms-token') || sessionStorage.getItem('bamzysms-token');

      if (token) {
        ['bamzysms-token', 'bamzysms-storage'].forEach((k) => {
          try { localStorage.removeItem(k); } catch { }
          try { sessionStorage.removeItem(k); } catch { }
        });

        // Hard redirect to login — use replace so back button won't return to dashboard
        window.location.replace('/login?expired=true');
      }

      return Promise.reject(new Error('Session expired. Please log in again.'));
    }

    const message = error.response?.data?.message || 'Something went wrong';
    return Promise.reject(new Error(message));
  }
);

export default apiClient;
