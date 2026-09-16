import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { aiAPI } from '../../api';
import AppLayout from '../../components/layout/AppLayout';

const catCfg = {
  technical:   { color: 'var(--color-accent)',    bg: 'bg-[var(--color-accent-light)]',    icon: '⚙️' },
  behavioral:  { color: 'var(--color-secondary)', bg: 'bg-[var(--color-secondary-light)]', icon: '💬' },
  situational: { color: 'var(--color-warning)',   bg: 'bg-[var(--color-warning-light)]',   icon: '🧩' },
  culture_fit: { color: 'var(--color-success)',   bg: 'bg-[var(--color-success-light)]',   icon: '🌱' },
};

export default function InterviewQuestions() {
  const { state } = useLocation();
  const [form, setForm] = useState({ jobId: state?.jobId || '', jobTitle: state?.jobTitle || '', jobDescription: '', level: 'mid' });
  const [questions, setQuestions] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!form.jobId && !form.jobDescription) { toast.error('Please enter a job description or provide a job ID.'); return; }
    setLoading(true);
    try { const { data } = await aiAPI.generateInterviewQuestions(form); setQuestions(data.questions); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed to generate questions'); }
    finally { setLoading(false); }
  };

  return (
    <AppLayout>
      <div className="max-w-[860px] mx-auto">
        <div className="mb-8">
          <h1 className="font-heading text-[2rem] font-bold mb-2 text-[var(--color-text-primary)]">🎯 Interview Question Generator</h1>
          <p className="text-[var(--color-text-secondary)]">AI generates tailored technical, behavioral, and situational questions based on the role.</p>
        </div>

        <form onSubmit={handleGenerate} className="card p-7 mb-7">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4 mb-4">
            <div>
              <label className="block text-[13px] font-semibold text-[var(--color-text-secondary)] mb-2">Job Title</label>
              <input value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} placeholder="e.g. Senior React Developer" className="input-field" />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[var(--color-text-secondary)] mb-2">Seniority Level</label>
              <select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} className="input-field">
                <option value="junior">Junior (0–2 yrs)</option>
                <option value="mid">Mid-level (2–5 yrs)</option>
                <option value="senior">Senior (5+ yrs)</option>
                <option value="staff">Staff / Lead</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[13px] font-semibold text-[var(--color-text-secondary)] mb-2">Job Description (Optional)</label>
            <textarea rows={6} value={form.jobDescription} onChange={(e) => setForm({ ...form, jobDescription: e.target.value })} placeholder="Paste JD for more targeted questions..." className="input-field resize-y" />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full mt-4 py-3 text-[15px]">
            {loading ? '🤖 Generating questions...' : '✨ Generate Interview Questions'}
          </button>
        </form>

        {questions && (
          <div>
            {Object.entries(questions).map(([category, qs]) => {
              if (!qs?.length) return null;
              const cfg = catCfg[category] || catCfg.technical;
              return (
                <div key={category} className="card p-6 mb-4">
                  <h3 className="font-heading text-[1.05rem] font-bold mb-4" style={{ color: cfg.color }}>
                    {cfg.icon} {category.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())} Questions
                  </h3>
                  <div className="flex flex-col gap-3">
                    {qs.map((q, i) => (
                      <div key={i} className="p-3.5 rounded-[var(--radius-md)] bg-[var(--color-surface-alt)] border border-[var(--color-border-light)]">
                        <div className="flex gap-2.5">
                          <div className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[11px] font-extrabold ${cfg.bg}`} style={{ color: cfg.color }}>{i + 1}</div>
                          <div>
                            <p className="text-sm leading-relaxed text-[var(--color-text-primary)]">{q.question || q}</p>
                            {q.hint && <p className="text-xs text-[var(--color-text-muted)] italic mt-2">💡 Look for: {q.hint}</p>}
                            {q.difficulty && (
                              <span className={`inline-block mt-1.5 text-[11px] px-2 py-0.5 rounded-full font-semibold capitalize ${
                                q.difficulty === 'hard' ? 'bg-[var(--color-danger-light)] text-[var(--color-danger)]'
                                : q.difficulty === 'medium' ? 'bg-[var(--color-warning-light)] text-[var(--color-warning)]'
                                : 'bg-[var(--color-success-light)] text-[var(--color-success)]'
                              }`}>{q.difficulty}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            <button onClick={() => {
              const text = Object.entries(questions).map(([cat, qs]) => `## ${cat.toUpperCase()}\n${qs.map((q, i) => `${i+1}. ${q.question || q}`).join('\n')}`).join('\n\n');
              navigator.clipboard.writeText(text);
              toast.success('Questions copied to clipboard!');
            }} className="btn-secondary w-full mt-2 py-3">📋 Copy All Questions</button>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
