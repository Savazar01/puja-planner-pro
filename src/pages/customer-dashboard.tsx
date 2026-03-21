import React, { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Carousel } from "@/components/ui/carousel";
import {
  Calendar,
  Clock,
  Archive,
  Trash2,
  ExternalLink,
  Plus,
  LayoutDashboard,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { Link, Navigate } from "react-router-dom";

const VITE_API_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/$/, '') : "";

interface UserEvent {
  id: string;
  title: string;
  event_date: string;
  status: "active" | "archived" | "completed" | "DRAFT" | "PLANNING";
  location: string;
  type?: string; // Optional fallback
}

const CustomerDashboard = () => {
  const { user, isAuthenticated, isLoading, token } = useAuth();

  // State for user-generated events (no mock data)
  const [events, setEvents] = useState<UserEvent[]>([]);
  const [isFetching, setIsFetching] = useState(true);

  React.useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch(`${VITE_API_URL}/api/events`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setEvents(data);
        }
      } catch (error) {
        console.error("Failed to fetch events:", error);
      } finally {
        setIsFetching(false);
      }
    };
    if (isAuthenticated) fetchEvents();
  }, [isAuthenticated]);

  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (user?.userType !== "customer" && !user?.isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const activeEvents = events.filter(e => ["active", "DRAFT", "PLANNING"].includes(e.status));
  const archivedEvents = events.filter(e => e.status === "archived");

  const handleDelete = (id: string) => {
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  const handleArchive = (id: string) => {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, status: "archived" } : e));
  };

  return (
    <main className="min-h-screen bg-background pb-20">
      {/* Header Section */}
      <div className="border-b border-border bg-card/50 backdrop-blur-md sticky top-16 z-30">
        <div className="container mx-auto max-w-7xl px-4 py-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-foreground md:text-4xl">My Dashboard</h1>
            <p className="mt-2 text-sm text-muted-foreground">Manage your upcoming rituals and family events.</p>
          </div>
          <Link to="/event-orchestration">
            <Button className="gap-2 shadow-lg shadow-primary/20">
              <Plus className="h-5 w-5" />
              Plan a Ritual
            </Button>
          </Link>
        </div>
      </div>

      <div className="container mx-auto max-w-7xl px-4 py-12 space-y-12">
        {/* Analytics Stats */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: "My Events", value: events.length, icon: Calendar, color: "text-blue-500" },
            { label: "Planned Rituals", value: activeEvents.length, icon: Clock, color: "text-amber-500" },
            { label: "Things to Do", value: 3, icon: AlertCircle, color: "text-red-500" },
            { label: "Completed", value: 1, icon: CheckCircle2, color: "text-green-500" },
          ].map((stat, i) => (
            <Card key={i} className="bg-card/40 border-primary/10">
              <CardContent className="p-6 flex items-center gap-4">
                <div className={`p-3 rounded-xl bg-background border border-border`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        {/* Active Events Grid */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Clock className="h-6 w-6 text-primary" />
              My Events
            </h2>
            <Badge variant="secondary">{activeEvents.length} Planning</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isFetching ? (
              <div className="col-span-full py-20 flex flex-col items-center justify-center space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                <p className="text-muted-foreground">Retrieving your ritual canvas...</p>
              </div>
            ) : (
              <>
                {activeEvents.map((event) => (
                  <Card key={event.id} className="group hover:border-primary/40 transition-all hover:shadow-xl hover:shadow-primary/5">
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <Badge variant="outline" className="capitalize">{event.type || event.status}</Badge>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-amber-500" onClick={() => handleArchive(event.id)}>
                            <Archive className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(event.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <CardTitle className="text-xl mt-2">{event.title}</CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        {new Date(event.event_date).toLocaleDateString()} • {event.location}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Link to={`/event-orchestration?id=${event.id}`}>
                        <Button className="w-full gap-2 variant-outline group/btn border-primary/20 hover:bg-primary/5">
                          Plan your ritual
                          <ExternalLink className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
                {activeEvents.length === 0 && (
                  <Card className="col-span-full border-dashed py-20 bg-muted/20">
                    <CardContent className="flex flex-col items-center justify-center text-center space-y-4">
                      <LayoutDashboard className="h-12 w-12 text-muted-foreground/30" />
                      <div className="space-y-1">
                        <p className="font-semibold text-lg">Your Canvas is Ready</p>
                        <p className="text-sm text-muted-foreground">You haven't planned any rituals yet. Let's start one!</p>
                        <Link to="/event-orchestration" className="inline-block mt-4">
                          <Button size="lg" className="gap-2">
                            <Plus className="h-5 w-5" />
                            Plan a Ritual
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </section>

        {/* History / Archive */}
        {archivedEvents.length > 0 && (
          <section className="space-y-6 pt-12 border-t border-border">
            <h2 className="text-xl font-bold text-muted-foreground flex items-center gap-2">
              <Archive className="h-5 w-5" />
              Recent Archives
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 opacity-70">
              {archivedEvents.map((event) => (
                <Card key={event.id} className="bg-muted/10">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm">{event.title}</p>
                      <p className="text-xs text-muted-foreground">{event.type || event.status}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(event.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
};

export default CustomerDashboard;
