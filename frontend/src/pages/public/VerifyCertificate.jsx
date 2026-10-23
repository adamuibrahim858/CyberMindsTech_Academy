import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  ShieldCheck,
  AlertOctagon,
  Search,
  Award,
  Calendar,
  XCircle,
  BookOpen,
  User,
} from 'lucide-react';
import verificationService from '../../services/verificationService';
import { getErrorMessage } from '../../services/api';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Spinner from '../../components/common/Spinner';
import Input from '../../components/forms/Input';

const VerifyCertificate = () => {
  const { certificateNumber: paramCert } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialCert = paramCert || searchParams.get('code') || '';
  const [query, setQuery] = useState(initialCert);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [notFoundMessage, setNotFoundMessage] = useState('');

  const performVerification = async (certNum) => {
    if (!certNum || !certNum.trim()) return;

    setIsLoading(true);
    setNotFoundMessage('');
    setResult(null);

    try {
      const res = await verificationService.verifyCertificate(certNum.trim());
      if (res?.status === 'success') {
        setResult(res.data);
      }
    } catch (err) {
      const msg = getErrorMessage(
        err,
        'Certificate not found. The provided certificate number or verification code is invalid.'
      );
      setNotFoundMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialCert) {
      performVerification(initialCert);
    }
  }, [initialCert]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearchParams({ code: query.trim() });
    performVerification(query.trim());
  };

  return (
    <div className="verify-page-container">
      {/* Hero Header */}
      <div className="verify-hero-section text-center">
        <h1 className="verify-hero-title">Official Certificate Verification</h1>
        <p className="verify-hero-subtitle">
          Verify the authenticity and validity of certifications issued by CyberMinds Tech Limited.
        </p>

        {/* Verification Form */}
        <div className="verify-search-card mt-6">
          <form onSubmit={handleSubmit} className="verify-search-form">
            <div className="verify-input-wrapper">
              <Input
                name="query"
                placeholder="Enter Certificate Number (e.g. CMT/2026/001)..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                icon={Search}
                className="mb-0"
                required
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              icon={Search}
              className="verify-submit-btn"
            >
              Verify Credential
            </Button>
          </form>

          <div className="verify-samples-row mt-3">
            <span className="text-xs text-muted">Try sample certificate:</span>
            <button
              type="button"
              className="sample-pill-btn font-mono"
              onClick={() => {
                setQuery('CMT/2026/001');
                performVerification('CMT/2026/001');
              }}
            >
              CMT/2026/001
            </button>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="verify-state-box mt-8">
          <Spinner size={36} text="Validating certificate against academy ledger..." />
        </div>
      )}

      {/* Not Found / Error Banner */}
      {!isLoading && notFoundMessage && (
        <div className="verify-result-wrapper mt-8 animate-fade-in">
          <div className="verify-result-card not-found-card">
            <div className="verify-status-banner banner-not-found">
              <XCircle size={36} className="text-danger flex-shrink-0" />
              <div>
                <h3 className="verify-status-heading">Invalid Credential</h3>
                <p className="text-sm mt-0.5">{notFoundMessage}</p>
              </div>
            </div>
            <div className="verify-details-body p-6 text-sm text-secondary">
              <p>
                Please double-check the certificate number printed on the physical or PDF certificate.
                Certificate numbers typically follow the format <code>CMT/YYYY/XXX</code>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Verified Certificate Display */}
      {!isLoading && result && (
        <div className="verify-result-wrapper mt-8 animate-fade-in">
          <div
            className={`verify-result-card ${
              result.validity_status === 'valid' ? 'card-valid' : 'card-revoked'
            }`}
          >
            {/* Header Banner */}
            <div
              className={`verify-status-banner ${
                result.validity_status === 'valid' ? 'banner-valid' : 'banner-revoked'
              }`}
            >
              {result.validity_status === 'valid' ? (
                <>
                  <ShieldCheck size={38} className="text-success flex-shrink-0" />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="verify-status-heading text-success">Verified Authentic</h3>
                      <Badge variant="success">VALID</Badge>
                    </div>
                    <p className="text-sm mt-0.5">
                      This certificate was officially issued by CyberMinds Tech Limited.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <AlertOctagon size={38} className="text-danger flex-shrink-0" />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="verify-status-heading text-danger">Revoked Credential</h3>
                      <Badge variant="danger">REVOKED</Badge>
                    </div>
                    <p className="text-sm mt-0.5 text-danger font-medium">
                      This certificate has been revoked and is no longer valid.
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Certificate Public Details */}
            <div className="verify-details-body p-6">
              <div className="verify-grid-2">
                <div className="verify-meta-block">
                  <span className="verify-meta-label">Recipient Full Name</span>
                  <div className="verify-meta-value flex items-center gap-2 mt-1">
                    <User size={18} className="text-muted" />
                    <span className="font-bold text-lg text-main">{result.student_name}</span>
                  </div>
                </div>

                <div className="verify-meta-block">
                  <span className="verify-meta-label">Official Certificate Number</span>
                  <div className="verify-meta-value flex items-center gap-2 mt-1">
                    <Award size={18} className="text-primary-color" />
                    <span className="font-mono font-bold text-lg text-primary-color">
                      {result.certificate_number}
                    </span>
                  </div>
                </div>
              </div>

              <div className="verify-meta-block mt-4">
                <span className="verify-meta-label">Certified Course Track</span>
                <div className="verify-meta-value flex items-center gap-2 mt-1">
                  <BookOpen size={18} className="text-muted" />
                  <span className="font-semibold text-main text-base">{result.course_name}</span>
                </div>
              </div>

              <div className="verify-grid-2 mt-4 pt-4 border-t">
                <div className="verify-meta-block">
                  <span className="verify-meta-label">Course Completion Date</span>
                  <div className="verify-meta-value flex items-center gap-2 mt-1 text-sm font-medium">
                    <Calendar size={16} className="text-muted" />
                    <span>{result.completion_date || '—'}</span>
                  </div>
                </div>

                <div className="verify-meta-block">
                  <span className="verify-meta-label">Credential Issuance Date</span>
                  <div className="verify-meta-value flex items-center gap-2 mt-1 text-sm font-medium">
                    <Calendar size={16} className="text-muted" />
                    <span>{result.issue_date || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Revocation notice if revoked */}
              {result.validity_status === 'revoked' && (
                <div className="verify-revocation-box mt-6 p-4 rounded-md bg-rose-50 border border-rose-200">
                  <div className="flex items-start gap-2">
                    <AlertOctagon size={20} className="text-danger flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-sm text-danger">Revocation Notice</h4>
                      {result.revocation_reason && (
                        <p className="text-sm text-secondary mt-1">
                          <strong>Official Reason:</strong> {result.revocation_reason}
                        </p>
                      )}
                      {result.revoked_at && (
                        <p className="text-xs text-muted mt-1">
                          Revocation timestamp: {result.revoked_at}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Privacy Safeguard Note */}
              <div className="verify-privacy-notice mt-6 text-xs text-muted text-center border-t pt-4">
                <span>
                  Privacy Protection: Personal contact details (phone number, email, and address) are
                  strictly confidential and omitted from public verification.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VerifyCertificate;
