import { useState, useEffect, useCallback } from 'react';
import {
  Award,
  Search,
  Filter,
  Eye,
  Download,
  AlertTriangle,
  ShieldCheck,
  AlertOctagon,
  RefreshCw,
} from 'lucide-react';
import certificateService from '../../services/certificateService';
import { getErrorMessage } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Card, { CardHeader, CardBody } from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import Spinner from '../../components/common/Spinner';
import EmptyState from '../../components/common/EmptyState';
import Input from '../../components/forms/Input';
import Select from '../../components/forms/Select';
import Textarea from '../../components/forms/Textarea';
import CertificatePreviewModal from '../../components/certificates/CertificatePreviewModal';

const Certificates = () => {
  const toast = useToast();

  const [certificates, setCertificates] = useState([]);
  const [meta, setMeta] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Modals
  const [previewCert, setPreviewCert] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedCert, setSelectedCert] = useState(null);
  const [isRevokeOpen, setIsRevokeOpen] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');
  const [revokeError, setRevokeError] = useState('');
  const [isRevoking, setIsRevoking] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  // Fetch Certificates
  const fetchCertificates = useCallback(
    async (page = 1) => {
      try {
        setIsLoading(true);
        const params = {
          page,
          per_page: 10,
        };
        if (search.trim()) params.search = search.trim();
        if (statusFilter) params.status = statusFilter;

        const res = await certificateService.getCertificates(params);
        setCertificates(res.data || []);
        setMeta(res.meta || null);
        setCurrentPage(page);
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to fetch certificates'));
      } finally {
        setIsLoading(false);
      }
    },
    [search, statusFilter, toast]
  );

  useEffect(() => {
    fetchCertificates(1);
  }, [fetchCertificates]);

  const handleOpenPreview = (cert) => {
    setPreviewCert(cert);
    setIsPreviewOpen(true);
  };

  const handleOpenRevoke = (cert) => {
    setSelectedCert(cert);
    setRevokeReason('');
    setRevokeError('');
    setIsRevokeOpen(true);
  };

  const handleConfirmRevoke = async (e) => {
    e.preventDefault();
    if (!revokeReason.trim()) {
      setRevokeError('Please provide a specific reason for revocation');
      return;
    }

    try {
      setIsRevoking(true);
      setRevokeError('');
      await certificateService.revokeCertificate(selectedCert.id, {
        reason: revokeReason.trim(),
      });
      toast.success('Certificate revoked successfully');
      setIsRevokeOpen(false);
      fetchCertificates(currentPage);
    } catch (err) {
      const msg = getErrorMessage(err, 'Failed to revoke certificate');
      setRevokeError(msg);
      toast.error(msg);
    } finally {
      setIsRevoking(false);
    }
  };

  const handleDownload = async (cert) => {
    try {
      setDownloadingId(cert.id);
      const blob = await certificateService.downloadAdminCertificate(cert.id);
      const safeName = cert.certificate_number.replace(/[^a-zA-Z0-9_-]/g, '_');
      certificateService.triggerDownload(blob, `Certificate_${safeName}.pdf`);
      toast.success('Certificate downloaded successfully');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to download certificate PDF'));
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="page-content-wrapper">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Certificate Registry</h2>
          <p className="page-subtitle">
            Inspect verified credentials, preview documents, download PDFs, and handle revocations.
          </p>
        </div>
      </div>

      {/* Filter and Search */}
      <Card className="mb-6">
        <CardBody className="filter-card-body">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchCertificates(1);
            }}
            className="filter-form-row"
          >
            <div className="search-input-box">
              <Input
                name="search"
                placeholder="Search by certificate number, student name, or course..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                icon={Search}
                className="mb-0"
              />
            </div>

            <div className="filter-select-box">
              <Select
                name="statusFilter"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="All Statuses"
                options={[
                  { value: 'valid', label: 'Valid Certificates Only' },
                  { value: 'revoked', label: 'Revoked Certificates' },
                ]}
                className="mb-0"
              />
            </div>

            <Button type="submit" variant="secondary" size="md" icon={Filter}>
              Filter
            </Button>

            <Button
              type="button"
              variant="outline"
              size="md"
              icon={RefreshCw}
              onClick={() => {
                setSearch('');
                setStatusFilter('');
                fetchCertificates(1);
              }}
              title="Reset filters"
            >
              Reset
            </Button>
          </form>
        </CardBody>
      </Card>

      {/* Certificates Table */}
      <Card>
        <CardHeader
          title="Issued Credentials"
          subtitle={
            meta?.total ? `Total of ${meta.total} certificates generated` : 'Certificate archive'
          }
        />
        <CardBody className="p-0">
          {isLoading ? (
            <div className="table-loading-container">
              <Spinner size={32} text="Loading certificates..." />
            </div>
          ) : certificates.length === 0 ? (
            <EmptyState
              icon={Award}
              title="No certificates found"
              description="No certificate records match your search or filter criteria."
            />
          ) : (
            <div className="responsive-table-container">
              <table className="portal-table">
                <thead>
                  <tr>
                    <th>Certificate Number</th>
                    <th>Recipient Student</th>
                    <th>Course</th>
                    <th>Dates</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {certificates.map((cert) => {
                    const studentName =
                      cert.enrolment?.student?.user?.name ||
                      cert.enrolment?.student?.name ||
                      'Student';
                    const courseName = cert.enrolment?.course?.name || 'Course';
                    const isValid = cert.status === 'valid' || cert.is_valid;
                    const isRevoked = cert.status === 'revoked';

                    return (
                      <tr
                        key={cert.id}
                        className={isRevoked ? 'table-row-revoked' : ''}
                      >
                        <td>
                          <div className="cert-number-cell">
                            <span className="font-mono font-bold text-main">
                              {cert.certificate_number}
                            </span>
                            {cert.verification_code && (
                              <span className="text-xs text-muted block font-mono">
                                UUID: {cert.verification_code.substring(0, 18)}...
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="student-recipient-cell">
                            <span className="font-medium text-main block">{studentName}</span>
                            {cert.enrolment?.student?.student_id && (
                              <span className="text-xs text-primary-color font-mono">
                                {cert.enrolment.student.student_id}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="max-w-xs">
                          <span className="font-medium text-main block">{courseName}</span>
                        </td>
                        <td>
                          <div className="text-xs text-secondary">
                            <div>
                              Issued:{' '}
                              {cert.issued_at
                                ? new Date(cert.issued_at).toLocaleDateString()
                                : '—'}
                            </div>
                            {cert.enrolment?.completed_at && (
                              <div className="text-muted">
                                Completed:{' '}
                                {new Date(cert.enrolment.completed_at).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </td>
                        <td>
                          {isValid ? (
                            <Badge variant="success" dot>
                              <ShieldCheck size={12} className="inline mr-1" />
                              Valid
                            </Badge>
                          ) : (
                            <Badge variant="danger" dot>
                              <AlertOctagon size={12} className="inline mr-1" />
                              Revoked
                            </Badge>
                          )}
                        </td>
                        <td className="text-right">
                          <div className="action-button-group">
                            <button
                              type="button"
                              className="btn-table-action"
                              title="Preview certificate"
                              onClick={() => handleOpenPreview(cert)}
                            >
                              <Eye size={16} />
                            </button>

                            <button
                              type="button"
                              className="btn-table-action"
                              title="Download PDF"
                              disabled={isRevoked || downloadingId === cert.id}
                              onClick={() => handleDownload(cert)}
                            >
                              {downloadingId === cert.id ? (
                                <Spinner size={14} text="" />
                              ) : (
                                <Download size={16} />
                              )}
                            </button>

                            {isValid && (
                              <button
                                type="button"
                                className="btn-table-action text-danger"
                                title="Revoke certificate"
                                onClick={() => handleOpenRevoke(cert)}
                              >
                                <AlertTriangle size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {meta && (
            <div className="table-pagination-footer">
              <Pagination
                currentPage={meta.current_page}
                lastPage={meta.last_page}
                total={meta.total}
                from={meta.from}
                to={meta.to}
                onPageChange={(page) => fetchCertificates(page)}
                isLoading={isLoading}
              />
            </div>
          )}
        </CardBody>
      </Card>

      {/* Preview Modal */}
      {previewCert && (
        <CertificatePreviewModal
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          certificate={previewCert}
          isAdmin={true}
        />
      )}

      {/* Revocation Modal */}
      <Modal
        isOpen={isRevokeOpen}
        onClose={() => setIsRevokeOpen(false)}
        title="Revoke Certificate Confirmation"
        subtitle={`Certificate #${selectedCert?.certificate_number}`}
        size="md"
      >
        <form onSubmit={handleConfirmRevoke} noValidate>
          <div className="revocation-warning-box">
            <AlertOctagon size={32} className="text-danger mb-2" />
            <h4 className="font-bold text-main">Confirm Certificate Revocation</h4>
            <p className="text-sm text-secondary mt-1">
              Revoking a certificate invalidates its official status permanently. The public
              verification page will mark this credential as <strong>REVOKED</strong>.
            </p>
          </div>

          {revokeError && (
            <div className="alert-banner alert-danger mt-3">
              <span>{revokeError}</span>
            </div>
          )}

          <div className="mt-4">
            <Textarea
              label="Official Revocation Reason"
              name="revokeReason"
              rows={3}
              placeholder="e.g. Academic dishonesty, certificate issued in error, or credential recall..."
              value={revokeReason}
              onChange={(e) => setRevokeReason(e.target.value)}
              error={revokeError ? '' : null}
              required
            />
          </div>

          <div className="modal-footer-actions mt-6">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setIsRevokeOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              size="md"
              isLoading={isRevoking}
              icon={AlertOctagon}
            >
              Confirm Revocation
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Certificates;
