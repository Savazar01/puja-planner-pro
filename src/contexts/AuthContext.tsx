import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { login as apiLogin, registerUser as apiRegister, getMe } from "@/lib/api";

type UserType = "customer" | "pandit" | "temple_admin" | "supplier" | "event_manager" | "other" | "admin";

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
  isLoading: boolean;
  searchCount: number;
  login: (email: string, pass: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  incrementSearch: () => void;
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean, mode?: "signin" | "register") => void;
  authMode: "signin" | "register";
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [isLoading, setIsLoading] = useState(!!localStorage.getItem("token"));
  const [searchCount, setSearchCount] = useState(0);
  const [showAuthModal, setShowAuthModalState] = useState(false);
  const [authMode, setAuthMode] = useState<"signin" | "register">("signin");

  const setShowAuthModal = useCallback((show: boolean, mode: "signin" | "register" = "signin") => {
    setAuthMode(mode);
    setShowAuthModalState(show);
  }, []);

  const fetchUser = useCallback(async (authToken: string) => {
    try {
      setIsLoading(true);
      const data = await getMe(authToken);
      const rawRole = (data.role || "").toString().toLowerCase();
      let behaviorRole = rawRole.trim();

      // Standardize: Map 'host' (legacy) and empty roles to 'customer'
      if (behaviorRole === "host" || !behaviorRole) {
        behaviorRole = "customer";
      }

      const rawName = data.profile?.full_name || data.email;
      const sanitizedName = rawName.trim();

      const fetchedUser = {
        id: data.id,
        name: sanitizedName,
        email: data.email,
        tier: data.subscription_tier?.toLowerCase() || "free",
        isAdmin: rawRole === "admin",
        userType: behaviorRole.includes("customer") ? "customer" : behaviorRole as UserType,
        token_balance: data.token_balance,
        has_pending_subscription: data.has_pending_subscription
      };
      setUser(fetchedUser);
      return fetchedUser;
    } catch (e) {
      console.error("Failed to fetch user via token:", e);
      logout();
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchUser(token);
    }
  }, [token, fetchUser]);

  const login = useCallback(async (email: string, pass: string) => {
    const res = await apiLogin(email, pass);
    const newToken = res.access_token;
    localStorage.setItem("token", newToken);
    setToken(newToken);
    
    // Non-blocking redirect: Use a temporary role check or redirect immediately
    // We try to decode the token to get the user type quickly if possible, 
    // but for now we redirect to a generic landing if we can't wait.
    // However, to keep role parity, we'll trigger fetchUser in background 
    // and perform a "Fast Redirect" based on the stored/expected behavior.
    
    setShowAuthModal(false);
    
    // Trigger background fetch
    fetchUser(newToken).then(u => {
      if (u) {
        const targetRole = u.userType.toLowerCase();
        if (u.isAdmin) {
          window.location.href = "/admin-dashboard";
        } else if (targetRole === "customer" || targetRole === "event_manager") {
          window.location.href = "/customer-dashboard";
        } else {
          window.location.href = "/dashboard";
        }
      }
    });

    // Optional: Immediate optimistic redirect if we have a hint, 
    // but the .then() above is fast enough if fetchUser is optimized.
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
    window.location.href = "/";
  }, []);

  const incrementSearch = useCallback(() => {
    setSearchCount((prev) => prev + 1);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, token, isAuthenticated: !!token && !!user, isLoading, searchCount, login, logout, register, incrementSearch, showAuthModal, setShowAuthModal, authMode }}
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
