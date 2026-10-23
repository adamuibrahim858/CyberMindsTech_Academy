import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
  // If cookies are ever needed, withCredentials can be true
  withCredentials: false,
});

// Attach token from sessionStorage/localStorage
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('cmt_token') || localStorage.getItem('cmt_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for handling 401s and standard error parsing
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // 401 Unauthorized - session expired
      if (error.response.status === 401) {
        sessionStorage.removeItem('cmt_token');
        sessionStorage.removeItem('cmt_user');
        localStorage.removeItem('cmt_token');
        localStorage.removeItem('cmt_user');

        const currentPath = window.location.pathname;
        if (!['/login', '/forgot-password', '/reset-password'].includes(currentPath) && !currentPath.startsWith('/verify')) {
          window.dispatchEvent(new CustomEvent('auth:expired'));
        }
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Format API error messages for display
 */
export const getErrorMessage = (error, fallback = 'An unexpected error occurred') => {
  if (!error) return fallback;
  if (typeof error === 'string') return error;

  if (error.response?.data) {
    const data = error.response.data;

    // Validation errors dictionary { field: ['error1', 'error2'] }
    if (data.errors && typeof data.errors === 'object') {
      const messages = Object.values(data.errors).flat();
      if (messages.length > 0) {
        return messages.join(' ');
      }
    }

    if (data.message) {
      return data.message;
    }
  }

  if (error.message) {
    return error.message;
  }

  return fallback;
};

export default api;
