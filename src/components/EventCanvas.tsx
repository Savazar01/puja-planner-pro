import React, { useState } from "react";
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
  const [intent, setIntent] = useState("");

  return (
    <div className="space-y-8 pb-12">
      {/* Intent Header */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-background to-secondary/20 p-8 border border-primary/20 shadow-xl">
        <div className="relative z-10 max-w-2xl mx-auto text-center space-y-4">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">What's the next chapter of your event?</h2>
          <p className="text-muted-foreground">The AI agents are listening. Type your intent to harvest new event anchors.</p>
          <div className="flex gap-2 p-2 bg-background/80 backdrop-blur rounded-full border border-border shadow-sm">
            <Input 
              placeholder="e.g., 'I want to add a Sattvik caterer for 50 guests in Hyderabad'" 
              className="flex-1 border-none bg-transparent focus-visible:ring-0 text-lg py-6"
              value={intent}
              onChange={(e) => setIntent(e.target.value)}
            />
            <Button size="icon" className="rounded-full h-12 w-12 bg-primary hover:bg-primary/90 transition-all">
              <Plus className="h-6 w-6" />
            </Button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
            {/* Confirmed */}
            <div className="relative pl-12">
              <div className="absolute left-0 mt-1 h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary ring-4 ring-background">
                <CheckCircle2 className="h-6 w-6 text-primary" />
              </div>
              <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 shadow-sm">
                <h4 className="font-semibold text-foreground">Foundation Rooted</h4>
                <p className="text-sm text-muted-foreground">Satyanarayan Puja — Dec 15, 2026</p>
              </div>
            </div>

            {/* Sourcing */}
            <div className="relative pl-12">
              <div className="absolute left-0 mt-1 h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center border-2 border-accent ring-4 ring-background">
                <Search className="h-6 w-6 text-accent-foreground" />
              </div>
              <div className="p-4 rounded-xl border border-accent/20 bg-accent/5 shadow-sm">
                <h4 className="font-semibold text-foreground">Sourcing Practitioners</h4>
                <p className="text-sm text-muted-foreground">Finder Agent is scanning for local Pandits.</p>
              </div>
            </div>

            {/* Action Required */}
            <div className="relative pl-12">
              <div className="absolute left-0 mt-1 h-10 w-10 rounded-full bg-destructive/20 flex items-center justify-center border-2 border-destructive ring-4 ring-background">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/5 shadow-sm animate-pulse">
                <h4 className="font-semibold text-foreground">Action Required</h4>
                <p className="text-sm text-muted-foreground">Assign a caterer to maintain momentum.</p>
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
                   <Card className="border-dashed">
                     <CardHeader>
                       <CardTitle className="text-sm font-semibold uppercase text-muted-foreground tracking-wider">Invitation Status</CardTitle>
                     </CardHeader>
                     <CardContent className="space-y-4">
                       <div className="flex items-center justify-between text-sm">
                         <span>WhatsApp Drafts</span>
                         <Badge variant="secondary">0 Ready</Badge>
                       </div>
                       <Button className="w-full" disabled>Generate Invited Drafts</Button>
                     </CardContent>
                   </Card>
                 </div>
               </SheetContent>
             </Sheet>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="hover:border-primary/50 transition-colors group cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-bold">The Pandit</CardTitle>
                <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <UserCheck className="h-5 w-5 text-primary" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="bg-primary/5 text-primary">Vedic Rituals</Badge>
                  <Badge variant="secondary" className="bg-primary/5 text-primary">Telugu</Badge>
                </div>
                <p className="text-sm text-muted-foreground italic">"Searching for a local Pandit with 10+ years experience..."</p>
                <Button className="w-full gap-2" variant="outline">
                  Refine Search
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            <Card className="hover:border-accent/50 transition-colors group cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-bold">The Caterer</CardTitle>
                <div className="p-2 rounded-lg bg-accent/10 group-hover:bg-accent/20 transition-colors">
                  <Search className="h-5 w-5 text-accent-foreground" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary" className="bg-accent/5 text-accent-foreground">Sattvik</Badge>
                  <Badge variant="secondary" className="bg-accent/5 text-accent-foreground">Traditional</Badge>
                </div>
                <p className="text-sm text-muted-foreground">Assign a caterer to unlock the full menu workspace.</p>
                <Button className="w-full gap-2" variant="outline">
                  Initialize Sourcing
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
};

export default EventCanvas;
