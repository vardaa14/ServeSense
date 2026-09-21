import React from 'react';
import Badge from "./Badge"
import Progress from "./Progress"
import { Check, ShieldCheck, MapPin } from 'lucide-react'

export default function VolunteerCard({ volunteer, actions }) {
  const reliability = volunteer.reliability_score > 1
    ? volunteer.reliability_score
    : Math.round((volunteer.reliability_score || 0) * 100)
    
  return (
    <article className="card card-hoverable volunteer-card">
      <div className="card-header">
        <div>
          <h3 className="card-title">{volunteer.name || "Volunteer"}</h3>
          <p className="text-muted text-sm flex items-center gap-2 mt-1">
            Reliability {reliability}%
            {volunteer.background_check_status && (
               <><ShieldCheck size={14} className="text-success" /> {volunteer.background_check_status}</>
            )}
          </p>
        </div>
        {volunteer.score != null && <Badge variant="success">{Math.round(volunteer.score * 100)}% Match</Badge>}
      </div>

      {volunteer.skill_score != null && (
        <div className="grid grid-cols-2 gap-4 mb-4">
          <Progress value={volunteer.skill_score * 100} label="Skills" variant="info" />
          <Progress value={volunteer.availability_score * 100} label="Availability" variant="success" />
          <Progress value={volunteer.distance_score * 100} label="Distance" variant="warning" />
          <Progress value={volunteer.reliability_score * 100} label="Reliability" variant="vivid" />
        </div>
      )}
      
      {volunteer.skills?.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {volunteer.skills.map((s) => (
            <Badge variant="info" key={s.name}>{s.name}{s.level ? ` · L${s.level}` : ""}</Badge>
          ))}
        </div>
      )}
      
      {volunteer.reasons?.length > 0 && (
        <div className="match-reasons mb-4">
          {volunteer.reasons.map((r, i) => (
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
