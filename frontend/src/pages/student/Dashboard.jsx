import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Award,
  CheckCircle,
  Clock,
  ArrowRight,
  Sparkles,
  User,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import dashboardService from '../../services/dashboardService';
import courseService from '../../services/courseService';
import Spinner from '../../components/common/Spinner';
import Card, { CardHeader, CardBody } from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import { useToast } from '../../context/ToastContext';
import logo2 from '../../assets/logo2.png';

const StudentDashboard = () => {
  const { user, student } = useAuth();
  const toast = useToast();

  const [stats, setStats] = useState(null);
  const [recentCourses, setRecentCourses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setIsLoading(true);
        const [statsRes, coursesRes] = await Promise.all([
          dashboardService.getStudentStats(),
          courseService.getMyCourses(),
        ]);

        if (statsRes?.status === 'success') {
          setStats(statsRes.data);
        }
        if (coursesRes?.status === 'success') {
          setRecentCourses((coursesRes.data || []).slice(0, 3));
        }
      } catch {
        toast.error('Failed to load student dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [toast]);

  if (isLoading) {
    return (
      <div className="page-loading-wrapper">
        <Spinner size={36} text="Loading student portal..." />
      </div>
    );
  }

  const studentId = student?.student_id || user?.student?.student_id;

  const statCards = [
    {
      title: 'Enrolled Courses',
      value: stats?.total_enrolled_courses ?? 0,
      icon: BookOpen,
      color: 'blue',
      link: '/student/courses',
    },
    {
      title: 'Courses In Progress',
      value: stats?.courses_in_progress ?? 0,
      icon: Clock,
      color: 'amber',
      link: '/student/courses',
    },
    {
      title: 'Completed Courses',
      value: stats?.completed_courses ?? 0,
      icon: CheckCircle,
      color: 'emerald',
      link: '/student/courses',
    },
    {
      title: 'Available Certificates',
      value: stats?.available_certificates ?? 0,
      icon: Award,
      color: 'sky',
      link: '/student/certificates',
    },
  ];

  return (
    <div className="page-content-wrapper">
      {/* Welcome Banner */}
      <div className="student-welcome-banner">
        <div className="welcome-banner-content">
          <div className="welcome-badge">
            <Sparkles size={16} className="text-warning" />
            <span>CyberMinds Tech Academy</span>
          </div>
          <h2 className="welcome-title">Welcome back, {user?.name}!</h2>
          <p className="welcome-subtitle">
            Track your course progress, view physical training milestones, and access your verified
            certificates.
          </p>
          {studentId && (
            <div className="welcome-student-id-tag">
              <span>Official Student ID:</span>
              <strong className="font-mono">{studentId}</strong>
            </div>
          )}
        </div>
        <div className="welcome-banner-decoration">
          <div className="welcome-logo-card">
            <img src={logo2} alt="CyberMinds Tech" className="welcome-logo-img" />
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="stats-grid mt-6">
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
                    View tracks <ArrowRight size={13} className="inline ml-1" />
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Course Progress & Quick Links */}
      <div className="dashboard-sections-grid mt-6">
        {/* Recent Enrolments */}
        <Card>
          <CardHeader
            title="My Active Course Enrolments"
            subtitle="Current training tracks and recent achievements"
            actions={
              <Link to="/student/courses" className="text-sm font-medium text-primary-color">
                View All Courses
              </Link>
            }
          />
          <CardBody>
            {recentCourses.length === 0 ? (
              <div className="empty-inline-box">
                <BookOpen size={24} className="text-muted" />
                <p className="text-sm text-muted">You are not currently enrolled in any courses.</p>
              </div>
            ) : (
              <div className="student-recent-courses-list">
                {recentCourses.map((enr) => {
                  const isCompleted = enr.status === 'completed';
                  return (
                    <div key={enr.id} className="student-course-item-row">
                      <div className="course-row-left">
                        <h4 className="course-row-title">{enr.course?.name}</h4>
                        <p className="course-row-code">
                          {enr.course?.code || 'Course'} • Duration: {enr.course?.duration || 'Standard'}
                        </p>
                      </div>

                      <div className="course-row-right">
                        {isCompleted ? (
                          <Badge variant="success" dot>Completed</Badge>
                        ) : (
                          <Badge variant="warning" dot>In Progress</Badge>
                        )}

                        {isCompleted && enr.certificate ? (
                          <Link to="/student/certificates">
                            <Button variant="outline" size="sm" icon={Award}>
                              View Certificate
                            </Button>
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Quick Access Card */}
        <Card>
          <CardHeader
            title="Student Shortcuts"
            subtitle="Access your academy records and verify credentials"
          />
          <CardBody>
            <div className="quick-actions-list">
              <Link to="/student/courses" className="quick-action-item">
                <div className="quick-action-icon text-blue">
                  <BookOpen size={20} />
                </div>
                <div className="quick-action-info">
                  <h4>My Courses</h4>
                  <p>Check enrolled training modules and status</p>
                </div>
                <ArrowRight size={16} className="quick-action-arrow" />
              </Link>

              <Link to="/student/certificates" className="quick-action-item">
                <div className="quick-action-icon text-sky">
                  <Award size={20} />
                </div>
                <div className="quick-action-info">
                  <h4>My Certificates</h4>
                  <p>Download and print earned certificates</p>
                </div>
                <ArrowRight size={16} className="quick-action-arrow" />
              </Link>

              <Link to="/student/profile" className="quick-action-item">
                <div className="quick-action-icon text-emerald">
                  <User size={20} />
                </div>
                <div className="quick-action-info">
                  <h4>Student Profile</h4>
                  <p>Update phone, address, and password</p>
                </div>
                <ArrowRight size={16} className="quick-action-arrow" />
              </Link>

              <Link to="/verify" className="quick-action-item">
                <div className="quick-action-icon text-indigo">
                  <ShieldCheck size={20} />
                </div>
                <div className="quick-action-info">
                  <h4>Public Credential Verification</h4>
                  <p>Verify certificate authenticity</p>
                </div>
                <ArrowRight size={16} className="quick-action-arrow" />
              </Link>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
};

export default StudentDashboard;
