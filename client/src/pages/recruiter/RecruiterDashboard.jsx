import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { useQuery } from '@tanstack/react-query';
import { jobsAPI } from '../../api';
import AppLayout from '../../components/layout/AppLayout';

const StatCard = ({ icon, label, value, colorClass }) => (
  <div className="card p-6 flex items-center gap-4">
    <div className={`w-[52px] h-[52px] rounded-xl flex items-center justify-center text-2xl ${colorClass}`}>
      {icon}
    </div>
    <div>
      <div className={`text-3xl font-heading font-extrabold ${colorClass.includes('text-') ? '' : 'text-[var(--color-text-primary)]'}`} style={{ color: colorClass.includes('text-') ? undefined : undefined }}>
        {value}
      </div>
      <div className="text-sm text-[var(--color-text-secondary)]">{label}</div>
    </div>
  </div>
);

export default function RecruiterDashboard() {
  const navigate = useNavigate();
  const { user } = useSelector((s) => s.auth);

  const { data: jobsData, isLoading } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => jobsAPI.getAll({ limit: 50 }).then((r) => r.data),
  });

  const jobs = jobsData?.jobs || [];
  const activeJobs = jobs.filter((j) => j.status === 'active').length;
  const totalApplicants = jobs.reduce((sum, j) => sum + (j.applicantCount || 0), 0);

  return (
    <AppLayout>
      <div className="max-w-[1200px] mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-heading text-3xl font-bold mb-1.5 text-[var(--color-text-primary)]">
              Welcome back, {user?.name?.split(' ')[0]} 👋
            </h1>
            <p className="text-[var(--color-text-secondary)]">Here's an overview of your recruitment activity</p>
          </div>
          <button
            onClick={() => navigate('/recruiter/jobs/new')}
            className="btn-primary py-3 px-6 rounded-full text-sm"
          >
            ➕ Post New Job
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mb-10">
          <StatCard icon="📋" label="Total Jobs" value={jobs.length} colorClass="bg-[var(--color-accent-light)] text-[var(--color-accent)]" />
          <StatCard icon="✅" label="Active Jobs" value={activeJobs} colorClass="bg-[var(--color-success-light)] text-[var(--color-success)]" />
          <StatCard icon="👥" label="Total Applicants" value={totalApplicants} colorClass="bg-[var(--color-secondary-light)] text-[var(--color-secondary)]" />
          <StatCard icon="🏆" label="Shortlisted" value={jobs.reduce((s, j) => s + (j.shortlistedCount || 0), 0)} colorClass="bg-[var(--color-warning-light)] text-[var(--color-warning)]" />
        </div>

        {/* Jobs List */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-heading text-xl font-bold text-[var(--color-text-primary)]">Your Job Postings</h2>
          <button
            onClick={() => navigate('/recruiter/analytics')}
            className="px-4 py-2 rounded-[var(--radius-md)] bg-[var(--color-secondary-light)] border border-[rgba(2,123,206,0.25)] text-[var(--color-secondary)] text-sm font-semibold cursor-pointer hover:border-[var(--color-secondary)] transition-colors"
          >
            📈 View Analytics
          </button>
        </div>

        {isLoading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-[100px] rounded-[var(--radius-lg)]" />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="card p-16 text-center">
            <div className="text-5xl mb-4">📭</div>
            <h3 className="font-heading font-bold mb-2 text-[var(--color-text-primary)]">No jobs posted yet</h3>
            <p className="text-[var(--color-text-secondary)] mb-6">Post your first job and let AI find the best candidates</p>
            <button onClick={() => navigate('/recruiter/jobs/new')} className="btn-primary py-3 px-7 rounded-full text-sm">
              Post a Job Now
            </button>
          </div>
        ) : (
          <div className="grid gap-3">
            {jobs.map((job) => (
              <div
                key={job._id}
                className="card px-6 py-5 cursor-pointer hover:border-[var(--color-accent)] transition-colors"
                onClick={() => navigate(`/recruiter/jobs/${job._id}`)}
              >
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <h3 className="font-heading text-base font-bold text-[var(--color-text-primary)]">{job.title}</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border capitalize ${
                        job.status === 'active'
                          ? 'bg-[var(--color-success-light)] text-[var(--color-success)] border-[rgba(16,185,129,0.25)]'
                          : 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)] border-[var(--color-border)]'
                      }`}>
                        {job.status}
                      </span>
                    </div>
                    <div className="flex gap-4 text-[var(--color-text-secondary)] text-sm">
                      {job.company && <span>🏢 {job.company}</span>}
                      <span>📍 {job.location || 'Remote'}</span>
                      <span>📅 {new Date(job.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex gap-5 text-center">
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
