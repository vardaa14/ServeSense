import React from 'react';

export default function Progress({ 
  value = 0, 
  max = 100, 
  variant = 'vivid', 
  label, 
  showValue = false 
}) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  
  return (
    <div className="progress-container">
      {(label || showValue) && (
        <div className="progress-labels">
          {label && <span>{label}</span>}
          {showValue && <span>{Math.round(percentage)}%</span>}
        </div>
      )}
      <div className="progress-track">
        <div 
          className={`progress-fill ${variant}`} 
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
