import React from 'react';

export default function ChartCard({ title, subtitle, children, className = '' }) {
  return (
    <div className={`card ${className}`}>
      <div className="card-header">
        <div>
          <h3 className="card-title">{title}</h3>
          {subtitle && <p className="text-muted text-sm">{subtitle}</p>}
        </div>
      </div>
      <div className="card-body" style={{ height: '300px', width: '100%' }}>
        {children}
      </div>
    </div>
  );
}
