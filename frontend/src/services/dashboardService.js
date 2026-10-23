import api from './api';

export const dashboardService = {
  async getAdminStats() {
    const response = await api.get('/admin/dashboard');
    return response.data;
  },

  async getStudentStats() {
    const response = await api.get('/student/dashboard');
    return response.data;
  },
};

export default dashboardService;
