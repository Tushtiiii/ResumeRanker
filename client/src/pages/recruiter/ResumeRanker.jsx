import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../../components/layout/AppLayout';
import { CandidateCard, UploadZone, GuestNav, LoginSaveBanner, GuestResultAlert } from './ranker/RankerComponents';
import DetailModal from './ranker/DetailModal';
import { SAMPLE_CANDIDATES } from './ranker/sampleData';

const API_BASE = 'http://localhost:5000/api';

export default function ResumeRanker() {
  const { token, user } = useSelector((s) => s.auth);
  const isGuest = !token || !user;
  const navigate = useNavigate();

  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [showResultAlert, setShowResultAlert] = useState(false);
  const [jdFile, setJdFile] = useState(null);
  const [candidatesFile, setCandidatesFile] = useState(null);
  const [candidatesText, setCandidatesText] = useState('');
  const [candidateInputMode, setCandidateInputMode] = useState('file');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState({ stage: '', pct: 0 });
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [search, setSearch] = useState('');
  const [minScore, setMinScore] = useState(0);
  const [sortOrder, setSortOrder] = useState('desc');

  const loadSample = () => { setCandidateInputMode('text'); setCandidatesText(JSON.stringify(SAMPLE_CANDIDATES, null, 2)); };

  const downloadJSON = () => {
    if (!results) return;
    const output = {
      meta: { generatedAt: new Date().toISOString(), jobTitle: results.jobTitle, totalCandidates: results.totalCandidates },
      jobDescription: results.jdParsed,
      rankedCandidates: results.rankedCandidates.map(({ rank, candidate, scores, insights }) => ({
        rank, name: candidate.name, email: candidate.email || '', overallScore: scores.finalScore,
        recommendation: insights.recommendation, scoreBreakdown: scores, aiSummary: insights.summary,
        strengths: insights.strengths, concerns: insights.concerns,
        matchedSkills: insights.matchedSkills, missingSkills: insights.missingSkills,
        recommendationReason: insights.recommendationReason,
      })),
    };
    const blob = new Blob([JSON.stringify(output, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `ranked_candidates_${Date.now()}.json`; a.click();
    URL.revokeObjectURL(url);
  };

  const downloadCSV = () => {
    if (!results) return;
    const headers = ['Rank','Name','Email','Score','Recommendation','SkillMatch','ExperienceMatch','ProjectRelevance','EducationMatch','Certifications','MatchedSkills','MissingSkills'];
    const rows = results.rankedCandidates.map(({ rank, candidate, scores, insights }) => [
      rank, candidate.name, candidate.email || '', scores.finalScore, insights.recommendation,
      scores.skillMatch, scores.experienceMatch, scores.projectRelevance, scores.educationMatch, scores.certifications,
      (insights.matchedSkills || []).join('; '), (insights.missingSkills || []).join('; '),
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `ranked_candidates_${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleAnalyze = async () => {
    setError('');
    if (!jdFile) return setError('Please upload a Job Description file.');
    if (candidateInputMode === 'file') {
      if (!candidatesFile) return setError('Please upload a candidates .json or .jsonl file.');
    } else {
      try { const p = JSON.parse(candidatesText); if (!Array.isArray(p) || !p.length) throw 0; if (p.length > 50) return setError('Maximum 50 candidates.'); }
      catch { return setError('Candidates must be a valid non-empty JSON array.'); }
    }
    setIsAnalyzing(true); setResults(null);
    const stages = [
      { stage: '📄 Parsing job description…', pct: 10 }, { stage: '🧠 Generating embeddings…', pct: 30 },
      { stage: '🔍 Analyzing profiles…', pct: 60 }, { stage: '✨ Generating insights…', pct: 85 }, { stage: '🏆 Ranking…', pct: 95 },
    ];
    let si = 0;
    const tick = setInterval(() => { if (si < stages.length) { setProgress(stages[si]); si++; } }, 800);
    try {
      const form = new FormData(); form.append('jdFile', jdFile);
      if (candidateInputMode === 'file') form.append('candidatesFile', candidatesFile);
      else form.append('candidates', candidatesText);
      const res = await fetch(`${API_BASE}/ranker/analyze`, { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {}, body: form });
      const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Analysis failed.');
      setResults(data); setProgress({ stage: '✅ Complete!', pct: 100 }); if (isGuest) setShowResultAlert(true);
    } catch (err) { setError(err.message || 'Analysis failed.'); }
    finally { clearInterval(tick); setIsAnalyzing(false); }
  };

  const displayed = results
    ? [...results.rankedCandidates]
        .filter((item) => { if (item.scores.finalScore < minScore) return false; if (!search) return true; const q = search.toLowerCase(); return (item.candidate.name||'').toLowerCase().includes(q) || (item.candidate.skills||[]).join(' ').toLowerCase().includes(q); })
        .sort((a, b) => sortOrder === 'desc' ? b.scores.finalScore - a.scores.finalScore : a.scores.finalScore - b.scores.finalScore)
    : [];

  const content = (
    <div className="max-w-[1000px] mx-auto">
      {isGuest && !bannerDismissed && <LoginSaveBanner onDismiss={() => setBannerDismissed(true)} />}
      {isGuest && showResultAlert && <GuestResultAlert onDismiss={() => setShowResultAlert(false)} />}

      {/* Header */}
      <div className="flex justify-between flex-wrap gap-4 mb-7">
        <div>
          <h1 className="font-heading text-[2rem] font-bold mb-1 text-[var(--color-text-primary)]">
            <span className="bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] bg-clip-text text-transparent">AI Resume Ranker</span>
          </h1>
          <p className="text-[var(--color-text-secondary)] text-sm">Upload a JD + candidate list → get AI-powered rankings</p>
        </div>
        {results && (
          <div className="flex gap-4">
            {[
              { label: 'Analyzed', value: results.totalCandidates },
              { label: 'Strong Matches', value: results.rankedCandidates.filter((r) => r.scores.finalScore >= 75).length, color: '#10b981' },
              { label: 'Top Score', value: results.rankedCandidates[0]?.scores.finalScore ?? '—', color: '#7c3aed' },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center">
                <div className="text-[1.5rem] font-extrabold font-heading" style={{ color: color || 'var(--color-text-primary)' }}>{value}</div>
                <div className="text-[11px] text-[var(--color-text-muted)]">{label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Section */}
      {!results && (
        <div className="card p-7 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-heading font-bold text-sm mb-3 text-[var(--color-text-primary)]">📋 Job Description</h3>
              <UploadZone label="Upload JD File" accept=".pdf,.docx,.txt" file={jdFile} onChange={(e) => setJdFile(e.target.files[0] || null)} hint="PDF, DOCX, or TXT · max 10 MB" />
            </div>
            <div>
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-heading font-bold text-sm text-[var(--color-text-primary)]">👥 Candidates</h3>
                <div className="flex gap-1.5">
                  {['file', 'text'].map((m) => (
                    <button key={m} onClick={() => setCandidateInputMode(m)}
                      className={`text-[11px] py-1 px-3 rounded-full border cursor-pointer transition-colors font-medium ${
                        candidateInputMode === m ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)]' : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-[var(--color-accent)]'
                      }`}>
                      {m === 'file' ? '📁 File' : '✏️ JSON'}
                    </button>
                  ))}
                  <button onClick={loadSample} className="text-[11px] py-1 px-3 rounded-full bg-[var(--color-success-light)] text-[var(--color-success)] border border-[rgba(16,185,129,0.2)] cursor-pointer font-medium">
                    Load Sample
                  </button>
                </div>
              </div>
              {candidateInputMode === 'file' ? (
                <>
                  <UploadZone label="Upload Candidates File" accept=".json,.jsonl" file={candidatesFile} onChange={(e) => setCandidatesFile(e.target.files[0] || null)} hint=".json or .jsonl" />
                  <p className="text-[11px] text-[var(--color-text-muted)] mt-2">Supports .jsonl (JSON Lines) or .json array of candidate objects.</p>
                </>
              ) : (
                <>
                  <textarea className="input-field resize-y font-mono text-[12px] h-[200px]" placeholder={'[\n  {\n    "name": "Jane Doe",\n    "skills": ["React", "Node.js"],\n    "totalExperienceYears": 3\n  }\n]'} value={candidatesText} onChange={(e) => setCandidatesText(e.target.value)} spellCheck={false} />
                  <p className="text-[11px] text-[var(--color-text-muted)] mt-1">Each: name, skills[], totalExperienceYears, experience[], education[], projects[], certifications[]</p>
                </>
              )}
            </div>
          </div>
          {error && <div className="mt-4 p-3 rounded-[var(--radius-md)] bg-[var(--color-danger-light)] border border-[rgba(239,68,68,0.25)] text-[var(--color-danger)] text-sm">⚠️ {error}</div>}
          <button className="btn-primary w-full mt-5 py-3.5 text-[15px]" onClick={handleAnalyze} disabled={isAnalyzing}>
            {isAnalyzing ? '⏳ Analyzing…' : '🚀 Analyze & Rank Candidates'}
          </button>
        </div>
      )}

      {/* Progress */}
      {isAnalyzing && (
        <div className="card p-7 text-center mb-6">
          <div className="text-base font-semibold text-[var(--color-text-primary)] mb-3">{progress.stage}</div>
          <div className="h-2 rounded-full bg-[var(--color-border-light)] overflow-hidden mb-2">
            <div className="h-full rounded-full bg-gradient-to-r from-[#7c3aed] to-[#6d28d9] transition-all duration-500" style={{ width: `${progress.pct}%` }} />
          </div>
          <p className="text-[12px] text-[var(--color-text-muted)]">AI is semantically analyzing each candidate…</p>
        </div>
      )}

      {/* Results */}
      {results && !isAnalyzing && (
        <>
          {/* Toolbar */}
          <div className="flex flex-wrap gap-3 mb-4 items-center justify-between">
            <div className="flex flex-wrap gap-2.5 items-center">
              <input className="input-field w-52" placeholder="🔍 Search by name or skill…" value={search} onChange={(e) => setSearch(e.target.value)} />
              <div className="flex items-center gap-1.5">
                <label className="text-[11px] text-[var(--color-text-muted)]">Min</label>
                <input type="number" min={0} max={100} className="input-field w-16 text-center" value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} />
              </div>
              <select className="input-field w-48" value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
                <option value="desc">↓ Highest First</option>
                <option value="asc">↑ Lowest First</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button className="btn-secondary py-2 px-3.5 text-[13px]" onClick={downloadJSON}>⬇️ JSON</button>
              <button className="btn-secondary py-2 px-3.5 text-[13px]" onClick={downloadCSV}>📊 CSV</button>
              <button className="btn-primary py-2 px-3.5 text-[13px]" onClick={() => { setResults(null); setJdFile(null); setCandidatesFile(null); setCandidatesText(''); setError(''); setSearch(''); setMinScore(0); }}>
                🔄 New Analysis
              </button>
            </div>
          </div>

          {/* JD Summary */}
          <div className="flex flex-wrap gap-2 items-center mb-5 p-3 rounded-[var(--radius-md)] bg-[var(--color-surface-alt)] border border-[var(--color-border-light)]">
            <span className="font-semibold text-sm text-[var(--color-text-primary)]">📋 {results.jobTitle}</span>
            {results.jdParsed?.seniorityLevel && <span className="tag">{results.jdParsed.seniorityLevel}</span>}
            {results.jdParsed?.experienceRange?.label && <span className="tag">⏱ {results.jdParsed.experienceRange.label}</span>}
            {(results.jdParsed?.requiredSkills || []).slice(0, 5).map((s) => <span key={s} className="tag bg-[var(--color-accent-light)] text-[var(--color-accent)] border-[rgba(124,58,237,0.2)]">{s}</span>)}
          </div>

          {/* Candidate Cards */}
          <div className="flex flex-col gap-3">
            {displayed.length === 0 ? (
              <div className="card p-14 text-center">
                <div className="text-5xl mb-3">🔍</div>
                <h3 className="font-heading font-bold mb-1 text-[var(--color-text-primary)]">No candidates match</h3>
                <p className="text-sm text-[var(--color-text-muted)]">Try lowering the minimum score or clearing the search.</p>
              </div>
            ) : (
              displayed.map((item) => (
                <CandidateCard key={item.candidate.id || item.candidate.email || item.rank} item={item} rank={item.rank} onClick={() => setSelectedItem(item)} />
              ))
            )}
          </div>
        </>
      )}

      {selectedItem && <DetailModal item={selectedItem} onClose={() => setSelectedItem(null)} />}
    </div>
  );

  if (isGuest) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)]">
        <GuestNav />
        <div className="pt-[70px] px-5 py-8">{content}</div>
      </div>
    );
  }
  return <AppLayout>{content}</AppLayout>;
}
