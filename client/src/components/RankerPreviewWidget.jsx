import { useState } from 'react';

// ─── Sample data shown in preview ─────────────────────────────────────────────
const PREVIEW_CANDIDATES = [
  {
    name: 'Aisha Sharma',
    headline: 'Full Stack Developer · 4y exp',
    score: 91,
    recommendation: 'Highly Recommended',
    skills: ['React', 'Node.js', 'AWS'],
  },
  {
    name: 'Priya Nair',
    headline: 'DevOps & Cloud Specialist · 6y exp',
    score: 78,
    recommendation: 'Recommended',
    skills: ['Kubernetes', 'Terraform', 'Docker'],
  },
  {
    name: 'Rahul Verma',
    headline: 'Backend Engineer · 2y exp',
    score: 54,
    recommendation: 'Consider',
    skills: ['Python', 'Django', 'Redis'],
  },
];

// ─── Mini score ring ───────────────────────────────────────────────────────────
function MiniRing({ score }) {
  const colorClass = score >= 75
    ? 'border-success bg-success/10 text-success'
    : score >= 50
      ? 'border-warning bg-warning/10 text-warning'
      : 'border-danger bg-danger/10 text-danger';

  return (
    <div className={`w-11 h-11 rounded-full border-[3px] flex items-center justify-center text-xs font-extrabold shrink-0 ${colorClass}`}>
      {score}
    </div>
  );
}

// ─── Widget ───────────────────────────────────────────────────────────────────
export default function RankerPreviewWidget() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* ── Floating trigger button ── */}
      <div className="fixed bottom-7 right-7 z-[900] flex flex-col items-end gap-3">
        {/* Tooltip label */}
        {!open && (
          <div className="bg-text-primary border border-accent/20 rounded-lg py-1.5 px-3 text-xs font-semibold text-white shadow-lg backdrop-blur-md whitespace-nowrap animate-fade-in-up">
            👀 Preview AI Ranker
          </div>
        )}

        {/* FAB button */}
        <button
          onClick={() => setOpen((v) => !v)}
          title={open ? 'Close preview' : 'Preview AI Ranker'}
          className={`w-[60px] h-[60px] rounded-full cursor-pointer flex items-center justify-center text-2xl shadow-xl transition-all duration-300 transform ${
            open
              ? 'bg-danger text-white hover:bg-danger/90 rotate-45 hover:shadow-danger/30'
              : 'bg-accent text-white hover:bg-accent-dark hover:scale-105 hover:shadow-accent/40'
          }`}
        >
          {open ? '✕' : '🤖'}
        </button>
      </div>

      {/* ── Preview popup panel ── */}
      {open && (
        <div className="fixed bottom-26 right-7 z-[899] w-[370px] bg-surface border border-border rounded-[20px] shadow-2xl overflow-hidden font-body animate-slide-up-in">
          {/* Header */}
          <div className="p-5 pb-3 bg-gradient-to-br from-accent/8 to-secondary/4 border-b border-border-light">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">🤖</span>
                <span className="font-heading font-extrabold text-[15px] text-text-primary">
                  AI Resume Ranker
                </span>
              </div>
              <span className="text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-full bg-success-light text-success border border-success/30">
                PREVIEW
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-1.5 leading-relaxed">
              Sample ranking for <strong className="text-text-primary">Senior Full Stack Developer</strong>
            </p>
          </div>

          {/* Candidate list */}
          <div className="p-4 flex flex-col gap-2.5">
            {PREVIEW_CANDIDATES.map((c, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 bg-surface-alt/40 border border-border-light rounded-xl transition-all duration-200 hover:bg-accent/5 hover:border-accent/15 cursor-default"
              >
                {/* Rank badge */}
                <div className={`w-[22px] h-[22px] rounded-full flex items-center justify-center text-[10px] font-extrabold text-white shrink-0 ${
                  i === 0 ? 'bg-gradient-to-br from-warning to-danger'
                  : i === 1 ? 'bg-gradient-to-br from-slate-400 to-slate-500'
                  : 'bg-gradient-to-br from-amber-700 to-amber-900'
                }`}>
                  {i + 1}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-text-primary mb-0.5">
                    {c.name}
                  </div>
                  <div className="text-[11px] text-text-muted mb-1.5 truncate">
                    {c.headline}
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {c.skills.map((s) => (
                      <span
                        key={s}
                        className="text-[9px] px-1.5 py-0.5 rounded bg-accent-light text-accent border border-accent/15 font-semibold"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Score ring */}
                <div className="flex flex-col items-center gap-1.5 shrink-0">
                  <MiniRing score={c.score} />
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border text-center whitespace-nowrap ${
                    c.score >= 75 ? 'bg-success-light text-success border-success/20'
                    : c.score >= 50 ? 'bg-warning-light text-warning border-warning/20'
                    : 'bg-danger-light text-danger border-danger/20'
                  }`}>
                    {c.recommendation}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Upload hint */}
          <div className="mx-4 mb-3 p-3 bg-secondary/5 border border-dashed border-secondary/20 rounded-xl flex items-center gap-3">
            <span className="text-lg shrink-0">📄</span>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-text-secondary truncate">
                Upload your JD + candidates
              </div>
              <div className="text-[11px] text-text-muted">
                PDF / DOCX / JSON · No account required
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="p-4 pt-0 flex gap-2">
            <button
              onClick={() => { window.location.hash = 'ranker'; setOpen(false); }}
              className="flex-1 py-2.5 rounded-xl bg-accent hover:bg-accent-dark text-white text-xs font-bold shadow-md shadow-accent/20 hover:shadow-lg hover:shadow-accent/30 transition-all duration-200 text-center cursor-pointer"
            >
              Open Full Ranker →
            </button>
            <button
              onClick={() => setOpen(false)}
              className="py-2.5 px-4 rounded-xl bg-surface-alt border border-border text-text-secondary hover:bg-border-light hover:text-text-primary text-xs font-semibold transition-all duration-200 cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ── Keyframe animations ── */}
      <style>{`
        .animate-slide-up-in {
          animation: slideUpIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.4s ease forwards;
        }
        @keyframes slideUpIn {
          from { opacity: 0; transform: translateY(20px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}
