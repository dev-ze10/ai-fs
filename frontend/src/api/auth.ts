import { api } from "../lib/axios";

interface AuthResponse {
  token: string;
  user: { id: string; email: string; name: string };
}

export async function loginApi(email: string, password: string) {
  const res = await api.post<AuthResponse>("/auth/login", { email, password });
  return res.data;
}

export async function registerApi(
  email: string,
  name: string,
  password: string,
) {
  const res = await api.post<AuthResponse>("/auth/register", {
    email,
    name,
    password,
  });
  return res.data;
}
