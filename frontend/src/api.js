import axios from "axios";

const API = import.meta.env.VITE_API_URL;

export const api = axios.create({
  baseURL: `${API}/api`,
  withCredentials: true
});


api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config;

    if (err.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        await api.post("/auth/refresh"); // Refresh token cookie used automatically
        return api(originalRequest);     // Retry original request
      } catch (error) {
        // refresh failed → logout user
        window.location.href = "/login";
      }
    }

    return Promise.reject(err);
  }
);




// // Attach JWT from localStorage to every request
// api.interceptors.request.use(config => {
//   const token = localStorage.getItem("jwt");
//   if (token) {
//     config.headers.Authorization = `Bearer ${token}`;
//   }
//   return config;
// });