import api from './api';

export const studentService = {
  // Admin endpoints
  async getStudents(params = {}) {
    const response = await api.get('/admin/students', { params });
    return response.data;
  },

  async getStudent(id) {
    const response = await api.get(`/admin/students/${id}`);
    return response.data;
  },

  async createStudent(payload) {
    const response = await api.post('/admin/students', payload);
    return response.data;
  },

  async updateStudent(id, payload) {
    const response = await api.put(`/admin/students/${id}`, payload);
    return response.data;
  },

  async resetStudentPassword(id, payload) {
    const response = await api.post(`/admin/students/${id}/reset-password`, payload);
    return response.data;
  },

  // Student portal endpoints
  async getProfile() {
    const response = await api.get('/student/profile');
    return response.data;
  },

  async updateProfile(payload) {
    const response = await api.put('/student/profile', payload);
    return response.data;
  },
};

export default studentService;
