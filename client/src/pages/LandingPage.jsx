import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import RankerPreviewWidget from '../components/RankerPreviewWidget';

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
            <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-[#7c3aed] to-[#6d28d9] flex items-center justify-center text-base shadow-md">
              🎯
            </div>
            <span className="font-heading font-bold text-xl text-[var(--color-text-primary)]">
              TalentAI
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              to="/resume-ranker"
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

      {/* ── Hero ── */}
      <section className="relative overflow-hidden py-24 md:py-32 px-6">
        {/* Decorative blobs */}
        <div className="absolute top-[-100px] right-[-100px] w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(124,58,237,0.08)_0%,transparent_70%)] pointer-events-none" />
        <div className="absolute bottom-[-80px] left-[-80px] w-[400px] h-[400px] rounded-full bg-[radial-gradient(circle,rgba(6,182,212,0.06)_0%,transparent_70%)] pointer-events-none" />

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--color-accent-light)] border border-[rgba(124,58,237,0.15)] text-sm text-[var(--color-accent)] font-medium mb-8">
            ✨ AI-Powered Recruitment Platform
          </div>
          <h1 className="font-heading text-5xl md:text-6xl lg:text-7xl font-extrabold leading-tight mb-6 text-[var(--color-text-primary)]">
            Hire the <span className="gradient-text">Best Talent</span>
            <br />with AI Intelligence
          </h1>
          <p className="text-lg md:text-xl text-[var(--color-text-secondary)] max-w-2xl mx-auto mb-10 leading-relaxed">
            TalentAI uses semantic embeddings, intelligent scoring, and deep analysis
            to match the right candidates to the right roles — 10× faster.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              to="/register?role=recruiter"
              className="btn-primary text-base px-8 py-3.5 rounded-full shadow-lg"
            >
              🚀 Start Hiring Free
            </Link>
            <Link
              to="/resume-ranker"
              className="btn-secondary  px-8 py-3.5 rounded-full"
            >
              🏆 Try AI Ranker
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-3 gap-6 max-w-lg mx-auto">
            {[
              { value: '7+', label: 'AI Dimensions' },
              { value: '10×', label: 'Faster Hiring' },
              { value: '95%', label: 'Match Accuracy' },
            ].map(({ value, label }) => (
              <div key={label} className="text-center">
                <div className="text-3xl font-extrabold font-heading gradient-text">{value}</div>
                <div className="text-xs text-[var(--color-text-muted)] mt-1">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-20 px-6" id="features">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-[var(--color-text-primary)] mb-4">
              Everything You Need to Hire Smarter
            </h2>
            <p className="text-[var(--color-text-secondary)] text-lg max-w-xl mx-auto">
              A complete AI toolkit built for modern recruitment teams.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map(({ icon, title, desc }) => (
              <div
                key={title}
                className="card p-6 hover:border-[var(--color-accent)] group transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-[var(--color-accent-light)] flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
                  {icon}
                </div>
                <h3 className="font-heading font-bold  text-[var(--color-text-primary)] mb-2">
                  {title}
                </h3>
                <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-[var(--color-text-primary)] mb-4">
              How It Works
            </h2>
            <p className="text-[var(--color-text-secondary)] text-lg">
              From job posting to hiring — in four simple steps.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map(({ num, title, desc }) => (
              <div key={num} className="text-center group">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#7c3aed] to-[#6d28d9] text-white font-heading font-extrabold text-lg flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform">
                  {num}
                </div>
                <h3 className="font-heading font-bold text-[var(--color-text-primary)] mb-2">
                  {title}
                </h3>
                <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center card p-12 md:p-16 bg-gradient-to-br from-[var(--color-accent-light)] to-white border-[rgba(124,58,237,0.15)]">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-[var(--color-text-primary)] mb-4">
            Ready to Transform Your Hiring?
          </h2>
          <p className="text-[var(--color-text-secondary)] text-lg mb-8 max-w-lg mx-auto">
            Join recruiters who are already using AI to find the best talent, faster.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              to="/register?role=recruiter"
              className="btn-primary text-base px-8 py-3.5 rounded-full"
            >
              Get Started Free →
            </Link>
            <Link
              to="/register?role=candidate"
              className="btn-secondary px-8 py-3.5 rounded-full"
            >
              I'm a Candidate
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-10 px-6 border-t border-[var(--color-border-light)]">
        <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#7c3aed] to-[#6d28d9] flex items-center justify-center text-xs">
              🎯
            </div>
            <span className="font-heading font-bold text-sm text-[var(--color-text-primary)]">TalentAI</span>
          </div>
          <p className="text-xs text-[var(--color-text-muted)]">
            © 2026 TalentAI. Built with AI for smarter hiring.
          </p>
        </div>
      </footer>
      <RankerPreviewWidget />
    </div>
  );
}
