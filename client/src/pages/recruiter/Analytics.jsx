import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { aiAPI } from '../../api';
import AppLayout from '../../components/layout/AppLayout';

const COLORS = ['#7c3aed', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899'];

const tooltipStyle = {
  background: '#ffffff',
  border: '1px solid #e2ddf0',
  borderRadius: 10,
  boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
};

export default function AnalyticsDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics'],
    queryFn: () => aiAPI.getAnalytics().then((r) => r.data),
  });

  const analytics = data?.analytics || {};

  return (
    <AppLayout>
      <div className="max-w-[1200px] mx-auto">
        <div className="mb-8">
          <h1 className="font-heading text-[2rem] font-bold mb-2 text-[var(--color-text-primary)]">📈 Analytics</h1>
          <p className="text-[var(--color-text-secondary)]">AI-powered insights into your recruitment pipeline</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-5">
            {[1,2,3,4].map((i) => <div key={i} className="skeleton h-[280px] rounded-[var(--radius-lg)]" />)}
          </div>
        ) : (
          <div className="grid gap-5">
            {/* Top Stats */}
            <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
              {[
                { label: 'Total Jobs', value: analytics.totalJobs ?? '—', icon: '📋', color: 'var(--color-accent)' },
                { label: 'Total Applications', value: analytics.totalApplications ?? '—', icon: '📝', color: 'var(--color-secondary)' },
                { label: 'Avg AI Score', value: analytics.avgScore ? `${analytics.avgScore.toFixed(1)}` : '—', icon: '🏆', color: 'var(--color-success)' },
                { label: 'Shortlisted', value: analytics.totalShortlisted ?? '—', icon: '✅', color: 'var(--color-warning)' },
              ].map(({ label, value, icon, color }) => (
                <div key={label} className="card p-5">
                  <div className="text-[28px] mb-2">{icon}</div>
                  <div className="text-[1.8rem] font-extrabold font-heading" style={{ color }}>{value}</div>
                  <div className="text-xs text-[var(--color-text-muted)]">{label}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-[repeat(auto-fit,minmax(400px,1fr))] gap-5">
              {/* Score Distribution */}
              {analytics.scoreDistribution && (
                <div className="card p-6">
                  <h3 className="font-heading font-bold mb-5 text-base text-[var(--color-text-primary)]">Score Distribution</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={analytics.scoreDistribution}>
                      <XAxis dataKey="range" tick={{ fill: '#5b5675', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#5b5675', fontSize: 11 }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="count" fill="url(#purpleGrad)" radius={[4, 4, 0, 0]} />
                      <defs>
                        <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#7c3aed" />
                          <stop offset="100%" stopColor="#4f46e5" />
                        </linearGradient>
                      </defs>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Top Skills in Demand */}
              {analytics.topSkills && (
                <div className="card p-6">
                  <h3 className="font-heading font-bold mb-5 text-base text-[var(--color-text-primary)]">Top Skills in Demand</h3>
                  <div className="flex flex-col gap-2.5">
                    {analytics.topSkills.slice(0, 8).map(({ skill, count }, i) => (
                      <div key={skill}>
                        <div className="flex justify-between mb-1 text-[13px]">
                          <span className="text-[var(--color-text-secondary)]">{skill}</span>
                          <span className="font-semibold" style={{ color: COLORS[i % COLORS.length] }}>{count}</span>
                        </div>
                        <div className="h-1 rounded-sm bg-[var(--color-border-light)]">
                          <div
                            className="h-full rounded-sm transition-all"
                            style={{
                              width: `${(count / (analytics.topSkills[0]?.count || 1)) * 100}%`,
                              background: COLORS[i % COLORS.length],
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Applications Over Time */}
              {analytics.applicationsOverTime && (
                <div className="card p-6">
                  <h3 className="font-heading font-bold mb-5 text-base text-[var(--color-text-primary)]">Applications Over Time</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={analytics.applicationsOverTime}>
                      <XAxis dataKey="date" tick={{ fill: '#5b5675', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#5b5675', fontSize: 11 }} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Line type="monotone" dataKey="count" stroke="#06b6d4" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Application Status */}
              {analytics.statusBreakdown && (
                <div className="card p-6">
                  <h3 className="font-heading font-bold mb-5 text-base text-[var(--color-text-primary)]">Pipeline Status</h3>
                  <div className="flex items-center gap-6">
                    <ResponsiveContainer width={160} height={160}>
                      <PieChart>
                        <Pie data={analytics.statusBreakdown} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="count">
                          {analytics.statusBreakdown.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex flex-col gap-2">
                      {analytics.statusBreakdown.map(({ status, count }, i) => (
                        <div key={status} className="flex items-center gap-2 text-[13px]">
                          <div className="w-2.5 h-2.5 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />
                          <span className="text-[var(--color-text-secondary)] capitalize">{status}</span>
                          <span className="font-bold ml-auto">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
