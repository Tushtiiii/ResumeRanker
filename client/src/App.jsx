import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import AuthCallback from './pages/auth/AuthCallback';
import RecruiterDashboard from './pages/recruiter/RecruiterDashboard';
import CreateJob from './pages/recruiter/CreateJob';
import JobDetail from './pages/recruiter/JobDetail';
import CandidateComparison from './pages/recruiter/CandidateComparison';
import AnalyticsDashboard from './pages/recruiter/Analytics';
import InterviewQuestions from './pages/recruiter/InterviewQuestions';
import CandidateDashboard from './pages/candidate/CandidateDashboard';
import AppLayout from './components/layout/AppLayout';

// ─── Stub pages for routes not yet fully built ─────────────────
const Stub = ({ title }) => (
  <AppLayout>
    <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-secondary)' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🚧</div>
      <h2 style={{ fontFamily: 'var(--font-heading)', marginBottom: 8 }}>{title}</h2>
      <p>Coming soon — this page is being built.</p>
    </div>
  </AppLayout>
);

// ─── Route Guards ─────────────────────────────────────────────
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, token } = useSelector((s) => s.auth);
  if (!token || !user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  return children;
};

const PublicRoute = ({ children }) => {
  const { token, user } = useSelector((s) => s.auth);
  if (token && user) {
    if (user.role === 'recruiter') return <Navigate to="/recruiter" replace />;
    if (user.role === 'candidate') return <Navigate to="/candidate" replace />;
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
  }
  return children;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        {/* Recruiter */}
        <Route path="/recruiter" element={<ProtectedRoute allowedRoles={['recruiter', 'admin']}><RecruiterDashboard /></ProtectedRoute>} />
        <Route path="/recruiter/jobs/new" element={<ProtectedRoute allowedRoles={['recruiter', 'admin']}><CreateJob /></ProtectedRoute>} />
        <Route path="/recruiter/jobs/:id" element={<ProtectedRoute allowedRoles={['recruiter', 'admin']}><JobDetail /></ProtectedRoute>} />
        <Route path="/recruiter/compare" element={<ProtectedRoute allowedRoles={['recruiter', 'admin']}><CandidateComparison /></ProtectedRoute>} />
        <Route path="/recruiter/analytics" element={<ProtectedRoute allowedRoles={['recruiter', 'admin']}><AnalyticsDashboard /></ProtectedRoute>} />
        <Route path="/recruiter/interview-questions" element={<ProtectedRoute allowedRoles={['recruiter', 'admin']}><InterviewQuestions /></ProtectedRoute>} />
        <Route path="/recruiter/chat" element={<ProtectedRoute allowedRoles={['recruiter', 'admin']}><Stub title="AI Chat Assistant" /></ProtectedRoute>} />
        {/* Candidate */}
        <Route path="/candidate" element={<ProtectedRoute allowedRoles={['candidate']}><CandidateDashboard /></ProtectedRoute>} />
        <Route path="/candidate/resume" element={<ProtectedRoute allowedRoles={['candidate']}><Stub title="Resume Upload" /></ProtectedRoute>} />
        <Route path="/candidate/applications" element={<ProtectedRoute allowedRoles={['candidate']}><Stub title="My Applications" /></ProtectedRoute>} />

        {/* Admin */}
        <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><Stub title="Admin Dashboard" /></ProtectedRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
