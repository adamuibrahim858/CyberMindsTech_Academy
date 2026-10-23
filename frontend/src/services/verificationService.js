import api from './api';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/v1';

export const verificationService = {
  async verifyCertificate(certificateNumber) {
    // Use native fetch to avoid Axios double-encoding %2F → %252F in the URL path.
    const encoded = encodeURIComponent(certificateNumber.trim());
    const url = `${API_BASE_URL}/verify/${encoded}`;

    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
    });

    const data = await res.json();

    // NOTE: The production Apache server returns HTTP 404 even on success (server bug).
    // So we check the response body's 'status' field, NOT res.ok / HTTP status code.
    if (data?.status === 'success') {
      return data;
    }

    // Genuine error — certificate not found or server error
    const err = new Error(data?.message || 'Certificate not found.');
    err.response = { status: res.status, data };
    throw err;
  },
};

export default verificationService;
