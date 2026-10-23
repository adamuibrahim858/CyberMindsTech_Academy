import api from './api';

export const courseService = {
  // Admin endpoints
  async getCourses(params = {}) {
    const response = await api.get('/admin/courses', { params });
    return response.data;
  },

  async getCourse(id) {
    const response = await api.get(`/admin/courses/${id}`);
    return response.data;
  },

  async createCourse(payload) {
    const response = await api.post('/admin/courses', payload);
    return response.data;
  },

  async updateCourse(id, payload) {
    const response = await api.put(`/admin/courses/${id}`, payload);
    return response.data;
  },

  async deleteCourse(id) {
    const response = await api.delete(`/admin/courses/${id}`);
    return response.data;
  },

  // Student endpoints
  async getMyCourses() {
    const response = await api.get('/student/courses');
    return response.data;
  },
};

export default courseService;
