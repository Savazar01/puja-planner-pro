import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Check, X, Search, Users, MapPin, CalendarCheck, Star, Phone, MessageCircle, ShoppingBag } from "lucide-react";
import { pricingTiers } from "@/data/mockData";
import { motion } from "framer-motion";
import logo from "@/assets/logo.png";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5 } }),
};

const HeroSection = () => {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  return (
    <section className="relative overflow-hidden bg-gradient-hero px-4 py-24 text-primary-foreground md:py-32">
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
      <div className="container relative mx-auto max-w-4xl text-center">
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="font-display text-3xl font-bold leading-tight md:text-5xl lg:text-6xl"
        >
          Everything you need for your{" "}
          <span className="text-gradient-saffron">Puja</span> or{" "}
          <span className="text-gradient-saffron">Wedding</span>.
          <br />
          In one place.
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="mx-auto mt-6 max-w-2xl text-lg opacity-80"
        >
          Find verified Pandits, book temples, manage guests, and coordinate every detail — all from one platform.
        </motion.p>
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          onSubmit={handleSearch}
          className="mx-auto mt-10 flex max-w-xl gap-2"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search Pandits, ceremonies, temples..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-12 rounded-lg border-none bg-card pl-10 text-foreground shadow-elevated"
            />
          </div>
          <Button type="submit" size="lg" className="h-12 rounded-lg px-8">
            Search
          </Button>
        </motion.form>
      </div>
    </section>
  );
};

const ValueProps = () => {
  const items = [
    { icon: Phone, title: "Verified Contacts", desc: "No more phone tag. Connect directly with verified Pandits and service providers." },
    { icon: MapPin, title: "Real-time Discovery", desc: "AI finds local temple events, Pandits, and services near you instantly." },
    { icon: CalendarCheck, title: "End-to-End Coordination", desc: "Manage guests, checklists, and vendors all from a single dashboard." },
  ];
  return (
    <section className="bg-gradient-warm px-4 py-20">
      <div className="container mx-auto max-w-5xl">
        <h2 className="text-center font-display text-3xl font-bold text-foreground md:text-4xl">
          Why families choose MyPandits
        </h2>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {items.map((item, i) => (
            <motion.div
              key={item.title}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className="rounded-xl bg-card p-8 text-center shadow-card transition-shadow hover:shadow-elevated"
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <item.icon className="h-7 w-7 text-primary" />
              </div>
              <h3 className="mt-5 font-display text-xl font-semibold text-foreground">{item.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const ServiceGrid = () => {
  const tabs = [
    { value: "pandits", label: "Pandits", icon: Users, items: ["Satyanarayan Puja", "Griha Pravesh", "Wedding Ceremonies", "Mundan Ceremony", "Havan & Yagna"] },
    { value: "temples", label: "Temples", icon: MapPin, items: ["Ganesh Temple", "ISKCON", "Shiva Mandir", "Ram Mandir", "Local Events"] },
    { value: "catering", label: "Catering", icon: ShoppingBag, items: ["Prasad Preparation", "Wedding Feast", "Satvik Food", "Sweet Boxes", "Banana Leaf Meals"] },
    { value: "venues", label: "Venues", icon: CalendarCheck, items: ["Marriage Halls", "Community Centers", "Outdoor Lawns", "Banquet Halls", "Temple Halls"] },
    { value: "supplies", label: "Supplies", icon: Star, items: ["Puja Samagri Kits", "Flowers & Garlands", "Idols & Frames", "Decoration Items", "Return Gifts"] },
  ];

  return (
    <section className="px-4 py-20">
      <div className="container mx-auto max-w-5xl">
        <h2 className="text-center font-display text-3xl font-bold text-foreground md:text-4xl">
          Everything for your ceremony
        </h2>
        <Tabs defaultValue="pandits" className="mt-10">
          <TabsList className="mx-auto flex w-full max-w-lg flex-wrap justify-center gap-1 bg-secondary">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="gap-1.5 text-xs sm:text-sm">
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {tabs.map((tab) => (
            <TabsContent key={tab.value} value={tab.value} className="mt-8">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
                {tab.items.map((item) => (
                  <div
                    key={item}
                    className="cursor-pointer rounded-lg border border-border bg-card p-5 text-center transition-all hover:border-primary hover:shadow-soft"
                  >
                    <p className="text-sm font-medium text-foreground">{item}</p>
                  </div>
                ))}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </section>
  );
};

const PricingSection = () => (
  <section className="bg-gradient-warm px-4 py-20">
    <div className="container mx-auto max-w-6xl">
      <h2 className="text-center font-display text-3xl font-bold text-foreground md:text-4xl">
        Simple, transparent pricing
      </h2>
      <p className="mx-auto mt-3 max-w-lg text-center text-muted-foreground">
        Start free, upgrade when you need more. WhatsApp invitations start at Silver.
      </p>
      <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {pricingTiers.map((tier, i) => (
          <motion.div
            key={tier.name}
            custom={i}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className={`relative rounded-xl border p-6 transition-shadow ${
              tier.highlighted
                ? "border-primary bg-card shadow-elevated ring-2 ring-primary"
                : "border-border bg-card shadow-card"
            }`}
          >
            {tier.highlighted && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground">
                Most Popular
              </Badge>
            )}
            <h3 className="font-display text-xl font-semibold text-foreground">{tier.name}</h3>
            <div className="mt-3">
              <span className="text-3xl font-bold text-foreground">{tier.price}</span>
              <span className="text-sm text-muted-foreground">{tier.period}</span>
            </div>
            <ul className="mt-6 space-y-3">
              {tier.features.map((f) => (
                <li key={f.name} className="flex items-start gap-2 text-sm">
                  {f.included ? (
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  ) : (
                    <X className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground/40" />
                  )}
                  <span className={f.included ? "text-foreground" : "text-muted-foreground/60"}>{f.name}</span>
                </li>
              ))}
            </ul>
            <Button
              className="mt-6 w-full"
              variant={tier.highlighted ? "default" : "outline"}
            >
              {tier.name === "Free" ? "Get Started" : "Subscribe"}
            </Button>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

const Footer = () => (
  <footer className="border-t border-border bg-card px-4 py-12">
    <div className="container mx-auto flex flex-col items-center gap-4 text-center">
      <div className="flex items-center gap-2">
        <img src={logo} alt="MyPandits.com" className="h-7" />
      </div>
      <p className="max-w-md text-sm text-muted-foreground">
        Your one-stop platform for planning Pujas, Weddings, and religious ceremonies with confidence.
      </p>
      <p className="text-xs text-muted-foreground">© 2026 MyPandits. All rights reserved.</p>
    </div>
  </footer>
);

const Index = () => (
  <main>
    <HeroSection />
    <ValueProps />
    <ServiceGrid />
    <PricingSection />
    <Footer />
  </main>
);

export default Index;
