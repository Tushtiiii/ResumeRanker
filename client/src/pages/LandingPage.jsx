import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import ResumeRanker from './recruiter/ResumeRanker';

const features = [
  { icon: '🤖', title: 'AI-Powered Ranking', desc: 'Semantic analysis scores candidates against job descriptions using advanced embeddings.' },
  { icon: '📄', title: 'Smart Resume Parsing', desc: 'AI extracts skills, experience, education, and projects from any resume format.' },
  { icon: '🎯', title: 'Interview Generator', desc: 'Generate tailored technical, behavioral, and situational interview questions.' },
  { icon: '📊', title: 'Analytics Dashboard', desc: 'Real-time insights into your recruitment pipeline with AI-driven metrics.' },
  { icon: '⚖️', title: 'Candidate Comparison', desc: 'Side-by-side comparison with score breakdowns across all dimensions.' },
  { icon: '🔍', title: 'Semantic Search', desc: 'Find the best candidates using natural language queries powered by vector embeddings.' },
];

const steps = [
  { num: '01', title: 'Post a Job', desc: 'Upload or paste your job description — AI automatically extracts requirements.' },
  { num: '02', title: 'Candidates Apply', desc: 'Candidates upload resumes that are parsed and profiled by AI automatically.' },
  { num: '03', title: 'AI Ranks & Scores', desc: 'Advanced algorithms score candidates across 7 dimensions with semantic matching.' },
  { num: '04', title: 'Make Decisions', desc: 'Compare top candidates, generate interview questions, and hire with confidence.' },
];

export default function LandingPage() {
  const { token, user } = useSelector((s) => s.auth);
  const dashPath = user?.role === 'recruiter' ? '/recruiter' : user?.role === 'admin' ? '/admin' : '/candidate';

  return (
    <div className="min-h-screen bg-[var(--color-base)]">
      {/* ── Navbar ── */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-[var(--color-border-light)]">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-3.5">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[10px] bg-[var(--color-accent)] flex items-center justify-center text-base shadow-md">
              ✅
            </div>
            <span className="font-heading font-bold text-xl text-[var(--color-text-primary)]">
              ResumeRanker
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="#ranker"
              className="hidden sm:inline-flex px-4 py-2 rounded-full text-sm font-medium text-[var(--color-accent)] hover:bg-[var(--color-accent-light)] transition-colors"
            >
              Try AI Ranker
            </Link>
            {token ? (
              <Link
                to={dashPath}
                className="btn-primary text-sm px-5 py-2.5 rounded-full"
              >
                Dashboard →
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-full text-sm font-medium text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] transition-all"
                >
                  Log In
                </Link>
                <Link
                  to="/register"
                  className="btn-primary text-sm px-5 py-2.5 rounded-full"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>
      {/* ── Resume Ranker ── */}
      <section id="ranker" className="py-20 px-6 bg-white scroll-mt-20">
        <ResumeRanker embedded />
      </section>     
    </div>
  );
}
