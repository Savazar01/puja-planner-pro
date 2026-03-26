import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { searchAll } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Star, MapPin, CheckCircle, Phone, MessageCircle, Loader2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

const SearchResults = () => {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const { isAuthenticated, searchCount, incrementSearch, login, showAuthModal, setShowAuthModal, token } = useAuth();

  const needsAuth = !isAuthenticated && searchCount >= 1;

  // Fetch data from backend API
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["search", initialQuery, token],
    queryFn: () => searchAll(initialQuery, undefined, token || undefined),
    enabled: !!initialQuery,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) incrementSearch();
    if (query.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(query)}`;
    }
  };

  // Standardized result extraction
  const results = data?.results || [];
  const pandits = results.filter(r => r.user_type === "PANDIT");
  const otherProviders = results.filter(r => r.user_type !== "PANDIT");

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

        {/* Loading State */}
        {isLoading && (
          <div className="mt-8 flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">Discovering results...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="mt-8 rounded-xl border border-destructive/50 bg-destructive/10 p-6 text-center">
            {error.message === "limit_reached" ? (
              <>
                <AlertCircle className="mx-auto h-8 w-8 text-primary" />
                <h3 className="mt-3 font-semibold text-foreground">Search Limit Reached</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Guests are limited to 3 searches per day. Please create a free account to continue searching.
                </p>
                <Button onClick={() => setShowAuthModal(true)} className="mt-4">Register Now</Button>
              </>
            ) : (
              <>
                <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
                <h3 className="mt-3 font-semibold text-foreground">Unable to fetch results</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {error instanceof Error ? error.message : "Please try again later"}
                </p>
                <Button onClick={() => refetch()} className="mt-4">Retry</Button>
              </>
            )}
          </div>
        )}

        {/* Results */}
        {!isLoading && !error && data && (
          <>
            <p className="mt-1 text-sm text-muted-foreground">
              {data.total_results} results found {data.cached && "(cached)"}
            </p>

            {/* Pandits */}
            <div className="mt-8">
              <h3 className="mb-4 font-display text-lg font-semibold text-foreground">Pandits</h3>
              <div className="relative space-y-4">
                {pandits.map((pandit, i) => (
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
                          <h4 className="font-display text-lg font-semibold text-foreground">{pandit.full_name}</h4>
                          {pandit.is_platform_member && (
                            <Badge variant="secondary" className="gap-1 text-xs">
                              <CheckCircle className="h-3 w-3 text-primary" /> Verified
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {pandit.additional_info?.specialization || "Professional Pandit"}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{pandit.location}</span>
                          <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 text-accent" />{pandit.rating || 5.0}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="text-sm font-semibold text-foreground">{pandit.additional_info?.price_range || "Contact for Quote"}</span>
                        <div className="flex gap-2">
                          {pandit.phone_number && (
                            <a href={`tel:${pandit.phone_number}`} className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 gap-1.5" style={{ borderColor: 'hsl(var(--phone-blue))', color: 'hsl(var(--phone-blue))' }}>
                              <Phone className="h-3.5 w-3.5" /> Call
                            </a>
                          )}
                          {pandit.phone_number && pandit.whatsapp_enabled !== false && (
                            <a
                              href={`https://wa.me/${pandit.phone_number.replace(/\D/g, '')}?text=${encodeURIComponent(`Namaste! I am planning a ${initialQuery || 'Puja ceremony'} and found your profile on SavazAI. Are you available?`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-3 gap-1.5"
                              style={{ backgroundColor: 'hsl(var(--whatsapp))' }}
                            >
                              <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                            </a>
                          )}
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

            {/* Temples/Venues */}
            <div className="mt-12">
              <h3 className="mb-4 font-display text-lg font-semibold text-foreground">Location Managers & Other Providers</h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {otherProviders.map((provider, i) => (
                  <motion.div
                    key={provider.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="rounded-xl border border-border bg-card p-5 shadow-card"
                  >
                    <div className="flex items-center gap-2">
                      <h4 className="font-display font-semibold text-foreground">{provider.full_name}</h4>
                      {provider.is_platform_member && <CheckCircle className="h-4 w-4 text-primary" />}
                    </div>
                    <Badge variant="outline" className="mt-2 text-[10px] uppercase">{provider.user_type}</Badge>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {provider.phone_number && (
                        <a href={`tel:${provider.phone_number}`} className="inline-flex items-center justify-center rounded-md text-xs font-medium border border-input bg-background hover:bg-accent h-8 px-2.5 gap-1.5" style={{ borderColor: 'hsl(var(--phone-blue))', color: 'hsl(var(--phone-blue))' }}>
                          <Phone className="h-3 w-3" /> Call
                        </a>
                      )}
                      {provider.phone_number && provider.whatsapp_enabled !== false && (
                        <a
                          href={`https://wa.me/${provider.phone_number.replace(/\D/g, '')}?text=${encodeURIComponent(`Namaste! I am coordinating a Puja via SavazAI and would like to connect.`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center rounded-md text-xs font-medium text-white h-8 px-2.5 gap-1.5"
                          style={{ backgroundColor: 'hsl(var(--whatsapp))' }}
                        >
                          <MessageCircle className="h-3 w-3" /> WhatsApp
                        </a>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

    </main>
  );
};

export default SearchResults;
