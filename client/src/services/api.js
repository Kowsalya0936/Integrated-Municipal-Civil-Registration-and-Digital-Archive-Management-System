import axios from 'axios';

const API_BASE_URL =
  process.env.REACT_APP_API_URL ||
  'http://127.0.0.1:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// Request Interceptor: Attach JWT Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle Unauthorized / Expired sessions
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token is invalid or expired
      const currentPath = window.location.pathname;
      if (currentPath !== '/login' && currentPath !== '/register' && currentPath !== '/') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login?expired=true';
      }
    }
    return Promise.reject(error);
  }
);

// Citizen: raise escalation on own overdue application
export const escalateApplication = (id, reason, description) =>
  api.post(`/applications/${id}/escalate`, { reason, description });

// Admin: get all citizen-escalated applications
export const getAdminEscalations = (escalationStatus) =>
  api.get('/admin/escalations', { params: escalationStatus ? { escalationStatus } : {} });

// Admin: update escalation status (PENDING / IN_REVIEW / RESOLVED)
export const updateEscalationStatus = (id, escalationStatus) =>
  api.put(`/admin/applications/${id}/escalation-status`, { escalationStatus });

export default api;
