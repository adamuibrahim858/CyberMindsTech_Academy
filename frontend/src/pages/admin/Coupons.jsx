import React, { useState, useEffect, useCallback } from 'react';
import {
  Ticket,
  PlusCircle,
  Search,
  Filter,
  Edit,
  Trash2,
  RefreshCw,
  AlertCircle,
  Power,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';
import couponService from '../../services/couponService';
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

const Coupons = () => {
  const toast = useToast();

  const [coupons, setCoupons] = useState([]);
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
  const [selectedCoupon, setSelectedCoupon] = useState(null);

  // Form state
  const [couponForm, setCouponForm] = useState({
    code: '',
    discount_percentage: '',
    max_uses: '',
    course_id: '',
    expires_at: '',
    is_active: true,
  });
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Fetch courses list for dropdown
  useEffect(() => {
    const fetchCoursesList = async () => {
      try {
        const res = await courseService.getCourses({ per_page: 100, is_active: 1 });
        setCourses(res.data || []);
      } catch {
        // Non-critical if course list fails to load
      }
    };
    fetchCoursesList();
  }, []);

  // Fetch Coupons
  const fetchCoupons = useCallback(
    async (page = 1) => {
      try {
        setIsLoading(true);
        const params = {
          page,
          per_page: 10,
        };
        if (search.trim()) params.search = search.trim();
        if (statusFilter !== '') params.is_active = statusFilter;

        const res = await couponService.getCoupons(params);
        setCoupons(res.data || []);
        setMeta(res.meta || null);
        setCurrentPage(page);
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to fetch coupons'));
      } finally {
        setIsLoading(false);
      }
    },
    [search, statusFilter, toast]
  );

  useEffect(() => {
    fetchCoupons(1);
  }, [fetchCoupons]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchCoupons(1);
  };

  const handleOpenAdd = () => {
    setCouponForm({
      code: '',
      discount_percentage: '',
      max_uses: '',
      course_id: '',
      expires_at: '',
      is_active: true,
    });
    setFormErrors({});
    setIsAddOpen(true);
  };

  const handleOpenEdit = (coupon) => {
    setSelectedCoupon(coupon);
    setCouponForm({
      code: coupon.code || '',
      discount_percentage: coupon.discount_percentage || '',
      max_uses: coupon.max_uses !== null && coupon.max_uses !== undefined ? coupon.max_uses : '',
      course_id: coupon.course_id ? String(coupon.course_id) : '',
      expires_at: coupon.expires_at ? coupon.expires_at.split('T')[0] : '',
      is_active: Boolean(coupon.is_active),
    });
    setFormErrors({});
    setIsEditOpen(true);
  };

  const handleOpenDelete = (coupon) => {
    setSelectedCoupon(coupon);
    setDeleteError('');
    setIsDeleteOpen(true);
  };

  const validate = () => {
    const errs = {};
    if (!couponForm.code.trim()) {
      errs.code = 'Coupon code is required';
    } else if (!/^[A-Za-z0-9_-]+$/.test(couponForm.code.trim())) {
      errs.code = 'Code can only contain letters, numbers, hyphens, and underscores';
    }

    const discount = Number(couponForm.discount_percentage);
    if (!couponForm.discount_percentage || isNaN(discount) || discount < 1 || discount > 100) {
      errs.discount_percentage = 'Discount must be between 1% and 100%';
    }

    if (couponForm.max_uses && Number(couponForm.max_uses) < 1) {
      errs.max_uses = 'Max uses must be at least 1';
    }

    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setIsSubmitting(true);
      setFormErrors({});

      const payload = {
        code: couponForm.code.trim().toUpperCase(),
        discount_percentage: Number(couponForm.discount_percentage),
        max_uses: couponForm.max_uses ? Number(couponForm.max_uses) : null,
        course_id: couponForm.course_id ? Number(couponForm.course_id) : null,
        expires_at: couponForm.expires_at ? `${couponForm.expires_at} 23:59:59` : null,
        is_active: couponForm.is_active,
      };

      await couponService.createCoupon(payload);
      toast.success('Coupon created successfully');
      setIsAddOpen(false);
      fetchCoupons(1);
    } catch (err) {
      const msg = getErrorMessage(err, 'Failed to create coupon');
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

      const payload = {
        code: couponForm.code.trim().toUpperCase(),
        discount_percentage: Number(couponForm.discount_percentage),
        max_uses: couponForm.max_uses ? Number(couponForm.max_uses) : null,
        course_id: couponForm.course_id ? Number(couponForm.course_id) : null,
        expires_at: couponForm.expires_at ? `${couponForm.expires_at} 23:59:59` : null,
        is_active: couponForm.is_active,
      };

      await couponService.updateCoupon(selectedCoupon.id, payload);
      toast.success('Coupon updated successfully');
      setIsEditOpen(false);
      fetchCoupons(currentPage);
    } catch (err) {
      const msg = getErrorMessage(err, 'Failed to update coupon');
      setFormErrors({ general: msg });
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedCoupon) return;

    try {
      setIsDeleting(true);
      setDeleteError('');
      await couponService.deleteCoupon(selectedCoupon.id);
      toast.success('Coupon deleted successfully');
      setIsDeleteOpen(false);
      fetchCoupons(currentPage);
    } catch (err) {
      const msg = getErrorMessage(err, 'Could not delete coupon');
      setDeleteError(msg);
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeactivateInstead = async () => {
    if (!selectedCoupon) return;
    try {
      setIsDeleting(true);
      await couponService.updateCoupon(selectedCoupon.id, { is_active: false });
      toast.success('Coupon deactivated successfully');
      setIsDeleteOpen(false);
      fetchCoupons(currentPage);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to deactivate coupon'));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="page-content-wrapper">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Certificate Coupons</h2>
          <p className="page-subtitle">
            Create promotional discount codes and 100% free passes for students downloading certificates.
          </p>
        </div>
        <div className="page-header-actions">
          <Button variant="primary" size="md" icon={PlusCircle} onClick={handleOpenAdd}>
            Create Coupon
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
                placeholder="Search coupon by code (e.g. SCHOLARSHIP100)..."
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
                  { value: '1', label: 'Active Coupons' },
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
                fetchCoupons(1);
              }}
              title="Reset filters"
            >
              Reset
            </Button>
          </form>
        </CardBody>
      </Card>

      {/* Coupons Table */}
      <Card>
        <CardHeader
          title="Active & Historical Coupons"
          subtitle={meta?.total ? `Total of ${meta.total} coupons registered` : 'Coupon records'}
        />
        <CardBody className="p-0">
          {isLoading ? (
            <div className="table-loading-container">
              <Spinner size={32} text="Loading coupons..." />
            </div>
          ) : coupons.length === 0 ? (
            <EmptyState
              icon={Ticket}
              title="No coupons found"
              description="No promotional coupons matched your filters. Create your first discount or 100% scholarship coupon."
              actionText="Create Coupon"
              actionIcon={PlusCircle}
              onAction={handleOpenAdd}
            />
          ) : (
            <div className="responsive-table-container">
              <table className="portal-table">
                <thead>
                  <tr>
                    <th>Coupon Code</th>
                    <th>Discount</th>
                    <th>Applicable Course</th>
                    <th>Usage / Cap</th>
                    <th>Expiration</th>
                    <th>Status</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {coupons.map((coupon) => {
                    const is100 = coupon.discount_percentage === 100;
                    return (
                      <tr key={coupon.id}>
                        <td>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm px-2.5 py-1 bg-surface-hover rounded border border-border">
                              {coupon.code}
                            </span>
                          </div>
                        </td>
                        <td>
                          {is100 ? (
                            <Badge variant="success">
                              <Sparkles size={12} className="inline mr-1" />
                              100% Free Pass
                            </Badge>
                          ) : (
                            <span className="font-semibold text-primary-color text-sm">
                              {coupon.discount_percentage}% OFF
                            </span>
                          )}
                        </td>
                        <td>
                          {coupon.course ? (
                            <span className="text-sm font-medium text-main">
                              {coupon.course.name}
                            </span>
                          ) : (
                            <span className="text-xs text-muted italic flex items-center gap-1">
                              <Layers size={13} /> All Courses
                            </span>
                          )}
                        </td>
                        <td>
                          <span className="text-sm">
                            <strong>{coupon.uses_count}</strong>
                            <span className="text-muted">
                              {' '}
                              / {coupon.max_uses !== null ? coupon.max_uses : '∞'}
                            </span>
                          </span>
                        </td>
                        <td>
                          {coupon.expires_at ? (
                            <span className="text-xs text-secondary inline-flex items-center gap-1">
                              <Calendar size={13} className="text-muted" />
                              {new Date(coupon.expires_at).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="text-xs text-muted">Never expires</span>
                          )}
                        </td>
                        <td>
                          {coupon.is_expired ? (
                            <Badge variant="danger" dot>
                              Expired
                            </Badge>
                          ) : coupon.is_exhausted ? (
                            <Badge variant="warning" dot>
                              Exhausted
                            </Badge>
                          ) : coupon.is_active ? (
                            <Badge variant="success" dot>
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="neutral">Inactive</Badge>
                          )}
                        </td>
                        <td className="text-right">
                          <div className="action-button-group">
                            <button
                              type="button"
                              className="btn-table-action"
                              title="Edit coupon"
                              onClick={() => handleOpenEdit(coupon)}
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              type="button"
                              className="btn-table-action text-danger"
                              title="Delete or deactivate coupon"
                              onClick={() => handleOpenDelete(coupon)}
                            >
                              <Trash2 size={16} />
                            </button>
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
                onPageChange={(page) => fetchCoupons(page)}
                isLoading={isLoading}
              />
            </div>
          )}
        </CardBody>
      </Card>

      {/* Add Coupon Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Create New Coupon"
        subtitle="Introduce a discount code for certificate checkout"
        size="md"
      >
        <form onSubmit={handleAddSubmit} noValidate>
          {formErrors.general && (
            <div className="alert-banner alert-danger mb-4">
              <span>{formErrors.general}</span>
            </div>
          )}

          <Input
            label="Coupon Code"
            name="code"
            placeholder="e.g. CYBER100, PROMO50, FELLOW2026"
            value={couponForm.code}
            onChange={(e) => setCouponForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
            error={formErrors.code}
            hint="Letters, numbers, hyphens, and underscores only"
            required
          />

          <div className="form-group mb-4">
            <label className="form-label">
              Discount Percentage (%) <span className="text-danger">*</span>
            </label>
            <div className="flex gap-2 mb-2">
              {[25, 50, 75, 100].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setCouponForm((p) => ({ ...p, discount_percentage: String(pct) }))}
                  className={`btn btn-xs ${
                    Number(couponForm.discount_percentage) === pct ? 'btn-primary' : 'btn-outline'
                  }`}
                >
                  {pct === 100 ? '100% (Free Pass)' : `${pct}%`}
                </button>
              ))}
            </div>
            <Input
              name="discount_percentage"
              type="number"
              min="1"
              max="100"
              placeholder="1 - 100"
              value={couponForm.discount_percentage}
              onChange={(e) => setCouponForm((p) => ({ ...p, discount_percentage: e.target.value }))}
              error={formErrors.discount_percentage}
              hint="Enter 100 to allow student to claim certificate completely free."
            />
          </div>

          <div className="form-group mb-4">
            <label className="form-label">Applicable Course (Optional)</label>
            <Select
              name="course_id"
              value={couponForm.course_id}
              onChange={(e) => setCouponForm((p) => ({ ...p, course_id: e.target.value }))}
              placeholder="Valid for All Courses"
              options={courses.map((c) => ({
                value: String(c.id),
                label: `${c.name} (${c.code || 'No Code'})`,
              }))}
            />
          </div>

          <div className="form-grid-2">
            <Input
              label="Maximum Redemptions"
              name="max_uses"
              type="number"
              min="1"
              placeholder="Leave blank for unlimited"
              value={couponForm.max_uses}
              onChange={(e) => setCouponForm((p) => ({ ...p, max_uses: e.target.value }))}
              error={formErrors.max_uses}
            />

            <Input
              label="Expiration Date"
              name="expires_at"
              type="date"
              value={couponForm.expires_at}
              onChange={(e) => setCouponForm((p) => ({ ...p, expires_at: e.target.value }))}
              hint="Leave blank for no expiry"
            />
          </div>

          <div className="modal-footer-actions mt-5">
            <Button type="button" variant="outline" size="md" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md" isLoading={isSubmitting}>
              Create Coupon
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Coupon Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Coupon"
        subtitle={`Updating coupon: ${selectedCoupon?.code}`}
        size="md"
      >
        <form onSubmit={handleEditSubmit} noValidate>
          {formErrors.general && (
            <div className="alert-banner alert-danger mb-4">
              <span>{formErrors.general}</span>
            </div>
          )}

          <Input
            label="Coupon Code"
            name="code"
            value={couponForm.code}
            onChange={(e) => setCouponForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
            error={formErrors.code}
            required
          />

          <div className="form-group mb-4">
            <label className="form-label">
              Discount Percentage (%) <span className="text-danger">*</span>
            </label>
            <div className="flex gap-2 mb-2">
              {[25, 50, 75, 100].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setCouponForm((p) => ({ ...p, discount_percentage: String(pct) }))}
                  className={`btn btn-xs ${
                    Number(couponForm.discount_percentage) === pct ? 'btn-primary' : 'btn-outline'
                  }`}
                >
                  {pct === 100 ? '100% (Free Pass)' : `${pct}%`}
                </button>
              ))}
            </div>
            <Input
              name="discount_percentage"
              type="number"
              min="1"
              max="100"
              value={couponForm.discount_percentage}
              onChange={(e) => setCouponForm((p) => ({ ...p, discount_percentage: e.target.value }))}
              error={formErrors.discount_percentage}
            />
          </div>

          <div className="form-group mb-4">
            <label className="form-label">Applicable Course (Optional)</label>
            <Select
              name="course_id"
              value={couponForm.course_id}
              onChange={(e) => setCouponForm((p) => ({ ...p, course_id: e.target.value }))}
              placeholder="Valid for All Courses"
              options={courses.map((c) => ({
                value: String(c.id),
                label: `${c.name} (${c.code || 'No Code'})`,
              }))}
            />
          </div>

          <div className="form-grid-2">
            <Input
              label="Maximum Redemptions"
              name="max_uses"
              type="number"
              min="1"
              placeholder="Leave blank for unlimited"
              value={couponForm.max_uses}
              onChange={(e) => setCouponForm((p) => ({ ...p, max_uses: e.target.value }))}
              error={formErrors.max_uses}
            />

            <Input
              label="Expiration Date"
              name="expires_at"
              type="date"
              value={couponForm.expires_at}
              onChange={(e) => setCouponForm((p) => ({ ...p, expires_at: e.target.value }))}
            />
          </div>

          <div className="form-group mt-3">
            <label className="form-label">Coupon Status</label>
            <Select
              name="is_active"
              value={couponForm.is_active ? '1' : '0'}
              onChange={(e) =>
                setCouponForm((p) => ({ ...p, is_active: e.target.value === '1' }))
              }
              options={[
                { value: '1', label: 'Active (Available for student redemption)' },
                { value: '0', label: 'Inactive / Suspended' },
              ]}
            />
          </div>

          <div className="modal-footer-actions mt-5">
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
        title="Delete Coupon Confirmation"
        subtitle={`Coupon: ${selectedCoupon?.code}`}
        size="sm"
      >
        <div className="delete-modal-content">
          <div className="delete-warning-icon">
            <AlertCircle size={36} className="text-danger" />
          </div>

          <p className="text-sm text-secondary text-center mt-2">
            Are you sure you want to delete coupon <strong>{selectedCoupon?.code}</strong>?
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
                Deactivate Coupon Instead
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
                Delete Coupon
              </Button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default Coupons;
