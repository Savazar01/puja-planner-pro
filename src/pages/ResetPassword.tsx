import { useState, useEffect } from "react";
import { resetPassword } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Link, useSearchParams, useNavigate } from "react-router-dom";

export default function ResetPassword() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get("token");

    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (!token) {
            toast({ variant: "destructive", title: "Invalid Link", description: "This password reset link is invalid or missing a token." });
            navigate("/");
        }
    }, [token, navigate, toast]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            toast({ variant: "destructive", title: "Oops!", description: "Passwords do not match." });
            return;
        }

        try {
            setLoading(true);
            await resetPassword(token!, newPassword);
            toast({ title: "Success!", description: "Your password has been reset. You can now login." });
            navigate("/");
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        } finally {
            setLoading(false);
        }
    };

    if (!token) return null;

    return (
        <div className="container mx-auto max-w-md py-20 px-4">
            <h1 className="text-3xl font-display text-center mb-6">Create New Password</h1>

            <div className="bg-card border p-6 rounded-xl shadow-sm">
                <p className="text-muted-foreground mb-6 text-sm">
                    Please enter your new password below. Make sure it's secure!
                </p>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <Label htmlFor="newPassword">New Password</Label>
                        <Input
                            id="newPassword"
                            type="password"
                            required
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                        />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="confirmPassword">Confirm New Password</Label>
                        <Input
                            id="confirmPassword"
                            type="password"
                            required
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? "Resetting..." : "Reset Password"}
                    </Button>
                </form>
                <div className="mt-6 text-center text-sm">
                    <Link to="/" className="text-primary hover:underline">Back to Login</Link>
                </div>
            </div>
        </div>
    );
}
