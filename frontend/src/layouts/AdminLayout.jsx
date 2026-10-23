import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  BookOpen,
  UserCheck,
  Award,
  Search,
  Ticket,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';
import logo1 from '../assets/logo1.png';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      toast.info('Logged out successfully');
      navigate('/login');
    } catch {
      toast.error('Logout failed');
    }
  };

  const navItems = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/students', label: 'Students', icon: Users },
    { to: '/admin/courses', label: 'Courses', icon: BookOpen },
    { to: '/admin/coupons', label: 'Coupons', icon: Ticket },
    { to: '/admin/enrolments', label: 'Enrolments', icon: UserCheck },
    { to: '/admin/certificates', label: 'Certificates', icon: Award },
    { to: '/verify', label: 'Verify Certificate', icon: Search },
  ];

  return (
    <div className="portal-container">
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside className={`portal-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand-wrapper">
          <div className="brand-logo-icon">
            <img src={logo1} alt="CyberMinds Tech" className="brand-logo-img" />
          </div>
          <div className="brand-text-container">
            <span className="brand-title">CyberMinds Tech</span>
            <span className="brand-badge">ADMIN PORTAL</span>
          </div>
          <button
            type="button"
            className="mobile-close-sidebar-btn"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section-label">Management</div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `sidebar-nav-item ${isActive ? 'active' : ''}`
                }
              >
                <Icon size={19} className="nav-item-icon" />
                <span className="nav-item-label">{item.label}</span>
                <ChevronRight size={14} className="nav-item-arrow" />
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-user-footer">
          <div className="sidebar-user-card">
            <div className="user-avatar-circle">
              {user?.name?.charAt(0) || 'A'}
            </div>
            <div className="user-details-text">
              <span className="user-display-name">{user?.name || 'Administrator'}</span>
              <span className="user-role-tag">Admin</span>
            </div>
          </div>
          <button
            type="button"
            className="sidebar-logout-btn"
            onClick={handleLogout}
            title="Log out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="portal-main-area">
        <header className="portal-topbar">
          <div className="topbar-left">
            <button
              type="button"
              className="topbar-toggle-btn"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar menu"
            >
              <Menu size={22} />
            </button>
          </div>

          <div className="topbar-right">
            <button
              type="button"
              className="topbar-logout-link"
              onClick={handleLogout}
            >
              <LogOut size={16} />
              <span>Logout</span>
            </button>
          </div>
        </header>

        <main className="portal-body">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
