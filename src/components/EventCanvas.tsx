import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  CheckCircle2,
  MessageCircle,
  Share2
} from "lucide-react";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from "@/components/ui/sheet";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";

const EventCanvas = () => {
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get("id");
  const [intent, setIntent] = useState("");
  const [isEventActive, setIsEventActive] = useState(!!eventId);
  
  // New modules state
  const [guests, setGuests] = useState([
    { id: "g1", name: "Anil Sharma", status: "Coming" },
    { id: "g2", name: "Meena Gupta", status: "Not yet responded" },
    { id: "g3", name: "Rahul V.", status: "Coming" }
  ]);
  
  const [supplies, setSupplies] = useState([
    { id: "s1", name: "Puja Thali", completed: true },
    { id: "s2", name: "Fresh Flowers", completed: false },
    { id: "s3", name: "Coconuts (2)", completed: false },
    { id: "s4", name: "Red Cloth", completed: true }
  ]);
  
  const [newGuest, setNewGuest] = useState({ name: "", phone: "" });
  const [newSupply, setNewSupply] = useState("");
  const [isGuestDialogOpen, setIsGuestDialogOpen] = useState(false);
  const [isSupplyDialogOpen, setIsSupplyDialogOpen] = useState(false);

  useEffect(() => {
    if (eventId) {
      setIsEventActive(true);
    }
  }, [eventId]);

  const handleIntentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (intent.trim()) {
      setIsEventActive(true);
    }
  };

  const addGuest = () => {
    if (newGuest.name.trim()) {
      setGuests(prev => [...prev, { id: `g${Date.now()}`, name: newGuest.name, status: "Not yet responded" }]);
      setNewGuest({ name: "", phone: "" });
      setIsGuestDialogOpen(false);
      toast({ title: "Guest Added", description: `${newGuest.name} has been added to your planning list.` });
    }
  };

  const toggleGuestStatus = (id: string) => {
    const statuses = ["Coming", "Not yet responded", "Declined"];
    setGuests(prev => prev.map(g => {
      if (g.id === id) {
        const nextIdx = (statuses.indexOf(g.status) + 1) % statuses.length;
        return { ...g, status: statuses[nextIdx] as any };
      }
      return g;
    }));
  };

  const sendWhatsAppInvite = (guestName: string, phone: string = "") => {
    const message = `Namaste ${guestName}! We would be honored to have you join us for our upcoming ritual. Please let us know if you can attend.`;
    const encodedMsg = encodeURIComponent(message);
    const waUrl = phone ? `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodedMsg}` : `https://wa.me/?text=${encodedMsg}`;
    window.open(waUrl, "_blank");
  };

  const addSupply = () => {
    if (newSupply.trim()) {
      setSupplies(prev => [...prev, { id: `s${Date.now()}`, name: newSupply, completed: false }]);
      setNewSupply("");
      setIsSupplyDialogOpen(false);
      toast({ title: "Item Added", description: `Added ${newSupply} to your ritual supplies.` });
    }
  };

  const currentEventName = eventId ? `Planning: ${eventId}` : "New Event Planning";
  const confirmedGuests = guests.filter(g => g.status === "Coming").length;

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
            <h3 className="text-2xl font-bold">Ready to plan your ritual?</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Tell your assistant what you need (like a Pandit or Catering) to start planning your family's special day.
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
        <Tabs defaultValue="planning" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8 bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="planning" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">Planning</TabsTrigger>
            <TabsTrigger value="guests" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">Guests</TabsTrigger>
            <TabsTrigger value="supplies" className="rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">Supplies</TabsTrigger>
          </TabsList>

          <TabsContent value="planning" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Timeline Section */}
              <section className="lg:col-span-1 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    Updates
                  </h3>
                  <Badge variant="outline" className="text-xs">Preparing</Badge>
                </div>
                
                <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-primary/50 before:via-border/50 before:to-transparent">
                  <div className="relative pl-12">
                    <div className="absolute left-0 mt-1 h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary ring-4 ring-background">
                      <CheckCircle2 className="h-6 w-6 text-primary" />
                    </div>
                    <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 shadow-sm">
                      <h4 className="font-semibold text-foreground">{currentEventName}</h4>
                      <p className="text-sm text-muted-foreground uppercase">{intent || "Family Context"}</p>
                    </div>
                  </div>

                  <div className="relative pl-12">
                    <div className="absolute left-0 mt-1 h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center border-2 border-accent ring-4 ring-background">
                      <Search className="h-6 w-6 text-accent-foreground" />
                    </div>
                    <div className="p-4 rounded-xl border border-accent/20 bg-accent/5 shadow-sm">
                      <h4 className="font-semibold text-foreground">Sourcing Helpers</h4>
                      <p className="text-sm text-muted-foreground">Finding the right people for your ceremony.</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Action Cards */}
              <section className="lg:col-span-2 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold font-display">Planning Space</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="hover:border-primary/50 transition-colors group cursor-pointer bg-card">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-lg font-bold">The Pandit</CardTitle>
                      <UserCheck className="h-5 w-5 text-primary" />
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">Looking for a priest who fits your traditions...</p>
                    </CardContent>
                  </Card>

                  <Card className="hover:border-accent/50 transition-colors group cursor-pointer bg-card">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-lg font-bold">The Help</CardTitle>
                      <Search className="h-5 w-5 text-accent-foreground" />
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">Connecting with caterers and decorators...</p>
                    </CardContent>
                  </Card>
                </div>
              </section>
            </div>
          </TabsContent>

          <TabsContent value="guests" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="bg-card">
              <CardHeader className="flex flex-row items-center justify-between border-b border-border mb-6">
                <div>
                  <CardTitle className="text-2xl font-bold">Guest List</CardTitle>
                  <CardDescription>{confirmedGuests} of {guests.length} guests are coming</CardDescription>
                </div>
                
                <Dialog open={isGuestDialogOpen} onOpenChange={setIsGuestDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      Invite Guests
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Invite a Guest</DialogTitle>
                      <CardDescription>Add someone you'd like to join your ritual.</CardDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" value={newGuest.name} onChange={(e) => setNewGuest({...newGuest, name: e.target.value})} placeholder="e.g. Anil Sharma" />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="phone">Phone (Optional for WhatsApp)</Label>
                        <Input id="phone" value={newGuest.phone} onChange={(e) => setNewGuest({...newGuest, phone: e.target.value})} placeholder="e.g. 9876543210" />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={addGuest}>Add to List</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="space-y-4">
                {guests.map((guest: any) => (
                  <div key={guest.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-background/50 group">
                    <div className="flex items-center gap-4">
                      <div className="font-medium">{guest.name}</div>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:bg-green-50 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => sendWhatsAppInvite(guest.name)}>
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={guest.status === "Coming" ? "default" : guest.status === "Declined" ? "destructive" : "secondary"}
                        className="cursor-pointer hover:opacity-80 transition-all px-3 py-1"
                        onClick={() => toggleGuestStatus(guest.id)}
                      >
                        {guest.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="supplies" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="bg-card">
              <CardHeader className="flex flex-row items-center justify-between border-b border-border mb-6">
                <div>
                  <CardTitle className="text-2xl font-bold">Ritual Supplies</CardTitle>
                  <CardDescription>Items needed for your ceremony</CardDescription>
                </div>
                
                <Dialog open={isSupplyDialogOpen} onOpenChange={setIsSupplyDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add Item
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>Add Ritual Supply</DialogTitle>
                      <CardDescription>What's missing for the ceremony?</CardDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="supply">Item Name</Label>
                        <Input id="supply" value={newSupply} onChange={(e) => setNewSupply(e.target.value)} placeholder="e.g. Pure Ghee, Coconuts" />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={addSupply}>Add to Checklist</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="space-y-4">
                {supplies.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 p-4 rounded-xl border border-border bg-background/50">
                    <Checkbox id={item.id} checked={item.completed} onCheckedChange={(checked) => {
                      setSupplies(prev => prev.map(s => s.id === item.id ? { ...s, completed: !!checked } : s));
                    }} />
                    <label htmlFor={item.id} className={`font-medium ${item.completed ? 'line-through text-muted-foreground' : ''}`}>
                      {item.name}
                    </label>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default EventCanvas;
