import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import AuthModal from "@/components/AuthModal";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import SearchResults from "./pages/SearchResults";
import Dashboard from "./pages/Dashboard";
import AdminCenter from "./pages/AdminCenter";
import ProfileSettings from "./pages/ProfileSettings";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import EventOrchestration from "./pages/event-orchestration";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Navbar />
          <AuthModal />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/search" element={<SearchRedirect />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/event-orchestration" element={<EventOrchestration />} />
            <Route path="/admin" element={<AdminCenter />} />
            <Route path="/admin-dashboard" element={<AdminCenter />} />
            <Route path="/settings" element={<ProfileSettings />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

const SearchRedirect = () => {
  const { user } = useAuth();
  if (user?.userType === "customer") {
    return <Navigate to="/event-orchestration" replace />;
  }
  return <Navigate to="/dashboard" replace />;
};

export default App;
