import api from './api';

export const enrolmentService = {
  // Admin endpoints
  async getEnrolments(params = {}) {
    const response = await api.get('/admin/enrolments', { params });
    return response.data;
  },

  async getEnrolment(id) {
    const response = await api.get(`/admin/enrolments/${id}`);
    return response.data;
  },

  async createEnrolment(payload) {
    const response = await api.post('/admin/enrolments', payload);
    return response.data;
  },

  async updateStatus(id, payload) {
    const response = await api.patch(`/admin/enrolments/${id}/status`, payload);
    return response.data;
  },
};

export default enrolmentService;
