import { useState, useEffect } from 'react';
import {
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Award,
  CreditCard,
  Lock,
} from 'lucide-react';
import courseService from '../../services/courseService';
import { getErrorMessage } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Card, { CardHeader, CardBody } from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Spinner from '../../components/common/Spinner';
import EmptyState from '../../components/common/EmptyState';
import CertificatePreviewModal from '../../components/certificates/CertificatePreviewModal';
import CertificatePaymentModal from '../../components/certificates/CertificatePaymentModal';

const MyCourses = () => {
  const toast = useToast();
  const [courses, setCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Certificate Preview Modal
  const [selectedCert, setSelectedCert] = useState(null);
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);

  // Payment Checkout Modal
  const [paymentCert, setPaymentCert] = useState(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setIsLoading(true);
        const res = await courseService.getMyCourses();
        if (res?.status === 'success') {
          setCourses(res.data || []);
        }
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to load your enrolled courses'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchCourses();
  }, [toast]);

  const handleOpenCertificate = (enrolment) => {
    if (enrolment.certificate) {
      const certObj = {
        ...enrolment.certificate,
        enrolment: enrolment,
      };

      if (enrolment.certificate.requires_payment) {
        setPaymentCert(certObj);
        setIsPaymentModalOpen(true);
      } else {
        setSelectedCert(certObj);
        setIsCertModalOpen(true);
      }
    } else {
      toast.info('Certificate record is being processed.');
    }
  };

  const handlePaymentSuccess = (updatedCert) => {
    setCourses((prev) =>
      prev.map((enr) => {
        if (enr.certificate?.id === updatedCert.id) {
          return {
            ...enr,
            certificate: {
              ...enr.certificate,
              is_paid: true,
              requires_payment: false,
            },
          };
        }
        return enr;
      })
    );
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':
        return (
          <Badge variant="success" dot>
            Completed
          </Badge>
        );
      case 'in_progress':
        return (
          <Badge variant="warning" dot>
            In Progress
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge variant="danger" dot>
            Cancelled
          </Badge>
        );
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  return (
    <div className="page-content-wrapper">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">My Courses</h2>
          <p className="page-subtitle">
            All training programs you are currently or previously enrolled in at CyberMinds Tech Limited.
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="page-loading-wrapper">
          <Spinner size={36} text="Loading enrolled courses..." />
        </div>
      ) : courses.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              icon={BookOpen}
              title="No courses enrolled"
              description="You have not been assigned to any course yet. Contact your academy administrator for enrolment."
            />
          </CardBody>
        </Card>
      ) : (
        <div className="my-courses-grid">
          {courses.map((enr) => {
            const course = enr.course;
            const isCompleted = enr.status === 'completed';
            const hasCertificate = isCompleted && Boolean(enr.certificate);
            const requiresPayment = hasCertificate && Boolean(enr.certificate.requires_payment);
            const certPrice = enr.certificate?.certificate_price ?? course?.certificate_price ?? 0;

            return (
              <Card key={enr.id} className="student-course-card">
                <CardHeader
                  title={course?.name || 'Course Program'}
                  subtitle={course?.code ? `Course Code: ${course.code}` : null}
                  actions={getStatusBadge(enr.status)}
                />
                <CardBody className="course-card-content">
                  {course?.description ? (
                    <p className="course-card-desc">{course.description}</p>
                  ) : (
                    <p className="course-card-desc italic text-muted">
                      No additional course description provided.
                    </p>
                  )}

                  <div className="course-meta-tags mt-4">
                    <div className="meta-tag-item">
                      <Clock size={14} className="text-muted" />
                      <span>Duration: <strong>{course?.duration || 'Standard'}</strong></span>
                    </div>

                    <div className="meta-tag-item">
                      <Calendar size={14} className="text-muted" />
                      <span>
                        Enrolled:{' '}
                        <strong>
                          {enr.enrolled_at ? new Date(enr.enrolled_at).toLocaleDateString() : '—'}
                        </strong>
                      </span>
                    </div>

                    {isCompleted && enr.completed_at && (
                      <div className="meta-tag-item text-success">
                        <CheckCircle2 size={14} />
                        <span>
                          Completed:{' '}
                          <strong>{new Date(enr.completed_at).toLocaleDateString()}</strong>
                        </span>
                      </div>
                    )}
                  </div>

                  {enr.remarks && (
                    <div className="enrolment-remarks-snippet mt-3">
                      <span className="text-xs text-muted block">Notes / Remarks:</span>
                      <p className="text-xs text-secondary mt-0.5">{enr.remarks}</p>
                    </div>
                  )}

                  {/* Certificate Action - strictly available ONLY for completed courses */}
                  <div className="course-card-actions mt-5">
                    {isCompleted ? (
                      hasCertificate ? (
                        <div className="flex items-center justify-between w-full gap-2">
                          {requiresPayment ? (
                            <>
                              <span className="text-xs font-medium text-warning flex items-center gap-1">
                                <Lock size={13} /> Fee: ₦{Number(certPrice).toLocaleString()}
                              </span>
                              <Button
                                variant="primary"
                                size="sm"
                                icon={CreditCard}
                                onClick={() => handleOpenCertificate(enr)}
                              >
                                Pay & Unlock
                              </Button>
                            </>
                          ) : (
                            <>
                              <span className="cert-status-text text-xs text-success font-medium">
                                Certificate #{enr.certificate.certificate_number}
                              </span>
                              <Button
                                variant="primary"
                                size="sm"
                                icon={Award}
                                onClick={() => handleOpenCertificate(enr)}
                              >
                                View Certificate
                              </Button>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="w-full text-center py-1">
                          <span className="text-xs text-muted">Certificate pending issuance</span>
                        </div>
                      )
                    ) : (
                      <div className="w-full text-center py-1">
                        <span className="text-xs text-muted italic">
                          {enr.status === 'in_progress'
                            ? 'Training in progress — certificate available upon physical course completion'
                            : 'Enrolment inactive — certificate unavailable'}
                        </span>
                      </div>
                    )}
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      {/* Certificate Preview Modal */}
      {selectedCert && (
        <CertificatePreviewModal
          isOpen={isCertModalOpen}
          onClose={() => setIsCertModalOpen(false)}
          certificate={selectedCert}
          isAdmin={false}
        />
      )}

      {/* Payment Checkout Modal */}
      {paymentCert && (
        <CertificatePaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          certificate={paymentCert}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
};

export default MyCourses;
