import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { login as apiLogin, registerUser as apiRegister, getMe } from "@/lib/api";

type UserType = "customer" | "HOST" | "pandit" | "temple_admin" | "supplier" | "event_manager" | "other" | "ADMIN" | "devotee";

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  tier: "free" | "silver" | "gold" | "platinum";
  isAdmin: boolean;
  userType: UserType;
  token_balance?: number;
  has_pending_subscription?: boolean;
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
      const fetchedUser = {
        id: data.id,
        name: data.profile?.full_name || data.email,
        email: data.email,
        tier: data.subscription_tier?.toLowerCase() || "free",
        isAdmin: data.role === "ADMIN",
        userType: data.role as UserType,
        token_balance: data.token_balance,
        has_pending_subscription: data.has_pending_subscription
      };
      setUser(fetchedUser);
      return fetchedUser;
    } catch (e) {
      console.error("Failed to fetch user via token:", e);
      logout();
      return null;
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
    const u = await fetchUser(res.access_token);
    setShowAuthModal(false);
    if (u && u.userType === "ADMIN") {
      window.location.href = "/admin-dashboard";
    }
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
