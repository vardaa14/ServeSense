import React from 'react';
import { FileQuestion } from 'lucide-react';

export default function EmptyState({ title, text, action, icon: Icon }) {
  const FinalIcon = Icon || FileQuestion;
  return (
    <div className="empty-state">
      <FinalIcon size={48} className="empty-icon" />
      <h3 className="empty-title">{title}</h3>
      {text && <p className="text-muted max-w-md">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
