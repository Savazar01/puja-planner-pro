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

const userTypes = [
  { value: "customer", label: "Customer (Devotee)" },
  { value: "pandit", label: "Pandit" },
  { value: "temple_admin", label: "Temple Admin" },
  { value: "supplier", label: "Supplier" },
  { value: "event_manager", label: "Event Manager" },
  { value: "other", label: "Other" },
] as const;

const AuthModal = () => {
  const { login, register, showAuthModal, setShowAuthModal } = useAuth();
  const [selectedType, setSelectedType] = useState<string>("customer");
  const [customType, setCustomType] = useState("");

  const handleRegister = () => {
    register(selectedType as any, selectedType === "other" ? customType : undefined);
  };

  return (
    <Dialog open={showAuthModal} onOpenChange={setShowAuthModal}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Welcome to MyPandits</DialogTitle>
          <DialogDescription>Sign in or create an account to get started.</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="signin" className="mt-2">
          <TabsList className="w-full">
            <TabsTrigger value="signin" className="flex-1">Sign In</TabsTrigger>
            <TabsTrigger value="register" className="flex-1">Register</TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="space-y-4 pt-4">
            <Button onClick={() => login()} className="w-full gap-2" size="lg">
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Sign in with Google
            </Button>
          </TabsContent>

          <TabsContent value="register" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>I am a</Label>
              <Select value={selectedType} onValueChange={setSelectedType}>
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

            {selectedType === "other" && (
              <div className="space-y-2">
                <Label>Specify your role</Label>
                <Input
                  placeholder="e.g., Decorator, Musician..."
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value)}
                />
              </div>
            )}

            <Button onClick={handleRegister} className="w-full gap-2" size="lg">
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Register with Google
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;
