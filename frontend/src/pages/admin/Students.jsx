import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Eye,
  Edit,
  KeyRound,
  CheckCircle,
  BookOpen,
  Award,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
} from 'lucide-react';
import studentService from '../../services/studentService';
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
import Textarea from '../../components/forms/Textarea';
import Select from '../../components/forms/Select';

const Students = () => {
  const toast = useToast();

  // State
  const [students, setStudents] = useState([]);
  const [meta, setMeta] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Modals state
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentDetails, setStudentDetails] = useState(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Form states
  const [registerForm, setRegisterForm] = useState({
    name: '',
    email: '',
    password: '',
    phone_number: '',
    address: '',
    is_active: true,
  });
  const [registerErrors, setRegisterErrors] = useState({});
  const [isSubmittingRegister, setIsSubmittingRegister] = useState(false);
  const [createdStudentInfo, setCreatedStudentInfo] = useState(null);

  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone_number: '',
    address: '',
    is_active: true,
  });
  const [editErrors, setEditErrors] = useState({});
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  const [resetForm, setResetForm] = useState({
    password: '',
    password_confirmation: '',
  });
  const [resetErrors, setResetErrors] = useState({});
  const [isSubmittingReset, setIsSubmittingReset] = useState(false);

  // Fetch Students
  const fetchStudents = useCallback(
    async (page = 1) => {
      try {
        setIsLoading(true);
        const params = {
          page,
          per_page: 10,
        };
        if (search.trim()) params.search = search.trim();
        if (statusFilter !== '') params.is_active = statusFilter;

        const res = await studentService.getStudents(params);
        setStudents(res.data || []);
        setMeta(res.meta || null);
        setCurrentPage(page);
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to fetch students'));
      } finally {
        setIsLoading(false);
      }
    },
    [search, statusFilter, toast]
  );

  useEffect(() => {
    fetchStudents(1);
  }, [fetchStudents]);

  // Handle Search submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchStudents(1);
  };

  // Open Details Modal
  const handleOpenDetails = async (student) => {
    setSelectedStudent(student);
    setIsDetailsOpen(true);
    setIsLoadingDetails(true);
    try {
      const res = await studentService.getStudent(student.id);
      setStudentDetails(res.data);
    } catch {
      toast.error('Failed to load student complete details');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (student) => {
    setSelectedStudent(student);
    setEditForm({
      name: student.name || '',
      email: student.email || '',
      phone_number: student.phone_number || '',
      address: student.address || '',
      is_active: Boolean(student.is_active),
    });
    setEditErrors({});
    setIsEditOpen(true);
  };

  // Open Reset Password Modal
  const handleOpenResetPassword = (student) => {
    setSelectedStudent(student);
    setResetForm({
      password: '',
      password_confirmation: '',
    });
    setResetErrors({});
    setIsResetPasswordOpen(true);
  };

  // Submit Student Registration
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!registerForm.name.trim()) errs.name = 'Full name is required';
    if (!registerForm.email.trim()) errs.email = 'Email is required';
    if (!registerForm.password) {
      errs.password = 'Initial password is required';
    } else if (registerForm.password.length < 8) {
      errs.password = 'Password must be at least 8 characters';
    }
    if (Object.keys(errs).length > 0) {
      setRegisterErrors(errs);
      return;
    }

    try {
      setIsSubmittingRegister(true);
      setRegisterErrors({});
      const res = await studentService.createStudent(registerForm);
      toast.success('Student registered successfully!');
      setCreatedStudentInfo(res.data);
      fetchStudents(1);
    } catch (err) {
      const msg = getErrorMessage(err, 'Failed to register student');
      setRegisterErrors({ general: msg });
      toast.error(msg);
    } finally {
      setIsSubmittingRegister(false);
    }
  };

  // Submit Edit
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editForm.name.trim()) {
      setEditErrors({ name: 'Name is required' });
      return;
    }

    try {
      setIsSubmittingEdit(true);
      setEditErrors({});
      await studentService.updateStudent(selectedStudent.id, editForm);
      toast.success('Student information updated successfully');
      setIsEditOpen(false);
      fetchStudents(currentPage);
    } catch (err) {
      const msg = getErrorMessage(err, 'Failed to update student');
      setEditErrors({ general: msg });
      toast.error(msg);
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // Submit Reset Password
  const handleResetSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!resetForm.password) {
      errs.password = 'Password is required';
    } else if (resetForm.password.length < 8) {
      errs.password = 'Password must be at least 8 characters';
    }
    if (resetForm.password !== resetForm.password_confirmation) {
      errs.password_confirmation = 'Passwords do not match';
    }
    if (Object.keys(errs).length > 0) {
      setResetErrors(errs);
      return;
    }

    try {
      setIsSubmittingReset(true);
      setResetErrors({});
      await studentService.resetStudentPassword(selectedStudent.id, resetForm);
      toast.success('Password successfully reset for student. Active sessions revoked.');
      setIsResetPasswordOpen(false);
    } catch (err) {
      const msg = getErrorMessage(err, 'Failed to reset student password');
      setResetErrors({ general: msg });
      toast.error(msg);
    } finally {
      setIsSubmittingReset(false);
    }
  };

  return (
    <div className="page-content-wrapper">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Student Directory</h2>
          <p className="page-subtitle">
            Register students, manage contact details, assign IDs, and monitor coursework.
          </p>
        </div>
        <div className="page-header-actions">
          <Button
            variant="primary"
            size="md"
            icon={UserPlus}
            onClick={() => {
              setRegisterForm({
                name: '',
                email: '',
                password: '',
                phone_number: '',
                address: '',
                is_active: true,
              });
              setRegisterErrors({});
              setCreatedStudentInfo(null);
              setIsRegisterOpen(true);
            }}
          >
            Register Student
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="mb-6">
        <CardBody className="filter-card-body">
          <form onSubmit={handleSearchSubmit} className="filter-form-row">
            <div className="search-input-box">
              <Input
                name="search"
                placeholder="Search by student name, ID, email, or phone..."
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
                  { value: '1', label: 'Active Students Only' },
                  { value: '0', label: 'Inactive / Deactivated' },
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
                fetchStudents(1);
              }}
              title="Reset filters"
            >
              Reset
            </Button>
          </form>
        </CardBody>
      </Card>

      {/* Students Table */}
      <Card>
        <CardHeader
          title="Registered Students"
          subtitle={meta?.total ? `Total of ${meta.total} students recorded` : 'Student listing'}
        />
        <CardBody className="p-0">
          {isLoading ? (
            <div className="table-loading-container">
              <Spinner size={32} text="Loading student records..." />
            </div>
          ) : students.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No students found"
              description="No student records match your current search or filter criteria."
              actionText="Register New Student"
              actionIcon={UserPlus}
              onAction={() => setIsRegisterOpen(true)}
            />
          ) : (
            <div className="responsive-table-container">
              <table className="portal-table">
                <thead>
                  <tr>
                    <th>Student ID</th>
                    <th>Full Name</th>
                    <th>Contact Info</th>
                    <th>Address</th>
                    <th>Enrolments</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((std) => (
                    <tr key={std.id}>
                      <td className="font-mono font-semibold text-primary-color">
                        {std.student_id || 'N/A'}
                      </td>
                      <td className="font-medium text-main">
                        <div className="student-name-cell">
                          <span>{std.name}</span>
                        </div>
                      </td>
                      <td>
                        <div className="contact-cell">
                          <span className="contact-email">
                            <Mail size={13} className="inline mr-1 text-muted" />
                            {std.email}
                          </span>
                          {std.phone_number && (
                            <span className="contact-phone text-xs text-muted">
                              <Phone size={12} className="inline mr-1 text-muted" />
                              {std.phone_number}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="text-secondary text-sm">
                        {std.address ? (
                          <span className="address-snippet" title={std.address}>
                            {std.address.length > 35
                              ? `${std.address.substring(0, 35)}...`
                              : std.address}
                          </span>
                        ) : (
                          <span className="text-muted text-xs">—</span>
                        )}
                      </td>
                      <td>
                        <Badge variant="info">
                          <BookOpen size={12} className="inline mr-1" />
                          {std.enrolments_count ?? 0} {std.enrolments_count === 1 ? 'course' : 'courses'}
                        </Badge>
                      </td>
                      <td>
                        {std.is_active ? (
                          <Badge variant="success" dot>
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="danger" dot>
                            Inactive
                          </Badge>
                        )}
                      </td>
                      <td className="text-right">
                        <div className="action-button-group">
                          <button
                            type="button"
                            className="btn-table-action"
                            title="View student profile & courses"
                            onClick={() => handleOpenDetails(std)}
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            type="button"
                            className="btn-table-action"
                            title="Edit student details"
                            onClick={() => handleOpenEdit(std)}
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            type="button"
                            className="btn-table-action"
                            title="Reset student password"
                            onClick={() => handleOpenResetPassword(std)}
                          >
                            <KeyRound size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
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
                onPageChange={(page) => fetchStudents(page)}
                isLoading={isLoading}
              />
            </div>
          )}
        </CardBody>
      </Card>

      {/* 1. Register Student Modal */}
      <Modal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        title="Register New Student"
        subtitle="Create an academy account with an automatically generated Student ID"
        size="lg"
      >
        {createdStudentInfo ? (
          <div className="created-student-success">
            <div className="success-icon-badge">
              <CheckCircle size={36} className="text-success" />
            </div>
            <h3 className="text-lg font-bold text-main mt-2">Student Registered Successfully!</h3>
            <p className="text-sm text-secondary mb-4">
              The student profile has been created and the following official credentials were
              assigned:
            </p>

            <div className="created-credentials-card">
              <div className="cred-row">
                <span className="cred-label">Assigned Student ID:</span>
                <span className="cred-value font-mono font-bold text-primary-color">
                  {createdStudentInfo.student_id}
                </span>
              </div>
              <div className="cred-row">
                <span className="cred-label">Full Name:</span>
                <span className="cred-value">{createdStudentInfo.name}</span>
              </div>
              <div className="cred-row">
                <span className="cred-label">Email:</span>
                <span className="cred-value">{createdStudentInfo.email}</span>
              </div>
              <div className="cred-row">
                <span className="cred-label">Phone:</span>
                <span className="cred-value">{createdStudentInfo.phone_number || 'None'}</span>
              </div>
              <div className="cred-row">
                <span className="cred-label">Initial Password:</span>
                <span className="cred-value font-mono">•••••••• (configured during creation)</span>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                size="md"
                onClick={() => {
                  setCreatedStudentInfo(null);
                  setRegisterForm({
                    name: '',
                    email: '',
                    password: '',
                    phone_number: '',
                    address: '',
                    is_active: true,
                  });
                }}
              >
                Register Another Student
              </Button>
              <Button variant="primary" size="md" onClick={() => setIsRegisterOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleRegisterSubmit} noValidate>
            {registerErrors.general && (
              <div className="alert-banner alert-danger mb-4">
                <span>{registerErrors.general}</span>
              </div>
            )}

            <div className="form-grid-2">
              <Input
                label="Full Name"
                name="name"
                placeholder="Jane Doe"
                value={registerForm.name}
                onChange={(e) =>
                  setRegisterForm((p) => ({ ...p, name: e.target.value }))
                }
                error={registerErrors.name}
                required
              />

              <Input
                label="Email Address"
                name="email"
                type="email"
                placeholder="student@example.com"
                value={registerForm.email}
                onChange={(e) =>
                  setRegisterForm((p) => ({ ...p, email: e.target.value }))
                }
                error={registerErrors.email}
                required
              />
            </div>

            <div className="form-grid-2">
              <Input
                label="Phone Number"
                name="phone_number"
                placeholder="+1 (555) 000-0000"
                value={registerForm.phone_number}
                onChange={(e) =>
                  setRegisterForm((p) => ({ ...p, phone_number: e.target.value }))
                }
                error={registerErrors.phone_number}
              />

              <Input
                label="Initial Password"
                name="password"
                type="password"
                placeholder="Minimum 8 characters"
                value={registerForm.password}
                onChange={(e) =>
                  setRegisterForm((p) => ({ ...p, password: e.target.value }))
                }
                error={registerErrors.password}
                hint="Student can log in using this password"
                required
              />
            </div>

            <Textarea
              label="Home / Contact Address"
              name="address"
              placeholder="e.g. 123 Tech Blvd, Suite 400..."
              rows={2}
              value={registerForm.address}
              onChange={(e) =>
                setRegisterForm((p) => ({ ...p, address: e.target.value }))
              }
            />

            <div className="modal-footer-actions mt-4">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => setIsRegisterOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isSubmittingRegister}
                icon={UserPlus}
              >
                Create Student Account
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* 2. Edit Student Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Student Information"
        subtitle={`Update details for ${selectedStudent?.name} (${selectedStudent?.student_id || ''})`}
        size="md"
      >
        <form onSubmit={handleEditSubmit} noValidate>
          {editErrors.general && (
            <div className="alert-banner alert-danger mb-4">
              <span>{editErrors.general}</span>
            </div>
          )}

          <Input
            label="Full Name"
            name="name"
            value={editForm.name}
            onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
            error={editErrors.name}
            required
          />

          <Input
            label="Email Address"
            name="email"
            type="email"
            value={editForm.email}
            onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
            error={editErrors.email}
            required
          />

          <Input
            label="Phone Number"
            name="phone_number"
            value={editForm.phone_number}
            onChange={(e) =>
              setEditForm((p) => ({ ...p, phone_number: e.target.value }))
            }
          />

          <Textarea
            label="Address"
            name="address"
            rows={2}
            value={editForm.address}
            onChange={(e) => setEditForm((p) => ({ ...p, address: e.target.value }))}
          />

          <div className="form-group">
            <label className="form-label">Account Status</label>
            <Select
              name="is_active"
              value={editForm.is_active ? '1' : '0'}
              onChange={(e) =>
                setEditForm((p) => ({ ...p, is_active: e.target.value === '1' }))
              }
              options={[
                { value: '1', label: 'Active Account (Permit login)' },
                { value: '0', label: 'Deactivated (Suspend access)' },
              ]}
            />
          </div>

          <div className="modal-footer-actions mt-4">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setIsEditOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSubmittingEdit}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* 3. Reset Password Modal */}
      <Modal
        isOpen={isResetPasswordOpen}
        onClose={() => setIsResetPasswordOpen(false)}
        title="Reset Student Password"
        subtitle={`Set a new login password for ${selectedStudent?.name}`}
        size="md"
      >
        <form onSubmit={handleResetSubmit} noValidate>
          {resetErrors.general && (
            <div className="alert-banner alert-danger mb-4">
              <span>{resetErrors.general}</span>
            </div>
          )}

          <p className="text-sm text-secondary mb-4">
            Resetting the student's password will immediately terminate all active sessions
            belonging to this student.
          </p>

          <Input
            label="New Password"
            name="password"
            type="password"
            placeholder="Minimum 8 characters"
            value={resetForm.password}
            onChange={(e) =>
              setResetForm((p) => ({ ...p, password: e.target.value }))
            }
            error={resetErrors.password}
            required
          />

          <Input
            label="Confirm New Password"
            name="password_confirmation"
            type="password"
            placeholder="Repeat password"
            value={resetForm.password_confirmation}
            onChange={(e) =>
              setResetForm((p) => ({ ...p, password_confirmation: e.target.value }))
            }
            error={resetErrors.password_confirmation}
            required
          />

          <div className="modal-footer-actions mt-4">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setIsResetPasswordOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              size="md"
              isLoading={isSubmittingReset}
              icon={KeyRound}
            >
              Reset Password Now
            </Button>
          </div>
        </form>
      </Modal>

      {/* 4. Student Details Modal */}
      <Modal
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        title="Student Profile & Course History"
        subtitle={selectedStudent?.name}
        size="lg"
      >
        {isLoadingDetails ? (
          <div className="py-8">
            <Spinner size={32} text="Loading student history..." />
          </div>
        ) : studentDetails ? (
          <div className="student-details-sheet">
            {/* Meta Card */}
            <div className="student-profile-overview-card">
              <div className="profile-overview-avatar">
                {studentDetails.name?.charAt(0) || 'S'}
              </div>
              <div className="profile-overview-content">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg text-main">{studentDetails.name}</h3>
                  {studentDetails.is_active ? (
                    <Badge variant="success" dot>Active</Badge>
                  ) : (
                    <Badge variant="danger" dot>Inactive</Badge>
                  )}
                </div>
                <p className="font-mono text-sm text-primary-color font-semibold mt-1">
                  ID: {studentDetails.student_id}
                </p>
                <div className="overview-contact-grid mt-2">
                  <span className="text-xs text-secondary">
                    <Mail size={12} className="inline mr-1 text-muted" />
                    {studentDetails.email}
                  </span>
                  {studentDetails.phone_number && (
                    <span className="text-xs text-secondary">
                      <Phone size={12} className="inline mr-1 text-muted" />
                      {studentDetails.phone_number}
                    </span>
                  )}
                  {studentDetails.address && (
                    <span className="text-xs text-secondary">
                      <MapPin size={12} className="inline mr-1 text-muted" />
                      {studentDetails.address}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Enrolments List */}
            <div className="enrolments-history-section mt-6">
              <h4 className="section-title-sm mb-3">
                Assigned Courses & Enrolments ({studentDetails.enrolments?.length || 0})
              </h4>
              {!studentDetails.enrolments || studentDetails.enrolments.length === 0 ? (
                <div className="empty-inline-box">
                  <BookOpen size={24} className="text-muted" />
                  <p className="text-sm text-muted">No courses currently assigned to this student.</p>
                </div>
              ) : (
                <div className="enrolments-list-cards">
                  {studentDetails.enrolments.map((enr) => (
                    <div key={enr.id} className="student-enrolment-item-card">
                      <div className="item-card-main">
                        <div className="flex items-center justify-between">
                          <h5 className="font-semibold text-main">
                            {enr.course?.name || 'Course'}
                          </h5>
                          {enr.status === 'completed' ? (
                            <Badge variant="success">Completed</Badge>
                          ) : enr.status === 'in_progress' ? (
                            <Badge variant="warning">In Progress</Badge>
                          ) : (
                            <Badge variant="danger">Cancelled</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted mt-1">
                          Code: {enr.course?.code || 'N/A'} • Duration: {enr.course?.duration || 'N/A'}
                        </p>
                        <div className="enrolment-dates-row mt-2 text-xs text-secondary">
                          <span>
                            Enrolled: {enr.enrolled_at ? new Date(enr.enrolled_at).toLocaleDateString() : '—'}
                          </span>
                          {enr.completed_at && (
                            <span className="ml-4">
                              Finished: {new Date(enr.completed_at).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>

                      {enr.certificate && (
                        <div className="item-card-cert-pill">
                          <Award size={16} className="text-primary-color" />
                          <div className="text-xs">
                            <span className="text-muted">Certificate: </span>
                            <strong className="font-mono">{enr.certificate.certificate_number}</strong>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-footer-actions mt-6">
              <Button variant="outline" size="md" onClick={() => setIsDetailsOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default Students;
