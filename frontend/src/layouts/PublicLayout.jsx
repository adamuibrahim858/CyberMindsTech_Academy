import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Award, LogIn } from 'lucide-react';
import logo1 from '../assets/logo1.png';

const PublicLayout = () => {
  return (
    <div className="public-wrapper">
      <header className="public-header">
        <div className="public-nav-container">
          <Link to="/" className="public-brand">
            <div className="public-logo-box">
              <img src={logo1} alt="CyberMinds Tech" className="public-logo-img" />
            </div>
            <div>
              <span className="public-brand-title">CyberMinds Tech Limited</span>
              <span className="public-brand-subtitle">Certificate Management Portal</span>
            </div>
          </Link>

          <nav className="public-nav-links">
            <Link to="/verify" className="public-nav-link public-nav-link-verify">
              <Award size={16} />
              <span>Verify Certificate</span>
            </Link>
            <Link to="/login" className="btn btn-primary btn-sm public-login-btn">
              <LogIn size={15} />
              <span>Portal Login</span>
            </Link>
          </nav>
        </div>
      </header>

      <main className="public-main-content">
        <Outlet />
      </main>

      <footer className="public-footer">
        <div className="public-footer-inner">
          <p>© {new Date().getFullYear()} CyberMinds Tech Limited. All rights reserved.</p>
          <div className="public-footer-links">
            <Link to="/verify">Public Verification</Link>
            <span>•</span>
            <Link to="/login">Portal Login</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;
