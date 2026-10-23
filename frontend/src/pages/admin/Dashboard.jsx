import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  BookOpen,
  UserCheck,
  CheckCircle,
  Award,
  AlertTriangle,
  UserPlus,
  PlusCircle,
  Search,
  ArrowRight,
} from 'lucide-react';
import dashboardService from '../../services/dashboardService';
import Spinner from '../../components/common/Spinner';
import Card, { CardHeader, CardBody } from '../../components/common/Card';
import Button from '../../components/common/Button';
import { useToast } from '../../context/ToastContext';
import logo1 from '../../assets/logo1.png';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();

  const fetchStats = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await dashboardService.getAdminStats();
      if (res?.status === 'success') {
        setStats(res.data);
      }
    } catch {
      toast.error('Failed to load dashboard statistics');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (isLoading) {
    return (
      <div className="page-loading-wrapper">
        <Spinner size={36} text="Loading academy metrics..." />
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Students',
      value: stats?.total_students ?? 0,
      icon: Users,
      color: 'blue',
      link: '/admin/students',
    },
    {
      title: 'Total Courses',
      value: stats?.total_courses ?? 0,
      icon: BookOpen,
      color: 'indigo',
      link: '/admin/courses',
    },
    {
      title: 'Active Enrolments',
      value: stats?.active_enrolments ?? 0,
      icon: UserCheck,
      color: 'amber',
      link: '/admin/enrolments?status=in_progress',
    },
    {
      title: 'Completed Enrolments',
      value: stats?.completed_enrolments ?? 0,
      icon: CheckCircle,
      color: 'emerald',
      link: '/admin/enrolments?status=completed',
    },
    {
      title: 'Certificates Issued',
      value: stats?.certificates_issued ?? 0,
      icon: Award,
      color: 'sky',
      link: '/admin/certificates?status=valid',
    },
    {
      title: 'Revoked Certificates',
      value: stats?.revoked_certificates ?? 0,
      icon: AlertTriangle,
      color: 'rose',
      link: '/admin/certificates?status=revoked',
    },
  ];

  return (
    <div className="page-content-wrapper">
      {/* Page Title & Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">Admin Overview</h2>
          <p className="page-subtitle">
            Academy performance, course enrolments, and credential issuance monitoring.
          </p>
        </div>
        <div className="page-header-actions">
          <Link to="/verify">
            <Button variant="outline" size="sm" icon={Search}>
              Verify Certificate
            </Button>
          </Link>
          <Link to="/admin/students">
            <Button variant="primary" size="sm" icon={UserPlus}>
              Register Student
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="stats-grid">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.title} to={card.link} className={`stat-card-link stat-${card.color}`}>
              <div className="stat-card">
                <div className="stat-card-top">
                  <span className="stat-card-title">{card.title}</span>
                  <div className={`stat-icon-badge ${card.color}`}>
                    <Icon size={20} />
                  </div>
                </div>
                <div className="stat-card-main">
                  <span className="stat-number">{card.value}</span>
                </div>
                <div className="stat-card-bottom">
                  <span className="stat-link-hint">
                    View details <ArrowRight size={13} className="inline ml-1" />
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick Actions & Portal Information */}
      <div className="dashboard-sections-grid mt-6">
        <Card className="quick-actions-card">
          <CardHeader
            title="Quick Management Actions"
            subtitle="Perform frequent tasks with a single click"
          />
          <CardBody>
            <div className="quick-actions-list">
              <Link to="/admin/students" className="quick-action-item">
                <div className="quick-action-icon text-blue">
                  <UserPlus size={20} />
                </div>
                <div className="quick-action-info">
                  <h4>Register New Student</h4>
                  <p>Create student account with auto-generated ID</p>
                </div>
                <ArrowRight size={16} className="quick-action-arrow" />
              </Link>

              <Link to="/admin/courses" className="quick-action-item">
                <div className="quick-action-icon text-indigo">
                  <PlusCircle size={20} />
                </div>
                <div className="quick-action-info">
                  <h4>Add New Course</h4>
                  <p>Configure course syllabus, duration, and code</p>
                </div>
                <ArrowRight size={16} className="quick-action-arrow" />
              </Link>

              <Link to="/admin/enrolments" className="quick-action-item">
                <div className="quick-action-icon text-amber">
                  <UserCheck size={20} />
                </div>
                <div className="quick-action-info">
                  <h4>Enrol Student in Course</h4>
                  <p>Assign student and manage training progress</p>
                </div>
                <ArrowRight size={16} className="quick-action-arrow" />
              </Link>

              <Link to="/admin/certificates" className="quick-action-item">
                <div className="quick-action-icon text-sky">
                  <Award size={20} />
                </div>
                <div className="quick-action-info">
                  <h4>Manage Certificates</h4>
                  <p>Inspect, preview, download, or revoke credentials</p>
                </div>
                <ArrowRight size={16} className="quick-action-arrow" />
              </Link>
            </div>
          </CardBody>
        </Card>

        <Card className="system-status-card">
          <CardHeader
            title="Credential Authority Info"
            subtitle="Security and cryptographic integrity"
          />
          <CardBody>
            <div className="authority-status-box">
              <div className="authority-badge">
                <div className="authority-logo-box">
                  <img src={logo1} alt="CyberMinds Tech" className="authority-logo-img" />
                </div>
                <div>
                  <h4 className="font-semibold text-main">CyberMinds Tech Authority</h4>
                  <p className="text-xs text-muted">Sequential Numbering & UUID Verification</p>
                </div>
              </div>
              <p className="text-sm text-secondary mt-3">
                All certificates issued by CyberMinds Tech Limited are backed by unique sequence
                numbers, cryptographic verification codes, and tamper-resistant PDF generation.
              </p>
              <div className="authority-meta-list mt-4">
                <div className="meta-row">
                  <span className="text-muted">Verification API:</span>
                  <span className="font-mono text-xs text-main">GET /api/v1/verify/{'{cert}'}</span>
                </div>
                <div className="meta-row">
                  <span className="text-muted">Auto-Issuance:</span>
                  <span className="badge badge-success badge-sm">Active on Completion</span>
                </div>
                <div className="meta-row">
                  <span className="text-muted">PDF Engine:</span>
                  <span className="text-xs font-medium">Laravel Snappy / Dompdf</span>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
