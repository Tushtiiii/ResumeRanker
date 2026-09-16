import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { loginSuccess } from '../../store/slices/authSlice';
import { authAPI } from '../../api';
import toast from 'react-hot-toast';

const DEMO_ACCOUNTS = {
  recruiter: {
    email: 'demo.recruiter@talentai.dev',
    password: 'Demo@1234',
    label: '💼 Try Recruiter Demo',
    name: 'Sarah Mitchell',
  },
  candidate: {
    email: 'demo.candidate@talentai.dev',
    password: 'Demo@1234',
    label: '👤 Try Candidate Demo',
    name: 'Arjun Sharma',
  },
};

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const doLogin = async (email, password) => {
    const { data } = await authAPI.login({ email, password });
    dispatch(loginSuccess(data));
    return data;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await doLogin(form.email, form.password);
      toast.success(`Welcome back, ${data.user.name}!`);
      redirectByRole(data.user.role);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async (role) => {
    const acct = DEMO_ACCOUNTS[role];
    setDemoLoading(role);
    try {
      const data = await doLogin(acct.email, acct.password);
      toast.success(`👋 Signed in as ${acct.name} (${role})`);
      redirectByRole(data.user.role);
    } catch (err) {
      toast.error(
        'Demo account not found. Ask your admin to run: npm run seed (in server/)',
        { duration: 5000 }
      );
    } finally {
      setDemoLoading(null);
    }
  };

  const redirectByRole = (role) => {
    if (role === 'recruiter') navigate('/recruiter');
    else if (role === 'admin') navigate('/admin');
    else navigate('/candidate');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-base)] px-6 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute w-[500px] h-[500px] rounded-full pointer-events-none bg-[radial-gradient(circle,rgba(124,58,237,0.07)_0%,transparent_70%)] top-[5%] right-[10%]" />
      <div className="absolute w-[400px] h-[400px] rounded-full pointer-events-none bg-[radial-gradient(circle,rgba(6,182,212,0.05)_0%,transparent_70%)] bottom-[10%] left-[5%]" />

      <div className="w-full max-w-[460px] relative z-10">
        {/* Logo */}
        <div className="text-center mb-9">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#7c3aed] to-[#6d28d9] flex items-center justify-center text-3xl mx-auto mb-4 shadow-lg">
            🎯
          </div>
          <h1 className="font-heading text-3xl font-bold mb-1.5 text-[var(--color-text-primary)]">
            Welcome back
          </h1>
          <p className="text-[var(--color-text-secondary)] text-base">
            Sign in to your TalentAI account
          </p>
        </div>

        {/* Demo Accounts */}
        <div className="card p-5 mb-5">
          <div className="text-[11px] font-bold text-[var(--color-text-muted)] tracking-widest uppercase mb-3.5">
            ⚡ Quick Demo Access
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {Object.entries(DEMO_ACCOUNTS).map(([role, acct]) => (
              <button
                key={role}
                onClick={() => handleDemo(role)}
                disabled={demoLoading !== null}
                className={`flex flex-col items-center gap-1 py-3 px-2.5 rounded-[var(--radius-md)] text-sm font-bold cursor-pointer transition-all border ${
                  role === 'recruiter'
                    ? 'bg-[var(--color-accent-light)] border-[rgba(124,58,237,0.2)] text-[var(--color-accent)] hover:border-[var(--color-accent)]'
                    : 'bg-[var(--color-secondary-light)] border-[rgba(6,182,212,0.2)] text-[var(--color-secondary)] hover:border-[var(--color-secondary)]'
                } ${demoLoading && demoLoading !== role ? 'opacity-50' : ''} ${demoLoading ? 'cursor-not-allowed' : ''}`}
              >
                {demoLoading === role ? (
                  <span className="opacity-70">Signing in…</span>
                ) : (
                  <>
                    <span>{acct.label}</span>
                    <span className="text-[10px] opacity-70 font-normal">{acct.name}</span>
                  </>
                )}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-[var(--color-text-muted)] mt-3 text-center">
            Password: <code className="bg-[var(--color-surface-alt)] px-1.5 py-0.5 rounded text-xs">Demo@1234</code>
          </p>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-[var(--color-border)]" />
          <span className="text-xs text-[var(--color-text-muted)] whitespace-nowrap">or sign in with email</span>
          <div className="flex-1 h-px bg-[var(--color-border)]" />
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="card p-8 flex flex-col gap-5">
          <div>
            <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-2">Email Address</label>
            <input
              type="email" required value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@company.com"
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-2">Password</label>
            <input
              type="password" required value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
              className="input-field"
            />
          </div>

          <button type="submit" disabled={loading || demoLoading !== null} className="btn-primary w-full py-3 text-base rounded-[var(--radius-md)]">
            {loading ? 'Signing in…' : 'Sign In →'}
          </button>

          {/* Divider */}
          <div className="relative text-center">
            <div className="absolute top-1/2 left-0 right-0 h-px bg-[var(--color-border)]" />
            <span className="relative bg-white px-3 text-xs text-[var(--color-text-muted)]">OR</span>
          </div>

          {/* Google OAuth */}
          <a
            href="/api/auth/google"
            className="flex items-center justify-center gap-2.5 py-3 px-5 rounded-[var(--radius-md)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm font-medium hover:bg-[var(--color-surface-alt)] hover:border-[var(--color-accent)] transition-all"
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </a>
        </form>

        <p className="text-center mt-5 text-[var(--color-text-secondary)] text-sm">
          Don't have an account?{' '}
          <Link to="/register" className="text-[var(--color-accent)] font-semibold hover:underline">
            Sign up free
          </Link>
        </p>
      </div>
    </div>
  );
}
