import axios from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add request interceptor for authentication
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("github_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem("github_token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export const apiService = {
  // Repositories
  listRepositories: () => api.get("/repos"),

  getRepositoryDetails: (owner: string, repo: string) =>
    api.get(`/repos/${owner}/${repo}`),

  // Activity
  getRecentActivity: (params?: { limit?: number; type?: string; repo?: string }) =>
    api.get("/activity", { params }),

  // Tasks
  listTasks: (params?: { status?: string; priority?: string; repo?: string }) =>
    api.get("/tasks", { params }),

  createTask: (data: {
    repo_id: number;
    title: string;
    priority: string;
    status: string;
    due_date: string;
  }) => api.post("/tasks", data),

  updateTask: (id: number, data: {
    priority?: string;
    status?: string;
    due_date?: string;
  }) => api.put(`/tasks/${id}`, data),

  deleteTask: (id: number) => api.delete(`/tasks/${id}`),

  // Analytics
  getRepositoryAnalytics: (owner: string, repo: string) =>
    api.get(`/analytics/repos/${owner}/${repo}`),

  getUserAnalytics: (username: string) =>
    api.get(`/analytics/users/${username}`),

  // Authentication
  authenticate: (code: string) => api.post("/auth/github", { code }),

  // Data Sync
  syncRepository: (owner: string, repo: string) =>
    api.post(`/sync/repository/${owner}/${repo}`),

  syncOrganization: (org: string) => api.post(`/sync/organization/${org}`),
};

export default apiService; 