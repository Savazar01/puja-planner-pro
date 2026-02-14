import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { mockPandits, mockTemples } from "@/data/mockData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Search, Star, MapPin, CheckCircle, Phone, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const { isAuthenticated, searchCount, incrementSearch, login, showAuthModal, setShowAuthModal } = useAuth();

  const needsAuth = !isAuthenticated && searchCount >= 1;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) incrementSearch();
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="border-b border-border bg-card px-4 py-6">
        <div className="container mx-auto max-w-4xl">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search Pandits, ceremonies, temples..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-11 pl-10"
              />
            </div>
            <Button type="submit" className="h-11">Search</Button>
          </form>
        </div>
      </div>

      <div className="container mx-auto max-w-4xl px-4 py-8">
        <h2 className="font-display text-2xl font-bold text-foreground">
          {initialQuery ? `Results for "${initialQuery}"` : "Browse Pandits & Temples"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{mockPandits.length + mockTemples.length} results found</p>

        {/* Pandits */}
        <div className="mt-8">
          <h3 className="mb-4 font-display text-lg font-semibold text-foreground">Pandits</h3>
          <div className="relative space-y-4">
            {mockPandits.map((pandit, i) => (
              <motion.div
                key={pandit.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-border bg-card p-5 shadow-card transition-shadow hover:shadow-elevated"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-display text-lg font-semibold text-foreground">{pandit.name}</h4>
                      {pandit.verified && (
                        <Badge variant="secondary" className="gap-1 text-xs">
                          <CheckCircle className="h-3 w-3 text-primary" /> Verified
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{pandit.specialization}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{pandit.location}</span>
                      <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 text-accent" />{pandit.rating} ({pandit.reviews})</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {pandit.languages.map((l) => (
                        <Badge key={l} variant="outline" className="text-xs">{l}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-sm font-semibold text-foreground">{pandit.priceRange}</span>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="gap-1.5">
                        <Phone className="h-3.5 w-3.5" /> Call
                      </Button>
                      <Button size="sm" className="gap-1.5">
                        <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Blur overlay for auth gating */}
            {needsAuth && (
              <div className="absolute inset-0 top-[200px] flex items-start justify-center rounded-xl bg-background/60 pt-16 backdrop-blur-md">
                <div className="rounded-xl bg-card p-8 text-center shadow-elevated">
                  <h3 className="font-display text-xl font-semibold text-foreground">Sign in to see more</h3>
                  <p className="mt-2 text-sm text-muted-foreground">Create a free account to view contact details and more results.</p>
                  <Button onClick={() => setShowAuthModal(true)} className="mt-4 gap-2">
                    Sign in with Google
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Temples */}
        <div className="mt-12">
          <h3 className="mb-4 font-display text-lg font-semibold text-foreground">Temples & Events</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {mockTemples.map((temple, i) => (
              <motion.div
                key={temple.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-border bg-card p-5 shadow-card"
              >
                <div className="flex items-center gap-2">
                  <h4 className="font-display font-semibold text-foreground">{temple.name}</h4>
                  {temple.verified && <CheckCircle className="h-4 w-4 text-primary" />}
                </div>
                <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />{temple.location}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">Deity: {temple.deity}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {temple.events.map((e) => (
                    <Badge key={e} variant="outline" className="text-xs">{e}</Badge>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      <Dialog open={showAuthModal} onOpenChange={setShowAuthModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Sign in to MyPandits</DialogTitle>
            <DialogDescription>Access verified contacts, manage events, and plan ceremonies.</DialogDescription>
          </DialogHeader>
          <Button onClick={login} className="mt-4 w-full gap-2" size="lg">
            <svg className="h-5 w-5" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Sign in with Google
          </Button>
        </DialogContent>
      </Dialog>
    </main>
  );
};

export default SearchResults;
