import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Menu, X, User, LogOut, Coins } from "lucide-react";
import { useState } from "react";
import logo from "@/assets/logo.png";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Navbar = () => {
  const { user, isAuthenticated, login, logout, setShowAuthModal } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { to: "/", label: "Home" },
    { to: "/search", label: "Find Pandits" },
    ...(isAuthenticated ? [{ to: "/dashboard", label: "Dashboard" }] : []),
    ...(user?.isAdmin ? [{ to: "/admin-dashboard", label: "Admin" }] : []),
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-md">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <img src={logo} alt="MyPandits.com" className="h-8" />
        </Link>

        {/* Desktop nav */}
        <div className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`text-sm font-medium transition-colors hover:text-primary ${location.pathname === link.to ? "text-primary" : "text-muted-foreground"
                }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {isAuthenticated ? (
            <div className="flex items-center gap-4">
              {user?.token_balance !== undefined && (
                <div className="flex items-center gap-1.5 font-bold text-amber-500 bg-gradient-to-r from-amber-500/10 to-yellow-500/10 border border-amber-500/20 px-4 py-1.5 rounded-full shadow-inner text-sm tracking-wide">
                  <Coins className="h-4 w-4 drop-shadow-sm" />
                  {user.token_balance.toLocaleString()}
                </div>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2 focus-visible:ring-0">
                    <User className="h-4 w-4" />
                    {user?.name}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link to="/settings" className="w-full cursor-pointer flex items-center">
                      <User className="mr-2 h-4 w-4" />
                      Account Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={logout} className="text-destructive cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <>
              <Button onClick={() => setShowAuthModal(true)} variant="outline" size="sm">
                Sign In
              </Button>
              <Button onClick={() => setShowAuthModal(true)} size="sm">
                Sign Up
              </Button>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-border bg-card px-4 py-4 md:hidden">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMobileOpen(false)}
              className="block py-2 text-sm font-medium text-muted-foreground hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-3 border-t border-border pt-3">
            {isAuthenticated ? (
              <>
                <Link to="/settings" onClick={() => setMobileOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full justify-start gap-2 mb-2">
                    <User className="h-4 w-4" />
                    Account Settings
                  </Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={logout} className="w-full justify-start gap-2 text-destructive">
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </>
            ) : (
              <Button onClick={() => setShowAuthModal(true)} size="sm" className="w-full">
                Sign In / Sign Up
              </Button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
