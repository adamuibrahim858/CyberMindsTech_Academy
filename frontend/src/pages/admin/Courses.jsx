import React, { useState, useEffect, useCallback } from 'react';
import {
  BookOpen,
  PlusCircle,
  Search,
  Filter,
  Edit,
  Trash2,
  Users,
  Clock,
  RefreshCw,
  AlertCircle,
  Power,
} from 'lucide-react';
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
import Textarea from '../../components/forms/Textarea';
import Select from '../../components/forms/Select';

const Courses = () => {
  const toast = useToast();

  const [courses, setCourses] = useState([]);
  const [meta, setMeta] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);

  // Form states
  const [courseForm, setCourseForm] = useState({
    name: '',
    code: '',
    duration: '',
    certificate_price: '',
    description: '',
    is_active: true,
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch Courses
  const fetchCourses = useCallback(
    async (page = 1) => {
      try {
        setIsLoading(true);
        const params = {
          page,
          per_page: 10,
        };
        if (search.trim()) params.search = search.trim();
        if (statusFilter !== '') params.is_active = statusFilter;

        const res = await courseService.getCourses(params);
        setCourses(res.data || []);
        setMeta(res.meta || null);
        setCurrentPage(page);
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to fetch courses'));
      } finally {
        setIsLoading(false);
      }
    },
    [search, statusFilter, toast]
  );

  useEffect(() => {
    fetchCourses(1);
  }, [fetchCourses]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchCourses(1);
  };

  const handleOpenAdd = () => {
    setCourseForm({
      name: '',
      code: '',
      duration: '',
      certificate_price: '',
      description: '',
      is_active: true,
    });
    setFormErrors({});
    setIsAddOpen(true);
  };

  const handleOpenEdit = (course) => {
    setSelectedCourse(course);
    setCourseForm({
      name: course.name || '',
      code: course.code || '',
      duration: course.duration || '',
      certificate_price: course.certificate_price !== undefined && course.certificate_price !== null ? course.certificate_price : '',
      description: course.description || '',
      is_active: Boolean(course.is_active),
    });
    setFormErrors({});
    setIsEditOpen(true);
  };

  const handleOpenDelete = (course) => {
    setSelectedCourse(course);
    setDeleteError('');
    setIsDeleteOpen(true);
  };

  const validate = () => {
    const errs = {};
    if (!courseForm.name.trim()) errs.name = 'Course name is required';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setIsSubmitting(true);
      setFormErrors({});
      await courseService.createCourse(courseForm);
      toast.success('Course created successfully');
      setIsAddOpen(false);
      fetchCourses(1);
    } catch (err) {
      const msg = getErrorMessage(err, 'Failed to create course');
      setFormErrors({ general: msg });
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setIsSubmitting(true);
      setFormErrors({});
      await courseService.updateCourse(selectedCourse.id, courseForm);
      toast.success('Course updated successfully');
      setIsEditOpen(false);
      fetchCourses(currentPage);
    } catch (err) {
      const msg = getErrorMessage(err, 'Failed to update course');
      setFormErrors({ general: msg });
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedCourse) return;

    try {
      setIsDeleting(true);
      setDeleteError('');
      await courseService.deleteCourse(selectedCourse.id);
      toast.success('Course deleted successfully');
      setIsDeleteOpen(false);
      fetchCourses(currentPage);
    } catch (err) {
      const msg = getErrorMessage(err, 'Could not delete course');
      setDeleteError(msg);
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeactivateInstead = async () => {
    if (!selectedCourse) return;
    try {
      setIsDeleting(true);
      await courseService.updateCourse(selectedCourse.id, { is_active: false });
      toast.success('Course deactivated successfully');
      setIsDeleteOpen(false);
      fetchCourses(currentPage);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to deactivate course'));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="page-content-wrapper">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Course Curriculum</h2>
          <p className="page-subtitle">
            Manage technical training programs, durations, codes, and enrolment status.
          </p>
        </div>
        <div className="page-header-actions">
          <Button variant="primary" size="md" icon={PlusCircle} onClick={handleOpenAdd}>
            Add New Course
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
                placeholder="Search by course name, code, or description..."
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
                  { value: '1', label: 'Active Courses Only' },
                  { value: '0', label: 'Archived / Inactive' },
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
                fetchCourses(1);
              }}
              title="Reset filters"
            >
              Reset
            </Button>
          </form>
        </CardBody>
      </Card>

      {/* Courses Table */}
      <Card>
        <CardHeader
          title="Academy Courses"
          subtitle={meta?.total ? `Total of ${meta.total} courses offered` : 'Course listing'}
        />
        <CardBody className="p-0">
          {isLoading ? (
            <div className="table-loading-container">
              <Spinner size={32} text="Loading courses..." />
            </div>
          ) : courses.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No courses found"
              description="No course matches your query. You can add a new course syllabus to the curriculum."
              actionText="Add Course"
              actionIcon={PlusCircle}
              onAction={handleOpenAdd}
            />
          ) : (
            <div className="responsive-table-container">
              <table className="portal-table">
                <thead>
                  <tr>
                    <th>Course Code</th>
                    <th>Course Title & Description</th>
                    <th>Duration</th>
                    <th>Certificate Fee</th>
                    <th>Enrolments</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((c) => (
                    <tr key={c.id}>
                      <td className="font-mono font-semibold text-primary-color">
                        {c.code || <span className="text-muted font-normal text-xs">—</span>}
                      </td>
                      <td className="max-w-md">
                        <div className="course-title-cell">
                          <span className="font-medium text-main block">{c.name}</span>
                          {c.description && (
                            <span className="text-xs text-muted block line-clamp-1 mt-0.5">
                              {c.description}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="text-sm text-secondary inline-flex items-center gap-1">
                          <Clock size={13} className="text-muted" />
                          {c.duration || 'Flexible'}
                        </span>
                      </td>
                      <td>
                        {Number(c.certificate_price) > 0 ? (
                          <span className="font-semibold text-main text-sm">
                            ₦{Number(c.certificate_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <Badge variant="success">Free</Badge>
                        )}
                      </td>
                      <td>
                        <Badge variant="neutral">
                          <Users size={12} className="inline mr-1" />
                          {c.enrolments_count ?? 0} {c.enrolments_count === 1 ? 'student' : 'students'}
                        </Badge>
                      </td>
                      <td>
                        {c.is_active ? (
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
                            title="Edit course syllabus"
                            onClick={() => handleOpenEdit(c)}
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            type="button"
                            className="btn-table-action text-danger"
                            title="Delete or deactivate course"
                            onClick={() => handleOpenDelete(c)}
                          >
                            <Trash2 size={16} />
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
                onPageChange={(page) => fetchCourses(page)}
                isLoading={isLoading}
              />
            </div>
          )}
        </CardBody>
      </Card>

      {/* Add Course Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add New Course"
        subtitle="Introduce a new training course into the academy portal"
        size="md"
      >
        <form onSubmit={handleAddSubmit} noValidate>
          {formErrors.general && (
            <div className="alert-banner alert-danger mb-4">
              <span>{formErrors.general}</span>
            </div>
          )}

          <Input
            label="Course Title"
            name="name"
            placeholder="e.g. Advanced Ethical Hacking & Penetration Testing"
            value={courseForm.name}
            onChange={(e) => setCourseForm((p) => ({ ...p, name: e.target.value }))}
            error={formErrors.name}
            required
          />

          <div className="form-grid-2">
            <Input
              label="Course Code"
              name="code"
              placeholder="e.g. CMT-SEC-301"
              value={courseForm.code}
              onChange={(e) => setCourseForm((p) => ({ ...p, code: e.target.value }))}
              error={formErrors.code}
              hint="Unique identifier code"
            />

            <Input
              label="Duration"
              name="duration"
              placeholder="e.g. 10 Weeks"
              value={courseForm.duration}
              onChange={(e) => setCourseForm((p) => ({ ...p, duration: e.target.value }))}
              error={formErrors.duration}
            />
          </div>

          <Input
            label="Certificate Cost Price (₦ NGN)"
            name="certificate_price"
            type="number"
            min="0"
            step="0.01"
            placeholder="e.g. 5000 (0 for free)"
            value={courseForm.certificate_price}
            onChange={(e) => setCourseForm((p) => ({ ...p, certificate_price: e.target.value }))}
            error={formErrors.certificate_price}
            hint="Fee required from student to download certificate. Enter 0 for free."
          />

          <Textarea
            label="Course Description"
            name="description"
            rows={3}
            placeholder="Outline curriculum syllabus, learning objectives, and lab requirements..."
            value={courseForm.description}
            onChange={(e) =>
              setCourseForm((p) => ({ ...p, description: e.target.value }))
            }
          />

          <div className="modal-footer-actions mt-4">
            <Button type="button" variant="outline" size="md" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md" isLoading={isSubmitting}>
              Create Course
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Course Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Course"
        subtitle={`Updating ${selectedCourse?.name}`}
        size="md"
      >
        <form onSubmit={handleEditSubmit} noValidate>
          {formErrors.general && (
            <div className="alert-banner alert-danger mb-4">
              <span>{formErrors.general}</span>
            </div>
          )}

          <Input
            label="Course Title"
            name="name"
            value={courseForm.name}
            onChange={(e) => setCourseForm((p) => ({ ...p, name: e.target.value }))}
            error={formErrors.name}
            required
          />

          <div className="form-grid-2">
            <Input
              label="Course Code"
              name="code"
              value={courseForm.code}
              onChange={(e) => setCourseForm((p) => ({ ...p, code: e.target.value }))}
              error={formErrors.code}
            />

            <Input
              label="Duration"
              name="duration"
              value={courseForm.duration}
              onChange={(e) => setCourseForm((p) => ({ ...p, duration: e.target.value }))}
              error={formErrors.duration}
            />
          </div>

          <Input
            label="Certificate Cost Price (₦ NGN)"
            name="certificate_price"
            type="number"
            min="0"
            step="0.01"
            placeholder="e.g. 5000 (0 for free)"
            value={courseForm.certificate_price}
            onChange={(e) => setCourseForm((p) => ({ ...p, certificate_price: e.target.value }))}
            error={formErrors.certificate_price}
            hint="Fee required from student to download certificate. Enter 0 for free."
          />

          <Textarea
            label="Course Description"
            name="description"
            rows={3}
            value={courseForm.description}
            onChange={(e) =>
              setCourseForm((p) => ({ ...p, description: e.target.value }))
            }
          />

          <div className="form-group">
            <label className="form-label">Course Status</label>
            <Select
              name="is_active"
              value={courseForm.is_active ? '1' : '0'}
              onChange={(e) =>
                setCourseForm((p) => ({ ...p, is_active: e.target.value === '1' }))
              }
              options={[
                { value: '1', label: 'Active Course (Open for enrolment)' },
                { value: '0', label: 'Inactive / Archived' },
              ]}
            />
          </div>

          <div className="modal-footer-actions mt-4">
            <Button type="button" variant="outline" size="md" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md" isLoading={isSubmitting}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Delete Course Confirmation"
        subtitle={`Course: ${selectedCourse?.name}`}
        size="sm"
      >
        <div className="delete-modal-content">
          <div className="delete-warning-icon">
            <AlertCircle size={36} className="text-danger" />
          </div>

          <p className="text-sm text-secondary text-center mt-2">
            Are you sure you want to permanently remove{' '}
            <strong>{selectedCourse?.name}</strong>?
          </p>

          {deleteError && (
            <div className="alert-banner alert-danger mt-3">
              <span className="text-xs">{deleteError}</span>
            </div>
          )}

          {deleteError ? (
            <div className="mt-4 flex flex-col gap-2">
              <Button
                variant="warning"
                size="md"
                icon={Power}
                onClick={handleDeactivateInstead}
                isLoading={isDeleting}
                className="w-full"
              >
                Deactivate Course Instead
              </Button>
              <Button
                variant="outline"
                size="md"
                onClick={() => setIsDeleteOpen(false)}
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          ) : (
            <div className="modal-footer-actions mt-6">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => setIsDeleteOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                size="md"
                onClick={handleDeleteConfirm}
                isLoading={isDeleting}
              >
                Delete Course
              </Button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default Courses;
