import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { candidateAPI, jobsAPI } from '../../api';
import AppLayout from '../../components/layout/AppLayout';

const statusStyle = {
  applied: 'bg-[rgba(6,182,212,0.08)] text-[var(--color-secondary)] border-[rgba(6,182,212,0.25)]',
  shortlisted: 'bg-[rgba(16,185,129,0.08)] text-[var(--color-success)] border-[rgba(16,185,129,0.25)]',
  rejected: 'bg-[rgba(239,68,68,0.08)] text-[var(--color-danger)] border-[rgba(239,68,68,0.25)]',
  hired: 'bg-[rgba(124,58,237,0.08)] text-[var(--color-accent)] border-[rgba(124,58,237,0.25)]',
};

export default function CandidateDashboard() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef();
  const [editMode, setEditMode] = useState(false);
  const [profileDraft, setProfileDraft] = useState(null);

  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ['candidate-profile'],
    queryFn: () => candidateAPI.getProfile().then((r) => r.data),
  });

  const { data: jobsData } = useQuery({
    queryKey: ['available-jobs'],
    queryFn: () => jobsAPI.getAll().then((r) => r.data),
  });

  const { data: appsData, isLoading: appsLoading } = useQuery({
    queryKey: ['my-applications'],
    queryFn: () => candidateAPI.getApplications().then((r) => r.data),
  });

  const uploadMutation = useMutation({
    mutationFn: (file) => {
      const fd = new FormData();
      fd.append('resume', file);
      return candidateAPI.uploadResume(fd);
    },
    onSuccess: () => { toast.success('Resume uploaded & parsed by AI! ✨'); queryClient.invalidateQueries(['candidate-profile']); },
    onError: (err) => toast.error(err.response?.data?.error || 'Upload failed'),
  });

  const updateMutation = useMutation({
    mutationFn: (data) => candidateAPI.updateProfile(data),
    onSuccess: () => { toast.success('Profile updated!'); setEditMode(false); queryClient.invalidateQueries(['candidate-profile']); },
    onError: (err) => toast.error(err.response?.data?.error || 'Update failed'),
  });

  const applyMutation = useMutation({
    mutationFn: (jobId) => candidateAPI.applyToJob(jobId),
    onSuccess: () => { toast.success('Application submitted! 🎉'); queryClient.invalidateQueries(['my-applications']); },
    onError: (err) => toast.error(err.response?.data?.error || 'Application failed'),
  });

  const profile = profileData?.candidate;
  const jobs = jobsData?.jobs || [];
  const apps = appsData?.applications || [];

  const startEdit = () => {
    setProfileDraft({
      headline: profile?.headline || '',
      summary: profile?.summary || '',
      location: profile?.location || '',
      skills: profile?.skills?.join(', ') || '',
    });
    setEditMode(true);
  };

  return (
    <AppLayout>
      <div className="max-w-[1100px] mx-auto">
        <div className="mb-8">
          <h1 className="font-heading text-[2rem] font-bold mb-2 text-[var(--color-text-primary)]">My Dashboard</h1>
          <p className="text-[var(--color-text-secondary)]">Your career profile, applications, and AI-analyzed resume</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
          {/* Left: Profile Card */}
          <div className="flex flex-col gap-5">
            <div className="card p-6">
              {profileLoading ? (
                <div className="flex flex-col gap-3">
                  <div className="skeleton h-12 w-12 rounded-full" />
                  <div className="skeleton h-4 w-32" />
                  <div className="skeleton h-3 w-full" />
                </div>
              ) : (
                <>
                  <div className="flex items-start gap-4 mb-5">
                    <div className="w-14 h-14 shrink-0 rounded-[var(--radius-lg)] bg-gradient-to-br from-[#7c3aed] to-[#6d28d9] flex items-center justify-center text-2xl font-extrabold text-white">
                      {profile?.userId?.name?.[0] || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="font-heading font-bold text-lg mb-0.5 text-[var(--color-text-primary)] truncate">{profile?.userId?.name || 'Set Up Profile'}</h2>
                      <p className="text-sm text-[var(--color-text-secondary)] truncate">{profile?.headline || 'Add a headline'}</p>
                      {profile?.location && <p className="text-xs text-[var(--color-text-muted)] mt-1">📍 {profile.location}</p>}
                    </div>
                  </div>

                  {editMode ? (
                    <div className="flex flex-col gap-3">
                      {['headline', 'location', 'summary'].map((f) => (
                        <div key={f}>
                          <label className="block text-[11px] font-semibold text-[var(--color-text-muted)] uppercase mb-1">{f}</label>
                          {f === 'summary' ? (
                            <textarea rows={3} value={profileDraft?.[f] || ''} onChange={(e) => setProfileDraft({ ...profileDraft, [f]: e.target.value })} className="input-field text-sm resize-y" />
                          ) : (
                            <input value={profileDraft?.[f] || ''} onChange={(e) => setProfileDraft({ ...profileDraft, [f]: e.target.value })} className="input-field text-sm" />
                          )}
                        </div>
                      ))}
                      <div>
                        <label className="block text-[11px] font-semibold text-[var(--color-text-muted)] uppercase mb-1">Skills (comma-separated)</label>
                        <input value={profileDraft?.skills || ''} onChange={(e) => setProfileDraft({ ...profileDraft, skills: e.target.value })} className="input-field text-sm" />
                      </div>
                      <div className="flex gap-2 mt-1">
                        <button onClick={() => updateMutation.mutate({ ...profileDraft, skills: profileDraft.skills.split(',').map((s) => s.trim()).filter(Boolean) })} className="btn-primary py-2 px-4 text-[13px] flex-1">Save</button>
                        <button onClick={() => setEditMode(false)} className="btn-secondary py-2 px-4 text-[13px]">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {profile?.summary && <p className="text-sm text-[var(--color-text-secondary)] mb-4 leading-relaxed">{profile.summary}</p>}
                      {profile?.skills?.length > 0 && (
                        <div className="mb-4">
                          <div className="text-xs text-[var(--color-text-muted)] mb-2">Skills</div>
                          <div className="flex flex-wrap gap-1">{profile.skills.map((s) => <span key={s} className="tag">{s}</span>)}</div>
                        </div>
                      )}
                      <div className="flex flex-col gap-2">
                        <button onClick={startEdit} className="btn-secondary w-full py-2.5 text-[13px]">✏️ Edit Profile</button>
                        <button onClick={() => fileInputRef.current?.click()} disabled={uploadMutation.isPending} className="btn-primary w-full py-2.5 text-[13px]">
                          {uploadMutation.isPending ? '🤖 AI parsing...' : '📄 Upload Resume'}
                        </button>
                        <input ref={fileInputRef} type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={(e) => e.target.files?.[0] && uploadMutation.mutate(e.target.files[0])} />
                      </div>
                    </>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-[var(--color-border-light)]">
                    {[
                      { label: 'Applications', value: apps.length, icon: '📝' },
                      { label: 'Experience', value: `${profile?.totalExperienceYears || 0}y`, icon: '💼' },
                      { label: 'Skills', value: profile?.skills?.length || 0, icon: '🛠' },
                    ].map((s) => (
                      <div key={s.label} className="text-center">
                        <div className="text-lg">{s.icon}</div>
                        <div className="text-lg font-extrabold font-heading text-[var(--color-accent)]">{s.value}</div>
                        <div className="text-[10px] text-[var(--color-text-muted)]">{s.label}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Right: Applications & Jobs */}
          <div className="flex flex-col gap-5">
            {/* My Applications */}
            <div className="card p-6">
              <h3 className="font-heading font-bold mb-4 text-base text-[var(--color-text-primary)]">📋 My Applications</h3>
              {appsLoading ? (
                <div className="flex flex-col gap-2.5">{[1,2,3].map((i) => <div key={i} className="skeleton h-14 rounded-[var(--radius-md)]" />)}</div>
              ) : apps.length === 0 ? (
                <div className="py-10 text-center text-[var(--color-text-muted)]">
                  <div className="text-3xl mb-2">📭</div>
                  <p className="text-sm">No applications yet. Browse jobs below!</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {apps.map((app) => (
                    <div key={app._id} className="flex items-center justify-between p-3.5 rounded-[var(--radius-md)] bg-[var(--color-surface-alt)] border border-[var(--color-border-light)]">
                      <div className="min-w-0 flex-1 mr-3">
                        <div className="font-semibold text-sm text-[var(--color-text-primary)] truncate">{app.jobId?.title || 'Job'}</div>
                        <div className="text-xs text-[var(--color-text-muted)]">{app.jobId?.company}{app.appliedAt ? ` · ${new Date(app.appliedAt).toLocaleDateString()}` : ''}</div>
                      </div>
                      <div className="flex items-center gap-2.5">
                        {app.finalScore != null && (
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-extrabold ${
                            app.finalScore >= 80 ? 'bg-[var(--color-success-light)] text-[var(--color-success)]'
                            : app.finalScore >= 60 ? 'bg-[var(--color-warning-light)] text-[var(--color-warning)]'
                            : 'bg-[var(--color-danger-light)] text-[var(--color-danger)]'
                          }`}>{app.finalScore}</div>
                        )}
                        <span className={`text-[11px] px-2.5 py-1 rounded-full border font-semibold capitalize ${statusStyle[app.status] || 'bg-[var(--color-surface-alt)] text-[var(--color-text-muted)]'}`}>{app.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Available Jobs */}
            <div className="card p-6">
              <h3 className="font-heading font-bold mb-4 text-base text-[var(--color-text-primary)]">🔍 Available Jobs</h3>
              {jobs.length === 0 ? (
                <div className="py-10 text-center text-[var(--color-text-muted)]"><p className="text-sm">No open positions right now.</p></div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {jobs.slice(0, 10).map((job) => {
                    const hasApplied = apps.some((a) => a.jobId?._id === job._id);
                    return (
                      <div key={job._id} className="flex items-center justify-between p-3.5 rounded-[var(--radius-md)] bg-[var(--color-surface-alt)] border border-[var(--color-border-light)]">
                        <div className="min-w-0 flex-1 mr-3">
                          <div className="font-semibold text-sm text-[var(--color-text-primary)] truncate">{job.title}</div>
                          <div className="text-xs text-[var(--color-text-muted)]">{job.company} · 📍 {job.location}</div>
                          {job.parsedProfile?.requiredSkills?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {job.parsedProfile.requiredSkills.slice(0, 4).map((s) => <span key={s} className="tag text-[10px]">{s}</span>)}
                            </div>
                          )}
                        </div>
                        <button disabled={hasApplied || applyMutation.isPending} onClick={() => applyMutation.mutate(job._id)}
                          className={`py-2 px-4 text-[13px] shrink-0 ${hasApplied ? 'btn-secondary opacity-60 cursor-not-allowed' : 'btn-primary'}`}>
                          {hasApplied ? '✓ Applied' : 'Apply'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
