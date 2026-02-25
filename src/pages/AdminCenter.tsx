import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getAllUsers, approveUser, getEmails, updateEmail, getSubscriptionRequests, approveSubscriptionRequest } from "@/lib/api";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function AdminCenter() {
    const { user, token } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [users, setUsers] = useState<any[]>([]);
    const [emails, setEmails] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [subscriptions, setSubscriptions] = useState<any[]>([]);

    useEffect(() => {
        if (!user || user.userType !== "ADMIN") {
            navigate("/");
            return;
        }

        if (token) {
            loadUsers();
            loadEmails();
            loadSubscriptions();
        }
    }, [user, navigate, token]);

    const loadSubscriptions = async () => {
        try {
            const data = await getSubscriptionRequests(token!);
            setSubscriptions(data);
        } catch (e: any) {
            console.error(e);
        }
    };

    const handleSubscriptionStatus = async (id: string, newStatus: "APPROVED" | "REJECTED") => {
        try {
            await approveSubscriptionRequest(id, newStatus, token!);
            toast({ title: `Subscription ${newStatus.toLowerCase()}` });
            setSubscriptions(subscriptions.filter(s => s.id !== id));
            loadUsers();
        } catch (e: any) {
            toast({ variant: "destructive", title: "Update Failed", description: e.message });
        }
    };

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

    const loadEmails = async () => {
        try {
            const data = await getEmails(token!);
            setEmails(data);
        } catch (e: any) {
            console.error(e);
        }
    };

    const handleStatusUpdate = async (id: string, newStatus: string) => {
        try {
            await approveUser(id, newStatus, token!);
            toast({ title: `User ${newStatus.toLowerCase()}` });
            setUsers(users.map(u => u.id === id ? { ...u, status: newStatus } : u));
        } catch (e: any) {
            toast({ variant: "destructive", title: "Update Failed", description: e.message });
        }
    };

    const handleEmailSave = async (emailId: number, subject: string, body_html: string) => {
        try {
            await updateEmail(emailId, { subject, body_html }, token!);
            toast({ title: "Template Saved" });
        } catch (e: any) {
            toast({ variant: "destructive", title: "Save Failed", description: e.message });
        }
    };

    if (!user || user.userType !== "ADMIN") return null;

    return (
        <div className="container mx-auto py-10 px-4">
            <h1 className="text-3xl font-display mb-6">Admin Dashboard</h1>

            <Tabs defaultValue="requests" className="w-full">
                <TabsList className="mb-6 h-auto p-1 py-1 px-1 bg-muted/50 rounded-xl">
                    <TabsTrigger value="requests" className="rounded-lg px-6 py-2.5">User Management</TabsTrigger>
                    <TabsTrigger value="subscriptions" className="rounded-lg px-6 py-2.5">Subscriptions</TabsTrigger>
                    <TabsTrigger value="emails" className="rounded-lg px-6 py-2.5">Email Templates</TabsTrigger>
                </TabsList>

                <TabsContent value="requests">
                    <h2 className="text-xl font-medium mb-4">User Management</h2>

                    {loading ? (
                        <p>Loading...</p>
                    ) : users.length === 0 ? (
                        <p className="text-muted-foreground">No users found.</p>
                    ) : (
                        <Tabs defaultValue="pending" className="w-full">
                            <TabsList className="mb-4">
                                <TabsTrigger value="pending">Pending Approvals</TabsTrigger>
                                <TabsTrigger value="active">Active Users</TabsTrigger>
                            </TabsList>

                            <TabsContent value="pending" className="space-y-4">
                                {users.filter(u => u.status === "PENDING" || u.status === "PENDING_DELETION").length === 0 ? (
                                    <p className="text-muted-foreground text-sm">No pending requests.</p>
                                ) : (
                                    users.filter(u => u.status === "PENDING" || u.status === "PENDING_DELETION").map(u => (
                                        <UserCard key={u.id} user={u} onUpdateStatus={handleStatusUpdate} />
                                    ))
                                )}
                            </TabsContent>

                            <TabsContent value="active" className="space-y-4">
                                {users.filter(u => u.status === "APPROVED").length === 0 ? (
                                    <p className="text-muted-foreground text-sm">No active users found.</p>
                                ) : (
                                    users.filter(u => u.status === "APPROVED").map(u => (
                                        <UserCard key={u.id} user={u} onUpdateStatus={handleStatusUpdate} />
                                    ))
                                )}
                            </TabsContent>
                        </Tabs>
                    )}
                </TabsContent>

                <TabsContent value="subscriptions">
                    <h2 className="text-xl font-medium mb-4">Subscription Approvals</h2>
                    <div className="space-y-4">
                        {subscriptions.filter(s => s.status === "PENDING").length === 0 ? (
                            <p className="text-muted-foreground">No pending subscription requests.</p>
                        ) : (
                            subscriptions.filter(s => s.status === "PENDING").map(sub => (
                                <SubscriptionCard
                                    key={sub.id}
                                    subscription={sub}
                                    onUpdate={handleSubscriptionStatus}
                                />
                            ))
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="emails">
                    <h2 className="text-xl font-medium mb-4">Email Templates</h2>
                    <div className="space-y-6">
                        {emails.map((email: any) => (
                            <EditableEmailTemplate
                                key={email.id}
                                email={email}
                                onSave={(subject, body) => handleEmailSave(email.id, subject, body)}
                            />
                        ))}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function EditableEmailTemplate({ email, onSave }: { email: any, onSave: (subject: string, body: string) => void }) {
    const [subject, setSubject] = useState(email.subject);
    const [bodyHtml, setBodyHtml] = useState(email.body_html);
    const [isEditing, setIsEditing] = useState(false);

    if (!isEditing) {
        return (
            <div className="border p-4 rounded-xl shadow-sm">
                <div className="flex justify-between items-center mb-2">
                    <Badge variant="outline">{email.event_type}</Badge>
                    <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>Edit</Button>
                </div>
                <h3 className="font-semibold text-lg mb-2">Subj: {email.subject}</h3>
                <div className="bg-muted p-3 rounded-lg text-sm text-foreground overflow-x-auto whitespace-pre-wrap">
                    {email.body_html}
                </div>
            </div>
        );
    }

    return (
        <div className="border border-primary/50 p-4 rounded-xl shadow-sm bg-muted/20">
            <div className="flex justify-between items-center mb-4">
                <Badge variant="outline">{email.event_type}</Badge>
            </div>
            <div className="space-y-4">
                <div>
                    <p className="text-sm font-medium mb-1">Subject</p>
                    <Input value={subject} onChange={e => setSubject(e.target.value)} />
                </div>
                <div>
                    <p className="text-sm font-medium mb-1">HTML Body</p>
                    <Textarea
                        value={bodyHtml}
                        onChange={e => setBodyHtml(e.target.value)}
                        rows={8}
                        className="font-mono text-sm"
                    />
                </div>
                <div className="flex gap-2 justify-end mt-4">
                    <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                    <Button onClick={() => {
                        onSave(subject, bodyHtml);
                        setIsEditing(false);
                    }}>Save Changes</Button>
                </div>
            </div>
        </div>
    );
}

function UserCard({ user: u, onUpdateStatus }: { user: any, onUpdateStatus: (id: string, status: string) => void }) {
    return (
        <div className="border p-4 rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-start justify-between gap-4 bg-card">
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-lg">{u.profile?.full_name || u.email}</p>
                    <Badge variant={
                        u.status === "APPROVED" ? "default" :
                            (u.status === "PENDING_DELETION" || u.status === "REJECTED") ? "destructive" :
                                "secondary"
                    }>{u.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{u.email} | Role: <span className="font-semibold text-primary">{u.role}</span></p>
                <div className="text-sm mt-3 text-muted-foreground space-y-1">
                    <p>WhatsApp: {u.profile?.whatsapp || "N/A"}</p>
                    <p>Target Location: {u.profile?.location || "N/A"}</p>
                    {u.role === "PANDIT" && <p>Experience: {u.profile?.role_metadata?.experience}, Specialty: {u.profile?.role_metadata?.specialty}</p>}
                    {u.role === "TEMPLE_ADMIN" && <p>Temple: {u.profile?.role_metadata?.temple_name}, Loc: {u.profile?.role_metadata?.location}</p>}
                </div>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
                {(u.role !== "HOST" && u.role !== "ADMIN") && (
                    <>
                        {(u.status === "PENDING" || u.status === "REJECTED") && (
                            <>
                                <Button variant="default" size="sm" onClick={() => onUpdateStatus(u.id, "APPROVED")}>Approve</Button>
                                {u.status !== "REJECTED" && (
                                    <Button variant="outline" size="sm" onClick={() => onUpdateStatus(u.id, "REJECTED")}>Reject</Button>
                                )}
                                <Button variant="destructive" size="sm" onClick={() => onUpdateStatus(u.id, "PENDING_DELETION")}>Mark as Spam</Button>
                            </>
                        )}
                        {u.status === "APPROVED" && (
                            <Button variant="outline" size="sm" onClick={() => onUpdateStatus(u.id, "REJECTED")}>Revoke Approval</Button>
                        )}
                        {u.status === "PENDING_DELETION" && (
                            <Button variant="secondary" size="sm" onClick={() => onUpdateStatus(u.id, "PENDING")}>Restore (Undo Spam)</Button>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

export function SubscriptionCard({ subscription: s, onUpdate }: { subscription: any, onUpdate: (id: string, status: "APPROVED" | "REJECTED") => void }) {
    return (
        <div className="border border-amber-500/30 bg-amber-50/10 p-4 rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
                <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-lg">{s.user_name || s.user_email}</p>
                    <Badge variant="outline" className="border-amber-500 text-amber-600 bg-amber-50">REQUEST: {s.target_tier}</Badge>
                </div>
                <div className="text-sm text-muted-foreground flex items-center gap-3">
                    <p>Date: {new Date(s.created_at).toLocaleDateString()}</p>
                    <p>Status: <span className="text-amber-600 font-medium">Pending Review</span></p>
                </div>
            </div>

            <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                <Button
                    variant="outline"
                    className="flex-1 sm:flex-none border-red-200 hover:bg-red-50 hover:text-red-600"
                    onClick={() => onUpdate(s.id, "REJECTED")}
                >
                    Reject
                </Button>
                <Button
                    className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700"
                    onClick={() => onUpdate(s.id, "APPROVED")}
                >
                    Approve
                </Button>
            </div>
        </div>
    );
}
