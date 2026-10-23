import React from 'react';

const Badge = ({ children, variant = 'neutral', size = 'md', dot = false, className = '' }) => {
  return (
    <span className={`badge badge-${variant} badge-${size} ${className}`}>
      {dot && <span className="badge-dot" />}
      {children}
    </span>
  );
};

export default Badge;
