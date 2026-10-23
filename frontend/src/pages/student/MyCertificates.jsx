import { useState, useEffect } from 'react';
import {
  Award,
  Download,
  Eye,
  Printer,
  ShieldCheck,
  CreditCard,
  Lock,
} from 'lucide-react';
import certificateService from '../../services/certificateService';
import { getErrorMessage } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Card, { CardBody } from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Spinner from '../../components/common/Spinner';
import EmptyState from '../../components/common/EmptyState';
import CertificatePreviewModal from '../../components/certificates/CertificatePreviewModal';
import CertificatePaymentModal from '../../components/certificates/CertificatePaymentModal';
import paymentService from '../../services/paymentService';

const MyCertificates = () => {
  const toast = useToast();
  const [certificates, setCertificates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);

  // Preview modal
  const [previewCert, setPreviewCert] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Payment checkout modal
  const [paymentCert, setPaymentCert] = useState(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);

  useEffect(() => {
    const fetchCertificates = async () => {
      try {
        setIsLoading(true);
        const res = await certificateService.getMyCertificates();
        if (res?.status === 'success') {
          setCertificates(res.data || []);
        }
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to load your certificates'));
      } finally {
        setIsLoading(false);
      }
    };

    const checkPaymentReturn = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const isReturn = urlParams.get('payment_return');
      const certId = urlParams.get('cert_id');
      const reference = urlParams.get('reference') || urlParams.get('trxref');

      if (isReturn && certId && reference) {
        // Clear query parameters from URL to avoid re-verifying on reload
        window.history.replaceState({}, document.title, window.location.pathname);

        try {
          toast.info('Verifying payment with CyberMinds Gateway...');
          const callbackRes = await paymentService.checkCallback(reference, certId);
          if (callbackRes?.status === 'success') {
            toast.success(callbackRes.message || 'Payment confirmed! Certificate unlocked.');
          } else if (callbackRes?.status === 'pending') {
            toast.info(callbackRes.message || 'Payment is still processing.');
          } else {
            toast.error(callbackRes?.message || 'Payment verification failed.');
          }
        } catch (err) {
          toast.error(getErrorMessage(err, 'Payment verification failed'));
        }
      }
      fetchCertificates();
    };

    checkPaymentReturn();
  }, [toast]);

  const handleOpenPreview = (cert) => {
    if (cert.requires_payment) {
      handleOpenPayment(cert);
      return;
    }
    setPreviewCert(cert);
    setIsPreviewOpen(true);
  };

  const handleOpenPayment = (cert) => {
    setPaymentCert(cert);
    setIsPaymentOpen(true);
  };

  const handlePaymentSuccess = (updatedCert) => {
    setCertificates((prev) =>
      prev.map((c) =>
        c.id === updatedCert.id
          ? { ...c, is_paid: true, requires_payment: false }
          : c
      )
    );
    // Optionally trigger immediate download of the newly unlocked certificate
    handleDownload({ ...updatedCert, is_paid: true, requires_payment: false });
  };

  const handleDownload = async (cert) => {
    if (cert.requires_payment) {
      handleOpenPayment(cert);
      return;
    }

    try {
      setDownloadingId(cert.id);
      const blob = await certificateService.downloadStudentCertificate(cert.id);
      const safeName = cert.certificate_number.replace(/[^a-zA-Z0-9_-]/g, '_');
      certificateService.triggerDownload(blob, `Certificate_${safeName}.pdf`);
      toast.success('Certificate downloaded successfully');
    } catch (err) {
      if (err.response?.status === 402) {
        toast.info('Payment required to download this certificate.');
        handleOpenPayment(cert);
      } else {
        toast.error(getErrorMessage(err, 'Failed to download certificate PDF'));
      }
    } finally {
      setDownloadingId(null);
    }
  };

  const handlePrint = async (cert) => {
    if (cert.requires_payment) {
      handleOpenPayment(cert);
      return;
    }

    try {
      setDownloadingId(cert.id);
      const blob = await certificateService.downloadStudentCertificate(cert.id);
      const blobUrl = certificateService.openPdfBlob(blob);
      const printWindow = window.open(blobUrl, '_blank');
      if (printWindow) {
        printWindow.focus();
      }
    } catch (err) {
      if (err.response?.status === 402) {
        toast.info('Payment required to print this certificate.');
        handleOpenPayment(cert);
      } else {
        toast.error(getErrorMessage(err, 'Failed to prepare certificate for printing'));
      }
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="page-content-wrapper">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">My Certificates</h2>
          <p className="page-subtitle">
            Official credentials issued to you by CyberMinds Tech Limited. Valid and verifiable worldwide.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="page-loading-wrapper">
          <Spinner size={36} text="Loading your certificates..." />
        </div>
      ) : certificates.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={Award}
              title="No certificates earned yet"
              description="Once you complete physical practical coursework and exams, your official certificates will appear here."
            />
          </CardBody>
        </Card>
      ) : (
        <div className="certificates-grid">
          {certificates.map((cert) => {
            const courseName = cert.enrolment?.course?.name || cert.course_name || 'Course Track';
            const courseCode = cert.enrolment?.course?.code;
            const completionDate = cert.enrolment?.completed_at
              ? new Date(cert.enrolment.completed_at).toLocaleDateString()
              : cert.completion_date || '—';
            const issueDate = cert.issued_at
              ? new Date(cert.issued_at).toLocaleDateString()
              : cert.issue_date || '—';

            const requiresPayment = Boolean(cert.requires_payment);
            const certPrice = cert.certificate_price ?? cert.enrolment?.course?.certificate_price ?? 0;

            return (
              <Card key={cert.id} className="student-cert-card">
                <div className="cert-card-accent-strip" />
                <CardBody className="student-cert-card-body">
                  <div className="cert-card-header-row">
                    <div className="cert-card-icon-box">
                      <Award size={28} className="text-primary-color" />
                    </div>
                    {requiresPayment ? (
                      <Badge variant="warning" dot>
                        <Lock size={12} className="inline mr-1" />
                        Fee: ₦{Number(certPrice).toLocaleString()}
                      </Badge>
                    ) : (
                      <Badge variant="success" dot>
                        <ShieldCheck size={12} className="inline mr-1" />
                        Unlocked & Valid
                      </Badge>
                    )}
                  </div>

                  <h3 className="cert-course-title mt-3">{courseName}</h3>
                  {courseCode && (
                    <span className="font-mono text-xs text-muted block mt-0.5">{courseCode}</span>
                  )}

                  <div className="cert-card-details-box mt-4">
                    <div className="cert-card-detail-item">
                      <span className="cert-detail-label">Certificate Number</span>
                      <span className="cert-detail-value font-mono font-bold text-main">
                        {cert.certificate_number}
                      </span>
                    </div>

                    <div className="cert-card-detail-row mt-2">
                      <div className="cert-card-detail-item">
                        <span className="cert-detail-label">Completion Date</span>
                        <span className="cert-detail-value">{completionDate}</span>
                      </div>
                      <div className="cert-card-detail-item">
                        <span className="cert-detail-label">Issue Date</span>
                        <span className="cert-detail-value">{issueDate}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="cert-card-action-bar mt-5">
                    {requiresPayment ? (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          icon={Lock}
                          onClick={() => handleOpenPayment(cert)}
                        >
                          Details
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          icon={CreditCard}
                          onClick={() => handleOpenPayment(cert)}
                          className="flex-1"
                        >
                          Pay & Unlock (₦{Number(certPrice).toLocaleString()})
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          icon={Eye}
                          onClick={() => handleOpenPreview(cert)}
                        >
                          View
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          icon={Printer}
                          onClick={() => handlePrint(cert)}
                          disabled={downloadingId === cert.id}
                        >
                          Print
                        </Button>

                        <Button
                          variant="primary"
                          size="sm"
                          icon={Download}
                          onClick={() => handleDownload(cert)}
                          isLoading={downloadingId === cert.id}
                        >
                          Download PDF
                        </Button>
                      </>
                    )}
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      {/* Preview Modal */}
      {previewCert && (
        <CertificatePreviewModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          certificate={previewCert}
          isAdmin={false}
        />
      )}

      {/* Payment Checkout Modal */}
      {paymentCert && (
        <CertificatePaymentModal
          isOpen={isPaymentOpen}
          onClose={() => setIsPaymentOpen(false)}
          certificate={paymentCert}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
};

export default MyCertificates;
