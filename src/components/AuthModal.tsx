import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

const userTypes = [
  { value: "HOST", label: "Customer (Devotee)" },
  { value: "PANDIT", label: "Pandit" },
  { value: "TEMPLE_ADMIN", label: "Temple Admin" },
  { value: "SUPPLIER", label: "Supplier" },
  { value: "EVENT_MANAGER", label: "Event Manager" },
  { value: "OTHER", label: "Other" },
] as const;

const AuthModal = () => {
  const { login, register, showAuthModal, setShowAuthModal } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Registration specific state
  const [role, setRole] = useState<string>("HOST");
  const [fullName, setFullName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [meta1, setMeta1] = useState("");
  const [meta2, setMeta2] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      setLoading(true);
      await login(email, password);
      toast({ title: "Welcome back!" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Login Failed", description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    try {
      setLoading(true);
      const role_metadata: any = {};
      if (role === "PANDIT") {
        role_metadata.experience = meta1;
        role_metadata.specialty = meta2;
      } else if (role === "TEMPLE_ADMIN") {
        role_metadata.temple_name = meta1;
        role_metadata.location = meta2;
      } else if (role === "OTHER") {
        role_metadata.description = meta1;
      }

      const payload = {
        email,
        password,
        role: role,
        profile: {
          full_name: fullName,
          whatsapp,
          role_metadata
        }
      };

      await register(payload);
      toast({ title: "Registration Successful", description: role !== "HOST" ? "Your account is pending admin approval." : "Welcome!" });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Registration Failed", description: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={showAuthModal} onOpenChange={setShowAuthModal}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Welcome to MyPandits</DialogTitle>
          <DialogDescription>Sign in or create an account to get started.</DialogDescription>
        </DialogHeader>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2">
          <TabsList className="w-full">
            <TabsTrigger value="signin" className="flex-1">Sign In</TabsTrigger>
            <TabsTrigger value="register" className="flex-1">Register</TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <Button onClick={handleLogin} disabled={loading} className="w-full">
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </TabsContent>

          <TabsContent value="register" className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label>Email</Label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Password</Label>
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Full Name</Label>
                <Input value={fullName} onChange={e => setFullName(e.target.value)} required />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>WhatsApp Number</Label>
                <Input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} required />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>I am a</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your role" />
                  </SelectTrigger>
                  <SelectContent>
                    {userTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {role === "PANDIT" && (
                <>
                  <div className="space-y-2 col-span-2">
                    <Label>Years of Experience</Label>
                    <Input value={meta1} onChange={e => setMeta1(e.target.value)} />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Primary Specialty (e.g. Wedding, Havan)</Label>
                    <Input value={meta2} onChange={e => setMeta2(e.target.value)} />
                  </div>
                </>
              )}

              {role === "TEMPLE_ADMIN" && (
                <>
                  <div className="space-y-2 col-span-2">
                    <Label>Temple Name</Label>
                    <Input value={meta1} onChange={e => setMeta1(e.target.value)} />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Temple Location</Label>
                    <Input value={meta2} onChange={e => setMeta2(e.target.value)} />
                  </div>
                </>
              )}

              {role === "OTHER" && (
                <div className="space-y-2 col-span-2">
                  <Label>Specify your role</Label>
                  <Input
                    placeholder="e.g., Decorator, Musician..."
                    value={meta1}
                    onChange={(e) => setMeta1(e.target.value)}
                  />
                </div>
              )}
            </div>

            <Button onClick={handleRegister} disabled={loading} className="w-full mt-4">
              {loading ? "Registering..." : "Create Account"}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;
