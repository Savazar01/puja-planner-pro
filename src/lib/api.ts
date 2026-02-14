import { Pandit, Temple } from "@/data/mockData";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

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
export async function searchAll(query: string, location?: string): Promise<SearchResponse> {
    const body: SearchRequest = {
        query,
        location: location || undefined,
        category: "all"
    };

    const response = await fetch(`${API_URL}/api/search`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
    }

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

/**
 * Health check endpoint
 */
export async function healthCheck(): Promise<{ status: string; service: string }> {
    const response = await fetch(`${API_URL}/health`);

    if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
}
