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
import { ArrowUpDown, Download } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function AdminCenter() {
    const { user, token } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();
    const [users, setUsers] = useState<any[]>([]);
    const [emails, setEmails] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [subscriptions, setSubscriptions] = useState<any[]>([]);

    useEffect(() => {
        if (!user || user.userType !== "admin") {
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

    if (!user || user.userType !== "admin") return null;

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

                            <TabsContent value="pending" className="space-y-4 pt-4">
                                {users.filter(u => u.status === "PENDING" || u.status === "PENDING_DELETION").length === 0 ? (
                                    <p className="text-muted-foreground text-sm">No pending requests.</p>
                                ) : (
                                    <UsersTable
                                        users={users.filter(u => u.status === "PENDING" || u.status === "PENDING_DELETION")}
                                        onUpdateStatus={handleStatusUpdate}
                                    />
                                )}
                            </TabsContent>

                            <TabsContent value="active" className="space-y-4 pt-4">
                                {users.filter(u => u.status === "APPROVED").length === 0 ? (
                                    <p className="text-muted-foreground text-sm">No active users found.</p>
                                ) : (
                                    <UsersTable
                                        users={users.filter(u => u.status === "APPROVED")}
                                        onUpdateStatus={handleStatusUpdate}
                                    />
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

function UsersTable({ users, onUpdateStatus }: { users: any[], onUpdateStatus: (id: string, status: string) => void }) {
    const [sortKey, setSortKey] = useState<string>("name");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
    const [filter, setFilter] = useState("");

    const handleSort = (key: string) => {
        if (sortKey === key) {
            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        } else {
            setSortKey(key);
            setSortOrder("asc");
        }
    };

    const sortedUsers = [...users].sort((a, b) => {
        let valA = a[sortKey] || "";
        let valB = b[sortKey] || "";

        if (sortKey === "name") {
            valA = a.profile?.full_name || a.email;
            valB = b.profile?.full_name || b.email;
        } else if (sortKey === "tier") {
            valA = a.subscription_tier || "Free";
            valB = b.subscription_tier || "Free";
        } else if (sortKey === "tokens") {
            valA = a.token_balance || 0;
            valB = b.token_balance || 0;
        } else if (sortKey === "location") {
            valA = a.profile?.location || "";
            valB = b.profile?.location || "";
        }

        if (valA < valB) return sortOrder === "asc" ? -1 : 1;
        if (valA > valB) return sortOrder === "asc" ? 1 : -1;
        return 0;
    });

    const filteredUsers = sortedUsers.filter(u => {
        const query = filter.toLowerCase();
        const name = (u.profile?.full_name || u.email).toLowerCase();
        const email = (u.email || "").toLowerCase();
        const role = (u.role || "").toLowerCase();
        const tier = (u.subscription_tier || "Free").toLowerCase();
        return name.includes(query) || email.includes(query) || role.includes(query) || tier.includes(query);
    });

    const downloadCSV = () => {
        const headers = ["Name", "Email", "Role", "Status", "Tier", "Tokens", "WhatsApp", "Location", "Created"];
        const rows = filteredUsers.map(u => [
            `"${u.profile?.full_name || ""}"`,
            `"${u.email}"`,
            `"${u.role}"`,
            `"${u.status}"`,
            `"${u.subscription_tier || "Free"}"`,
            `"${u.token_balance || 0}"`,
            `"${u.profile?.whatsapp || ""}"`,
            `"${u.profile?.location || ""}"`,
            `"${new Date(u.created_at).toLocaleDateString()}"`
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `users_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-muted/20 p-4 rounded-xl border">
                <Input
                    placeholder="Search by name, email, role, or tier..."
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                    className="max-w-md bg-background"
                />
                <Button onClick={downloadCSV} variant="outline" className="gap-2">
                    <Download className="w-4 h-4" /> Export CSV
                </Button>
            </div>

            <div className="border rounded-xl shadow-sm bg-card overflow-hidden overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50">
                            <TableHead className="w-[200px]">
                                <Button variant="ghost" onClick={() => handleSort("name")} className="-ml-4 font-semibold">
                                    User <ArrowUpDown className="ml-2 h-4 w-4" />
                                </Button>
                            </TableHead>
                            <TableHead>
                                <Button variant="ghost" onClick={() => handleSort("role")} className="-ml-4 font-semibold">
                                    Role <ArrowUpDown className="ml-2 h-4 w-4" />
                                </Button>
                            </TableHead>
                            <TableHead>
                                <Button variant="ghost" onClick={() => handleSort("location")} className="-ml-4 font-semibold">
                                    Location <ArrowUpDown className="ml-2 h-4 w-4" />
                                </Button>
                            </TableHead>
                            <TableHead>
                                <Button variant="ghost" onClick={() => handleSort("tier")} className="-ml-4 font-semibold">
                                    Plan & Tokens <ArrowUpDown className="ml-2 h-4 w-4" />
                                </Button>
                            </TableHead>
                            <TableHead className="text-right font-semibold">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredUsers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                    No results matched your search.
                                </TableCell>
                            </TableRow>
                        ) : filteredUsers.map(u => (
                            <TableRow key={u.id}>
                                <TableCell>
                                    <div className="font-medium text-base">{u.profile?.full_name || u.email}</div>
                                    <div className="text-sm text-muted-foreground">{u.email}</div>
                                    <div className="text-xs text-muted-foreground mt-1">WhatsApp: {u.profile?.whatsapp || "N/A"}</div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="mb-2">{u.role}</Badge>
                                    <div className="text-xs text-muted-foreground">
                                        {u.status === "PENDING_DELETION" ? (
                                            <span className="text-red-500 font-medium whitespace-nowrap">Spam/Deleted</span>
                                        ) : (
                                            u.status
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="text-sm">{u.profile?.location || "N/A"}</div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col gap-1 items-start">
                                        <Badge variant="secondary" className="capitalize border-amber-500/30 text-amber-700 bg-amber-50">
                                            {u.subscription_tier || "Free"}
                                        </Badge>
                                        <span className="text-xs font-mono font-medium border px-1.5 py-0.5 rounded-md bg-muted/50">
                                            {u.token_balance?.toLocaleString() || 0} T
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-right space-x-2 space-y-2">
                                    {(!u.role?.toLowerCase().includes("customer") && !u.role?.toLowerCase().includes("host") && !u.role?.toLowerCase().includes("admin")) && (
                                        <div className="flex flex-wrap gap-2 justify-end">
                                            {(u.status === "PENDING" || u.status === "REJECTED") && (
                                                <>
                                                    <Button variant="default" size="sm" onClick={() => onUpdateStatus(u.id, "APPROVED")}>Approve</Button>
                                                    {u.status !== "REJECTED" && (
                                                        <Button variant="outline" size="sm" onClick={() => onUpdateStatus(u.id, "REJECTED")}>Reject</Button>
                                                    )}
                                                    <Button variant="destructive" size="sm" onClick={() => onUpdateStatus(u.id, "PENDING_DELETION")}>Mark Spam</Button>
                                                </>
                                            )}
                                            {u.status === "APPROVED" && (
                                                <Button variant="outline" size="sm" onClick={() => onUpdateStatus(u.id, "REJECTED")}>Revoke</Button>
                                            )}
                                            {u.status === "PENDING_DELETION" && (
                                                <Button variant="secondary" size="sm" onClick={() => onUpdateStatus(u.id, "PENDING")}>Restore</Button>
                                            )}
                                        </div>
                                    )}
                                    {(u.role?.toLowerCase().includes("customer") || u.role?.toLowerCase().includes("host")) && (
                                        <div className="text-xs text-muted-foreground italic px-2 py-1">Auto-Approved</div>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
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
