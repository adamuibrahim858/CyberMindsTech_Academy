import React, { forwardRef } from 'react';

const Input = forwardRef(
  (
    {
      label,
      name,
      type = 'text',
      value,
      onChange,
      placeholder,
      error,
      hint,
      required = false,
      disabled = false,
      icon: Icon,
      endIcon: EndIcon,
      onEndIconClick,
      className = '',
      autoComplete,
      ...props
    },
    ref
  ) => {
    return (
      <div className={`form-group ${error ? 'has-error' : ''} ${className}`}>
        {label && (
          <label htmlFor={name} className="form-label">
            {label}
            {required && <span className="required-star">*</span>}
          </label>
        )}
        <div className="input-wrapper">
          {Icon && (
            <span className="input-icon input-icon-start">
              <Icon size={18} />
            </span>
          )}
          <input
            ref={ref}
            id={name}
            name={name}
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            disabled={disabled}
            autoComplete={autoComplete}
            required={required}
            className={`form-control ${Icon ? 'with-start-icon' : ''} ${
              EndIcon ? 'with-end-icon' : ''
            }`}
            {...props}
          />
          {EndIcon && (
            <button
              type="button"
              className="input-icon input-icon-end-btn"
              onClick={onEndIconClick}
              tabIndex={-1}
            >
              <EndIcon size={18} />
            </button>
          )}
        </div>
        {hint && !error && <p className="form-hint">{hint}</p>}
        {error && <p className="form-error">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
