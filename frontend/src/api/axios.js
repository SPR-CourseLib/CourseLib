import axios from "axios";
import { clearAuthTokens } from "../auth";

const apiBaseUrl = (import.meta.env.VITE_API_URL || "/api").replace(/\/+$/, "");

const api = axios.create({
  baseURL: apiBaseUrl,
});

api.interceptors.request.use(
  (config) => {
    const accessToken = localStorage.getItem("accessToken");

    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem("refreshToken");

      if (!refreshToken) {
        clearAuthTokens();
        return Promise.reject(error);
      }

      try {
        const response = await axios.post(`${apiBaseUrl}/auth/refresh/`, {
          refresh: refreshToken,
        });

        const newAccessToken = response.data.access;

        localStorage.setItem(
          "accessToken",
          newAccessToken
        );

        originalRequest.headers.Authorization =
          `Bearer ${newAccessToken}`;

        return api(originalRequest);
      } catch (refreshError) {
        clearAuthTokens();

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
