import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { updateProfile, requestAccountDeletion } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle } from "lucide-react";

export default function ProfileSettings() {
    const { user, token, logout } = useAuth();
    const { toast } = useToast();
    const [whatsapp, setWhatsapp] = useState("");
    const [location, setLocation] = useState("");
    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const handleSave = async () => {
        try {
            setLoading(true);
            await updateProfile({ whatsapp, location }, token!);
            toast({ title: "Profile updated successfully" });
        } catch (e: any) {
            toast({ variant: "destructive", title: "Update Failed", description: e.message });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm("Are you sure? Your account will be hard-deleted in 15 days.")) return;
        try {
            setDeleting(true);
            await requestAccountDeletion(token!);
            toast({ title: "Deletion Requested", description: "You have been logged out." });
            logout();
        } catch (e: any) {
            toast({ variant: "destructive", title: "Request Failed", description: e.message });
            setDeleting(false);
        }
    };

    if (!user) return null;

    return (
        <div className="container mx-auto max-w-2xl py-12 px-4">
            <h1 className="text-3xl font-display mb-8">Account Settings</h1>

            <div className="bg-card border rounded-xl p-6 shadow-sm mb-8">
                <h2 className="text-xl font-medium mb-4">Edit Profile</h2>
                <div className="space-y-4">
                    <div>
                        <Label>WhatsApp Number</Label>
                        <Input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="e.g. +91 9876543210" />
                    </div>
                    <div>
                        <Label>Location</Label>
                        <Input value={location} onChange={e => setLocation(e.target.value)} placeholder="City, State" />
                    </div>
                    <Button onClick={handleSave} disabled={loading}>{loading ? "Saving..." : "Save Changes"}</Button>
                </div>
            </div>

            <div className="bg-destructive/10 border-destructive/20 border rounded-xl p-6 shadow-sm">
                <h2 className="text-xl font-medium text-destructive flex items-center gap-2 mb-2">
                    <AlertCircle className="h-5 w-5" /> Danger Zone
                </h2>
                <p className="text-sm text-muted-foreground mb-4">
                    Once you request account deletion, your account status will be set to pending. After 15 days, all your data will be permanently erased in accordance with GDPR guidelines.
                </p>
                <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                    {deleting ? "Processing..." : "Request Account Deletion"}
                </Button>
            </div>
        </div>
    );
}
