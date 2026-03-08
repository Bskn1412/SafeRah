import axios from "axios";

const API = import.meta.env.VITE_API_URL;

export const api = axios.create({
  baseURL: `${API}/api`,
  withCredentials: true
});

// Attach JWT from localStorage to every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem("jwt");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});