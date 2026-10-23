import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Lock, Mail, Key, ArrowLeft, CheckCircle2 } from 'lucide-react';
import Input from '../../components/forms/Input';
import Button from '../../components/common/Button';
import authService from '../../services/authService';
import { getErrorMessage } from '../../services/api';
import { useToast } from '../../context/ToastContext';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [formData, setFormData] = useState({
    email: searchParams.get('email') || '',
    token: searchParams.get('token') || '',
    password: '',
    password_confirmation: '',
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    if (!formData.token.trim()) newErrors.token = 'Reset token is required';
    if (!formData.password) {
      newErrors.password = 'New password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    if (formData.password !== formData.password_confirmation) {
      newErrors.password_confirmation = 'Passwords do not match';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setServerError('');

    try {
      await authService.resetPassword({
        email: formData.email.trim(),
        token: formData.token.trim(),
        password: formData.password,
        password_confirmation: formData.password_confirmation,
      });

      setIsSuccess(true);
      toast.success('Password successfully reset! Please login.');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      const msg = getErrorMessage(err, 'Failed to reset password. Token may be invalid or expired.');
      setServerError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-card-container">
        <div className="auth-card">
          <div className="auth-card-header">
            <h3>Reset Password</h3>
            <p>Set a new secure password for your account</p>
          </div>

          {serverError && (
            <div className="alert-banner alert-danger">
              <span>{serverError}</span>
            </div>
          )}

          {isSuccess ? (
            <div className="reset-success-box text-center">
              <CheckCircle2 size={48} className="text-success mx-auto mb-2" />
              <h4>Password Changed!</h4>
              <p className="text-sm text-muted mb-4">
                Your password has been successfully updated. Redirecting to login...
              </p>
              <Button variant="primary" size="md" onClick={() => navigate('/login')} className="w-full">
                Go to Login
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="auth-form" noValidate>
              <Input
                label="Email Address"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                error={errors.email}
                icon={Mail}
                required
              />

              <Input
                label="Reset Token"
                name="token"
                type="text"
                value={formData.token}
                onChange={handleChange}
                error={errors.token}
                icon={Key}
                required
              />

              <Input
                label="New Password"
                name="password"
                type="password"
                placeholder="Minimum 8 characters"
                value={formData.password}
                onChange={handleChange}
                error={errors.password}
                icon={Lock}
                required
              />

              <Input
                label="Confirm New Password"
                name="password_confirmation"
                type="password"
                placeholder="Re-enter password"
                value={formData.password_confirmation}
                onChange={handleChange}
                error={errors.password_confirmation}
                icon={Lock}
                required
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isLoading}
                className="w-full mt-2"
              >
                Reset Password
              </Button>
            </form>
          )}

          <div className="auth-back-action">
            <Link to="/login" className="back-link">
              <ArrowLeft size={16} />
              <span>Back to Login</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
