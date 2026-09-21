import React from 'react';
import { formatTimeRange } from "../api/client"
import Badge from "./Badge"
import Progress from "./Progress"
import { MapPin, Clock, Users, Check } from 'lucide-react'

export default function TaskCard({ task, actions, match, distanceKm, reasons }) {
  const urgency = task.urgency_level || task.urgency
  
  return (
    <article className="card card-hoverable task-card">
      <div className="card-header">
        <div>
          <h3 className="card-title">{task.title}</h3>
          <p className="text-muted text-sm flex items-center gap-2 mt-1">
            {task.organization || task.organization_name}
          </p>
        </div>
        {match != null && <Badge variant="success">{Math.round(match)}% Match</Badge>}
      </div>
      
      <div className="flex flex-wrap gap-2 mb-4">
        {task.category && <Badge variant="info">{task.category}</Badge>}
        {urgency != null && <Badge variant={urgency >= 4 ? "error" : "warning"}>Urgency {urgency}/5</Badge>}
        {task.estimated_beneficiaries != null && <Badge variant="neutral"><Users size={12} className="mr-1"/> {task.estimated_beneficiaries} pax</Badge>}
        {distanceKm != null && <Badge variant="info"><MapPin size={12} className="mr-1"/> {distanceKm} km</Badge>}
      </div>
      
      <p className="text-muted text-sm flex items-center gap-2 mb-4">
        <Clock size={16} /> {formatTimeRange(task.start_time, task.end_time)}
      </p>

      {match != null && (
        <div className="mb-4">
          <Progress value={match} max={100} label="Match Score" showValue variant="vivid" />
        </div>
      )}
      
      {reasons?.length > 0 && (
        <div className="match-reasons mb-4">
          <p className="font-semibold text-sm">Why this matches:</p>
          {reasons.map((r, i) => (
            <div key={i} className="match-reason">
              <Check size={16} className="match-reason-icon" />
              <span>{r}</span>
            </div>
          ))}
        </div>
      )}
      
      {actions && <div className="card-actions">{actions}</div>}
    </article>
  )
}
