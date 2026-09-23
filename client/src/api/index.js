import axios from 'axios';
import { store } from '../store';
import { logout } from '../store/slices/authSlice';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 60000, // 60s for AI operations
});

// Attach JWT token
api.interceptors.request.use((config) => {
  const token = store.getState().auth.token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 → auto logout
api.interceptors.response.use( 
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      store.dispatch(logout());
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ─── Auth ──────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getProfile: () => api.get('/auth/profile'),
};

// ─── Jobs ──────────────────────────────────────────────────────
export const jobsAPI = {
  create: (formData) => api.post('/jobs', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getAll: (params) => api.get('/jobs', { params }),
  getOne: (id) => api.get(`/jobs/${id}`),
  update: (id, data) => api.patch(`/jobs/${id}`, data),
  delete: (id) => api.delete(`/jobs/${id}`),
  getStats: (id) => api.get(`/jobs/${id}/stats`),
};

// ─── Candidates ────────────────────────────────────────────────
export const candidatesAPI = {
  uploadResume: (formData) => api.post('/candidates/upload-resume', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  }),
  getProfile: () => api.get('/candidates/me'),   // alias used by CandidateDashboard
  getMyProfile: () => api.get('/candidates/me'),
  updateProfile: (data) => api.put('/candidates/me', data),
  getAll: (params) => api.get('/candidates', { params }),
  getOne: (id) => api.get(`/candidates/${id}`),
  apply: (jobId) => api.post(`/candidates/apply/${jobId}`),
  applyToJob: (jobId) => api.post(`/candidates/apply/${jobId}`),
  getApplications: () => api.get('/candidates/applications'),  // alias
  getMyApplications: () => api.get('/candidates/applications'),
};

export const candidateAPI = candidatesAPI;

// ─── AI ────────────────────────────────────────────────────────
export const aiAPI = {
  rankCandidates: (jobId) => api.post('/ai/rank-candidates', { jobId }),
  generateInsights: (jobId, candidateId) => api.post('/ai/generate-insights', { jobId, candidateId }),
  generateInterviewQuestions: (data) => api.post('/ai/interview-questions', data),
  interviewQuestions: (jobId, difficulty, count) => api.post('/ai/interview-questions', { jobId, difficulty, count }),
  chat: (query, jobId) => api.post('/ai/chat', { query, jobId }),
  getRankedApplications: (jobId, params) => api.get(`/ai/ranked-applications/${jobId}`, { params }),
  getAnalytics: () => api.get('/admin/analytics'),   // analytics shortcut
  getStatus: () => api.get('/ai/status'),
};

// ─── Admin ─────────────────────────────────────────────────────
export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getUsers: (params) => api.get('/admin/users', { params }),
  updateUser: (id, data) => api.patch(`/admin/users/${id}`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  getAnalytics: () => api.get('/admin/analytics'),
};

export default api;
