import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { updateProfile, requestAccountDeletion, changePassword } from "@/lib/api";
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

    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [passwordLoading, setPasswordLoading] = useState(false);

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

    const handlePasswordChange = async () => {
        if (newPassword !== confirmPassword) {
            toast({ variant: "destructive", title: "Passwords do not match" });
            return;
        }
        if (!oldPassword || !newPassword) {
            toast({ variant: "destructive", title: "Fields cannot be empty" });
            return;
        }
        try {
            setPasswordLoading(true);
            await changePassword({ old_password: oldPassword, new_password: newPassword }, token!);
            toast({ title: "Password changed successfully" });
            setOldPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (e: any) {
            toast({ variant: "destructive", title: "Change Failed", description: e.message });
        } finally {
            setPasswordLoading(false);
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

            <div className="bg-card border rounded-xl p-6 shadow-sm mb-8">
                <h2 className="text-xl font-medium mb-4">Change Password</h2>
                <div className="space-y-4">
                    <div>
                        <Label>Current Password</Label>
                        <Input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} />
                    </div>
                    <div>
                        <Label>New Password</Label>
                        <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                    </div>
                    <div>
                        <Label>Confirm New Password</Label>
                        <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                    </div>
                    <Button onClick={handlePasswordChange} disabled={passwordLoading} variant="secondary">
                        {passwordLoading ? "Updating..." : "Update Password"}
                    </Button>
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
