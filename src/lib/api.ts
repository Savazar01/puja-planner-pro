import { Pandit, Temple } from "@/data/mockData";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8735";

export interface SearchResponse {
    pandits: Pandit[];
    venues: any[];
    catering: any[];
    total_results: number;
    cached: boolean;
    timestamp: string;
}

export interface SearchRequest {
    query: string;
    location?: string;
    category?: string;
}

/**
 * Search across all categories (Pandits, Venues, Catering)
 */
export async function searchAll(query: string, location?: string, token?: string): Promise<SearchResponse> {
    const body: SearchRequest = {
        query,
        location: location || undefined,
        category: "all"
    };

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(`${API_URL}/api/search`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        if (response.status === 429 || response.status === 403) throw new Error("limit_reached");
        throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
}

export async function login(email: string, password: string) {
    const formData = new URLSearchParams();
    formData.append("username", email);
    formData.append("password", password);

    const response = await fetch(`${API_URL}/api/auth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData,
    });
    if (!response.ok) throw new Error("Invalid credentials");
    return response.json();
}

export async function registerUser(data: any) {
    const response = await fetch(`${API_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Registration failed");
    }
    return response.json();
}

export async function getMe(token: string) {
    const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) throw new Error("Unauthorized");
    return response.json();
}

/**
 * Discover Pandits in a specific location
 */
export async function discoverPandits(location: string): Promise<Pandit[]> {
    const response = await fetch(
        `${API_URL}/api/discover/pandits?location=${encodeURIComponent(location)}`
    );

    if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Discover Venues in a specific location
 */
export async function discoverVenues(location: string): Promise<any[]> {
    const response = await fetch(
        `${API_URL}/api/discover/venues?location=${encodeURIComponent(location)}`
    );

    if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Discover Catering services in a specific location
 */
export async function discoverCatering(location: string): Promise<any[]> {
    const response = await fetch(
        `${API_URL}/api/discover/catering?location=${encodeURIComponent(location)}`
    );

    if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
}

export async function healthCheck(): Promise<{ status: string; service: string }> {
    const response = await fetch(`${API_URL}/health`);

    if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
}

export async function getAllUsers(token: string) {
    const response = await fetch(`${API_URL}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) throw new Error("Failed to fetch users");
    return response.json();
}

export async function approveUser(id: string, status: string, token: string) {
    const response = await fetch(`${API_URL}/api/admin/approve/${id}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
    });
    if (!response.ok) throw new Error("Failed to update user status");
    return response.json();
}

export async function getEmails(token: string) {
    const response = await fetch(`${API_URL}/api/admin/emails`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) throw new Error("Failed to fetch emails");
    return response.json();
}

export async function updateEmail(id: number, data: { subject?: string; body_html?: string }, token: string) {
    const response = await fetch(`${API_URL}/api/admin/emails/${id}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to update email template");
    return response.json();
}

export async function updateProfile(data: { whatsapp?: string; location?: string }, token: string) {
    const response = await fetch(`${API_URL}/api/users/me/profile`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to update profile");
    return response.json();
}

export async function requestAccountDeletion(token: string) {
    const response = await fetch(`${API_URL}/api/users/me/request-deletion`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) throw new Error("Failed to request deletion");
    return response.json();
}

export async function changePassword(data: any, token: string) {
    const response = await fetch(`${API_URL}/api/auth/change-password`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.detail || "Failed to change password");
    return result;
}

export async function forgotPassword(email: string) {
    const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.detail || "Failed to process request");
    return result;
}

export async function resetPassword(token: string, new_password: string) {
    const response = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.detail || "Failed to reset password");
    return result;
}
