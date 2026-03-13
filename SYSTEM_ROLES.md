# Universal System Roles Definitions

This document codifies the roles within the Savaz ecosystem, defining their metadata schema, flexible discovery categories, and privacy-first onboarding protocols.

## 1. Role Matrix (JSONB Metadata Schema)

Each human role is primary defined by a `metadata` blob (JSONB) optimized for search relevance and agentic discovery.

| Role | Metadata Schema (JSONB) | Service_Categories |
| :--- | :--- | :--- |
| **Devotee** | `{"preferences": ["string"], "catering_nature": "string (Sattvik/Regular)", "location_radius": "int"}` | N/A |
| **Pandit** | `{"specialties": ["Ritualist", "Astrologer", "Muhurtam", "Ayurveda"], "experience_years": "int", "languages": ["string"]}` | `Puja`, `Wedding`, `Astrology`, `Ayurveda` |
| **Temple Admin** | `{"temple_name": "string", "deity": "string", "capacity": "int", "amenities": ["string"]}` | `Temple_Stay`, `Prasad`, `Rituals` |
| **Media** | `{"equipment": ["string"], "portfolio_url": "url", "base_rate": "decimal"}` | `Photography`, `Videography`, `Live_Stream` |
| **Caterer** | `{"cuisine": ["string"], "sattvik_option": "boolean", "min_guests": "int", "fssai_certified": "boolean"}` | `Food`, `Beverages`, `Sattvic_Kitchen` |
| **Decorator** | `{"themes": ["string"], "inventory_type": ["string"], "package_info": "json"}` | `Venue_Decor`, `Eco_Friendly` |
| **Site Manager**| `{"certification_level": "string", "managed_events_count": "int"}` | `Logistics`, `Coordination` |

---

## 2. Flexible Pandit Discovery (Wide Open)

To ensure a "Wide Open" search experience, the platform treats all Vedic and ritualistic practitioners under a unified discovery umbrella. Discovery is driven by `Service_Categories` rather than restrictive traditional boundaries (like Shakha).

*   **Service_Categories**:
    *   `Puja`: Satyanarayana, Ganesha, etc.
    *   `Wedding`: Vivaha, Pre-wedding rituals.
    *   `Astrology`: Horoscope reading, Kundali matching.
    *   `Ayurveda`: Consultations, Wellness tips.
    *   `Muhurtam`: Auspicious timing calculation.

---

## 3. Handshake Protocols

Onboarding is structured to balance ease-of-entry with professional accountability.

### Phase 1: Thin Onboarding (Identity & Role)
*Purpose: Low-friction initial funnel.*
- **Fields collected**: Legal Name, Primary Contact (masked), Selected Role, General Area.
- **Access Level**: Created profile; searchable by the Finder Agent for general availability.

### Phase 2: Event-Specific Detail Harvesting (KYC & Skills)
*Purpose: Unlocked upon event booking or professional verification.*
- **Fields collected**: Professional Certifications, Detailed Skills (Aastro/Veda), Bank/UPI (for settlements), Govt ID.
- **Access Level**: Validated professional status; eligible for premium matching and direct booking.

---

## 4. Privacy Gate Integration (Port 8740)

During the **Search and Matching** phase, the following fields are explicitly masked to maintain user privacy while allowing the Finder Agent to rank results.

| Field | Search visibility | Masking/Redaction Strategy |
| :--- | :--- | :--- |
| **Precise Location** | Redacted | Only 'City' or 'Sector' passed to AI agents. |
| **Phone Number** | Always Masked | Replaced with `<REDACTED>` for cloud inference. |
| **Email Address** | Always Masked | Not visible during initial discovery. |
| **Govt Identifiers** | NEVER Exposed | Processed locally; never shared with Cloud LLMs. |

---

## 5. Agentic Search Patterns (Finder Agent)

The Finder Agent queries use the `Service_Categories` and `specialties` keys to find practitioners.

- **Wide Open Search Example**: `Find Pandit where Service_Categories contains ['Ayurveda', 'Astrology']`
- **Result Logic**: Returns any practitioner tagged with those categories, regardless of their primary 'Role' designation being restricted to ritualists.
