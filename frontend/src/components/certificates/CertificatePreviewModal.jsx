import { useState, useEffect } from 'react';
import {
  Download,
  Printer,
  ExternalLink,
  ShieldCheck,
  AlertOctagon,
  Lock,
  CreditCard,
} from 'lucide-react';
import Modal from '../common/Modal';
import Button from '../common/Button';
import Badge from '../common/Badge';
import Spinner from '../common/Spinner';
import certificateService from '../../services/certificateService';
import { useToast } from '../../context/ToastContext';
import logo1 from '../../assets/logo1.png';
import CertificatePaymentModal from './CertificatePaymentModal';

const CertificatePreviewModal = ({
  isOpen,
  onClose,
  certificate,
  isAdmin = false,
  onPaymentSuccess,
}) => {
  const toast = useToast();
  const [isDownloading, setIsDownloading] = useState(false);
  const [blobUrl, setBlobUrl] = useState(null);
  const [isLoadingPdf, setIsLoadingPdf] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const [currentCert, setCurrentCert] = useState(certificate);

  useEffect(() => {
    setCurrentCert(certificate);
  }, [certificate]);

  const requiresPayment = !isAdmin && Boolean(currentCert?.requires_payment);
  const certPrice = currentCert?.certificate_price ?? currentCert?.enrolment?.course?.certificate_price ?? 0;

  useEffect(() => {
    let currentUrl = null;

    if (isOpen && currentCert?.id && !requiresPayment) {
      setIsLoadingPdf(true);
      const fetchPdf = async () => {
        try {
          const blob = isAdmin
            ? await certificateService.downloadAdminCertificate(currentCert.id)
            : await certificateService.downloadStudentCertificate(currentCert.id);

          currentUrl = window.URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
          setBlobUrl(currentUrl);
        } catch {
          // If PDF preview fails (e.g. revoked certificate or payment needed), preview fallback still shows details
        } finally {
          setIsLoadingPdf(false);
        }
      };

      fetchPdf();
    }

    return () => {
      if (currentUrl) {
        window.URL.revokeObjectURL(currentUrl);
      }
      setBlobUrl(null);
    };
  }, [isOpen, currentCert?.id, isAdmin, requiresPayment]);

  if (!currentCert) return null;

  const studentName =
    currentCert.enrolment?.student?.user?.name ||
    currentCert.enrolment?.student?.name ||
    currentCert.student_name ||
    'Student';

  const courseName =
    currentCert.enrolment?.course?.name ||
    currentCert.course_name ||
    'Course';

  const certNumber = currentCert.certificate_number || 'N/A';
  const isValid = currentCert.status === 'valid' || currentCert.is_valid;
  const isRevoked = currentCert.status === 'revoked';

  const handleDownload = async () => {
    if (requiresPayment) {
      setIsPaymentModalOpen(true);
      return;
    }

    try {
      setIsDownloading(true);
      const blob = isAdmin
        ? await certificateService.downloadAdminCertificate(currentCert.id)
        : await certificateService.downloadStudentCertificate(currentCert.id);

      const safeName = certNumber.replace(/[^a-zA-Z0-9_-]/g, '_');
      certificateService.triggerDownload(blob, `Certificate_${safeName}.pdf`);
      toast.success('Certificate downloaded successfully');
    } catch {
      toast.error('Failed to download certificate PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    if (requiresPayment) {
      setIsPaymentModalOpen(true);
      return;
    }

    if (blobUrl) {
      const printWindow = window.open(blobUrl, '_blank');
      if (printWindow) {
        printWindow.focus();
      }
    } else {
      handleDownload();
    }
  };

  const handlePaymentCompleted = (updated) => {
    setCurrentCert({ ...currentCert, is_paid: true, requires_payment: false });
    if (typeof onPaymentSuccess === 'function') {
      onPaymentSuccess(updated);
    }
  };

  const verifyUrl = `/verify/${encodeURIComponent(certNumber)}`;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Certificate Preview"
        subtitle={`Certificate #${certNumber}`}
        size="xl"
        footer={
          <div className="cert-modal-footer">
            <a
              href={verifyUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-outline btn-sm cert-verify-link"
            >
              <ExternalLink size={16} />
              <span>Public Verification</span>
            </a>

            <div className="cert-modal-actions">
              {requiresPayment ? (
                <Button
                  variant="primary"
                  size="md"
                  icon={CreditCard}
                  onClick={() => setIsPaymentModalOpen(true)}
                >
                  Unlock Certificate (₦{Number(certPrice).toLocaleString()})
                </Button>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="md"
                    icon={Printer}
                    onClick={handlePrint}
                    disabled={isRevoked || !blobUrl}
                  >
                    Print
                  </Button>
                  <Button
                    variant="primary"
                    size="md"
                    icon={Download}
                    isLoading={isDownloading}
                    onClick={handleDownload}
                    disabled={isRevoked}
                  >
                    Download PDF
                  </Button>
                </>
              )}
            </div>
          </div>
        }
      >
        <div className="cert-preview-layout">
          {/* Certificate meta summary card */}
          <div className="cert-meta-bar">
            <div className="cert-meta-item">
              <span className="cert-meta-label">Status</span>
              <div>
                {isRevoked ? (
                  <Badge variant="danger" dot>
                    <AlertOctagon size={14} className="mr-1 inline" /> Revoked
                  </Badge>
                ) : requiresPayment ? (
                  <Badge variant="warning" dot>
                    <Lock size={14} className="mr-1 inline" /> Payment Required
                  </Badge>
                ) : isValid ? (
                  <Badge variant="success" dot>
                    <ShieldCheck size={14} className="mr-1 inline" /> Valid Certificate
                  </Badge>
                ) : (
                  <Badge variant="neutral">{currentCert.status}</Badge>
                )}
              </div>
            </div>

            <div className="cert-meta-item">
              <span className="cert-meta-label">Awarded To</span>
              <span className="cert-meta-value font-medium">{studentName}</span>
            </div>

            <div className="cert-meta-item">
              <span className="cert-meta-label">Course</span>
              <span className="cert-meta-value font-medium">{courseName}</span>
            </div>

            <div className="cert-meta-item">
              <span className="cert-meta-label">Issue Date</span>
              <span className="cert-meta-value">
                {currentCert.issued_at
                  ? new Date(currentCert.issued_at).toLocaleDateString()
                  : 'N/A'}
              </span>
            </div>
          </div>

          {/* Revocation notice if revoked */}
          {isRevoked && (
            <div className="revocation-banner">
              <AlertOctagon size={20} className="revocation-banner-icon" />
              <div>
                <p className="font-semibold text-danger">This certificate has been revoked</p>
                {currentCert.revocation_reason && (
                  <p className="text-sm">Reason: {currentCert.revocation_reason}</p>
                )}
                {currentCert.revoked_at && (
                  <p className="text-xs text-muted">
                    Revoked on: {new Date(currentCert.revoked_at).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Payment Required notice if unpaid */}
          {requiresPayment && (
            <div className="revocation-banner bg-warning-light border border-warning my-3">
              <Lock size={20} className="text-warning shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-main">Certificate Download Locked</p>
                <p className="text-sm text-secondary">
                  A certificate fee of <strong>₦{Number(certPrice).toLocaleString()}</strong> is required to download or print your official certificate.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                icon={CreditCard}
                onClick={() => setIsPaymentModalOpen(true)}
              >
                Pay with Paystack
              </Button>
            </div>
          )}

          {/* Embedded PDF iframe / Document viewer */}
          <div className="cert-pdf-container">
            {isLoadingPdf ? (
              <div className="cert-loading-state">
                <Spinner size={36} text="Loading certificate preview..." />
              </div>
            ) : blobUrl ? (
              <iframe
                src={`${blobUrl}#toolbar=0&navpanes=0`}
                title="Certificate PDF Preview"
                className="cert-pdf-iframe"
              />
            ) : (
              <div className="cert-fallback-card">
                <div className="cert-fallback-logo-box">
                  <img src={logo1} alt="CyberMinds Tech" className="cert-fallback-logo" />
                </div>
                <h4>{courseName}</h4>
                <p>Awarded to {studentName}</p>
                <p className="text-sm text-muted">
                  Certificate Number: <strong>{certNumber}</strong>
                </p>
                {isRevoked ? (
                  <p className="text-danger text-sm">Preview unavailable for revoked certificate.</p>
                ) : requiresPayment ? (
                  <div className="mt-4 flex flex-col items-center gap-2">
                    <p className="text-sm text-secondary">
                      Complete payment to view and download your full credential.
                    </p>
                    <Button
                      variant="primary"
                      size="sm"
                      icon={CreditCard}
                      onClick={() => setIsPaymentModalOpen(true)}
                    >
                      Pay & Unlock Certificate
                    </Button>
                  </div>
                ) : (
                  <Button variant="primary" size="sm" icon={Download} onClick={handleDownload}>
                    Download Certificate
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Embedded payment modal */}
      {isPaymentModalOpen && (
        <CertificatePaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          certificate={currentCert}
          onPaymentSuccess={handlePaymentCompleted}
        />
      )}
    </>
  );
};

export default CertificatePreviewModal;
