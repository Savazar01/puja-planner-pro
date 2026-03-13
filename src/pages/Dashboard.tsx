import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { mockGuests, mockChecklist, type Guest, type ChecklistItem } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarCheck, Users, ShoppingBag, Plus, Send, MessageCircle, Lock } from "lucide-react";
import { Navigate } from "react-router-dom";

const statusColors: Record<Guest["status"], string> = {
  accepted: "bg-primary/10 text-primary",
  sent: "bg-accent/20 text-accent-foreground",
  pending: "bg-muted text-muted-foreground",
  declined: "bg-destructive/10 text-destructive",
};

const Dashboard = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newGuestName, setNewGuestName] = useState("");
  const [newGuestPhone, setNewGuestPhone] = useState("");

  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/" replace />;
  
  // Redirect customers to their dedicated workspace
  if (user?.isAdmin) {
    // Admin stays here or goes to admin-dashboard
  } else if (user?.userType === "customer") {
    return <Navigate to="/event-orchestration" replace />;
  }

  const tierAllowsGuests = user?.tier === "gold" || user?.tier === "platinum";

  const toggleChecklistItem = (id: string) => {
    setChecklist((prev) => prev.map((item) => (item.id === id ? { ...item, completed: !item.completed } : item)));
  };

  const addGuest = () => {
    if (!newGuestName.trim()) return;
    const newGuest: Guest = {
      id: String(Date.now()),
      name: newGuestName,
      phone: newGuestPhone,
      email: "",
      status: "pending",
      invitedVia: "whatsapp",
    };
    setGuests((prev) => [...prev, newGuest]);
    setNewGuestName("");
    setNewGuestPhone("");
  };

  const completedCount = checklist.filter((c) => c.completed).length;
  const categories = [...new Set(checklist.map((c) => c.category))];

  const hasData = guests.length > 0 || checklist.length > 0;

  return (
    <main className="min-h-screen bg-background">
      <div className="border-b border-border bg-card px-4 py-6">
        <div className="container mx-auto max-w-5xl">
          <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">Legacy Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your event logistics and coordination.</p>
        </div>
      </div>

      <div className="container mx-auto max-w-5xl px-4 py-8">
        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{guests.length}</p>
                <p className="text-sm text-muted-foreground">Guests</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/20">
                <CalendarCheck className="h-6 w-6 text-accent-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{guests.filter((g) => g.status === "accepted").length}</p>
                <p className="text-sm text-muted-foreground">RSVPs Confirmed</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary">
                <ShoppingBag className="h-6 w-6 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{checklist.length > 0 ? `${completedCount}/${checklist.length}` : "0"}</p>
                <p className="text-sm text-muted-foreground">Supplies Ready</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {!hasData && (
          <Card className="mt-8 border-dashed bg-muted/20">
            <CardContent className="py-20 text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <CalendarCheck className="h-8 w-8 text-muted-foreground/40" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold">No Active Events</h3>
                <p className="text-sm text-muted-foreground">Once you create an event via the Event Canvas, your summaries will appear here.</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="guests" className="mt-8">
          <TabsList className="bg-secondary">
            <TabsTrigger value="guests" className="gap-1.5"><Users className="h-4 w-4" />Guests</TabsTrigger>
            <TabsTrigger value="checklist" className="gap-1.5"><ShoppingBag className="h-4 w-4" />Checklist</TabsTrigger>
          </TabsList>

          <TabsContent value="guests" className="mt-6">
            {!tierAllowsGuests ? (
              <Card>
                <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
                  <Lock className="h-12 w-12 text-muted-foreground/40" />
                  <h3 className="font-display text-xl font-semibold text-foreground">Guest Management is a Gold feature</h3>
                  <p className="max-w-sm text-sm text-muted-foreground">Upgrade to Gold to manage guests, send WhatsApp invitations, and track RSVPs.</p>
                  <Button className="mt-2">Upgrade to Gold</Button>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="font-display text-lg">Guest List</CardTitle>
                  <Button size="sm" variant="outline" className="gap-1.5"><Send className="h-3.5 w-3.5" />Send All Invites</Button>
                </CardHeader>
                <CardContent>
                  <div className="mb-4 flex gap-2">
                    <Input placeholder="Guest name" value={newGuestName} onChange={(e) => setNewGuestName(e.target.value)} className="max-w-[200px]" />
                    <Input placeholder="Phone number" value={newGuestPhone} onChange={(e) => setNewGuestPhone(e.target.value)} className="max-w-[200px]" />
                    <Button onClick={addGuest} size="sm" className="gap-1"><Plus className="h-4 w-4" />Add</Button>
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Via</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {guests.map((guest) => (
                          <TableRow key={guest.id}>
                            <TableCell className="font-medium">{guest.name}</TableCell>
                            <TableCell className="text-muted-foreground">{guest.phone}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className={statusColors[guest.status]}>{guest.status}</Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">{guest.invitedVia}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button size="sm" variant="ghost" className="gap-1">
                                <MessageCircle className="h-3.5 w-3.5" />WhatsApp
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="checklist" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-lg">Samagri / Supplies Checklist</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {categories.map((cat) => (
                  <div key={cat}>
                    <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">{cat}</h4>
                    <div className="space-y-2">
                      {checklist
                        .filter((item) => item.category === cat)
                        .map((item) => (
                          <label
                            key={item.id}
                            className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-secondary/50"
                          >
                            <Checkbox checked={item.completed} onCheckedChange={() => toggleChecklistItem(item.id)} />
                            <span className={`flex-1 text-sm ${item.completed ? "text-muted-foreground line-through" : "text-foreground"}`}>
                              {item.name}
                            </span>
                            {item.quantity && <span className="text-xs text-muted-foreground">{item.quantity}</span>}
                          </label>
                        ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
};

export default Dashboard;
