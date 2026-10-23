import React from 'react';
import { Loader2 } from 'lucide-react';

const Spinner = ({ size = 32, text = 'Loading data...', className = '' }) => {
  return (
    <div className={`spinner-container ${className}`}>
      <Loader2 className="spinner-icon animate-spin" size={size} />
      {text && <p className="spinner-text">{text}</p>}
    </div>
  );
};

export default Spinner;
