import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { loginSuccess } from '../../store/slices/authSlice';
import { authAPI } from '../../api';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const [searchParams] = useSearchParams();
  const defaultRole = searchParams.get('role') || 'candidate';
  const [form, setForm] = useState({ name: '', email: '', password: '', role: defaultRole });
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await authAPI.register(form);
      dispatch(loginSuccess(data));
      toast.success('Account created! Welcome to GreenHire 🎉');
      if (data.user.role === 'recruiter') navigate('/recruiter');
      else navigate('/candidate');
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--color-base)] px-6 relative overflow-hidden">
      {/* Decorative blob */}
      <div className="absolute w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(75,179,253,0.07)_0%,transparent_70%)] bottom-[5%] left-[5%] pointer-events-none" />

      <div className="w-full max-w-[460px] relative z-10">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-[52px] h-[52px] rounded-[14px] bg-gradient-to-br from-[#00345a] to-[#4bb3fd] flex items-center justify-center text-[26px] mx-auto mb-4 shadow-lg">
            🎯
          </div>
          <h1 className="font-heading text-3xl font-bold mb-2 text-[var(--color-text-primary)]">
            Create your account
          </h1>
          <p className="text-[var(--color-text-secondary)] text-base">
            Join GreenHire and transform hiring
          </p>
        </div>

        {/* Role Toggle */}
        <div className="flex gap-0.5 bg-[var(--color-surface-alt)] rounded-[var(--radius-md)] p-1 mb-6 border border-[var(--color-border)]">
          {['candidate', 'recruiter'].map((role) => (
            <button
              key={role}
              onClick={() => setForm({ ...form, role })}
              className={`flex-1 py-2.5 rounded-[10px] border-none cursor-pointer text-sm font-semibold capitalize transition-all ${
                form.role === role
                  ? 'bg-gradient-to-r from-[#00345a] to-[#4bb3fd] text-white shadow-md'
                  : 'bg-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              {role === 'candidate' ? '👤 Candidate' : '💼 Recruiter'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="card p-9 flex flex-col gap-5">
          {[
            { label: 'Full Name', key: 'name', type: 'text', placeholder: 'John Smith' },
            { label: 'Email Address', key: 'email', type: 'email', placeholder: 'you@company.com' },
            { label: 'Password', key: 'password', type: 'password', placeholder: '••••••••' },
          ].map(({ label, key, type, placeholder }) => (
            <div key={key}>
              <label className="block text-sm font-semibold text-[var(--color-text-secondary)] mb-2">
                {label}
              </label>
              <input
                type={type} required value={form[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                placeholder={placeholder}
                className="input-field"
              />
            </div>
          ))}

          <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base rounded-[var(--radius-md)]">
            {loading ? 'Creating account...' : `Create ${form.role === 'recruiter' ? 'Recruiter' : 'Candidate'} Account →`}
          </button>
        </form>

        <p className="text-center mt-5 text-[var(--color-text-secondary)] text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-[var(--color-accent)] font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
