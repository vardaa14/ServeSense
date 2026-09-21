import React from 'react';
import { relativeTime } from "../api/client"
import { Bell, AlertTriangle, CheckCircle2, MessageSquare } from 'lucide-react'
import Button from "./Button"

export default function NotificationPanel({ items, onRead, onReadAll, compact }) {
  // If not compact (e.g. on full page), wrap in a card
  const content = (
    <>
      <div className="notification-header">
        <h3 className="font-bold text-lg">Notifications</h3>
        {onReadAll && <Button variant="ghost" className="text-xs" onClick={onReadAll}>Mark all read</Button>}
      </div>
      
      {(!items || items.length === 0) && (
        <div className="p-8 text-center text-muted">
          <Bell size={32} className="mx-auto mb-2 opacity-50" />
          <p>No notifications yet.</p>
        </div>
      )}
      
      <div className="notification-list">
        {items?.map((n) => {
          let Icon = MessageSquare;
          let iconClass = "";
          
          if (n.payload?.type === 'assignment') {
            Icon = CheckCircle2;
            iconClass = "task";
          } else if (n.payload?.urgent) {
            Icon = AlertTriangle;
            iconClass = "urgent";
          }

          return (
            <div 
              key={n.id} 
              className={`notification-item ${n.read_at ? "read" : "unread"}`} 
              onClick={() => onRead && onRead(n)}
            >
              <div className={`notification-icon-wrapper ${iconClass}`}>
                <Icon size={20} />
              </div>
              <div className="flex-1">
                <div className="notification-title">{n.payload?.title || n.template_key}</div>
                <div className="notification-body">{n.payload?.body}</div>
                <div className="notification-time">{relativeTime(n.created_at)}</div>
              </div>
            </div>
          )
        })}
      </div>
    </>
  );

  if (!compact) {
    return (
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {content}
      </div>
    )
  }

  return content;
}
