import { useLocation, useNavigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';

const ScoreBar = ({ value }) => {
  const color = (value || 0) >= 80 ? 'var(--color-success)' : (value || 0) >= 60 ? 'var(--color-warning)' : 'var(--color-danger)';
  const barBg = (value || 0) >= 80 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
    : (value || 0) >= 60 ? 'bg-gradient-to-r from-amber-400 to-orange-400'
    : 'bg-gradient-to-r from-red-400 to-pink-400';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded bg-[var(--color-border-light)]">
        <div className={`h-full rounded ${barBg}`} style={{ width: `${value || 0}%` }} />
      </div>
      <span className="text-[13px] font-bold min-w-9 text-right" style={{ color }}>{value ?? '—'}</span>
    </div>
  );
};

const metrics = [
  { key: 'finalScore', label: '🏆 Final Score', isMain: true },
  { key: 'skillMatch', label: 'Skill Match (30%)' },
  { key: 'experienceMatch', label: 'Experience Match (25%)' },
  { key: 'projectRelevance', label: 'Project Relevance (15%)' },
  { key: 'careerGrowth', label: 'Career Growth (10%)' },
  { key: 'softSkills', label: 'Soft Skills (10%)' },
  { key: 'certifications', label: 'Certifications (5%)' },
  { key: 'platformActivity', label: 'Platform Activity (5%)' },
];

const RecBadge = ({ value }) => {
  const map = {
    strong_yes: { label: '⭐ Strong Yes', color: 'var(--color-success)' },
    yes: { label: '✅ Yes', color: '#4ade80' },
    maybe: { label: '🤔 Maybe', color: 'var(--color-warning)' },
    no: { label: '❌ No', color: 'var(--color-danger)' },
    strong_no: { label: '🚫 Strong No', color: '#b91c1c' },
  };
  const r = map[value] || { label: '— Not analyzed', color: 'var(--color-text-muted)' };
  return <span className="font-semibold text-[13px]" style={{ color: r.color }}>{r.label}</span>;
};

export default function CandidateComparison() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { applications = [], job } = state || {};

  if (!applications.length) {
    return (
      <AppLayout>
        <div className="max-w-[600px] mx-auto my-20 text-center">
          <div className="text-5xl mb-4">⚖️</div>
          <h2 className="font-heading font-bold mb-3 text-[var(--color-text-primary)]">No candidates selected</h2>
          <p className="text-[var(--color-text-secondary)] mb-6">Go to a Job Detail page and select 2–3 candidates to compare.</p>
          <button onClick={() => navigate('/recruiter')} className="btn-primary py-3 px-6">Back to Dashboard</button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-[1100px] mx-auto">
        <div className="mb-7 flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="btn-secondary py-2 px-4 text-[13px]">← Back</button>
          <div>
            <h1 className="font-heading text-[1.8rem] font-bold mb-1 text-[var(--color-text-primary)]">Candidate Comparison</h1>
            {job && <p className="text-[var(--color-text-secondary)] text-sm">for {job.title}</p>}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-separate border-spacing-0">
            <thead>
              <tr>
                <th className="p-0 text-left min-w-[220px] bg-[var(--color-surface-alt)] border-b border-[var(--color-border)]">
                  <div className="p-4 font-semibold text-[var(--color-text-secondary)]">Metric</div>
                </th>
                {applications.map((app) => {
                  const c = app.candidateId;
                  return (
                    <th key={app._id} className="p-0 text-center min-w-[200px] bg-[var(--color-surface-alt)] border-b border-[var(--color-border)]">
                      <div className="py-4 px-2">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#00345a] to-[#4bb3fd] mx-auto mb-2.5 flex items-center justify-center text-xl font-extrabold text-white">
                          {c?.userId?.name?.[0] || '?'}
                        </div>
                        <div className="font-bold text-[var(--color-text-primary)] mb-1">{c?.userId?.name || 'Candidate'}</div>
                        <div className="text-[11px] text-[var(--color-text-muted)]">{c?.headline?.slice(0, 50)}</div>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {metrics.map((m) => (
                <tr key={m.key}>
                  <td className={`p-3.5 pl-4 whitespace-nowrap border-b border-[var(--color-border-light)] ${m.isMain ? 'font-bold text-[15px] text-[var(--color-text-primary)] bg-[var(--color-accent-light)]' : 'font-medium text-[13px] text-[var(--color-text-secondary)]'}`}>{m.label}</td>
                  {applications.map((app) => {
                    const value = m.isMain ? app.finalScore : app.scoreBreakdown?.[m.key];
                    return (
                      <td key={app._id} className={`p-3.5 px-5 text-left border-b border-[var(--color-border-light)] ${m.isMain ? 'bg-[var(--color-accent-light)]' : ''}`}>
                        {value != null ? <ScoreBar value={value} /> : <span className="text-[var(--color-text-muted)]">Not scored</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr>
                <td className="p-3.5 pl-4 font-medium text-[13px] text-[var(--color-text-secondary)] border-b border-[var(--color-border-light)]">Total Experience</td>
                {applications.map((app) => (
                  <td key={app._id} className="p-3.5 px-5 border-b border-[var(--color-border-light)]">
                    <span className="font-semibold text-[var(--color-secondary)]">{app.candidateId?.totalExperienceYears ?? '?'} yrs</span>
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-3.5 pl-4 font-medium text-[13px] text-[var(--color-text-secondary)] border-b border-[var(--color-border-light)]">Top Skills</td>
                {applications.map((app) => (
                  <td key={app._id} className="p-3.5 px-5 border-b border-[var(--color-border-light)]">
                    <div className="flex flex-wrap gap-1">
                      {(app.candidateId?.skills || []).slice(0, 6).map((s) => (
                        <span key={s} className="tag text-[11px]">{s}</span>
                      ))}
                    </div>
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-3.5 pl-4 font-medium text-[13px] text-[var(--color-text-secondary)]">AI Recommendation</td>
                {applications.map((app) => (
                  <td key={app._id} className="p-3.5 px-5">
                    <RecBadge value={app.aiInsights?.recommendation} />
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
