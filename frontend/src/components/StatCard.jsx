import React from 'react';
import { TrendingUp, AlertCircle, CheckCircle, Info } from 'lucide-react';

export default function StatCard({ label, value, hint, tone, icon: Icon }) {
  let DefaultIcon = Info;
  if (tone === 'success') DefaultIcon = CheckCircle;
  if (tone === 'warning' || tone === 'danger') DefaultIcon = AlertCircle;

  const FinalIcon = Icon || DefaultIcon;

  return (
    <article className={`stat-card card-hoverable card ${tone || ""}`}>
      <span className="stat-card-label">{label}</span>
      <strong className="stat-card-value">{value}</strong>
      {hint ? <em className="text-muted text-sm mt-2 not-italic">{hint}</em> : null}
      <FinalIcon size={48} className="stat-card-icon" />
    </article>
  )
}
