import { useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';

export const RECOMMENDATION_META = {
  'Highly Recommended': { color: '#10b981', bg: 'rgba(16,185,129,0.1)', icon: '⭐' },
  Recommended:          { color: '#027bce', bg: 'rgba(2,123,206,0.1)',   icon: '✅' },
  Consider:             { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  icon: '🤔' },
  'Not Recommended':    { color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   icon: '❌' },
};

export function ScoreRing({ score, size = 72 }) {
  const ring = score >= 75 ? 'border-emerald-400 text-emerald-600' : score >= 50 ? 'border-amber-400 text-amber-600' : 'border-red-400 text-red-500';
  return (
    <div className={`rounded-full border-[3px] flex items-center justify-center font-extrabold font-heading ${ring}`}
      style={{ width: size, height: size, fontSize: size * 0.28 }}>{score}</div>
  );
}

export function SkillPill({ label, matched }) {
  return (
    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium border ${
      matched ? 'bg-[rgba(16,185,129,0.08)] text-emerald-600 border-[rgba(16,185,129,0.25)]'
              : 'bg-[rgba(239,68,68,0.06)] text-red-500 border-[rgba(239,68,68,0.2)] line-through'
    }`}>{label}</span>
  );
}

export function ProgressBar({ label, value, color }) {
  return (
    <div className="flex items-center gap-2 mb-1.5">
      <span className="text-[11px] text-[var(--color-text-muted)] w-20 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 rounded bg-[var(--color-border-light)]">
        <div className="h-full rounded transition-all" style={{ width: `${value}%`, background: color }} />
      </div>
      <span className="text-[11px] font-bold w-6 text-right" style={{ color }}>{value}</span>
    </div>
  );
}

export function CandidateCard({ item, rank, onClick }) {
  const { candidate, scores, insights } = item;
  const rec = RECOMMENDATION_META[insights?.recommendation] || RECOMMENDATION_META['Consider'];
  const rankCls = rank === 1 ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-black'
    : rank === 2 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-black'
    : rank === 3 ? 'bg-gradient-to-br from-amber-600 to-amber-800 text-white'
    : 'bg-[var(--color-surface-alt)] text-[var(--color-text-secondary)]';
  return (
    <div className="card p-5 cursor-pointer hover:border-[rgba(0,72,124,0.3)] transition-colors" onClick={onClick}>
      <div className="flex gap-4 flex-wrap">
        <div className="flex flex-col items-center gap-2 shrink-0">
          <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-extrabold ${rankCls}`}>#{rank}</span>
          <ScoreRing score={scores.finalScore} size={56} />
        </div>
        <div className="flex-1 min-w-[200px]">
          <div className="flex justify-between flex-wrap gap-2 mb-1">
            <div>
              <h3 className="font-heading font-bold text-[15px] text-[var(--color-text-primary)]">{candidate.name}</h3>
              <p className="text-xs text-[var(--color-text-muted)]">{candidate.headline || 'Candidate'}</p>
            </div>
            <span className="text-[11px] px-2.5 py-1 rounded-full font-semibold h-fit" style={{ color: rec.color, background: rec.bg }}>
              {rec.icon} {insights?.recommendation || 'Consider'}
            </span>
          </div>
          <p className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed mb-2 line-clamp-2">{insights?.summary || candidate.summary || '—'}</p>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {candidate.totalExperienceYears > 0 && <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]">💼 {candidate.totalExperienceYears}y</span>}
            {candidate.certifications?.length > 0 && <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]">🎓 {candidate.certifications.length} cert{candidate.certifications.length > 1 ? 's' : ''}</span>}
          </div>
          <div className="flex flex-wrap gap-1">
            {(insights?.matchedSkills || []).slice(0, 4).map((s) => <SkillPill key={s} label={s} matched />)}
            {(insights?.missingSkills || []).slice(0, 2).map((s) => <SkillPill key={s} label={s} matched={false} />)}
          </div>
        </div>
        <div className="w-[140px] shrink-0">
          <ProgressBar label="Skills" value={scores.skillMatch} color="#00487c" />
          <ProgressBar label="Exp" value={scores.experienceMatch} color="#027bce" />
          <ProgressBar label="Projects" value={scores.projectRelevance} color="#10b981" />
          <ProgressBar label="Education" value={scores.educationMatch} color="#f59e0b" />
        </div>
      </div>
    </div>
  );
}

export function UploadZone({ label, accept, file, onChange, hint }) {
  const inputRef = useRef();
  const [dragging, setDragging] = useState(false);
  const handleDrop = useCallback((e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) onChange({ target: { files: [f] } }); }, [onChange]);
  return (
    <div
      className={`border-2 border-dashed rounded-[var(--radius-lg)] py-7 px-5 text-center cursor-pointer transition-all ${
        dragging ? 'border-[var(--color-accent)] bg-[rgba(0,72,124,0.04)]'
        : file ? 'border-emerald-300 bg-[rgba(16,185,129,0.03)]'
        : 'border-[var(--color-border)] bg-[var(--color-surface-alt)]'
      }`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
    >
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={onChange} />
      {file ? (
        <>
          <div className="text-3xl mb-1.5">✅</div>
          <p className="text-sm font-semibold text-emerald-600">{file.name}</p>
          <p className="text-[11px] text-[var(--color-text-muted)] mt-1">Click to replace</p>
        </>
      ) : (
        <>
          <div className="text-3xl mb-1.5">📄</div>
          <p className="text-sm font-medium text-[var(--color-text-secondary)]">{label}</p>
          <p className="text-[11px] text-[var(--color-text-muted)] mt-1">{hint}</p>
        </>
      )}
    </div>
  );
}

export function GuestNav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-[1000] flex items-center justify-between py-3.5 px-10 bg-white/90 backdrop-blur-xl border-b border-[var(--color-border)]">
      <Link to="/" className="flex items-center gap-2.5 no-underline">
        <div className="w-8 h-8 rounded-[9px] bg-[var(--color-accent)] flex items-center justify-center text-base">🎯</div>
        <span className="font-heading text-lg font-bold text-[var(--color-text-primary)]">GreenHire</span>
      </Link>
      <div className="flex gap-2.5">
        <Link to="/login" className="py-2 px-5 rounded-full border border-[var(--color-border)] text-[var(--color-text-primary)] no-underline text-[13px] font-medium hover:border-[var(--color-accent)] transition-colors">Log In</Link>
        <Link to="/register" className="py-2 px-5 rounded-full bg-[var(--color-accent)] text-white no-underline text-[13px] font-semibold">Sign Up Free</Link>
      </div>
    </nav>
  );
}

export function LoginSaveBanner({ onDismiss }) {
  return (
    <div className="flex items-center justify-between py-3 px-6 rounded-[var(--radius-md)] mb-6 gap-4 flex-wrap bg-[var(--color-accent-light)] border border-[rgba(0,72,124,0.2)]">
      <div className="flex items-center gap-2.5">
        <span className="text-xl">💾</span>
        <div>
          <span className="font-semibold text-sm text-[var(--color-text-primary)]">You're using GreenHire as a guest.</span>
          <span className="text-[var(--color-text-secondary)] text-[13px] ml-1.5">Results won't be saved.</span>
        </div>
      </div>
      <div className="flex gap-2 shrink-0">
        <Link to="/login" className="py-1.5 px-4 rounded-full border border-[rgba(0,72,124,0.4)] text-[var(--color-accent)] no-underline text-[13px] font-semibold">Log In</Link>
        <Link to="/register" className="py-1.5 px-4 rounded-full bg-[var(--color-accent)] text-white no-underline text-[13px] font-bold">Create Free Account</Link>
        <button onClick={onDismiss} className="bg-transparent border-none text-[var(--color-text-muted)] cursor-pointer text-base p-0">✕</button>
      </div>
    </div>
  );
}

export function GuestResultAlert({ onDismiss }) {
  return (
    <div className="flex items-start gap-3.5 py-4 px-5 rounded-[var(--radius-md)] mb-5 bg-[rgba(16,185,129,0.06)] border border-[rgba(16,185,129,0.25)]">
      <span className="text-2xl shrink-0 mt-0.5">🎉</span>
      <div className="flex-1">
        <p className="font-bold text-[15px] text-[var(--color-text-primary)] mb-1">Analysis complete! Create a free account to save these results.</p>
        <p className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed">Your ranked candidates won't be stored as a guest. Sign up free to save analyses.</p>
        <div className="flex gap-2 mt-2.5">
          <Link to="/register" className="py-2 px-5 rounded-full bg-[var(--color-accent)] text-white no-underline text-[13px] font-bold">Create Free Account →</Link>
          <Link to="/login" className="py-2 px-5 rounded-full border border-[var(--color-border)] text-[var(--color-text-secondary)] no-underline text-[13px]">Log In</Link>
        </div>
      </div>
      <button onClick={onDismiss} className="bg-transparent border-none text-[var(--color-text-muted)] cursor-pointer text-base shrink-0">✕</button>
    </div>
  );
}
