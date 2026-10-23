import api from './api';

export const couponService = {
  // Admin endpoints
  async getCoupons(params = {}) {
    const response = await api.get('/admin/coupons', { params });
    return response.data;
  },

  async getCoupon(id) {
    const response = await api.get(`/admin/coupons/${id}`);
    return response.data;
  },

  async createCoupon(payload) {
    const response = await api.post('/admin/coupons', payload);
    return response.data;
  },

  async updateCoupon(id, payload) {
    const response = await api.put(`/admin/coupons/${id}`, payload);
    return response.data;
  },

  async deleteCoupon(id) {
    const response = await api.delete(`/admin/coupons/${id}`);
    return response.data;
  },
};

export default couponService;
