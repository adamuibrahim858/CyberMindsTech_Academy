import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, ArrowLeft, KeyRound, CheckCircle2 } from 'lucide-react';
import Input from '../../components/forms/Input';
import Button from '../../components/common/Button';
import authService from '../../services/authService';
import { getErrorMessage } from '../../services/api';
import { useToast } from '../../context/ToastContext';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resetToken, setResetToken] = useState(null);
  const toast = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Email is required');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const data = await authService.forgotPassword(email.trim());
      toast.success('Password reset token generated.');
      setResetToken(data.reset_token);
    } catch (err) {
      const msg = getErrorMessage(err, 'Unable to process password reset request.');
      setError(msg);
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
            <h3>Forgot Password</h3>
            <p>Enter your registered email address to receive password reset instructions</p>
          </div>

          {error && (
            <div className="alert-banner alert-danger">
              <span>{error}</span>
            </div>
          )}

          {resetToken ? (
            <div className="reset-token-box">
              <div className="reset-token-header">
                <CheckCircle2 size={24} className="text-success" />
                <h4>Reset Token Generated</h4>
              </div>
              <p className="text-sm">
                A password reset token has been issued for <strong>{email}</strong>:
              </p>
              <div className="token-code-block">
                <code>{resetToken}</code>
              </div>
              <p className="text-xs text-muted mb-4">
                In production, this is emailed to the user. For development and testing, you can proceed directly with this token.
              </p>
              <Button
                variant="primary"
                size="md"
                className="w-full"
                onClick={() =>
                  navigate(`/reset-password?email=${encodeURIComponent(email)}&token=${encodeURIComponent(resetToken)}`)
                }
              >
                Proceed to Reset Password
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="auth-form" noValidate>
              <Input
                label="Registered Email"
                name="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                error={error}
                icon={Mail}
                required
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                isLoading={isLoading}
                icon={KeyRound}
                className="w-full mt-2"
              >
                Send Reset Instructions
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

export default ForgotPassword;
