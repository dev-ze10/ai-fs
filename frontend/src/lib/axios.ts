import ax from "axios";
import { useAuthStore } from "../stores/auth";

export const api = ax.create({
  baseURL: "/api",
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = "/login";
    }
    return Promise.reject(err);
  },
);

export function extractError(err: unknown): string {
  if (ax.isAxiosError(err)) {
    const data = err.response?.data;
    if (data?.details?.length) {
      return data.details.map((d: { message: string }) => d.message).join(", ");
    }
    return data?.error ?? err.message;
  }
  return "An unexpected error occurred";
}
