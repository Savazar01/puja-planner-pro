import { useState } from "react";
import { forgotPassword } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const { toast } = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            await forgotPassword(email);
            setSuccess(true);
            toast({ title: "Email Sent", description: "If the email exists, a reset link will be sent shortly." });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto max-w-md py-20 px-4">
            <h1 className="text-3xl font-display text-center mb-6">Forgot Password</h1>

            {success ? (
                <div className="bg-primary/10 border border-primary/20 text-center p-6 rounded-xl space-y-4">
                    <p className="font-medium text-lg">Check your inbox!</p>
                    <p className="text-muted-foreground">We've sent a password recovery link to your email.</p>
                    <Button variant="outline" className="mt-4" onClick={() => setSuccess(false)}>Send Again</Button>
                </div>
            ) : (
                <div className="bg-card border p-6 rounded-xl shadow-sm">
                    <p className="text-muted-foreground mb-6 text-sm">
                        Enter the email address associated with your account and we'll send you a link to reset your password.
                    </p>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1">
                            <Label htmlFor="email">Email Address</Label>
                            <Input
                                id="email"
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@example.com"
                            />
                        </div>
                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? "Sending..." : "Send Reset Link"}
                        </Button>
                    </form>
                    <div className="mt-6 text-center text-sm">
                        <Link to="/" className="text-primary hover:underline">Return to Home</Link>
                    </div>
                </div>
            )}
        </div>
    );
}
