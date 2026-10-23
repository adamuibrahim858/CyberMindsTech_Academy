import { useState, useEffect } from 'react';
import {
  User,
  Phone,
  Lock,
  Save,
  GraduationCap,
  KeyRound,
} from 'lucide-react';
import studentService from '../../services/studentService';
import { useAuth } from '../../context/AuthContext';
import { getErrorMessage } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Card, { CardHeader, CardBody } from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Spinner from '../../components/common/Spinner';
import Input from '../../components/forms/Input';
import Textarea from '../../components/forms/Textarea';

const Profile = () => {
  const { user, updateUserData } = useAuth();
  const toast = useToast();

  const [isLoading, setIsLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);

  // Profile Edit form
  const [formData, setFormData] = useState({
    name: '',
    phone_number: '',
    address: '',
    current_password: '',
    password: '',
    password_confirmation: '',
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        const res = await studentService.getProfile();
        if (res?.status === 'success') {
          const s = res.data;
          setProfileData(s);
          setFormData({
            name: s.name || '',
            phone_number: s.phone_number || '',
            address: s.address || '',
            current_password: '',
            password: '',
            password_confirmation: '',
          });
        }
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to fetch student profile'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [toast]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
    if (errors[name]) {
      setErrors((p) => ({ ...p, [name]: '' }));
    }
  };

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Full name is required';

    if (formData.password) {
      if (!formData.current_password) {
        errs.current_password = 'Current password is required to set a new password';
      }
      if (formData.password.length < 8) {
        errs.password = 'New password must be at least 8 characters';
      }
      if (formData.password !== formData.password_confirmation) {
        errs.password_confirmation = 'New passwords do not match';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setIsSubmitting(true);
      setErrors({});

      const payload = {
        name: formData.name.trim(),
        phone_number: formData.phone_number ? formData.phone_number.trim() : null,
        address: formData.address ? formData.address.trim() : null,
      };

      if (formData.password) {
        payload.current_password = formData.current_password;
        payload.password = formData.password;
        payload.password_confirmation = formData.password_confirmation;
      }

      const res = await studentService.updateProfile(payload);
      if (res?.status === 'success') {
        const updatedStudent = res.data;
        setProfileData(updatedStudent);

        // Update local auth context
        if (user) {
          updateUserData({
            ...user,
            name: updatedStudent.name,
          }, updatedStudent);
        }

        // Reset password fields
        setFormData((p) => ({
          ...p,
          current_password: '',
          password: '',
          password_confirmation: '',
        }));

        toast.success('Profile updated successfully');
      }
    } catch (err) {
      const msg = getErrorMessage(err, 'Failed to update profile');
      setErrors({ general: msg });
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="page-loading-wrapper">
        <Spinner size={36} text="Loading student profile..." />
      </div>
    );
  }

  return (
    <div className="page-content-wrapper">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">My Profile</h2>
          <p className="page-subtitle">
            Manage your personal contact details, security credentials, and identity information.
          </p>
        </div>
      </div>

      <div className="profile-layout-grid">
        {/* Left identity card */}
        <div className="profile-identity-card-wrapper">
          <Card className="profile-badge-card">
            <CardBody className="text-center p-6">
              <div className="profile-big-avatar">
                {profileData?.name?.charAt(0) || 'S'}
              </div>
              <h3 className="font-bold text-lg text-main mt-3">{profileData?.name}</h3>
              <p className="text-sm text-muted">{profileData?.email}</p>

              <div className="student-id-display-box mt-4">
                <span className="text-xs text-muted block">Student ID Number</span>
                <span className="font-mono font-bold text-primary-color text-base">
                  {profileData?.student_id || 'N/A'}
                </span>
              </div>

              <div className="profile-status-badges mt-4 flex justify-center gap-2">
                <Badge variant="success" dot>Active Student</Badge>
                <Badge variant="info">
                  <GraduationCap size={13} className="inline mr-1" />
                  {profileData?.enrolments?.length || 0} Tracks
                </Badge>
              </div>

              <div className="profile-rules-note mt-6">
                <p className="text-xs text-secondary leading-relaxed">
                  Your official <strong>Student ID</strong> and <strong>Email Address</strong> are
                  managed by CyberMinds Tech administration and cannot be modified here.
                </p>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Right edit form */}
        <div className="profile-form-wrapper">
          <Card>
            <CardHeader
              title="Edit Profile Information"
              subtitle="Update your contact details or change your password"
            />
            <CardBody>
              {errors.general && (
                <div className="alert-banner alert-danger mb-4">
                  <span>{errors.general}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                <div className="form-section-title">
                  <User size={18} className="text-primary-color" />
                  <span>Personal Contact Information</span>
                </div>

                <div className="form-grid-2 mt-3">
                  <Input
                    label="Official Full Name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    error={errors.name}
                    required
                  />

                  <Input
                    label="Email Address (Read-Only)"
                    name="email"
                    type="email"
                    value={profileData?.email || ''}
                    disabled
                    hint="Contact admin to change official email"
                  />
                </div>

                <div className="form-grid-2">
                  <Input
                    label="Phone Number"
                    name="phone_number"
                    placeholder="+1 (555) 000-0000"
                    value={formData.phone_number}
                    onChange={handleChange}
                    error={errors.phone_number}
                    icon={Phone}
                  />

                  <Input
                    label="Student ID (Immutable)"
                    name="student_id"
                    value={profileData?.student_id || ''}
                    disabled
                    hint="Permanently assigned by CyberMinds Tech"
                  />
                </div>

                <Textarea
                  label="Contact Address"
                  name="address"
                  rows={2}
                  placeholder="Street, City, Country..."
                  value={formData.address}
                  onChange={handleChange}
                  error={errors.address}
                />

                <div className="form-section-title mt-6">
                  <KeyRound size={18} className="text-primary-color" />
                  <span>Change Password (Optional)</span>
                </div>
                <p className="text-xs text-muted mb-4">
                  Leave password fields blank if you do not want to change your password.
                </p>

                <div className="form-grid-1">
                  <Input
                    label="Current Password"
                    name="current_password"
                    type="password"
                    placeholder="Enter existing password to confirm changes"
                    value={formData.current_password}
                    onChange={handleChange}
                    error={errors.current_password}
                    icon={Lock}
                  />
                </div>

                <div className="form-grid-2">
                  <Input
                    label="New Password"
                    name="password"
                    type="password"
                    placeholder="Minimum 8 characters"
                    value={formData.password}
                    onChange={handleChange}
                    error={errors.password}
                    icon={Lock}
                  />

                  <Input
                    label="Confirm New Password"
                    name="password_confirmation"
                    type="password"
                    placeholder="Repeat new password"
                    value={formData.password_confirmation}
                    onChange={handleChange}
                    error={errors.password_confirmation}
                    icon={Lock}
                  />
                </div>

                <div className="flex justify-end mt-6">
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    isLoading={isSubmitting}
                    icon={Save}
                  >
                    Save Profile Changes
                  </Button>
                </div>
              </form>
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Profile;
