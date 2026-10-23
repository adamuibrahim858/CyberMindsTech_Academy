import React, { useState } from 'react';
import { useNavigate, useLocation, Link, Navigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, LogIn, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Input from '../../components/forms/Input';
import Button from '../../components/common/Button';
import { getErrorMessage } from '../../services/api';

const Login = () => {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  // If already authenticated, redirect immediately
  if (isAuthenticated && user) {
    const from = location.state?.from?.pathname;
    const defaultPath = user.role === 'admin' ? '/admin/dashboard' : '/student/dashboard';
    return <Navigate to={from || defaultPath} replace />;
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
    setServerError('');
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
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
      const { user: loggedInUser, redirectPath } = await login(
        { email: formData.email.trim(), password: formData.password },
        formData.rememberMe
      );

      toast.success(`Welcome back, ${loggedInUser.name}!`);

      const destination = location.state?.from?.pathname || redirectPath;
      navigate(destination, { replace: true });
    } catch (err) {
      const errorMsg = getErrorMessage(err, 'Failed to sign in. Please check your credentials.');
      setServerError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-card-container">
        <div className="auth-card">
          <div className="auth-card-header">
            <h3>Sign In to Your Account</h3>
            <p>Enter your credentials to access your portal</p>
          </div>

          {serverError && (
            <div className="alert-banner alert-danger">
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form" noValidate>
            <Input
              label="Email Address"
              name="email"
              type="email"
              placeholder="name@example.com"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
              icon={Mail}
              autoComplete="email"
              required
            />

            <Input
              label="Password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
              icon={Lock}
              endIcon={showPassword ? EyeOff : Eye}
              onEndIconClick={() => setShowPassword((prev) => !prev)}
              autoComplete="current-password"
              required
            />

            <div className="auth-meta-row">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                />
                <span>Remember me</span>
              </label>

              <Link to="/forgot-password" className="auth-link-text">
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              icon={LogIn}
              className="w-full mt-4"
            >
              Sign In
            </Button>
          </form>

          <div className="auth-footer-divider">
            <span>or verify a credential</span>
          </div>

          <div className="auth-public-action">
            <Link to="/verify" className="btn btn-outline btn-md w-full">
              <span>Verify Student Certificate</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
