import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Search, 
  Clock, 
  AlertCircle,
  ChevronRight,
  FileText,
  UserCheck,
  CheckCircle2
} from "lucide-react";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from "@/components/ui/sheet";

const EventCanvas = () => {
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get("id");
  const [intent, setIntent] = useState("");
  const [isEventActive, setIsEventActive] = useState(!!eventId);

  useEffect(() => {
    if (eventId) {
      setIsEventActive(true);
      // In a real app, fetch event data here
      console.log(`Loading context for event: ${eventId}`);
    }
  }, [eventId]);

  const handleIntentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (intent.trim()) {
      setIsEventActive(true);
    }
  };

  const currentEventName = eventId ? `Event #${eventId}` : "New Orchestration";

  return (
    <div className="space-y-8 pb-12">
      {/* Intent Header */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-background to-secondary/20 p-8 border border-primary/20 shadow-xl">
        <div className="relative z-10 max-w-2xl mx-auto text-center space-y-4">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">What's the next chapter of your event?</h2>
          <p className="text-muted-foreground">The AI agents are listening. Type your intent to harvest new event anchors.</p>
          <form onSubmit={handleIntentSubmit} className="flex gap-2 p-2 bg-background/80 backdrop-blur rounded-full border border-primary/20 shadow-sm focus-within:ring-2 ring-primary/20 transition-all">
            <Input 
              placeholder="e.g., 'I want to add a Sattvik caterer for 50 guests in Hyderabad'" 
              className="flex-1 border-none bg-transparent focus-visible:ring-0 text-lg py-6"
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
            />
            <Button type="submit" size="icon" className="rounded-full h-12 w-12 bg-primary hover:bg-primary/90 transition-all">
              <Plus className="h-6 w-6" />
            </Button>
          </form>
        </div>
      </section>

      {!isEventActive ? (
        <section className="py-20 text-center space-y-6">
          <div className="mx-auto w-24 h-24 rounded-full bg-primary/5 flex items-center justify-center border-2 border-dashed border-primary/20">
            <Plus className="h-10 w-10 text-primary/40" />
          </div>
          <div className="space-y-2">
            <h3 className="text-2xl font-bold">Your Canvas is Ready</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Describe your first ritual or logistics need in the intent bar above to begin harvesting orchestration anchors.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3 pt-4">
             {["Plan a Mundan", "Hire a Pandit", "Sattvik Catering"].map((tag) => (
               <Badge key={tag} variant="secondary" className="cursor-pointer hover:bg-primary/10 transition-colors" onClick={() => setIntent(tag)}>
                 {tag}
               </Badge>
             ))}
          </div>
        </section>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
          {/* Event Pulse - Vertical Timeline */}
          <section className="lg:col-span-1 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Event Pulse
              </h3>
              <Badge variant="outline" className="text-xs">Harvesting Mode</Badge>
            </div>
            
            <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-primary/50 before:via-border/50 before:to-transparent">
              {/* Confirmed - Dynamic Placeholder */}
              <div className="relative pl-12">
                <div className="absolute left-0 mt-1 h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary ring-4 ring-background">
                  <CheckCircle2 className="h-6 w-6 text-primary" />
                </div>
                <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 shadow-sm">
                  <h4 className="font-semibold text-foreground">{currentEventName}</h4>
                  <p className="text-sm text-muted-foreground uppercase">{intent || "Active Context"}</p>
                </div>
              </div>

              {/* Sourcing */}
              <div className="relative pl-12">
                <div className="absolute left-0 mt-1 h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center border-2 border-accent ring-4 ring-background">
                  <Search className="h-6 w-6 text-accent-foreground" />
                </div>
                <div className="p-4 rounded-xl border border-accent/20 bg-accent/5 shadow-sm">
                  <h4 className="font-semibold text-foreground">Sourcing Practitioners</h4>
                  <p className="text-sm text-muted-foreground">Finder Agent is scanning for leads matching intent.</p>
                </div>
              </div>

              {/* Action Required */}
              <div className="relative pl-12">
                <div className="absolute left-0 mt-1 h-10 w-10 rounded-full bg-destructive/20 flex items-center justify-center border-2 border-destructive ring-4 ring-background">
                  <AlertCircle className="h-6 w-6 text-destructive" />
                </div>
                <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/5 shadow-sm animate-pulse text-destructive">
                  <h4 className="font-semibold">Action Required</h4>
                  <p className="text-sm">Finalize ritual details to unlock agents.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Agentic Action Cards */}
          <section className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold">Agentic Workspace</h3>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <FileText className="h-4 w-4" />
                    Scribe Preview
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[400px] sm:w-[540px] bg-background/95 backdrop-blur">
                  <SheetHeader>
                    <SheetTitle className="text-2xl font-bold flex items-center gap-2">
                      <FileText className="h-6 w-6 text-primary" />
                      Scribe Workspace
                    </SheetTitle>
                  </SheetHeader>
                  <div className="mt-8 space-y-6">
                    <Card className="border-dashed">
                      <CardHeader>
                        <CardTitle className="text-sm font-semibold uppercase text-muted-foreground tracking-wider">Event Website</CardTitle>
                      </CardHeader>
                      <CardContent className="h-48 flex items-center justify-center bg-muted/30 rounded-lg">
                        <p className="text-sm text-muted-foreground">No content harvested yet.</p>
                      </CardContent>
                    </Card>
                    <div className="flex justify-end">
                       <Button variant="secondary" className="gap-2" disabled>
                         <Search className="h-4 w-4" />
                         Trigger Multi-Agent Sourcing
                       </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="hover:border-primary/50 transition-colors group cursor-pointer border-dashed bg-muted/20">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-lg font-bold text-muted-foreground">The Pandit</CardTitle>
                  <div className="p-2 rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
                    <UserCheck className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground italic">Waiting for specific ritual anchors...</p>
                </CardContent>
              </Card>

              <Card className="hover:border-accent/50 transition-colors group cursor-pointer border-dashed bg-muted/20">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-lg font-bold text-muted-foreground">The Caterer</CardTitle>
                  <div className="p-2 rounded-lg bg-muted group-hover:bg-accent/10 transition-colors">
                    <Search className="h-5 w-5 text-muted-foreground group-hover:text-accent-foreground transition-colors" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground italic">Connect supply chain via intent...</p>
                </CardContent>
              </Card>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default EventCanvas;
