import { RECOMMENDATION_META, ScoreRing, SkillPill, ProgressBar } from './RankerComponents';

export default function DetailModal({ item, onClose }) {
  if (!item) return null;
  const { candidate, scores, insights } = item;
  const rec = RECOMMENDATION_META[insights?.recommendation] || RECOMMENDATION_META['Consider'];
  return (
    <div className="fixed inset-0 z-[2000] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-[780px] w-full max-h-[90vh] overflow-y-auto p-7 relative" onClick={(e) => e.stopPropagation()}>
        <button className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[var(--color-surface-alt)] border border-[var(--color-border-light)] flex items-center justify-center text-[var(--color-text-muted)] cursor-pointer hover:bg-[var(--color-border-light)] transition-colors" onClick={onClose}>✕</button>

        {/* Hero */}
        <div className="flex items-center gap-4 mb-5 pb-5 border-b border-[var(--color-border-light)]">
          <ScoreRing score={scores.finalScore} size={72} />
          <div>
            <h2 className="font-heading text-xl font-bold text-[var(--color-text-primary)]">{candidate.name}</h2>
            <p className="text-sm text-[var(--color-text-muted)] mb-1.5">{candidate.headline}</p>
            <span className="text-[12px] px-2.5 py-1 rounded-full font-semibold" style={{ color: rec.color, background: rec.bg }}>
              {rec.icon} {insights?.recommendation}
            </span>
          </div>
        </div>

        <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed mb-5">{insights?.summary}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Score Breakdown */}
          <div className="p-4 rounded-[var(--radius-md)] bg-[var(--color-surface-alt)] border border-[var(--color-border-light)]">
            <h4 className="font-heading font-bold text-sm mb-3 text-[var(--color-text-primary)]">📊 Match Breakdown</h4>
            <ProgressBar label="Skills" value={scores.skillMatch} color="#7c3aed" />
            <ProgressBar label="Experience" value={scores.experienceMatch} color="#06b6d4" />
            <ProgressBar label="Projects" value={scores.projectRelevance} color="#10b981" />
            <ProgressBar label="Education" value={scores.educationMatch} color="#f59e0b" />
            <ProgressBar label="Certs" value={scores.certifications} color="#ec4899" />
          </div>

          {/* Skills */}
          <div className="p-4 rounded-[var(--radius-md)] bg-[var(--color-surface-alt)] border border-[var(--color-border-light)]">
            <h4 className="font-heading font-bold text-sm mb-3 text-[var(--color-text-primary)]">🎯 Skills Analysis</h4>
            <p className="text-[11px] text-[var(--color-text-muted)] mb-1.5">Matched</p>
            <div className="flex flex-wrap gap-1 mb-3">
              {(insights?.matchedSkills || []).map((s) => <SkillPill key={s} label={s} matched />)}
              {!(insights?.matchedSkills?.length) && <span className="text-[11px] text-[var(--color-text-muted)] italic">None</span>}
            </div>
            <p className="text-[11px] text-[var(--color-text-muted)] mb-1.5">Missing</p>
            <div className="flex flex-wrap gap-1">
              {(insights?.missingSkills || []).map((s) => <SkillPill key={s} label={s} matched={false} />)}
              {!(insights?.missingSkills?.length) && <span className="text-[11px] text-[var(--color-text-muted)] italic">No gaps</span>}
            </div>
          </div>

          {/* Strengths */}
          <div className="p-4 rounded-[var(--radius-md)] bg-[var(--color-surface-alt)] border border-[var(--color-border-light)]">
            <h4 className="font-heading font-bold text-sm mb-2 text-[var(--color-text-primary)]">💪 Key Strengths</h4>
            <ul className="text-[13px] text-emerald-600 list-none p-0 flex flex-col gap-1">
              {(insights?.strengths || []).map((s, i) => <li key={i}>✓ {s}</li>)}
            </ul>
          </div>

          {/* Concerns */}
          <div className="p-4 rounded-[var(--radius-md)] bg-[var(--color-surface-alt)] border border-[var(--color-border-light)]">
            <h4 className="font-heading font-bold text-sm mb-2 text-[var(--color-text-primary)]">⚠️ Concerns</h4>
            <ul className="text-[13px] text-amber-600 list-none p-0 flex flex-col gap-1">
              {(insights?.concerns || []).map((c, i) => <li key={i}>• {c}</li>)}
              {!(insights?.concerns?.length) && <li className="text-emerald-500">No major concerns</li>}
            </ul>
          </div>

          {/* Full-width sections */}
          {insights?.jdVsResumeNotes && (
            <div className="col-span-full p-4 rounded-[var(--radius-md)] bg-[var(--color-surface-alt)] border border-[var(--color-border-light)]">
              <h4 className="font-heading font-bold text-sm mb-2 text-[var(--color-text-primary)]">📋 JD vs Resume</h4>
              <p className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed">{insights.jdVsResumeNotes}</p>
            </div>
          )}
          {insights?.relevantExperience && (
            <div className="col-span-full p-4 rounded-[var(--radius-md)] bg-[var(--color-surface-alt)] border border-[var(--color-border-light)]">
              <h4 className="font-heading font-bold text-sm mb-2 text-[var(--color-text-primary)]">💼 Relevant Experience</h4>
              <p className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed">{insights.relevantExperience}</p>
            </div>
          )}

          {/* Recommendation */}
          <div className="col-span-full p-4 rounded-[var(--radius-md)] border-2" style={{ borderColor: rec.color, background: rec.bg }}>
            <h4 className="font-heading font-bold text-sm mb-1" style={{ color: rec.color }}>{rec.icon} Recommendation: {insights?.recommendation}</h4>
            <p className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed">{insights?.recommendationReason}</p>
          </div>

          {/* Interview Focus */}
          {insights?.interviewFocus?.length > 0 && (
            <div className="col-span-full p-4 rounded-[var(--radius-md)] bg-[var(--color-surface-alt)] border border-[var(--color-border-light)]">
              <h4 className="font-heading font-bold text-sm mb-2 text-[var(--color-text-primary)]">🎤 Interview Focus</h4>
              <ul className="text-[13px] text-[var(--color-secondary)] list-none p-0 flex flex-col gap-1">
                {insights.interviewFocus.map((t, i) => <li key={i}>→ {t}</li>)}
              </ul>
            </div>
          )}

          {/* Education */}
          {candidate.education?.length > 0 && (
            <div className="p-4 rounded-[var(--radius-md)] bg-[var(--color-surface-alt)] border border-[var(--color-border-light)]">
              <h4 className="font-heading font-bold text-sm mb-2 text-[var(--color-text-primary)]">🎓 Education</h4>
              {candidate.education.map((e, i) => (
                <div key={i} className="mb-1.5">
                  <div className="font-semibold text-[13px] text-[var(--color-text-primary)]">{e.degree} in {e.field}</div>
                  <div className="text-[11px] text-[var(--color-text-muted)]">{e.institution} · {e.endYear}</div>
                </div>
              ))}
            </div>
          )}

          {/* Certifications */}
          {candidate.certifications?.length > 0 && (
            <div className="p-4 rounded-[var(--radius-md)] bg-[var(--color-surface-alt)] border border-[var(--color-border-light)]">
              <h4 className="font-heading font-bold text-sm mb-2 text-[var(--color-text-primary)]">📜 Certifications</h4>
              {candidate.certifications.map((c, i) => (
                <div key={i} className="mb-1.5">
                  <div className="font-semibold text-[13px] text-[var(--color-text-primary)]">{c.name}</div>
                  <div className="text-[11px] text-[var(--color-text-muted)]">{c.issuer} · {c.year}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
