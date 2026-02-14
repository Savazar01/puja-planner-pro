import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { discoveryLogs, pricingTiers } from "@/data/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Shield, Settings, Activity, Eye, EyeOff } from "lucide-react";
import { Navigate } from "react-router-dom";

const featureNames = [
  "Search Pandits & Temples",
  "Contact details & WhatsApp",
  "Guest Management",
  "Samagri Checklist",
  "AI Event Planning",
  "Invite via WhatsApp",
  "Priority Support",
  "Dedicated Coordinator",
];

const AdminPage = () => {
  const { isAuthenticated } = useAuth();
  const [apiKeys, setApiKeys] = useState({ serper: "", firecrawl: "", gemini: "" });
  const [showKeys, setShowKeys] = useState({ serper: false, firecrawl: false, gemini: false });
  const [entitlements, setEntitlements] = useState<Record<string, Record<string, boolean>>>(() => {
    const matrix: Record<string, Record<string, boolean>> = {};
    pricingTiers.forEach((tier) => {
      matrix[tier.name] = {};
      featureNames.forEach((feat) => {
        const tierFeature = tier.features.find((f) => f.name === feat);
        matrix[tier.name][feat] = tierFeature?.included ?? false;
      });
    });
    return matrix;
  });

  if (!isAuthenticated) return <Navigate to="/" replace />;

  const toggleEntitlement = (tier: string, feature: string) => {
    setEntitlements((prev) => ({
      ...prev,
      [tier]: { ...prev[tier], [feature]: !prev[tier][feature] },
    }));
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="border-b border-border bg-card px-4 py-6">
        <div className="container mx-auto max-w-6xl">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">Admin Command Center</h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-6xl px-4 py-8">
        <Tabs defaultValue="entitlements">
          <TabsList className="bg-secondary">
            <TabsTrigger value="entitlements" className="gap-1.5"><Settings className="h-4 w-4" />Entitlements</TabsTrigger>
            <TabsTrigger value="api" className="gap-1.5"><Settings className="h-4 w-4" />API Config</TabsTrigger>
            <TabsTrigger value="logs" className="gap-1.5"><Activity className="h-4 w-4" />Discovery Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="entitlements" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-lg">Entitlement Matrix</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[180px]">Feature</TableHead>
                        {pricingTiers.map((t) => (
                          <TableHead key={t.name} className="text-center">{t.name}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {featureNames.map((feat) => (
                        <TableRow key={feat}>
                          <TableCell className="text-sm font-medium">{feat}</TableCell>
                          {pricingTiers.map((t) => (
                            <TableCell key={t.name} className="text-center">
                              <Switch
                                checked={entitlements[t.name]?.[feat] ?? false}
                                onCheckedChange={() => toggleEntitlement(t.name, feat)}
                              />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="api" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-lg">API Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {(["serper", "firecrawl", "gemini"] as const).map((key) => (
                  <div key={key} className="space-y-2">
                    <Label className="text-sm font-medium capitalize">{key} API Key</Label>
                    <div className="flex gap-2">
                      <Input
                        type={showKeys[key] ? "text" : "password"}
                        value={apiKeys[key]}
                        onChange={(e) => setApiKeys((prev) => ({ ...prev, [key]: e.target.value }))}
                        placeholder={`Enter ${key} API key...`}
                      />
                      <Button variant="ghost" size="icon" onClick={() => setShowKeys((prev) => ({ ...prev, [key]: !prev[key] }))}>
                        {showKeys[key] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                ))}
                <Button>Save API Keys</Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-lg">AI Discovery Logs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex items-center gap-4 text-sm text-muted-foreground">
                  <span>Total discovered: <strong className="text-foreground">{discoveryLogs.length}</strong></span>
                  <span>Pandits: <strong className="text-foreground">{discoveryLogs.filter((l) => l.type === "pandit").length}</strong></span>
                  <span>Events: <strong className="text-foreground">{discoveryLogs.filter((l) => l.type === "event").length}</strong></span>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead className="text-right">Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {discoveryLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <Badge variant={log.type === "pandit" ? "default" : "secondary"} className="text-xs">
                            {log.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{log.name}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{log.source}</Badge></TableCell>
                        <TableCell className="text-muted-foreground">{log.location}</TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">{log.timestamp}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
};

export default AdminPage;
