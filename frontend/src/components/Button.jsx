import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Button({ 
  children, 
  variant = 'primary', 
  className = '', 
  loading = false, 
  icon: Icon,
  disabled,
  ...props 
}) {
  const baseClass = `button ${variant} ${className}`;
  
  return (
    <button 
      className={baseClass} 
      disabled={disabled || loading} 
      {...props}
    >
      {loading && <Loader2 className="animate-spin" size={18} />}
      {!loading && Icon && <Icon size={18} />}
      {children}
    </button>
  );
}
