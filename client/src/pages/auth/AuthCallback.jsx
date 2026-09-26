import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { loginSuccess } from '../../store/slices/authSlice';
import { authAPI } from '../../api';

export default function AuthCallback() {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace('#', ''));
    const token = params.get('token');
    const role = params.get('role');

    if (!token) { navigate('/login'); return; }

    // Set token first so the API interceptor picks it up
    localStorage.setItem('token', token);

    authAPI.getProfile()
      .then(({ data }) => {
        dispatch(loginSuccess({ token, user: data.user }));
        if (role === 'recruiter') navigate('/recruiter');
        else if (role === 'admin') navigate('/admin');
        else navigate('/candidate');
      })
      .catch(() => navigate('/login'));
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--color-base)]">
      <div className="w-[52px] h-[52px] rounded-[14px] bg-gradient-to-br from-[#00345a] to-[#4bb3fd] flex items-center justify-center text-[26px] mb-6 animate-pulse shadow-lg">
        🎯
      </div>
      <p className="text-[var(--color-text-secondary)]">
        Completing sign in...
      </p>
    </div>
  );
}
