import { useState, useEffect, useCallback } from 'react';
import {
  UserCheck,
  PlusCircle,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Eye,
  Award,
  RefreshCw,
} from 'lucide-react';
import enrolmentService from '../../services/enrolmentService';
import studentService from '../../services/studentService';
import courseService from '../../services/courseService';
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

const Enrolments = () => {
  const toast = useToast();

  const [enrolments, setEnrolments] = useState([]);
  const [meta, setMeta] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Modals
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isCertModalOpen, setIsCertModalOpen] = useState(false);

  const [selectedEnrolment, setSelectedEnrolment] = useState(null);
  const [targetStatus, setTargetStatus] = useState('completed');
  const [statusRemarks, setStatusRemarks] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // For assignment dropdowns
  const [studentsList, setStudentsList] = useState([]);
  const [coursesList, setCoursesList] = useState([]);
  const [assignForm, setAssignForm] = useState({
    student_id: '',
    course_id: '',
    remarks: '',
  });
  const [assignErrors, setAssignErrors] = useState({});
  const [isAssigning, setIsAssigning] = useState(false);

  // Fetch enrolments
  const fetchEnrolments = useCallback(
    async (page = 1) => {
      try {
        setIsLoading(true);
        const params = {
          page,
          per_page: 10,
        };
        if (search.trim()) params.search = search.trim();
        if (statusFilter) params.status = statusFilter;

        const res = await enrolmentService.getEnrolments(params);
        setEnrolments(res.data || []);
        setMeta(res.meta || null);
        setCurrentPage(page);
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to fetch enrolments'));
      } finally {
        setIsLoading(false);
      }
    },
    [search, statusFilter, toast]
  );

  useEffect(() => {
    fetchEnrolments(1);
  }, [fetchEnrolments]);

  // Load students & courses for dropdown when opening Assign modal
  const handleOpenAssign = async () => {
    setAssignForm({
      student_id: '',
      course_id: '',
      remarks: '',
    });
    setAssignErrors({});
    setIsAssignOpen(true);

    try {
      const [studentsRes, coursesRes] = await Promise.all([
        studentService.getStudents({ is_active: 1, per_page: 100 }),
        courseService.getCourses({ is_active: 1, per_page: 100 }),
      ]);
      setStudentsList(studentsRes.data || []);
      setCoursesList(coursesRes.data || []);
    } catch {
      toast.error('Failed to load students or courses for enrolment');
    }
  };

  // Submit Enrolment
  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!assignForm.student_id) errs.student_id = 'Please select a student';
    if (!assignForm.course_id) errs.course_id = 'Please select a course';
    if (Object.keys(errs).length > 0) {
      setAssignErrors(errs);
      return;
    }

    try {
      setIsAssigning(true);
      setAssignErrors({});
      await enrolmentService.createEnrolment({
        student_id: Number(assignForm.student_id),
        course_id: Number(assignForm.course_id),
        remarks: assignForm.remarks,
      });
      toast.success('Student successfully enrolled in course');
      setIsAssignOpen(false);
      fetchEnrolments(1);
    } catch (err) {
      const msg = getErrorMessage(err, 'Failed to enrol student');
      setAssignErrors({ general: msg });
      toast.error(msg);
    } finally {
      setIsAssigning(false);
    }
  };

  // Open Status Change Confirmation Modal
  const handleOpenStatusModal = (enrolment, newStatus) => {
    setSelectedEnrolment(enrolment);
    setTargetStatus(newStatus);
    setStatusRemarks(enrolment.remarks || '');
    setIsStatusModalOpen(true);
  };

  // Confirm Status Change
  const handleConfirmStatusChange = async () => {
    if (!selectedEnrolment) return;

    try {
      setIsUpdatingStatus(true);
      await enrolmentService.updateStatus(selectedEnrolment.id, {
        status: targetStatus,
        remarks: statusRemarks,
      });

      if (targetStatus === 'completed') {
        toast.success('Course marked completed! Certificate automatically issued.');
      } else {
        toast.success(`Enrolment status updated to ${targetStatus}`);
      }

      setIsStatusModalOpen(false);
      fetchEnrolments(currentPage);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update enrolment status'));
    } finally {
      setIsUpdatingStatus(false);
    }
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
          <h2 className="page-title">Course Enrolments</h2>
          <p className="page-subtitle">
            Assign students to training tracks, manage progression, and authorize certificate completion.
          </p>
        </div>
        <div className="page-header-actions">
          <Button variant="primary" size="md" icon={PlusCircle} onClick={handleOpenAssign}>
            Enrol Student
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardBody className="filter-card-body">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchEnrolments(1);
            }}
            className="filter-form-row"
          >
            <div className="search-input-box">
              <Input
                name="search"
                placeholder="Search by student name, ID, or course title..."
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
                  { value: 'in_progress', label: 'In Progress' },
                  { value: 'completed', label: 'Completed' },
                  { value: 'cancelled', label: 'Cancelled' },
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
                fetchEnrolments(1);
              }}
              title="Reset filters"
            >
              Reset
            </Button>
          </form>
        </CardBody>
      </Card>

      {/* Enrolments Table */}
      <Card>
        <CardHeader
          title="Student Enrolments"
          subtitle={meta?.total ? `Total of ${meta.total} enrolment records` : 'Enrolments list'}
        />
        <CardBody className="p-0">
          {isLoading ? (
            <div className="table-loading-container">
              <Spinner size={32} text="Loading enrolments..." />
            </div>
          ) : enrolments.length === 0 ? (
            <EmptyState
              icon={UserCheck}
              title="No enrolments found"
              description="No enrolment records match your filters. You can assign a student to any active course."
              actionText="Enrol Student"
              actionIcon={PlusCircle}
              onAction={handleOpenAssign}
            />
          ) : (
            <div className="responsive-table-container">
              <table className="portal-table">
                <thead>
                  <tr>
                    <th>Student Name & ID</th>
                    <th>Course Track</th>
                    <th>Enrolled Date</th>
                    <th>Status</th>
                    <th>Certificate</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {enrolments.map((enr) => {
                    const studentName = enr.student?.user?.name || enr.student?.name || 'Student';
                    const studentCode = enr.student?.student_id || 'N/A';
                    const courseName = enr.course?.name || 'Course';

                    return (
                      <tr key={enr.id}>
                        <td>
                          <div className="enrolment-student-cell">
                            <span className="font-medium text-main block">{studentName}</span>
                            <span className="font-mono text-xs text-primary-color font-semibold">
                              {studentCode}
                            </span>
                          </div>
                        </td>
                        <td className="max-w-xs">
                          <span className="font-medium text-main block">{courseName}</span>
                          {enr.course?.code && (
                            <span className="text-xs text-muted block font-mono">
                              {enr.course.code}
                            </span>
                          )}
                        </td>
                        <td>
                          <div className="text-xs text-secondary">
                            <div>
                              Enrolled:{' '}
                              {enr.enrolled_at
                                ? new Date(enr.enrolled_at).toLocaleDateString()
                                : '—'}
                            </div>
                            {enr.completed_at && (
                              <div className="text-success font-medium">
                                Completed: {new Date(enr.completed_at).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </td>
                        <td>{getStatusBadge(enr.status)}</td>
                        <td>
                          {enr.certificate ? (
                            <button
                              type="button"
                              className="cert-quick-badge"
                              onClick={() => {
                                setSelectedEnrolment(enr);
                                setIsCertModalOpen(true);
                              }}
                              title="Preview issued certificate"
                            >
                              <Award size={13} className="text-primary-color" />
                              <span className="font-mono text-xs">
                                {enr.certificate.certificate_number}
                              </span>
                            </button>
                          ) : (
                            <span className="text-muted text-xs">—</span>
                          )}
                        </td>
                        <td className="text-right">
                          <div className="action-button-group">
                            <button
                              type="button"
                              className="btn-table-action"
                              title="View details"
                              onClick={() => {
                                setSelectedEnrolment(enr);
                                setIsDetailsOpen(true);
                              }}
                            >
                              <Eye size={16} />
                            </button>

                            {/* Status update options */}
                            {enr.status === 'in_progress' && (
                              <Button
                                variant="outline"
                                size="sm"
                                icon={CheckCircle}
                                className="btn-success-subtle"
                                onClick={() => handleOpenStatusModal(enr, 'completed')}
                                title="Mark course completed and issue certificate"
                              >
                                Complete
                              </Button>
                            )}

                            {enr.status === 'in_progress' && (
                              <button
                                type="button"
                                className="btn-table-action text-danger"
                                title="Cancel enrolment"
                                onClick={() => handleOpenStatusModal(enr, 'cancelled')}
                              >
                                <XCircle size={16} />
                              </button>
                            )}

                            {enr.status === 'cancelled' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenStatusModal(enr, 'in_progress')}
                                title="Resume enrolment"
                              >
                                Resume
                              </Button>
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
                onPageChange={(page) => fetchEnrolments(page)}
                isLoading={isLoading}
              />
            </div>
          )}
        </CardBody>
      </Card>

      {/* 1. Assign Course Modal */}
      <Modal
        isOpen={isAssignOpen}
        onClose={() => setIsAssignOpen(false)}
        title="Enrol Student in Course"
        subtitle="Assign a student to an academy course track"
        size="md"
      >
        <form onSubmit={handleAssignSubmit} noValidate>
          {assignErrors.general && (
            <div className="alert-banner alert-danger mb-4">
              <span>{assignErrors.general}</span>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">
              Select Student <span className="required-star">*</span>
            </label>
            <select
              className="form-control form-select"
              value={assignForm.student_id}
              onChange={(e) =>
                setAssignForm((p) => ({ ...p, student_id: e.target.value }))
              }
              required
            >
              <option value="">-- Choose registered student --</option>
              {studentsList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.student_id}) - {s.email}
                </option>
              ))}
            </select>
            {assignErrors.student_id && (
              <p className="form-error">{assignErrors.student_id}</p>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">
              Select Course <span className="required-star">*</span>
            </label>
            <select
              className="form-control form-select"
              value={assignForm.course_id}
              onChange={(e) =>
                setAssignForm((p) => ({ ...p, course_id: e.target.value }))
              }
              required
            >
              <option value="">-- Choose active course track --</option>
              {coursesList.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.code ? `(${c.code})` : ''} - {c.duration || 'Standard'}
                </option>
              ))}
            </select>
            {assignErrors.course_id && (
              <p className="form-error">{assignErrors.course_id}</p>
            )}
          </div>

          <Textarea
            label="Enrolment Remarks (Optional)"
            name="remarks"
            rows={2}
            placeholder="e.g. Batch Q4 Weekend Session..."
            value={assignForm.remarks}
            onChange={(e) =>
              setAssignForm((p) => ({ ...p, remarks: e.target.value }))
            }
          />

          <div className="modal-footer-actions mt-4">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setIsAssignOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md" isLoading={isAssigning}>
              Confirm Enrolment
            </Button>
          </div>
        </form>
      </Modal>

      {/* 2. Change Status Confirmation Dialog */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title={
          targetStatus === 'completed'
            ? 'Complete Course & Issue Certificate'
            : `Update Status to ${targetStatus}`
        }
        subtitle={`Student: ${
          selectedEnrolment?.student?.user?.name || selectedEnrolment?.student?.name
        }`}
        size="md"
      >
        <div className="status-modal-content">
          {targetStatus === 'completed' ? (
            <div className="completion-alert-box">
              <CheckCircle size={32} className="text-success mb-2" />
              <h4 className="font-bold text-main">Confirm Practical Training Completion</h4>
              <p className="text-sm text-secondary mt-1">
                You are about to mark this student as having successfully completed{' '}
                <strong>{selectedEnrolment?.course?.name}</strong>.
              </p>
              <div className="cert-notice-badge mt-3">
                <Award size={16} className="text-primary-color" />
                <span>An official certificate will be automatically generated and issued!</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-secondary mb-4">
              Are you sure you want to change the enrolment status to{' '}
              <strong className="capitalize">{targetStatus.replace('_', ' ')}</strong>?
            </p>
          )}

          <div className="mt-4">
            <Textarea
              label="Update Remarks / Notes"
              name="statusRemarks"
              rows={2}
              placeholder="e.g. Completed physical lab assessment and project review..."
              value={statusRemarks}
              onChange={(e) => setStatusRemarks(e.target.value)}
            />
          </div>

          <div className="modal-footer-actions mt-6">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setIsStatusModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant={targetStatus === 'completed' ? 'primary' : 'secondary'}
              size="md"
              onClick={handleConfirmStatusChange}
              isLoading={isUpdatingStatus}
            >
              {targetStatus === 'completed' ? 'Authorize & Issue Certificate' : 'Save Status'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 3. Enrolment Details Modal */}
      <Modal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        title="Enrolment Information"
        subtitle={`Enrolment #${selectedEnrolment?.id}`}
        size="md"
      >
        {selectedEnrolment && (
          <div className="enrolment-details-box">
            <div className="details-data-grid">
              <div className="detail-item">
                <span className="detail-label">Student Name:</span>
                <span className="detail-value font-medium">
                  {selectedEnrolment.student?.user?.name || selectedEnrolment.student?.name}
                </span>
              </div>

              <div className="detail-item">
                <span className="detail-label">Student ID:</span>
                <span className="detail-value font-mono font-semibold text-primary-color">
                  {selectedEnrolment.student?.student_id || 'N/A'}
                </span>
              </div>

              <div className="detail-item">
                <span className="detail-label">Course:</span>
                <span className="detail-value font-medium">
                  {selectedEnrolment.course?.name}
                </span>
              </div>

              <div className="detail-item">
                <span className="detail-label">Course Code:</span>
                <span className="detail-value font-mono">
                  {selectedEnrolment.course?.code || '—'}
                </span>
              </div>

              <div className="detail-item">
                <span className="detail-label">Enrolment Date:</span>
                <span className="detail-value">
                  {selectedEnrolment.enrolled_at
                    ? new Date(selectedEnrolment.enrolled_at).toLocaleString()
                    : '—'}
                </span>
              </div>

              <div className="detail-item">
                <span className="detail-label">Current Status:</span>
                <span className="detail-value">{getStatusBadge(selectedEnrolment.status)}</span>
              </div>

              {selectedEnrolment.completed_at && (
                <div className="detail-item">
                  <span className="detail-label">Completion Date:</span>
                  <span className="detail-value font-medium text-success">
                    {new Date(selectedEnrolment.completed_at).toLocaleString()}
                  </span>
                </div>
              )}

              {selectedEnrolment.remarks && (
                <div className="detail-item full-width">
                  <span className="detail-label">Remarks:</span>
                  <p className="detail-value text-sm mt-1">{selectedEnrolment.remarks}</p>
                </div>
              )}
            </div>

            {selectedEnrolment.certificate && (
              <div className="mt-4 p-3 bg-subtle rounded-md border flex items-center justify-between">
                <div>
                  <span className="text-xs text-muted block">Associated Certificate:</span>
                  <span className="font-mono font-bold text-sm text-primary-color">
                    {selectedEnrolment.certificate.certificate_number}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  icon={Award}
                  onClick={() => {
                    setIsDetailsOpen(false);
                    setIsCertModalOpen(true);
                  }}
                >
                  Preview Certificate
                </Button>
              </div>
            )}

            <div className="modal-footer-actions mt-6">
              <Button variant="outline" size="md" onClick={() => setIsDetailsOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* 4. Certificate Preview Modal */}
      {selectedEnrolment?.certificate && (
        <CertificatePreviewModal
          isOpen={isCertModalOpen}
          onClose={() => setIsCertModalOpen(false)}
          certificate={selectedEnrolment.certificate}
          isAdmin={true}
        />
      )}
    </div>
  );
};

export default Enrolments;
