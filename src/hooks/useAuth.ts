"use client";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuthStore } from "@/store/authStore";

export function useAuth() {
  const token = useAuthStore((s) => s.token);
  const setToken = useAuthStore((s) => s.setToken);

  const user = useQuery(api.auth.me, token ? { token } : "skip");
  const isLoading = token !== null && user === undefined;

  const signupMutation = useMutation(api.auth.signup);
  const loginMutation = useMutation(api.auth.login);
  const logoutMutation = useMutation(api.auth.logout);

  async function signup(email: string, password: string, name: string) {
    const result = await signupMutation({ email, password, name });
    setToken(result.token);
    return result;
  }

  async function login(email: string, password: string) {
    const result = await loginMutation({ email, password });
    setToken(result.token);
    return result;
  }

  async function logout() {
    if (token) await logoutMutation({ token });
    setToken(null);
  }

  return {
    user: user ?? null,
    isAuthenticated: !!user,
    isLoading,
    signup,
    login,
    logout,
  };
}