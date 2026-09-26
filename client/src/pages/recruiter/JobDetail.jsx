import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { jobsAPI, aiAPI } from '../../api';
import AppLayout from '../../components/layout/AppLayout';

const ScoreBar = ({ label, value }) => {
  const barColor = value >= 80 ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
    : value >= 60 ? 'bg-gradient-to-r from-amber-400 to-orange-400'
    : 'bg-gradient-to-r from-red-400 to-pink-400';
  const textColor = value >= 80 ? 'text-[var(--color-success)]' : value >= 60 ? 'text-[var(--color-warning)]' : 'text-[var(--color-danger)]';
  return (
    <div className="mb-2.5">
      <div className="flex justify-between mb-1 text-xs">
        <span className="text-[var(--color-text-secondary)]">{label}</span>
        <span className={`font-bold ${textColor}`}>{value}/100</span>
      </div>
      <div className="h-1.5 rounded-full bg-[var(--color-border-light)] overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
};

const ScoreBadge = ({ score }) => {
  const cls = score >= 80
    ? 'bg-[var(--color-success-light)] text-[var(--color-success)] border-[rgba(16,185,129,0.3)]'
    : score >= 60
    ? 'bg-[var(--color-warning-light)] text-[var(--color-warning)] border-[rgba(245,158,11,0.3)]'
    : 'bg-[var(--color-danger-light)] text-[var(--color-danger)] border-[rgba(239,68,68,0.3)]';
  return (
    <div className={`w-12 h-12 rounded-xl border flex items-center justify-center text-lg font-extrabold font-heading ${cls}`}>
      {score}
    </div>
  );
};

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedApp, setSelectedApp] = useState(null);
  const [filters, setFilters] = useState({ minScore: '', status: '', skills: '' });
  const [insightsLoading, setInsightsLoading] = useState(null);
  const [activeInsights, setActiveInsights] = useState({});
  const [selectedForCompare, setSelectedForCompare] = useState([]);

  const { data: jobData, isLoading: jobLoading } = useQuery({
    queryKey: ['job', id],
    queryFn: () => jobsAPI.getOne(id).then((r) => r.data),
  });

  const { data: rankedData, isLoading: rankedLoading, refetch: refetchRanked } = useQuery({
    queryKey: ['ranked', id],
    queryFn: () => aiAPI.getRankedApplications(id, filters).then((r) => r.data),
  });

  const rankMutation = useMutation({
    mutationFn: () => aiAPI.rankCandidates(id),
    onSuccess: () => {
      toast.success('AI ranking complete! ✨');
      refetchRanked();
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Ranking failed'),
  });

  const fetchInsights = async (jobId, candidateId, appId) => {
    if (activeInsights[appId]) return;
    setInsightsLoading(appId);
    try {
      const { data } = await aiAPI.generateInsights(jobId, candidateId);
      setActiveInsights((prev) => ({ ...prev, [appId]: data.insights }));
    } catch (err) {
      toast.error('Failed to generate insights');
    } finally {
      setInsightsLoading(null);
    }
  };

  const job = jobData?.job;
  const applications = rankedData?.applications || [];

  const toggleCompare = (candidateId) => {
    setSelectedForCompare((prev) =>
      prev.includes(candidateId) ? prev.filter((id) => id !== candidateId)
        : prev.length < 3 ? [...prev, candidateId] : prev
    );
  };

  if (jobLoading) return <AppLayout><div className="p-10 text-center text-[var(--color-text-muted)]">Loading...</div></AppLayout>;

  return (
    <AppLayout>
      <div className="max-w-[1200px] mx-auto">
        {/* Job Header */}
        <div className="card p-7 mb-6">
          <div className="flex justify-between flex-wrap gap-4">
            <div>
              <h1 className="font-heading text-[1.8rem] font-bold mb-1.5 text-[var(--color-text-primary)]">{job?.title}</h1>
              <div className="flex gap-4 text-[var(--color-text-secondary)] text-[13px] flex-wrap">
                {job?.company && <span>🏢 {job.company}</span>}
                <span>📍 {job?.location}</span>
                <span>👥 {job?.applicantCount || 0} applicants</span>
                {job?.parsedProfile?.experienceRange?.label && (
                  <span>⏱ {job.parsedProfile.experienceRange.label}</span>
                )}
              </div>
            </div>
            <div className="flex gap-2.5">
              <button onClick={() => navigate('/recruiter/interview-questions', { state: { jobId: id, jobTitle: job?.title } })} className="btn-secondary py-3 px-5 text-sm">
                🎯 Interview Qs
              </button>
              <button onClick={() => rankMutation.mutate()} disabled={rankMutation.isPending} className="btn-primary py-3 px-5 text-sm">
                {rankMutation.isPending ? '🤖 Ranking...' : '🚀 Run AI Ranking'}
              </button>
            </div>
          </div>

          {/* Required Skills */}
          {job?.parsedProfile?.requiredSkills?.length > 0 && (
            <div className="mt-5">
              <div className="text-xs text-[var(--color-text-muted)] mb-2">Required Skills</div>
              <div className="flex flex-wrap gap-1.5">
                {job.parsedProfile.requiredSkills.map((s) => (
                  <span key={s} className="tag">{s}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Compare Banner */}
        {selectedForCompare.length > 1 && (
          <div className="flex items-center justify-between px-6 py-3.5 rounded-[var(--radius-md)] mb-4 bg-[var(--color-accent-light)] border border-[rgba(0,72,124,0.25)]">
            <span className="text-sm text-[var(--color-text-primary)]">
              {selectedForCompare.length} candidates selected for comparison
            </span>
            <button onClick={() => navigate('/recruiter/compare', {
              state: {
                candidateIds: selectedForCompare,
                applications: applications.filter((a) => selectedForCompare.includes(a.candidateId?._id)),
                job,
              }
            })} className="btn-primary py-2 px-4.5 text-[13px]">
              Compare Side-by-Side →
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-3 mb-5 flex-wrap">
          <input
            placeholder="Min score (0-100)"
            value={filters.minScore}
            onChange={(e) => setFilters({ ...filters, minScore: e.target.value })}
            className="input-field w-40"
          />
          <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="input-field w-40">
            <option value="">All Statuses</option>
            <option value="applied">Applied</option>
            <option value="shortlisted">Shortlisted</option>
            <option value="rejected">Rejected</option>
          </select>
          <input
            placeholder="Filter by skill"
            value={filters.skills}
            onChange={(e) => setFilters({ ...filters, skills: e.target.value })}
            className="input-field flex-1 min-w-[140px]"
          />
          <button onClick={() => refetchRanked()} className="btn-primary py-2.5 px-4.5 text-[13px]">
            Apply Filters
          </button>
        </div>

        {/* Ranked Candidates */}
        {rankedLoading ? (
          <div className="grid gap-3">
            {[1,2,3].map((i) => <div key={i} className="skeleton h-[120px] rounded-[var(--radius-lg)]" />)}
          </div>
        ) : applications.length === 0 ? (
          <div className="card p-16 text-center">
            <div className="text-5xl mb-4">🏆</div>
            <h3 className="font-heading font-bold mb-2 text-[var(--color-text-primary)]">No ranked candidates yet</h3>
            <p className="text-[var(--color-text-secondary)] mb-6">
              Once candidates apply, click "Run AI Ranking" to score and rank them.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {applications.map((app, i) => {
              const c = app.candidateId;
              const isExpanded = selectedApp === app._id;
              const insights = activeInsights[app._id];

              return (
                <div key={app._id} className={`card p-5 cursor-pointer transition-colors ${
                  selectedForCompare.includes(c?._id) ? 'border-[rgba(0,72,124,0.5)]' : ''
                }`}>
                  <div onClick={() => setSelectedApp(isExpanded ? null : app._id)}
                    className="flex items-center gap-4 flex-wrap">
                    {/* Rank */}
                    <div className={`w-9 h-9 rounded-full shrink-0 flex items-center justify-center text-sm font-extrabold font-heading ${
                      i === 0 ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-black'
                      : i === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400 text-black'
                      : i === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-800 text-white'
                      : 'bg-[var(--color-surface-alt)] text-[var(--color-text-secondary)]'
                    }`}>#{app.rank || i+1}</div>

                    {/* Info */}
                    <div className="flex-1 min-w-[200px]">
                      <div className="font-bold text-base font-heading mb-1 text-[var(--color-text-primary)]">
                        {c?.userId?.name || 'Candidate'}
                      </div>
                      <div className="text-[13px] text-[var(--color-text-secondary)]">{c?.headline}</div>
                    </div>

                    {/* Score */}
                    {app.finalScore != null && <ScoreBadge score={app.finalScore} />}

                    {/* Actions */}
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => toggleCompare(c?._id)} className={`py-1.5 px-3 rounded-[var(--radius-md)] text-xs border cursor-pointer transition-colors ${
                        selectedForCompare.includes(c?._id)
                          ? 'bg-[var(--color-accent-light)] border-[rgba(0,72,124,0.3)] text-[var(--color-accent)]'
                          : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)]'
                      }`}>
                        {selectedForCompare.includes(c?._id) ? '✓ Compare' : 'Compare'}
                      </button>
                      {app.finalScore != null && (
                        <button onClick={() => fetchInsights(id, c?._id, app._id)} className="py-1.5 px-3 rounded-[var(--radius-md)] text-xs bg-[var(--color-accent-light)] border border-[rgba(0,72,124,0.25)] text-[var(--color-accent)] cursor-pointer hover:border-[var(--color-accent)] transition-colors">
                          {insightsLoading === app._id ? '⏳' : '💡 Insights'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded View */}
                  {isExpanded && (
                    <div className="mt-5 pt-5 border-t border-[var(--color-border-light)]">
                      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6">
                        {/* Score Breakdown */}
                        {app.scoreBreakdown && (
                          <div>
                            <h4 className="font-heading font-bold mb-3.5 text-sm text-[var(--color-text-primary)]">Score Breakdown</h4>
                            <ScoreBar label="Skill Match (30%)" value={app.scoreBreakdown.skillMatch} />
                            <ScoreBar label="Experience Match (25%)" value={app.scoreBreakdown.experienceMatch} />
                            <ScoreBar label="Project Relevance (15%)" value={app.scoreBreakdown.projectRelevance} />
                            <ScoreBar label="Career Growth (10%)" value={app.scoreBreakdown.careerGrowth} />
                            <ScoreBar label="Soft Skills (10%)" value={app.scoreBreakdown.softSkills} />
                            <ScoreBar label="Certifications (5%)" value={app.scoreBreakdown.certifications} />
                            <ScoreBar label="Platform Activity (5%)" value={app.scoreBreakdown.platformActivity} />
                          </div>
                        )}

                        {/* Skills + Info */}
                        <div>
                          <div className="mb-4">
                            <h4 className="font-heading font-bold mb-2.5 text-sm text-[var(--color-text-primary)]">Candidate Info</h4>
                            <div className="text-[13px] text-[var(--color-text-secondary)] flex flex-col gap-1">
                              <span>🕐 {c?.totalExperienceYears} years experience</span>
                              {c?.location && <span>📍 {c.location}</span>}
                              {c?.topDomains?.length > 0 && <span>🏷 {c.topDomains.join(', ')}</span>}
                            </div>
                          </div>
                          {c?.skills?.length > 0 && (
                            <div>
                              <div className="text-xs text-[var(--color-text-muted)] mb-2">Skills</div>
                              <div className="flex flex-wrap gap-1">
                                {c.skills.slice(0, 12).map((s) => (
                                  <span key={s} className="tag">{s}</span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* AI Insights */}
                        {insights && (
                          <div className="col-span-full">
                            <h4 className="font-heading font-bold mb-3.5 text-sm text-[var(--color-text-primary)]">🤖 AI Insights</h4>
                            <div className="p-4 rounded-[var(--radius-md)] bg-[var(--color-accent-light)] border border-[rgba(0,72,124,0.15)] text-[13px] text-[var(--color-text-secondary)] leading-relaxed mb-3">
                              {insights.summary}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <div className="text-xs text-[var(--color-success)] font-bold mb-2">✅ Strengths</div>
                                {insights.strengths?.map((s, i) => (
                                  <div key={i} className="text-[13px] text-[var(--color-text-secondary)] mb-1">• {s}</div>
                                ))}
                              </div>
                              <div>
                                <div className="text-xs text-[var(--color-warning)] font-bold mb-2">⚠️ Concerns</div>
                                {insights.concerns?.map((c, i) => (
                                  <div key={i} className="text-[13px] text-[var(--color-text-secondary)] mb-1">• {c}</div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
