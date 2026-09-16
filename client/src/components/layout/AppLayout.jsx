import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../../store/slices/authSlice';

const navItems = {
  recruiter: [
    { path: '/recruiter', icon: '📊', label: 'Dashboard' },
    { path: '/recruiter/jobs/new', icon: '➕', label: 'Post Job' },
    { path: '/recruiter/resume-ranker', icon: '🏆', label: 'AI Ranker' },
    { path: '/recruiter/interview-questions', icon: '🎯', label: 'Interview Qs' },
    { path: '/recruiter/analytics', icon: '📈', label: 'Analytics' },
  ],
  candidate: [
    { path: '/candidate', icon: '👤', label: 'My Profile' },
    { path: '/candidate/applications', icon: '📋', label: 'Applications' },
  ],
  admin: [
    { path: '/admin', icon: '⚙️', label: 'Admin Panel' },
  ],
};

export default function AppLayout({ children }) {
  const { user } = useSelector((s) => s.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const role = user?.role || 'candidate';
  const items = navItems[role] || navItems.candidate;

  return (
    <div className="flex min-h-screen bg-[var(--color-base)]">
      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-screen bg-white border-r border-[var(--color-border)] flex flex-col z-50 transition-all duration-300 ${
          collapsed ? 'w-[68px]' : 'w-[240px]'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-[var(--color-border-light)]">
          <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-[#7c3aed] to-[#6d28d9] flex items-center justify-center text-base shrink-0 shadow-md">
            🎯
          </div>
          {!collapsed && (
            <span className="font-heading font-bold text-lg text-[var(--color-text-primary)]">
              TalentAI
            </span>
          )}
        </div>

        {/* Nav Items */}
        <nav className="flex-1 flex flex-col gap-1 p-3 overflow-y-auto">
          {items.map(({ path, icon, label }) => {
            const active = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] text-sm font-medium transition-all duration-200 no-underline ${
                  active
                    ? 'bg-[var(--color-accent-light)] text-[var(--color-accent)] font-semibold'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text-primary)]'
                }`}
                title={label}
              >
                <span className="text-lg w-6 text-center shrink-0">{icon}</span>
                {!collapsed && <span>{label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Collapse + User */}
        <div className="p-3 border-t border-[var(--color-border-light)]">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-[var(--radius-md)] text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] border-none bg-transparent cursor-pointer transition-colors"
          >
            {collapsed ? '→' : '← Collapse'}
          </button>
          <div className="mt-2 flex items-center gap-2.5 px-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7c3aed] to-[#6d28d9] flex items-center justify-center text-xs font-bold text-white shrink-0">
              {user?.name?.[0] || '?'}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
                  {user?.name}
                </div>
                <button
                  onClick={() => {
                    dispatch(logout());
                    navigate('/');
                  }}
                  className="text-xs text-[var(--color-danger)] hover:underline bg-transparent border-none cursor-pointer p-0"
                >
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={`flex-1 transition-all duration-300 ${
          collapsed ? 'ml-[68px]' : 'ml-[240px]'
        }`}
      >
        <div className="max-w-[1400px] mx-auto p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
