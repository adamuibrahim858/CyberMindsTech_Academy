import api from './api';

export const authService = {
  async login(credentials) {
    const response = await api.post('/login', credentials);
    return response.data;
  },

  async logout() {
    try {
      const response = await api.post('/logout');
      return response.data;
    } finally {
      sessionStorage.removeItem('cmt_token');
      sessionStorage.removeItem('cmt_user');
      localStorage.removeItem('cmt_token');
      localStorage.removeItem('cmt_user');
    }
  },

  async getMe() {
    const response = await api.get('/me');
    return response.data;
  },

  async forgotPassword(email) {
    const response = await api.post('/forgot-password', { email });
    return response.data;
  },

  async resetPassword(data) {
    const response = await api.post('/reset-password', data);
    return response.data;
  },
};

export default authService;
