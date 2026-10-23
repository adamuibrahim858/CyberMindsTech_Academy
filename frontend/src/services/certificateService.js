import api from './api';

export const certificateService = {
  // Admin endpoints
  async getCertificates(params = {}) {
    const response = await api.get('/admin/certificates', { params });
    return response.data;
  },

  async getCertificate(id) {
    const response = await api.get(`/admin/certificates/${id}`);
    return response.data;
  },

  async revokeCertificate(id, payload) {
    const response = await api.post(`/admin/certificates/${id}/revoke`, payload);
    return response.data;
  },

  async downloadAdminCertificate(id) {
    const response = await api.get(`/admin/certificates/${id}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },

  // Student endpoints
  async getMyCertificates() {
    const response = await api.get('/student/certificates');
    return response.data;
  },

  async downloadStudentCertificate(id) {
    const response = await api.get(`/student/certificates/${id}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Helper to trigger browser download of a blob
   */
  triggerDownload(blob, filename = 'certificate.pdf') {
    const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.parentNode.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  /**
   * Helper to open blob in print mode or new tab
   */
  openPdfBlob(blob) {
    const url = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
    return url;
  },
};

export default certificateService;
