import axios from 'axios';

// ✅ Resiliently normalize backend URL — ensure it ends with /api and has no trailing slash
const getApiUrl = () => {
  let url = import.meta.env.VITE_API_URL || 'https://skf-project-silas.onrender.com/api';
  url = url.trim().replace(/\/$/, ''); // Remove trailing slash if present
  if (!url.endsWith('/api')) {
    url += '/api';
  }
  return url;
};

const API_URL = getApiUrl();

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    // DRF returns 403 when NO token is supplied (anonymous user hits IsAuthenticated).
    // DRF returns 401 when a token IS supplied but is invalid/expired.
    // Handle both the same way: try to refresh, else send to login.
    if ((status === 401 || status === 403) && !originalRequest._retry) {
      originalRequest._retry = true;
      const refresh = localStorage.getItem('refresh_token');

      if (refresh) {
        try {
          const res = await axios.post(`${API_URL}/auth/refresh/`, { refresh });
          const newAccess = res.data.access;
          localStorage.setItem('access_token', newAccess);
          api.defaults.headers.common['Authorization'] = `Bearer ${newAccess}`;
          originalRequest.headers.Authorization = `Bearer ${newAccess}`;
          return api(originalRequest);
        } catch (refreshError) {
          localStorage.clear();
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      } else {
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default api;