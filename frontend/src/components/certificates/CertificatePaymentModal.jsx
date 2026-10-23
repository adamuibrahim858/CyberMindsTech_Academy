import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  ShieldCheck,
  Tag,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Lock,
  ArrowRight,
  X,
} from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Input from '../forms/Input';
import paymentService from '../../services/paymentService';
import { getErrorMessage } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';

const CertificatePaymentModal = ({
  isOpen,
  onClose,
  certificate,
  onPaymentSuccess,
}) => {
  const toast = useToast();
  const { user } = useAuth();

  const [isLoadingStatus, setIsLoadingStatus] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState(null);

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');

  // Checkout execution state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingText, setProcessingText] = useState('');

  // Load payment status and key on modal open
  useEffect(() => {
    if (isOpen && certificate?.id) {
      setCouponCode('');
      setAppliedCoupon(null);
      setCouponError('');
      setIsProcessing(false);

      const fetchStatus = async () => {
        try {
          setIsLoadingStatus(true);
          const res = await paymentService.getPaymentStatus(certificate.id);
          if (res?.status === 'success') {
            setPaymentStatus(res.data);
          }
        } catch (err) {
          toast.error(getErrorMessage(err, 'Failed to retrieve certificate payment details'));
        } finally {
          setIsLoadingStatus(false);
        }
      };

      fetchStatus();
    }
  }, [isOpen, certificate?.id]);

  if (!certificate) return null;

  const originalPrice = paymentStatus?.price ?? (Number(certificate.certificate_price) || 0);

  // Calculate prices based on applied coupon
  let discountAmount = 0;
  let finalAmount = originalPrice;
  let isFree = originalPrice <= 0;

  if (appliedCoupon) {
    const discountPct = Number(appliedCoupon.discount_percentage) || 0;
    discountAmount =
      appliedCoupon.discount_amount !== undefined && appliedCoupon.discount_amount !== null
        ? Number(appliedCoupon.discount_amount)
        : (originalPrice * discountPct) / 100;

    finalAmount =
      appliedCoupon.final_amount !== undefined && appliedCoupon.final_amount !== null
        ? Number(appliedCoupon.final_amount)
        : Math.max(0, originalPrice - discountAmount);

    isFree = Boolean(appliedCoupon.is_free) || finalAmount <= 0;
  }

  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    if (!couponCode.trim()) return;

    try {
      setIsApplyingCoupon(true);
      setCouponError('');
      const res = await paymentService.applyCoupon(certificate.id, couponCode.trim());

      if (res?.status === 'success') {
        const couponData = res.data;
        setAppliedCoupon(couponData);
        toast.success(
          couponData.is_free
            ? '100% Discount Applied! Certificate is completely free.'
            : `${couponData.discount_percentage}% discount applied! You save ₦${Number(couponData.discount_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`
        );
      }
    } catch (err) {
      const msg = getErrorMessage(err, 'Invalid or expired coupon code');
      setCouponError(msg);
      toast.error(msg);
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
  };

  const handleClaimFree = async () => {
    try {
      setIsProcessing(true);
      setProcessingText('Unlocking certificate access...');

      const res = await paymentService.claimFree(
        certificate.id,
        appliedCoupon ? appliedCoupon.code : ''
      );

      if (res?.status === 'success') {
        toast.success(res.message || 'Certificate unlocked successfully!');
        if (typeof onPaymentSuccess === 'function') {
          onPaymentSuccess({ ...certificate, is_paid: true, requires_payment: false });
        }
        onClose();
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to claim free certificate'));
    } finally {
      setIsProcessing(false);
      setProcessingText('');
    }
  };

  const handlePayWithPaystack = async () => {
    try {
      setIsProcessing(true);
      setProcessingText('Initializing secure checkout...');

      // 1. Initialize payment on backend via Central Gateway
      const initRes = await paymentService.initializePayment(
        certificate.id,
        appliedCoupon ? appliedCoupon.code : null
      );

      if (initRes?.status !== 'success' || !initRes?.data?.authorization_url) {
        throw new Error(initRes?.message || 'Payment initialization failed. Missing checkout URL.');
      }

      setProcessingText('Redirecting to CyberMinds Payment Gateway...');

      // 2. Redirect to Central Gateway authorization URL (Paystack checkout)
      window.location.href = initRes.data.authorization_url;
    } catch (err) {
      setIsProcessing(false);
      setProcessingText('');
      toast.error(getErrorMessage(err, 'Failed to launch checkout'));
    }
  };

  const courseTitle =
    certificate.enrolment?.course?.name || paymentStatus?.course_name || 'Course Track';

  return (
    <Modal
      isOpen={isOpen}
      onClose={isProcessing ? () => {} : onClose}
      title="Certificate Checkout"
      subtitle={`Unlock Certificate #${certificate.certificate_number}`}
      size="md"
    >
      <div className="payment-modal-content">
        {/* Certificate Overview Card */}
        <div className="payment-course-banner p-4 bg-surface rounded-lg border border-border mb-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-xs uppercase tracking-wider text-muted font-semibold block">
                Certificate Credential
              </span>
              <h4 className="font-semibold text-main text-base mt-1">{courseTitle}</h4>
              <span className="text-xs font-mono text-muted block mt-0.5">
                Cert No: {certificate.certificate_number}
              </span>
            </div>
            <div className="payment-secure-badge">
              <Badge variant="neutral">
                <Lock size={12} className="inline mr-1 text-primary-color" />
                One-Time Fee
              </Badge>
            </div>
          </div>
        </div>

        {/* Pricing Summary Breakdown */}
        <div className="payment-summary-card p-4 rounded-lg bg-surface-hover border border-border mb-4">
          <div className="flex justify-between items-center py-1 text-sm text-secondary">
            <span>Certificate Base Fee</span>
            <div className="flex items-center gap-2">
              {appliedCoupon && Number(discountAmount) > 0 && (
                <span className="text-xs text-muted line-through font-mono">
                  ₦{Number(originalPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              )}
              <span className={`font-medium ${appliedCoupon && Number(discountAmount) > 0 ? 'text-primary-color font-bold' : 'text-main'}`}>
                ₦{Number(appliedCoupon ? finalAmount : originalPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {appliedCoupon && (
            <div className="flex justify-between items-center py-1.5 text-sm text-success border-t border-dashed border-border mt-1.5 pt-1.5">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <Tag size={14} className="text-success" />
                Coupon ({appliedCoupon.code}) &bull; {appliedCoupon.discount_percentage}% OFF
              </span>
              <span className="font-bold text-success font-mono">
                -₦{Number(discountAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          )}

          <div className="border-t border-border mt-3 pt-3 flex justify-between items-center">
            <div>
              <span className="font-semibold text-main text-base block">Total Payable</span>
              {appliedCoupon && (
                <span className="text-xs text-success font-medium">
                  You save ₦{Number(discountAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} with this code
                </span>
              )}
            </div>
            <span className="text-xl font-bold text-primary-color font-mono">
              {isFree ? (
                <span className="text-success inline-flex items-center gap-1">
                  <Sparkles size={18} /> ₦0.00 (Free)
                </span>
              ) : (
                `₦${Number(finalAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              )}
            </span>
          </div>
        </div>

        {/* Coupon Form */}
        {!appliedCoupon ? (
          <form onSubmit={handleApplyCoupon} className="coupon-form mb-5">
            <label className="form-label text-xs font-medium text-secondary flex items-center gap-1 mb-1.5">
              <Tag size={13} /> Have a discount coupon or scholarship code?
            </label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  name="couponCode"
                  placeholder="e.g. SCHOLARSHIP100, PROMO25"
                  value={couponCode}
                  onChange={(e) => {
                    setCouponCode(e.target.value.toUpperCase());
                    setCouponError('');
                  }}
                  className="mb-0 uppercase"
                  disabled={isProcessing}
                />
              </div>
              <Button
                type="submit"
                variant="outline"
                size="md"
                isLoading={isApplyingCoupon}
                disabled={!couponCode.trim() || isProcessing}
              >
                Apply
              </Button>
            </div>
            {couponError && (
              <span className="text-xs text-danger block mt-1 flex items-center gap-1">
                <AlertCircle size={12} /> {couponError}
              </span>
            )}
          </form>
        ) : (
          <div className="applied-coupon-pill mb-5 p-2.5 rounded bg-success-light border border-success flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-success shrink-0" />
              <span className="text-xs font-medium text-success">
                Coupon <strong>{appliedCoupon.code}</strong> applied ({appliedCoupon.discount_percentage}% off &bull; Saving ₦{Number(discountAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
              </span>
            </div>
            <button
              type="button"
              onClick={handleRemoveCoupon}
              className="text-muted hover:text-danger text-xs flex items-center gap-0.5 p-1 transition-colors"
              title="Remove coupon"
              disabled={isProcessing}
            >
              <X size={14} /> Remove
            </button>
          </div>
        )}

        {/* Security / Policy Guarantee Note */}
        <div className="security-note text-xs text-muted flex items-start gap-2 mb-5">
          <ShieldCheck size={16} className="text-primary-color shrink-0 mt-0.5" />
          <span>
            Payments are securely routed via the <strong>CyberMinds Payment Gateway</strong> (Paystack). Once unlocked, you will have permanent lifetime access to view, print, and download your official certificate.
          </span>
        </div>

        {/* Action Button */}
        <div className="modal-footer-actions">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={onClose}
            disabled={isProcessing}
          >
            Cancel
          </Button>

          {isFree ? (
            <Button
              type="button"
              variant="primary"
              size="md"
              icon={Sparkles}
              isLoading={isProcessing}
              onClick={handleClaimFree}
              className="btn-success"
            >
              {processingText || 'Claim Free Certificate'}
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              size="md"
              icon={CreditCard}
              isLoading={isProcessing}
              onClick={handlePayWithPaystack}
            >
              {processingText || `Proceed to Pay ₦${Number(finalAmount).toLocaleString()}`}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default CertificatePaymentModal;
