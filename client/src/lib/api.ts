import axios from "axios";
import { useAuthStore } from "../stores/authStore";

export const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

// Auth API
export const authApi = {
  register: (email: string, password: string) =>
    api.post("/auth/register", { email, password }),
  login: (email: string, password: string) =>
    api.post("/auth/login", { email, password }),
  getMe: () => api.get("/auth/me"),
};

// AI API
export const aiApi = {
  suggestStyles: (projectId: string, refresh = false) =>
    api.post(`/ai/${projectId}/suggest-styles${refresh ? '?refresh=true' : ''}`),
  getSuggestions: (projectId: string) =>
    api.get(`/ai/${projectId}/suggestions`),
  refinePrompt: (projectId: string, prompt: string) =>
    api.post(`/ai/${projectId}/refine-prompt`, { prompt }),
  saveSettings: (projectId: string, settings: Record<string, unknown>) =>
    api.post(`/ai/${projectId}/settings`, settings),
  getSettings: (projectId: string) =>
    api.get(`/ai/${projectId}/settings`),
};

// Projects API
export const projectsApi = {
  create: (formData: FormData) =>
    api.post("/projects", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  getAll: () => api.get("/projects"),
  getOne: (id: string) => api.get(`/projects/${id}`),
  updateSettings: (id: string, settings: Record<string, unknown>) =>
    api.patch(`/projects/${id}/settings`, settings),
  updateKeyframes: (id: string, keyframes: unknown[]) =>
    api.patch(`/projects/${id}/keyframes`, { keyframes }),
  delete: (id: string) => api.delete(`/projects/${id}`),
};
