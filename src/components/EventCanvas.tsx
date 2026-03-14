import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
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
  Share2,
  MoreVertical,
  Pencil,
  Trash2,
  Users
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const VITE_API_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/$/, '') : "";

const EventCanvas = () => {
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get("id");
  const { token } = useAuth();
  const [intent, setIntent] = useState("");
  const [isEventActive, setIsEventActive] = useState(!!eventId);
  const [eventData, setEventData] = useState<any>(null);
  const [isEditingMetadata, setIsEditingMetadata] = useState(false);
  const [editForm, setEditForm] = useState({ title: "", location: "", date: "", time: "" });
  
  // New modules state (Initially empty for Blank Canvas)
  const [guests, setGuests] = useState<any[]>([]);
  const [supplies, setSupplies] = useState<any[]>([]);
  
  const [newGuest, setNewGuest] = useState({ id: "", name: "", phone: "", memberCount: 1 });
  const [newSupply, setNewSupply] = useState("");
  const [isGuestDialogOpen, setIsGuestDialogOpen] = useState(false);
  const [isSupplyDialogOpen, setIsSupplyDialogOpen] = useState(false);
  const [editingGuestId, setEditingGuestId] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedPartners, setSelectedPartners] = useState<any[]>([]);

  useEffect(() => {
    const fetchEventData = async () => {
      if (eventId) {
        try {
          // 1. Fetch Event Base Details
          const evResponse = await fetch(`${VITE_API_URL}/api/events`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const allEvents = await evResponse.json();
          const currentEvent = allEvents.find((e: any) => e.id === eventId);
          if (currentEvent) {
            setEventData(currentEvent);
            const dt = currentEvent.event_date ? new Date(currentEvent.event_date) : new Date();
            setEditForm({
              title: currentEvent.title,
              location: currentEvent.location || "",
              date: dt.toISOString().split('T')[0],
              time: dt.toTimeString().split(' ')[0].substring(0, 5)
            });
            setSelectedPartners(currentEvent.bookings || []);
            setIsEventActive(true);
          }

          // 2. Sync Modules (Guests & Supplies)
          const [gRes, sRes] = await Promise.all([
            fetch(`${VITE_API_URL}/api/events/${eventId}/guests`, {
              headers: { Authorization: `Bearer ${token}` }
            }),
            fetch(`${VITE_API_URL}/api/events/${eventId}/supplies`, {
              headers: { Authorization: `Bearer ${token}` }
            })
          ]);
          
          if (gRes.ok) setGuests(await gRes.json());
          if (sRes.ok) setSupplies(await sRes.json());
          
        } catch (error) {
          console.error("Failed to fetch event data:", error);
        }
      }
    };
    fetchEventData();
  }, [eventId, token]);


  const handleUpdateMetadata = async () => {
    if (!eventId) return;
    try {
      const combinedDateTime = new Date(`${editForm.date}T${editForm.time}`);
      const response = await fetch(`${VITE_API_URL}/api/events/${eventId}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: editForm.title,
          location: editForm.location,
          event_date: combinedDateTime.toISOString()
        })
      });
      if (response.ok) {
        const updated = await response.json();
        setEventData(updated);
        setIsEditingMetadata(false);
        toast({ title: "Details Updated", description: "Your ritual settings have been saved." });
      }
    } catch (error) {
      console.error("Failed to update metadata:", error);
      toast({ title: "Update Failed", description: "Could not save changes.", variant: "destructive" });
    }
  };

  const handleIntentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (intent.trim()) {
      setIsEventActive(true);
      setIsSearching(true);
      const searchUrl = `${VITE_API_URL}/api/search`;
      try {
        const response = await fetch(searchUrl, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ 
            query: intent, 
            location: "Hyderabad",
            event_id: eventId // Pass existing if available
          })
        });
        
        if (!response.ok) {
           throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        setSearchResults(data.results || []);
        
        // [AGENTIC INSTANTIATION] Capture Draft Event ID and Update URL
        if (data.event_id && data.event_id !== eventId) {
          window.history.replaceState({}, '', `/event-orchestration?id=${data.event_id}`);
          // Force a fresh fetch for the new event context
          window.location.reload(); 
        }
      } catch (error: any) {
        console.error(`Search failed:`, error);
        toast({ 
            title: "Search Error", 
            description: error.message || "Network Error: Could not connect to the AI Agent.", 
            variant: "destructive" 
        });
      } finally {
        setIsSearching(false);
      }
    }
  };

  const selectPartner = async (partner: any, type: string) => {
    if (!eventId) {
      toast({ title: "No Event", description: "Please create an event first." });
      return;
    }
    
    try {
      const response = await fetch(`${VITE_API_URL}/api/events/${eventId}/select`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          partner_id: partner.id,
          partner_type: type,
          is_external: !partner.is_internal,
          partner_data: partner.is_internal ? null : partner
        })
      });
      
      if (response.ok) {
        const updatedEvent = await response.json();
        setSelectedPartners(updatedEvent.bookings);
        toast({ title: "Partner Selected", description: `${partner.name} has been added to your ritual plan.` });
      }
    } catch (error) {
      console.error("Selection failed:", error);
    }
  };

  const addGuest = async () => {
    if (newGuest.name.trim() && newGuest.phone.trim() && eventId) {
      try {
        const response = await fetch(`${VITE_API_URL}/api/events/${eventId}/guests`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            name: newGuest.name,
            phone: newGuest.phone,
            member_count: newGuest.memberCount,
            status: "PENDING"
          })
        });
        
        if (response.ok) {
          const addedGuest = await response.json();
          setGuests(prev => [...prev, addedGuest]);
          toast({ title: "Guest Added", description: `${newGuest.name} has been added to the database.` });
          setNewGuest({ id: "", name: "", phone: "", memberCount: 1 });
          setIsGuestDialogOpen(false);
        }
      } catch (error) {
        console.error("Failed to add guest:", error);
      }
    }
  };

  const removeGuest = async (id: string) => {
    if (!eventId) return;
    try {
      const response = await fetch(`${VITE_API_URL}/api/events/${eventId}/guests/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setGuests(prev => prev.filter(g => g.id !== id));
        toast({ title: "Guest Removed", description: "The guest has been deleted from your list." });
      }
    } catch (error) {
      console.error("Failed to remove guest:", error);
    }
  };

  const openEditGuest = (guest: any) => {
    setNewGuest({ ...guest });
    setEditingGuestId(guest.id);
    setIsGuestDialogOpen(true);
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

  const sendWhatsAppInvite = (guest: any) => {
    const message = `Namaste ${guest.name}! We would be honored to have you join us for our upcoming ritual. Please let us know if your family of ${guest.memberCount} can attend.`;
    const encodedMsg = encodeURIComponent(message);
    const waUrl = `https://wa.me/${guest.phone.replace(/\D/g, '')}?text=${encodedMsg}`;
    window.open(waUrl, "_blank");
  };

  const addSupply = async () => {
    if (newSupply.trim() && eventId) {
      try {
        const response = await fetch(`${VITE_API_URL}/api/events/${eventId}/supplies`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            name: newSupply,
            category: "Essentials",
            completed: false
          })
        });
        
        if (response.ok) {
          const addedSupply = await response.json();
          setSupplies(prev => [...prev, addedSupply]);
          setNewSupply("");
          setIsSupplyDialogOpen(false);
          toast({ title: "Item Added", description: `Added ${newSupply} to your ritual checklist.` });
        }
      } catch (error) {
        console.error("Failed to add supply:", error);
      }
    }
  };


  const currentEventName = eventId ? `Planning: ${eventId}` : "New Event Planning";
  const confirmedInvitations = guests.filter(g => g.status === "Coming").length;
  const totalGuestsComing = guests.filter(g => g.status === "Coming").reduce((acc, g) => acc + (g.memberCount || 1), 0);

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
                    <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 shadow-sm group relative">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-foreground">{eventData?.title || currentEventName}</h4>
                          <p className="text-sm text-muted-foreground uppercase">{intent || "Family Context"}</p>
                          {eventData?.event_date && (
                             <p className="text-xs text-primary/70 mt-1">
                               {new Date(eventData.event_date).toLocaleString()} • {eventData.location}
                             </p>
                          )}
                        </div>
                        <Dialog open={isEditingMetadata} onOpenChange={setIsEditingMetadata}>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Edit Ritual Details</DialogTitle>
                              <CardDescription>Adjust the core anchors of your ceremony.</CardDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                              <div className="grid gap-2">
                                <Label>Ritual Title</Label>
                                <Input value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} />
                              </div>
                              <div className="grid gap-2">
                                <Label>Location</Label>
                                <Input value={editForm.location} onChange={e => setEditForm({...editForm, location: e.target.value})} />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="grid gap-2">
                                  <Label>Date</Label>
                                  <Input type="date" value={editForm.date} onChange={e => setEditForm({...editForm, date: e.target.value})} />
                                </div>
                                <div className="grid gap-2">
                                  <Label>Time</Label>
                                  <Input type="time" value={editForm.time} onChange={e => setEditForm({...editForm, time: e.target.value})} />
                                </div>
                              </div>
                            </div>
                            <DialogFooter>
                              <Button onClick={handleUpdateMetadata}>Save Details</Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </div>

                  <div className="relative pl-12">
                    <div className="absolute left-0 mt-1 h-10 w-10 rounded-full bg-accent/20 flex items-center justify-center border-2 border-accent ring-4 ring-background">
                      <Search className="h-6 w-6 text-accent-foreground" />
                    </div>
                    <div className="p-4 rounded-xl border border-accent/20 bg-accent/5 shadow-sm">
                      <h4 className="font-semibold text-foreground">Sourcing Helpers</h4>
                      <p className="text-sm text-muted-foreground">
                        {selectedPartners.length > 0 ? `${selectedPartners.length} partner(s) aligned.` : "Finding the right people for your ceremony."}
                      </p>
                    </div>
                  </div>

                  {selectedPartners.map((booking, idx) => (
                    <div key={booking.id || idx} className="relative pl-12">
                      <div className="absolute left-0 mt-1 h-10 w-10 rounded-full bg-green-100 flex items-center justify-center border-2 border-green-500 ring-4 ring-background">
                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                      </div>
                      <div className="p-4 rounded-xl border border-green-200 bg-green-50 shadow-sm">
                        <h4 className="font-semibold text-foreground">{booking.partner_data?.name || "Partner Selected"}</h4>
                        <p className="text-sm text-muted-foreground uppercase">{booking.partner_type}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Action Cards */}
              <section className="lg:col-span-2 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold font-display">Planning Space</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {isSearching ? (
                    <div className="col-span-full py-12 flex flex-col items-center justify-center space-y-4">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                      <p className="text-muted-foreground animate-pulse">Agents are scouring the web & internal database...</p>
                    </div>
                  ) : (
                    <>
                      {/* Search Results Display */}
                      {searchResults.length > 0 ? (
                        searchResults.map((partner, idx) => (
                          <Card key={partner.id || idx} className="hover:border-primary/50 transition-all group bg-card overflow-hidden">
                            <CardHeader className="flex flex-row items-start justify-between pb-2">
                              <div className="space-y-1">
                                <CardTitle className="text-lg font-bold flex items-center gap-2">
                                  {partner.name}
                                  {partner.is_platform_member && (
                                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200 gap-1 text-[10px] h-5">
                                      <CheckCircle2 className="h-3 w-3" />
                                      Member ✓
                                    </Badge>
                                  )}
                                </CardTitle>
                                <CardDescription>{partner.location}</CardDescription>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {partner.additional_info?.specialization || partner.additional_info?.venue_type || partner.additional_info?.cuisine_types?.join(", ") || "Available for your ceremony."}
                              </p>
                              <Button 
                                className="w-full gap-2" 
                                variant={selectedPartners.some(b => b.partner_id === partner.id) ? "secondary" : "default"}
                                onClick={() => selectPartner(partner, partner.role || 'SUPPLIER')}
                                disabled={selectedPartners.some(b => b.partner_id === partner.id)}
                              >
                                {selectedPartners.some(b => b.partner_id === partner.id) ? "Selected" : "Select for Ritual"}
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </CardContent>
                          </Card>
                        ))
                      ) : (
                        <>
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
                        </>
                      )}
                    </>
                  )}
                </div>
              </section>
            </div>
          </TabsContent>

          <TabsContent value="guests" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="bg-card">
              <CardHeader className="flex flex-row items-center justify-between border-b border-border mb-6">
                <div>
                  <CardTitle className="text-2xl font-bold">Guest List</CardTitle>
                  <CardDescription>
                    {confirmedInvitations} invitations accepted ({totalGuestsComing} total guests)
                  </CardDescription>
                </div>
                
                <Dialog open={isGuestDialogOpen} onOpenChange={(open) => {
                  setIsGuestDialogOpen(open);
                  if (!open) {
                    setEditingGuestId(null);
                    setNewGuest({ id: "", name: "", phone: "", memberCount: 1 });
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add Guest
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                      <DialogTitle>{editingGuestId ? "Edit Guest" : "Add a Guest"}</DialogTitle>
                      <CardDescription>All fields are required for WhatsApp coordination.</CardDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input id="name" value={newGuest.name} onChange={(e) => setNewGuest({...newGuest, name: e.target.value})} placeholder="e.g. Anil Sharma" />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="phone">WhatsApp Number</Label>
                        <Input id="phone" value={newGuest.phone} onChange={(e) => setNewGuest({...newGuest, phone: e.target.value})} placeholder="e.g. 919876543210" />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="members">Members in Family</Label>
                        <Input id="members" type="number" min="1" value={newGuest.memberCount} onChange={(e) => setNewGuest({...newGuest, memberCount: parseInt(e.target.value) || 1})} />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={addGuest} disabled={!newGuest.name || !newGuest.phone}>
                        {editingGuestId ? "Save Changes" : "Save Guest"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="space-y-4">
                {guests.map((guest: any) => (
                  <div key={guest.id} className="flex items-center justify-between p-4 rounded-xl border border-border bg-background/50 group">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col">
                        <div className="font-bold flex items-center gap-2">
                          {guest.name}
                          <Badge variant="outline" className="text-[10px] h-4 px-1 flex items-center gap-1 border-primary/20">
                            <Users className="h-3 w-3" />
                            {guest.memberCount}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">{guest.phone}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button variant="ghost" size="icon" className="h-9 w-9 text-green-600 hover:bg-green-50" onClick={() => sendWhatsAppInvite(guest)}>
                        <MessageCircle className="h-5 w-5" />
                      </Button>
                      
                      <Badge 
                        variant={guest.status === "Coming" ? "default" : guest.status === "Declined" ? "destructive" : "secondary"}
                        className="cursor-pointer hover:opacity-80 transition-all px-3 py-1 min-w-[100px] text-center justify-center"
                        onClick={() => toggleGuestStatus(guest.id)}
                      >
                        {guest.status}
                      </Badge>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditGuest(guest)} className="gap-2">
                            <Pencil className="h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => removeGuest(guest.id)} className="gap-2 text-destructive">
                            <Trash2 className="h-4 w-4" /> Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
                    <Checkbox id={item.id} checked={item.completed} onCheckedChange={async (checked) => {
                      if (!eventId) return;
                      try {
                        const response = await fetch(`${VITE_API_URL}/api/events/${eventId}/supplies/${item.id}?completed=${!!checked}`, {
                          method: 'PATCH',
                          headers: { 'Authorization': `Bearer ${token}` }
                        });
                        if (response.ok) {
                          setSupplies(prev => prev.map(s => s.id === item.id ? { ...s, completed: !!checked } : s));
                        }
                      } catch (error) {
                        console.error("Failed to toggle supply:", error);
                      }
                    }} />
                    <label htmlFor={item.id} className={`font-medium ${item.completed ? 'line-through text-muted-foreground' : ''}`}>
                      {item.name} {item.quantity ? `(${item.quantity})` : ""}
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
