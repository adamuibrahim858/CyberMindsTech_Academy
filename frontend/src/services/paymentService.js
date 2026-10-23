import api from './api';

export const paymentService = {
  /**
   * Fetch payment status and pricing for a certificate
   */
  async getPaymentStatus(certificateId) {
    const response = await api.get(`/student/certificates/${certificateId}/payment-status`);
    return response.data;
  },

  /**
   * Validate and preview coupon calculation
   */
  async applyCoupon(certificateId, code) {
    const response = await api.post(`/student/certificates/${certificateId}/apply-coupon`, { code });
    return response.data;
  },

  /**
   * Unlock certificate for free (when price is 0 or 100% coupon applied)
   */
  async claimFree(certificateId, code = '') {
    const payload = code ? { code } : {};
    const response = await api.post(`/student/certificates/${certificateId}/claim-free`, payload);
    return response.data;
  },

  /**
   * Initialize Paystack payment transaction
   */
  async initializePayment(certificateId, couponCode = null) {
    const payload = couponCode ? { coupon_code: couponCode } : {};
    const response = await api.post(`/student/certificates/${certificateId}/initialize-payment`, payload);
    return response.data;
  },

  /**
   * Securely verify Paystack payment on Laravel backend
   */
  async verifyPayment(certificateId, reference) {
    const response = await api.post(`/student/certificates/${certificateId}/verify-payment`, { reference });
    return response.data;
  },
  /**
   * Verify callback status from Central Gateway return
   */
  async checkCallback(reference, certificateId) {
    const response = await api.post('/student/payment/check-callback', {
      reference,
      certificate_id: certificateId,
    });
    return response.data;
  },
};

export default paymentService;
