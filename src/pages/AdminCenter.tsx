import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getPendingUsers, approveUser } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function AdminCenter() {
    const { user, token } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user || user.userType !== "ADMIN") {
            navigate("/");
            return;
        }

        if (token) {
            loadPendingUsers();
        }
    }, [user, navigate, token]);

    const loadPendingUsers = async () => {
        try {
            setLoading(true);
            const data = await getPendingUsers(token!);
            setUsers(data);
        } catch (e: any) {
            toast({ variant: "destructive", title: "Error", description: e.message });
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (id: string, status: "APPROVED" | "REJECTED") => {
        try {
            await approveUser(id, status, token!);
            toast({ title: `User ${status.toLowerCase()}` });
            setUsers(users.filter(u => u.id !== id));
        } catch (e: any) {
            toast({ variant: "destructive", title: "Update Failed", description: e.message });
        }
    };

    if (!user || user.userType !== "ADMIN") return null;

    return (
        <div className="container mx-auto py-10 px-4">
            <h1 className="text-3xl font-display mb-6">Admin Center</h1>
            <h2 className="text-xl font-medium mb-4">Pending Approvals</h2>

            {loading ? (
                <p>Loading...</p>
            ) : users.length === 0 ? (
                <p className="text-muted-foreground">No pending users right now.</p>
            ) : (
                <div className="space-y-4">
                    {users.map(u => (
                        <div key={u.id} className="border p-4 rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <p className="font-semibold text-lg">{u.profile?.full_name || u.email}</p>
                                <p className="text-sm text-muted-foreground">{u.email} | Role: <span className="font-semibold text-primary">{u.role}</span></p>
                                <div className="text-sm mt-2 text-muted-foreground">
                                    <p>WhatsApp: {u.profile?.whatsapp || "N/A"}</p>
                                    <p>Target Location: {u.profile?.location || "N/A"}</p>
                                    {u.role === "PANDIT" && <p>Experience: {u.profile?.role_metadata?.experience}, Specialty: {u.profile?.role_metadata?.specialty}</p>}
                                    {u.role === "TEMPLE_ADMIN" && <p>Temple: {u.profile?.role_metadata?.temple_name}, Loc: {u.profile?.role_metadata?.location}</p>}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" className="border-destructive text-destructive" onClick={() => handleStatusUpdate(u.id, "REJECTED")}>Reject</Button>
                                <Button onClick={() => handleStatusUpdate(u.id, "APPROVED")}>Approve</Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
