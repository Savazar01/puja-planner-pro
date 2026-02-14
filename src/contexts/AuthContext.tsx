import React, { createContext, useContext, useState, useCallback } from "react";

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  tier: "free" | "silver" | "gold" | "platinum";
  isAdmin: boolean;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  searchCount: number;
  login: () => void;
  logout: () => void;
  incrementSearch: () => void;
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [searchCount, setSearchCount] = useState(0);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const login = useCallback(() => {
    setUser({
      id: "1",
      name: "Demo User",
      email: "demo@mypandits.com",
      tier: "gold",
      isAdmin: false,
    });
    setShowAuthModal(false);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setSearchCount(0);
  }, []);

  const incrementSearch = useCallback(() => {
    setSearchCount((prev) => prev + 1);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, searchCount, login, logout, incrementSearch, showAuthModal, setShowAuthModal }}
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
