import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getAllUsers, approveUser } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

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
            loadUsers();
        }
    }, [user, navigate, token]);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const data = await getAllUsers(token!);
            setUsers(data);
        } catch (e: any) {
            toast({ variant: "destructive", title: "Error", description: e.message });
        } finally {
            setLoading(false);
        }
    };

    const handleStatusToggle = async (id: string, currentStatus: string) => {
        const newStatus = currentStatus === "APPROVED" ? "REJECTED" : "APPROVED";
        try {
            await approveUser(id, newStatus, token!);
            toast({ title: `User ${newStatus.toLowerCase()}` });
            setUsers(users.map(u => u.id === id ? { ...u, status: newStatus } : u));
        } catch (e: any) {
            toast({ variant: "destructive", title: "Update Failed", description: e.message });
        }
    };

    if (!user || user.userType !== "ADMIN") return null;

    return (
        <div className="container mx-auto py-10 px-4">
            <h1 className="text-3xl font-display mb-6">Admin Dashboard</h1>
            <h2 className="text-xl font-medium mb-4">User Management</h2>

            {loading ? (
                <p>Loading...</p>
            ) : users.length === 0 ? (
                <p className="text-muted-foreground">No users found.</p>
            ) : (
                <div className="space-y-4">
                    {users.map(u => (
                        <div key={u.id} className="border p-4 rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <div className="flex items-center gap-2">
                                    <p className="font-semibold text-lg">{u.profile?.full_name || u.email}</p>
                                    <Badge variant={u.status === "APPROVED" ? "default" : "secondary"}>{u.status}</Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">{u.email} | Role: <span className="font-semibold text-primary">{u.role}</span></p>
                                <div className="text-sm mt-2 text-muted-foreground">
                                    <p>WhatsApp: {u.profile?.whatsapp || "N/A"}</p>
                                    <p>Target Location: {u.profile?.location || "N/A"}</p>
                                    {u.role === "PANDIT" && <p>Experience: {u.profile?.role_metadata?.experience}, Specialty: {u.profile?.role_metadata?.specialty}</p>}
                                    {u.role === "TEMPLE_ADMIN" && <p>Temple: {u.profile?.role_metadata?.temple_name}, Loc: {u.profile?.role_metadata?.location}</p>}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                {(u.role === "PANDIT" || u.role === "SUPPLIER" || u.role === "TEMPLE_ADMIN" || u.role === "OTHER") && (
                                    <Button
                                        variant={u.status === "APPROVED" ? "outline" : "default"}
                                        onClick={() => handleStatusToggle(u.id, u.status)}
                                    >
                                        {u.status === "APPROVED" ? "Revoke Approval" : "Approve"}
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
