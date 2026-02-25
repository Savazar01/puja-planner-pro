import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { login as apiLogin, registerUser as apiRegister, getMe } from "@/lib/api";

type UserType = "customer" | "pandit" | "temple_admin" | "supplier" | "event_manager" | "other" | "ADMIN";

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  tier: "free" | "silver" | "gold" | "platinum";
  isAdmin: boolean;
  userType: UserType;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  searchCount: number;
  login: (email: string, pass: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  incrementSearch: () => void;
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [searchCount, setSearchCount] = useState(0);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const fetchUser = useCallback(async (authToken: string) => {
    try {
      const data = await getMe(authToken);
      setUser({
        id: data.id,
        name: data.profile?.full_name || data.email,
        email: data.email,
        tier: "free",
        isAdmin: data.role === "ADMIN",
        userType: data.role.toLowerCase() as UserType,
      });
    } catch (e) {
      console.error("Failed to fetch user via token:", e);
      logout();
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchUser(token);
    }
  }, [token, fetchUser]);

  const login = useCallback(async (email: string, pass: string) => {
    const res = await apiLogin(email, pass);
    localStorage.setItem("token", res.access_token);
    setToken(res.access_token);
    await fetchUser(res.access_token);
    setShowAuthModal(false);
  }, [fetchUser]);

  const register = useCallback(async (data: any) => {
    await apiRegister(data);
    // Auto-login after register
    await login(data.email, data.password);
  }, [login]);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("token");
    setSearchCount(0);
  }, []);

  const incrementSearch = useCallback(() => {
    setSearchCount((prev) => prev + 1);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, token, isAuthenticated: !!user, searchCount, login, logout, register, incrementSearch, showAuthModal, setShowAuthModal }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
