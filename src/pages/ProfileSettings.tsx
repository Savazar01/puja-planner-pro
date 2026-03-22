import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { updateProfile, requestAccountDeletion, changePassword, getMe } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle, User, MapPin, Globe, Shield, Activity, Star } from "lucide-react";

export default function ProfileSettings() {
    const { user, token, logout } = useAuth();
    const { toast } = useToast();

    const [loading, setLoading] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [fetching, setFetching] = useState(true);

    // Form States
    const [fullName, setFullName] = useState("");
    const [bio, setBio] = useState("");
    const [profilePicture, setProfilePicture] = useState("");
    const [phone, setPhone] = useState("");
    const [whatsapp, setWhatsapp] = useState("");

    const [location, setLocation] = useState("");
    const [street, setStreet] = useState("");
    const [city, setCity] = useState("");
    const [stateRegion, setStateRegion] = useState("");
    const [country, setCountry] = useState("India");
    const [addressZip, setAddressZip] = useState("");
    const [addressType, setAddressType] = useState("");

    const [title, setTitle] = useState("");
    const [languages, setLanguages] = useState("");

    const [socials, setSocials] = useState<any>({ instagram: "", facebook: "", website: "" });
    const [roleMetadata, setRoleMetadata] = useState<any>({});

    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [passwordLoading, setPasswordLoading] = useState(false);

    useEffect(() => {
        if (!token) return;
        const loadUser = async () => {
            try {
                const data = await getMe(token);
                const p = data.profile || {};
                setFullName(p.full_name || "");
                setBio(p.bio || "");
                setProfilePicture(p.profile_picture_url || "");
                setPhone(p.phone || "");
                setWhatsapp(p.whatsapp || "");
                setLocation(p.location || "");
                setStreet(p.address_street || "");
                setCity(p.address_city || "");
                setStateRegion(p.address_state || "");
                setCountry(p.address_country || "India");
                setAddressZip(p.address_zip || "");
                setAddressType(p.address_type || (user.userType === 'customer' ? 'Home' : 'Business'));
                setTitle(p.title || "");
                setLanguages(p.languages || "");
                setSocials(p.social_media || { instagram: "", facebook: "", website: "" });
                setRoleMetadata(p.role_metadata || {});
            } catch (e) {
                console.error("Failed to load profile details", e);
            } finally {
                setFetching(false);
            }
        };
        loadUser();
    }, [token]);

    const handleSaveProfile = async () => {
        try {
            setLoading(true);
            await updateProfile({
                full_name: fullName,
                bio,
                profile_picture_url: profilePicture,
                phone,
                whatsapp,
                location,
                address_street: street,
                address_city: city,
                address_state: stateRegion,
                address_country: country,
                address_zip: addressZip,
                address_type: addressType,
                title,
                languages,
                social_media: socials,
                role_metadata: roleMetadata
            }, token!);
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

    const handleUpgrade = async (targetTier: string, cost: number) => {
        if (!user || user.has_pending_subscription) {
            toast({ variant: "destructive", title: "Action Blocked", description: `You already have a pending subscription upgrade.` });
            return;
        }
        try {
            setLoading(true);
            const { upgradeSubscription } = await import("@/lib/api");
            await upgradeSubscription(targetTier, token!);
            toast({ title: "Request Submitted", description: `An Admin will review your upgrade to ${targetTier}.` });
            setTimeout(() => window.location.reload(), 1500);
        } catch (e: any) {
            toast({ variant: "destructive", title: "Upgrade Failed", description: e.message });
        } finally {
            setLoading(false);
        }
    };

    const updateSocial = (key: string, value: string) => {
        setSocials((prev: any) => ({ ...prev, [key]: value }));
    };

    const updateRoleMeta = (key: string, value: string) => {
        setRoleMetadata((prev: any) => ({ ...prev, [key]: value }));
    };

    const generateDisplayLocation = (l: string, c: string, s: string, co: string, z: string) => {
        const parts = [l, c, s, co, z].map(p => p?.trim()).filter(Boolean);
        setLocation(parts.join(", "));
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 500 * 1024) {
            toast({ variant: "destructive", title: "File too large", description: "Image must be less than 500KB" });
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setProfilePicture(reader.result as string);
        };
        reader.readAsDataURL(file);
    };

    if (!user) return null;
    if (fetching) return <div className="text-center py-20 text-muted-foreground">Loading profile...</div>;

    const needsRoleTab = user.userType === "pandit" || user.userType === "event_manager" || user.userType === "temple_admin" || user.userType === "supplier";

    return (
        <div className="container mx-auto max-w-4xl py-12 px-4">
            <h1 className="text-3xl font-display mb-8">Account Settings</h1>

            <Tabs defaultValue="basic" className="flex flex-col md:flex-row gap-8">
                <TabsList className="flex md:flex-col justify-start items-start h-auto bg-transparent space-y-2 md:w-64">
                    <TabsTrigger value="basic" className="w-full justify-start gap-3"><User size={18} /> Basic Info</TabsTrigger>

                    {user.userType === "customer" ? (
                        <TabsTrigger value="subscription" className="w-full justify-start gap-3 text-amber-600 data-[state=active]:text-amber-700 data-[state=active]:bg-amber-50">
                            <Star size={18} /> Subscription
                        </TabsTrigger>
                    ) : null}

                    <TabsTrigger value="address" className="w-full justify-start gap-3"><MapPin size={18} /> Address</TabsTrigger>
                    <TabsTrigger value="socials" className="w-full justify-start gap-3"><Globe size={18} /> Social Media</TabsTrigger>
                    {needsRoleTab && <TabsTrigger value="role" className="w-full justify-start gap-3"><Activity size={18} /> Service Details</TabsTrigger>}
                    <TabsTrigger value="security" className="w-full justify-start gap-3"><Shield size={18} /> Security</TabsTrigger>
                </TabsList>

                <div className="flex-1 bg-card border rounded-xl shadow-sm min-h-[500px] overflow-hidden">
                    <div className="p-6 md:p-8 h-full">
                        <TabsContent value="basic" className="space-y-6 m-0">
                            <div>
                                <h2 className="text-2xl font-medium mb-1">Basic Information</h2>
                                <p className="text-sm text-muted-foreground mb-6">Manage your core identity and contact details.</p>
                            </div>

                            <div className="flex flex-col sm:flex-row sm:items-end gap-6 mb-8">
                                <div className="w-24 h-24 rounded-full border-2 border-primary/20 overflow-hidden bg-muted flex items-center justify-center shrink-0">
                                    {profilePicture ? (
                                        <img src={profilePicture} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <User size={40} className="text-muted-foreground opacity-50" />
                                    )}
                                </div>
                                <div className="flex-1 space-y-4">
                                    <div className="space-y-2">
                                        <Label>Profile Picture (Max 500KB)</Label>
                                        <Input type="file" accept="image/*" onChange={handleFileUpload} className="cursor-pointer" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Title</Label>
                                            <select 
                                                value={title} 
                                                onChange={e => setTitle(e.target.value)}
                                                className="w-full h-10 px-3 py-2 bg-background border rounded-md text-sm ring-offset-background"
                                            >
                                                <option value="">Select Title</option>
                                                {["Mr.", "Mrs.", "Ms.", "Dr.", "Prof."].map(t => <option key={t} value={t}>{t}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Full Name</Label>
                                            <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your Name" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <Label>Standard Phone</Label>
                                    <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="+91 0000000000" />
                                </div>
                                <div className="space-y-2">
                                    <Label>WhatsApp Number <span className="text-red-500">*</span></Label>
                                    <Input value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="Required for notifications" />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label>Languages Managed (e.g. Telugu, English, Hindi)</Label>
                                    <Input value={languages} onChange={e => setLanguages(e.target.value)} placeholder="Enter languages separated by commas" />
                                </div>
                            </div>

                            <div className="space-y-2 pt-2">
                                <Label>Bio / About Me</Label>
                                <Textarea
                                    value={bio}
                                    onChange={e => setBio(e.target.value)}
                                    placeholder="Tell us a bit about yourself..."
                                    className="min-h-[100px]"
                                />
                            </div>
                            <Button onClick={handleSaveProfile} disabled={loading} className="mt-6 w-full sm:w-auto">{loading ? "Saving..." : "Save basic info"}</Button>
                        </TabsContent>

                        {user.userType === "customer" && (
                            <TabsContent value="subscription" className="space-y-6 m-0">
                                <div>
                                    <h2 className="text-2xl font-medium mb-1 flex items-center gap-2">
                                        <Star className="text-amber-500 fill-amber-500" /> Subscription & Tokens
                                    </h2>
                                    <p className="text-sm text-muted-foreground mb-6">Upgrade your account tier to unlock premium astrology and event planning features.</p>
                                </div>

                                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl mb-8 flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-amber-800">Current Balance</p>
                                        <p className="text-2xl font-bold text-amber-600">{user.token_balance?.toLocaleString() || 0} Tokens</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-medium text-muted-foreground">Current Tier</p>
                                        <p className="text-lg font-bold capitalize">{user.tier}</p>
                                    </div>
                                </div>

                                <div className="grid md:grid-cols-3 gap-4">
                                    {/* Silver Tier */}
                                    <div className="border rounded-xl p-5 relative overflow-hidden flex flex-col">
                                        <div className="mb-4">
                                            <h3 className="text-lg font-bold text-slate-400">SILVER</h3>
                                            <p className="text-2xl font-bold mt-2">$10 <span className="text-sm font-normal text-muted-foreground"></span></p>
                                        </div>
                                        <ul className="text-sm text-muted-foreground space-y-2 mb-6 flex-1">
                                            <li>• Priority Support</li>
                                            <li>• Verified Badge</li>
                                            <li>• Ad-Free Browsing</li>
                                            <li>• +10,000 Tokens</li>
                                        </ul>
                                        <Button
                                            variant={user.tier === 'silver' ? "secondary" : "outline"}
                                            className="w-full"
                                            disabled={loading || user.has_pending_subscription || user.tier === 'silver' || user.tier === 'gold' || user.tier === 'platinum'}
                                            onClick={() => handleUpgrade("SILVER", 10)}
                                        >
                                            {user.has_pending_subscription ? "Pending Review" : (user.tier === 'silver' ? "Current Tier" : "Upgrade")}
                                        </Button>
                                    </div>

                                    {/* Gold Tier */}
                                    <div className="border rounded-xl p-5 relative overflow-hidden flex flex-col border-amber-500 shadow-sm bg-amber-50/30">
                                        <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">POPULAR</div>
                                        <div className="mb-4">
                                            <h3 className="text-lg font-bold text-amber-500">GOLD</h3>
                                            <p className="text-2xl font-bold mt-2">$30 <span className="text-sm font-normal text-muted-foreground"></span></p>
                                        </div>
                                        <ul className="text-sm text-muted-foreground space-y-2 mb-6 flex-1 text-amber-900/70">
                                            <li>• Everything in Silver</li>
                                            <li>• 1 Free Puja Video Call</li>
                                            <li>• Vendor Discounts</li>
                                            <li>• +25,000 Tokens</li>
                                        </ul>
                                        <Button
                                            className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                                            disabled={loading || user.has_pending_subscription || user.tier === 'gold' || user.tier === 'platinum'}
                                            onClick={() => handleUpgrade("GOLD", 30)}
                                        >
                                            {user.has_pending_subscription ? "Pending Review" : (user.tier === 'gold' ? "Current Tier" : "Upgrade")}
                                        </Button>
                                    </div>

                                    {/* Platinum Tier */}
                                    <div className="border rounded-xl p-5 relative overflow-hidden flex flex-col bg-slate-900 text-white">
                                        <div className="mb-4">
                                            <h3 className="text-lg font-bold text-blue-300">PLATINUM</h3>
                                            <p className="text-2xl font-bold mt-2">$50 <span className="text-sm font-normal text-slate-400"></span></p>
                                        </div>
                                        <ul className="text-sm text-slate-300 space-y-2 mb-6 flex-1">
                                            <li>• Everything in Gold</li>
                                            <li>• Unlimited Virtual Pujas</li>
                                            <li>• Dedicated VIP Manager</li>
                                            <li>• +60,000 Tokens</li>
                                        </ul>
                                        <Button
                                            variant="secondary"
                                            className="w-full text-slate-900 bg-white hover:bg-slate-200"
                                            disabled={loading || user.has_pending_subscription || user.tier === 'platinum'}
                                            onClick={() => handleUpgrade("PLATINUM", 50)}
                                        >
                                            {user.has_pending_subscription ? "Pending Review" : (user.tier === 'platinum' ? "Current Tier" : "Upgrade")}
                                        </Button>
                                    </div>
                                </div>
                            </TabsContent>
                        )}

                        <TabsContent value="address" className="space-y-6 m-0">
                            <div>
                                <h2 className="text-2xl font-medium mb-1">Location & Address</h2>
                                <p className="text-sm text-muted-foreground mb-6">Manage your operational base and display areas.</p>
                            </div>

                            <div className="grid md:grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <Label>Address Type</Label>
                                    <select 
                                        value={addressType} 
                                        onChange={e => setAddressType(e.target.value)}
                                        className="w-full h-10 px-3 py-2 bg-background border rounded-md text-sm"
                                    >
                                        <option value="Home">Home</option>
                                        <option value="Business">Business</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Country</Label>
                                    <select 
                                        value={country} 
                                        onChange={e => {
                                            setCountry(e.target.value);
                                            generateDisplayLocation(street, city, stateRegion, e.target.value, addressZip);
                                        }}
                                        className="w-full h-10 px-3 py-2 bg-background border rounded-md text-sm"
                                    >
                                        <option value="India">India</option>
                                        <option value="USA">USA</option>
                                        <option value="Canada">Canada</option>
                                        <option value="UK">UK</option>
                                        <option value="Australia">Australia</option>
                                    </select>
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label>Street/Locality</Label>
                                    <Input 
                                        value={street} 
                                        onChange={e => {
                                            setStreet(e.target.value);
                                            generateDisplayLocation(e.target.value, city, stateRegion, country, addressZip);
                                        }} 
                                        placeholder="e.g. Srinagar Colony" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>City</Label>
                                    <Input 
                                        value={city} 
                                        onChange={e => {
                                            setCity(e.target.value);
                                            generateDisplayLocation(street, e.target.value, stateRegion, country, addressZip);
                                        }} 
                                        placeholder="City" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>State / Province</Label>
                                    <Input 
                                        value={stateRegion} 
                                        onChange={e => {
                                            setStateRegion(e.target.value);
                                            generateDisplayLocation(street, city, e.target.value, country, addressZip);
                                        }} 
                                        placeholder="State" 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{country === "USA" || country === "Canada" ? "Zip Code" : "Pincode"}</Label>
                                    <Input 
                                        value={addressZip} 
                                        onChange={e => {
                                            setAddressZip(e.target.value);
                                            generateDisplayLocation(street, city, stateRegion, country, e.target.value);
                                        }} 
                                        placeholder={country === "USA" || country === "Canada" ? "e.g. 90210" : "e.g. 500001"} 
                                    />
                                </div>
                            </div>

                            <div className="space-y-2 pt-4 border-t">
                                <Label>Display Location (Automatically Generated)</Label>
                                <Input value={location} readOnly className="bg-muted" />
                            </div>
                            <Button onClick={handleSaveProfile} disabled={loading} className="mt-6 w-full sm:w-auto">Save Address</Button>
                        </TabsContent>

                        <TabsContent value="socials" className="space-y-6 m-0">
                            <div>
                                <h2 className="text-2xl font-medium mb-1">Social Media Presence</h2>
                                <p className="text-sm text-muted-foreground mb-6">Link your external profiles for greater visibility.</p>
                            </div>

                            <div className="space-y-5">
                                <div className="space-y-2">
                                    <Label>Personal Website</Label>
                                    <Input value={socials?.website || ""} onChange={e => updateSocial('website', e.target.value)} placeholder="https://..." />
                                </div>
                                <div className="space-y-2">
                                    <Label>Instagram Profile</Label>
                                    <Input value={socials?.instagram || ""} onChange={e => updateSocial('instagram', e.target.value)} placeholder="@username" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Facebook Page</Label>
                                    <Input value={socials?.facebook || ""} onChange={e => updateSocial('facebook', e.target.value)} placeholder="Facebook URL" />
                                </div>
                            </div>
                            <Button onClick={handleSaveProfile} disabled={loading} className="mt-6 w-full sm:w-auto">Save Links</Button>
                        </TabsContent>

                        {needsRoleTab && (
                            <TabsContent value="role" className="space-y-6 m-0">
                                <div>
                                    <h2 className="text-2xl font-medium mb-1 capitalize">{user.userType.replace("_", " ")} Details</h2>
                                    <p className="text-sm text-muted-foreground mb-6">Update specifics relating to your service offerings.</p>
                                </div>

                                <div className="grid md:grid-cols-2 gap-5">
                                    <div className="space-y-2">
                                        <Label>Years of Experience</Label>
                                        <Input
                                            type="number"
                                            value={roleMetadata?.experience || ""}
                                            onChange={e => updateRoleMeta('experience', e.target.value)}
                                            placeholder="e.g. 5"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Primary Specialty</Label>
                                        <Input
                                            value={roleMetadata?.specialty || ""}
                                            onChange={e => updateRoleMeta('specialty', e.target.value)}
                                            placeholder="e.g. Vedic Astrology, Catering, etc."
                                        />
                                    </div>
                                    {user.userType === "temple_admin" && (
                                        <div className="space-y-2 md:col-span-2">
                                            <Label>Temple Name</Label>
                                            <Input
                                                value={roleMetadata?.temple_name || ""}
                                                onChange={e => updateRoleMeta('temple_name', e.target.value)}
                                                placeholder="Name of your Temple"
                                            />
                                        </div>
                                    )}
                                </div>
                                <Button onClick={handleSaveProfile} disabled={loading} className="mt-6 w-full sm:w-auto">Save Service Info</Button>
                            </TabsContent>
                        )}

                        <TabsContent value="security" className="space-y-8 m-0">
                            <div>
                                <div>
                                    <h2 className="text-2xl font-medium mb-1">Change Password</h2>
                                    <p className="text-sm text-muted-foreground mb-6">Ensure your account uses a strong, unique password.</p>
                                </div>
                                <div className="space-y-4 max-w-sm">
                                    <div className="space-y-2">
                                        <Label>Current Password</Label>
                                        <Input type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>New Password</Label>
                                        <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Confirm New Password</Label>
                                        <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                                    </div>
                                    <Button className="w-full" onClick={handlePasswordChange} disabled={passwordLoading} variant="secondary">
                                        {passwordLoading ? "Updating..." : "Update Password"}
                                    </Button>
                                </div>
                            </div>

                            <div className="pt-8 mt-8 border-t border-destructive/20">
                                <h3 className="text-xl font-medium text-destructive flex items-center gap-2 mb-2">
                                    <AlertCircle size={20} /> Danger Zone
                                </h3>
                                <p className="text-sm text-muted-foreground mb-6">
                                    Once you request account deletion, it will be placed in a pending state and fully purged from our database in 15 days in accordance with GDPR guidelines.
                                </p>
                                <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                                    {deleting ? "Processing..." : "Request Account Deletion"}
                                </Button>
                            </div>
                        </TabsContent>
                    </div>
                </div>
            </Tabs>
        </div>
    );
}
