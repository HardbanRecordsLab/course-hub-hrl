import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { apiPost, apiGet } from "@/lib/api";

export type UserRole = "admin" | "student";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface AuthContextType {
  user: AppUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("hrl_token");
    const refreshToken = localStorage.getItem("hrl_refresh_token");
    if (token && refreshToken) {
      apiGet<{ id: string; name: string; email: string; role: string } & Record<string, unknown>>("/api/auth/me")
        .then((u) => setUser({ ...u, role: u.role.toLowerCase() as UserRole }))
        .catch(async () => {
          try {
            const data = await apiPost<{ accessToken: string; refreshToken: string; user: { id: string; name: string; email: string; role: string } }>("/api/auth/refresh", { refreshToken });
            localStorage.setItem("hrl_token", data.accessToken);
            localStorage.setItem("hrl_refresh_token", data.refreshToken);
            setUser({ ...data.user, role: data.user.role.toLowerCase() as UserRole });
          } catch {
            localStorage.removeItem("hrl_token");
            localStorage.removeItem("hrl_refresh_token");
          }
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const data = await apiPost<{ token: string; refreshToken: string; user: { id: string; name: string; email: string; role: string } }>("/api/auth/login", { email, password });
      const role = data.user.role.toLowerCase() as UserRole;
      localStorage.setItem("hrl_token", data.token);
      localStorage.setItem("hrl_refresh_token", data.refreshToken);
      setUser({ ...data.user, role });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || "Błąd logowania" };
    }
  };

  const register = async (name: string, email: string, password: string) => {
    try {
      const data = await apiPost<{ token: string; refreshToken: string; user: { id: string; name: string; email: string; role: string } }>("/api/auth/register", { name, email, password });
      const role = data.user.role.toLowerCase() as UserRole;
      localStorage.setItem("hrl_token", data.token);
      localStorage.setItem("hrl_refresh_token", data.refreshToken);
      setUser({ ...data.user, role });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || "Błąd rejestracji" };
    }
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem("hrl_refresh_token");
    try {
      await apiPost(`/api/auth/refresh/logout`, { refreshToken });
    } catch {}
    localStorage.removeItem("hrl_token");
    localStorage.removeItem("hrl_refresh_token");
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, isAuthenticated: !!user, loading, login, register, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
