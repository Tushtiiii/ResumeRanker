import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { jobsAPI } from '../../api';
import AppLayout from '../../components/layout/AppLayout';

/* ── Stat Card ──────────────────────────────────────────────── */
const StatCard = ({ icon, label, value, colorClass, delay = 0 }) => (
  <div
    className="card p-6 flex items-center gap-4"
    style={{ animation: `fade-in 0.45s ease ${delay}ms both` }}
  >
    <div
      className={`w-[52px] h-[52px] rounded-xl flex items-center justify-center text-2xl ${colorClass}`}
    >
      {icon}
    </div>
    <div>
      <div className="text-3xl font-heading font-extrabold text-[var(--color-text-primary)]">
        {value}
      </div>
      <div className="text-sm text-[var(--color-text-secondary)]">{label}</div>
    </div>
  </div>
);

/* ── Quick Action Button ────────────────────────────────────── */
const QuickAction = ({ icon, label, desc, onClick, gradient }) => (
  <button
    onClick={onClick}
    className="card p-5 text-left cursor-pointer border-transparent hover:border-[var(--color-accent)] transition-all duration-200 group"
    style={{ background: 'var(--color-surface)' }}
  >
    <div
      className="w-11 h-11 rounded-xl flex items-center justify-center text-xl mb-3 transition-transform duration-200 group-hover:scale-110"
      style={{ background: gradient }}
    >
      {icon}
    </div>
    <div className="font-heading font-bold text-[15px] text-[var(--color-text-primary)] mb-0.5">
      {label}
    </div>
    <div className="text-xs text-[var(--color-text-muted)] leading-relaxed">{desc}</div>
  </button>
);

/* ── Status Filter Pill ─────────────────────────────────────── */
const FilterPill = ({ label, count, active, onClick }) => (
  <button
    onClick={onClick}
    className={`px-3.5 py-1.5 rounded-full text-[12px] font-semibold border cursor-pointer transition-all duration-200 ${
      active
        ? 'bg-[var(--color-accent)] text-white border-[var(--color-accent)] shadow-sm'
        : 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border-[var(--color-border)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]'
    }`}
  >
    {label}
    {count !== undefined && (
      <span
        className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${
          active ? 'bg-white/25' : 'bg-[var(--color-surface-alt)]'
        }`}
      >
        {count}
      </span>
    )}
  </button>
);

/* ──────────────────────────────────────────────────────────── */
export default function RecruiterDashboard() {
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);

  const { data: jobsData, isLoading } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => jobsAPI.getAll({ limit: 100 }).then((r) => r.data),
  });

  const jobs = jobsData?.jobs || [];
  const activeJobs = jobs.filter((j) => j.status === 'active').length;
  const closedJobs = jobs.filter((j) => j.status === 'closed').length;
  const draftJobs = jobs.filter((j) => j.status === 'draft').length;
  const totalApplicants = jobs.reduce((sum, j) => sum + (j.applicantCount || 0), 0);
  const totalShortlisted = jobs.reduce((s, j) => s + (j.shortlistedCount || 0), 0);

  // ── Filters & search ──
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const displayed = useMemo(() => {
    let list = [...jobs];
    if (statusFilter !== 'all') list = list.filter((j) => j.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (j) =>
          (j.title || '').toLowerCase().includes(q) ||
          (j.company || '').toLowerCase().includes(q) ||
          (j.location || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [jobs, statusFilter, search]);

  return (
    <AppLayout>
      <div className="max-w-[1200px] mx-auto">
        {/* ── Header ── */}
        <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold mb-1.5 text-[var(--color-text-primary)]">
              Welcome back, {user?.name?.split(' ')[0]} 👋
            </h1>
            <p className="text-[var(--color-text-secondary)]">
              Here's an overview of your recruitment activity
            </p>
          </div>
          <button
            onClick={() => navigate('/recruiter/jobs/new')}
            className="btn-primary py-3 px-6 rounded-full text-sm"
          >
            ➕ Post New Job
          </button>
        </div>

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mb-8">
          <StatCard
            icon="📋"
            label="Total Jobs"
            value={jobs.length}
            colorClass="bg-[var(--color-accent-light)] text-[var(--color-accent)]"
            delay={0}
          />
          <StatCard
            icon="✅"
            label="Active Jobs"
            value={activeJobs}
            colorClass="bg-[var(--color-success-light)] text-[var(--color-success)]"
            delay={60}
          />
          <StatCard
            icon="👥"
            label="Total Applicants"
            value={totalApplicants}
            colorClass="bg-[var(--color-secondary-light)] text-[var(--color-secondary)]"
            delay={120}
          />
          <StatCard
            icon="🏆"
            label="Shortlisted"
            value={totalShortlisted}
            colorClass="bg-[var(--color-warning-light)] text-[var(--color-warning)]"
            delay={180}
          />
        </div>

        {/* ── AI Quick Actions Hub ── */}
        <div className="mb-10">
          <h2 className="font-heading text-lg font-bold text-[var(--color-text-primary)] mb-4">
            ⚡ Quick Actions
          </h2>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
            <QuickAction
              icon="🤖"
              label="AI Resume Ranker"
              desc="Upload JD & candidates → get AI-powered semantic rankings instantly"
              onClick={() => navigate('/recruiter/ranker')}
              gradient="linear-gradient(135deg, rgba(0,72,124,0.12), rgba(2,123,206,0.12))"
            />
            <QuickAction
              icon="➕"
              label="Post a New Job"
              desc="Create a job posting and let candidates apply automatically"
              onClick={() => navigate('/recruiter/jobs/new')}
              gradient="linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.06))"
            />
            <QuickAction
              icon="🎯"
              label="Interview Questions"
              desc="Generate tailored technical & behavioral interview questions"
              onClick={() => navigate('/recruiter/interview-questions')}
              gradient="linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.06))"
            />
            <QuickAction
              icon="📈"
              label="View Analytics"
              desc="Real-time insights into your recruitment pipeline performance"
              onClick={() => navigate('/recruiter/analytics')}
              gradient="linear-gradient(135deg, rgba(139,92,246,0.12), rgba(139,92,246,0.06))"
            />
          </div>
        </div>

        {/* ── AI Ranker Promo Banner ── */}
        <div
          className="card mb-10 p-6 flex items-center justify-between flex-wrap gap-5"
          style={{
            background:
              'linear-gradient(135deg, rgba(0,52,90,0.04) 0%, rgba(2,123,206,0.06) 100%)',
            borderColor: 'rgba(0,72,124,0.15)',
          }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0"
              style={{
                background: 'linear-gradient(135deg, #00487c, #027bce)',
                boxShadow: '0 4px 16px rgba(0,72,124,0.3)',
              }}
            >
              🧠
            </div>
            <div>
              <h3 className="font-heading font-bold text-[16px] text-[var(--color-text-primary)] mb-0.5">
                AI-Powered Candidate Scoring
              </h3>
              <p className="text-[13px] text-[var(--color-text-secondary)] leading-relaxed max-w-[500px]">
                Upload a job description and candidate profiles — our AI semantically analyzes
                skills, experience, projects & certifications to produce ranked scores across 7
                dimensions.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/recruiter/ranker')}
            className="btn-primary py-3 px-7 rounded-full text-sm shrink-0"
          >
            🚀 Launch AI Ranker
          </button>
        </div>

        {/* ── Jobs List ── */}
        <div className="mb-5">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
            <h2 className="font-heading text-xl font-bold text-[var(--color-text-primary)]">
              Your Job Postings
            </h2>
            <div className="flex items-center gap-2.5">
              <input
                className="input-field w-56"
                placeholder="🔍 Search jobs…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Status filters */}
          <div className="flex flex-wrap gap-2 mb-5">
            <FilterPill
              label="All"
              count={jobs.length}
              active={statusFilter === 'all'}
              onClick={() => setStatusFilter('all')}
            />
            <FilterPill
              label="Active"
              count={activeJobs}
              active={statusFilter === 'active'}
              onClick={() => setStatusFilter('active')}
            />
            <FilterPill
              label="Closed"
              count={closedJobs}
              active={statusFilter === 'closed'}
              onClick={() => setStatusFilter('closed')}
            />
            <FilterPill
              label="Draft"
              count={draftJobs}
              active={statusFilter === 'draft'}
              onClick={() => setStatusFilter('draft')}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-[100px] rounded-[var(--radius-lg)]" />
            ))}
          </div>
        ) : displayed.length === 0 && jobs.length === 0 ? (
          <div className="card p-16 text-center">
            <div className="text-5xl mb-4">📭</div>
            <h3 className="font-heading font-bold mb-2 text-[var(--color-text-primary)]">
              No jobs posted yet
            </h3>
            <p className="text-[var(--color-text-secondary)] mb-6">
              Post your first job and let AI find the best candidates
            </p>
            <button
              onClick={() => navigate('/recruiter/jobs/new')}
              className="btn-primary py-3 px-7 rounded-full text-sm"
            >
              Post a Job Now
            </button>
          </div>
        ) : displayed.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="text-4xl mb-3">🔍</div>
            <h3 className="font-heading font-bold mb-1 text-[var(--color-text-primary)]">
              No matching jobs
            </h3>
            <p className="text-sm text-[var(--color-text-muted)]">
              Try clearing the search or changing the status filter.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {displayed.map((job) => (
              <div
                key={job._id}
                className="card px-6 py-5 cursor-pointer hover:border-[var(--color-accent)] transition-colors"
                onClick={() => navigate(`/recruiter/jobs/${job._id}`)}
              >
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <h3 className="font-heading text-base font-bold text-[var(--color-text-primary)]">
                        {job.title}
                      </h3>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border capitalize ${
                          job.status === 'active'
                            ? 'bg-[var(--color-success-light)] text-[var(--color-success)] border-[rgba(16,185,129,0.25)]'
                            : job.status === 'closed'
                            ? 'bg-[var(--color-danger-light)] text-[var(--color-danger)] border-[rgba(239,68,68,0.2)]'
                            : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] border-[var(--color-border)]'
                        }`}
                      >
                        {job.status}
                      </span>
                    </div>
                    <div className="flex gap-4 text-[var(--color-text-secondary)] text-sm">
                      {job.company && <span>🏢 {job.company}</span>}
                      <span>📍 {job.location || 'Remote'}</span>
                      <span>📅 {new Date(job.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Metrics */}
                  <div className="flex gap-5 text-center items-center">
                    <div>
                      <div className="text-xl font-extrabold font-heading text-[var(--color-secondary)]">
                        {job.applicantCount || 0}
                      </div>
                      <div className="text-[11px] text-[var(--color-text-muted)]">Applicants</div>
                    </div>
                    <div>
                      <div className="text-xl font-extrabold font-heading text-[var(--color-success)]">
                        {job.shortlistedCount || 0}
                      </div>
                      <div className="text-[11px] text-[var(--color-text-muted)]">Shortlisted</div>
                    </div>

                    {/* Quick AI Rank button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/recruiter/ranker?jobId=${job._id}`);
                      }}
                      className="ml-2 px-3 py-2 rounded-[var(--radius-md)] text-[12px] font-semibold cursor-pointer transition-all duration-200 border border-[rgba(0,72,124,0.2)] bg-[var(--color-accent-light)] text-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-white hover:border-[var(--color-accent)]"
                      title="Rank candidates with AI"
                    >
                      ⚡ AI Rank
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
