import React from 'react';
import { Loader2 } from 'lucide-react';

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  icon: Icon,
  type = 'button',
  onClick,
  className = '',
  ...props
}) => {
  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      onClick={onClick}
      className={`btn btn-${variant} btn-${size} ${isLoading ? 'btn-loading' : ''} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="btn-spinner" size={size === 'sm' ? 14 : 18} />
      ) : Icon ? (
        <Icon className="btn-icon" size={size === 'sm' ? 14 : 18} />
      ) : null}
      <span>{children}</span>
    </button>
  );
};

export default Button;
