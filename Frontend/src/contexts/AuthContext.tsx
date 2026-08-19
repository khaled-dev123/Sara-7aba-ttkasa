import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { authApi } from "@/api";
import { setTokens, clearTokens, loadTokens } from "@/lib/api-client";
import type { UserWithMarket } from "@/types";

interface AuthContextType {
  user: UserWithMarket | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<UserWithMarket>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserWithMarket | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = useCallback(async () => {
    try {
      const tokens = loadTokens();
      if (!tokens.accessToken) {
        setIsLoading(false);
        return;
      }
      const userData = await authApi.me();
      setUser(userData);
    } catch {
      clearTokens();
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = useCallback(async (username: string, password: string) => {
    const tokens = await authApi.login(username, password);
    setTokens(tokens.access_token, tokens.refresh_token);
    const userData = await authApi.me();
    setUser(userData);
    return userData;
  }, []);

  const logout = useCallback(async () => {
    try {
      const refreshToken = localStorage.getItem("refresh_token");
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    } catch {
      // ignore
    } finally {
      clearTokens();
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
