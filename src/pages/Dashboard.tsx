import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Navigate } from "react-router-dom";
import EventCanvas from "@/components/EventCanvas";
import { ShieldAlert } from "lucide-react";

const Dashboard = () => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) return <Navigate to="/" replace />;

  const role = user?.userType?.toString().toLowerCase() || "";
  const isCustomer = role.includes("customer");
  const isAdmin = user?.userType === "ADMIN";

  if (!isCustomer && !isAdmin) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full text-center space-y-6 p-8 rounded-2xl border border-border bg-card">
          <div className="flex justify-center">
            <div className="p-4 rounded-full bg-destructive/10">
              <ShieldAlert className="h-12 w-12 text-destructive" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Access Restricted</h1>
          <p className="text-muted-foreground">
            The Event Canvas is reserved for active Customers. Please contact support if you believe this is an error.
          </p>
          <Button onClick={() => window.location.href = "/"} className="w-full">
            Return to Home
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-16 z-30 transition-all">
        <div className="container mx-auto max-w-7xl px-4 py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">Protected Customer Workspace</h1>
              <p className="mt-2 text-sm text-muted-foreground flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                Live Event Canvas — Synchronized with MyPandits Global Constitution
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 px-3 py-1">
                Role: {user?.userType}
              </Badge>
              <Badge variant="outline" className="bg-accent/5 text-accent-foreground border-accent/20 px-3 py-1 uppercase font-bold tracking-tighter">
                {user?.tier} Member
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-7xl px-4 py-12">
        <EventCanvas />
      </div>
    </main>
  );
};

export default Dashboard;
