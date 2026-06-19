import api from './api';

export const dataService = {
  // --- Auth ---
  auth: {
    login: (email, password) => api.post('/auth/login/', { email, password }),
    register: (data) => api.post('/auth/register/', data),
    refresh: (refresh) => api.post('/auth/refresh/', { refresh }),
  },

  // --- Projects ---
  projects: {
    list: (params = {}) => api.get('/projects/', { params }),
    get: (id) => api.get(`/projects/${id}/`),
    create: (data) => api.post('/projects/', data),
    update: (id, data) => api.put(`/projects/${id}/`, data),
    delete: (id) => api.delete(`/projects/${id}/`),
  },

  // --- Tasks ---
  tasks: {
    listByProject: (projectId) => api.get('/tasks/', { params: { project: projectId } }),
    get: (id) => api.get(`/tasks/${id}/`),
    create: (data) => api.post('/tasks/', data),
    update: (id, data) => api.put(`/tasks/${id}/`, data),
    delete: (id) => api.delete(`/tasks/${id}/`),
    addComment: (id, comment) => api.post(`/tasks/${id}/comment/`, { comment }),
  },

  // --- Team ---
  team: {
    list: () => api.get('/team/'),
    update: (data) => api.post('/team/', data),
    delete: (id) => api.delete(`/team/${id}/`),
  },

  // --- Notifications ---
  notifications: {
    list: () => api.get('/notifications/'),
    markRead: (id) => api.put(`/notifications/${id}/read/`),
  },

  // --- Analytics ---
  analytics: {
    overview: () => api.get('/analytics/overview/'),
  },

  // --- Project Discussion ---
  comments: {
    list: (projectId) => api.get(`/projects/${projectId}/comments/`),
    create: (projectId, data) => api.post(`/projects/${projectId}/comments/`, data),
    update: (commentId, data) => api.put(`/comments/${commentId}/`, data),
    delete: (commentId) => api.delete(`/comments/${commentId}/`),
  },
};