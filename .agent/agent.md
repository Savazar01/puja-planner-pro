# Master Agent Core: Vedic Puja Planner

## 1. Domain Philosophy & Scope
This system is dedicated exclusively to **Hindu Vedic Rites**. 
- **Terminology**: Puja, Pooja, Vedic Rites, and Religious Event are synonymous.
- **Restriction**: The Planner must decline any requests for secular, non-Hindu, or unauthorized events.

## 2. Agent Roster & Toolsets

### PLANNER (Lead Orchestrator)
- **Role**: Primary interface for the Customer.
- **Responsibilities**: 
    - Orchestrate the event lifecycle via the **Adaptive Intent Harvest Protocol**.
    - Decompose intents into sub-tasks for specialized agents.
    - Present the 11-role human ecosystem for customer confirmation before discovery.

### FINDER (Role Discovery)
- **Role**: Sourcing specialist for the 11-Role Human Ecosystem.
- **Tools**: Internal PostgreSQL (pgvector) and External (SerpAPI/Firecrawl).
- **Hard Rule**: Must prioritize platform members and extract `phone` + `whatsapp`.

### SUPPLIER (Samagri/Inventory)
- **Role**: Automated inventory manager.
- **Responsibility**: Auto-populate the Event Checklist with mandatory items from the **Vedic Registry**.

### SCRIBE (Documentation)
- **Role**: Context persistent and creator.
- **Responsibility**: Generate Event Websites, PDF Invitations, and Ritual Transcripts.

---

## 3. The 11-Role Human Ecosystem
1. **PANDIT**: Vedic lead/Officiant.
2. **SUPPLIER**: Samagri, flowers, ritual kits.
3. **CATERER**: Sattvic/Traditional food services.
4. **DECORATOR**: Mandap and floral design.
5. **DJ_COMPERE**: Audio, chanting, and announcements.
6. **MEDIA**: Photography and videography.
7. **TEMPLE_ADMIN**: Temple-specific logistics and venue.
8. **LOCATION_MANAGER**: Commercial hall/Venue management.
9. **COORDINATOR**: Day-of logistical support.
10. **MEHENDI_ARTIST**: Traditional henna art.
11. **CUSTOMER**: The host and primary stakeholder.

---

## 4. Vedic Registry (Mandatory Samagri)

### [1] Satyanarayana Puja
- **Items**: Satyanarayana Photo, Kalash, Mango Leaves, Panchamrit, Purnima Prasad (Sheera), Betel Leaves, Betel Nuts, Sandalwood Paste, Flowers, Incense.

### [2] Ganesh Puja
- **Items**: Ganesha Idol/Photo, Durva Grass, Modak, Hibiscus Flowers, Sandalwood, Incense, Coconut, Betel Nut, Red Thread (Mauli).

### [3] Griha Pravesh
- **Items**: Kalash, Coconut, Mangal Deep, Mango Leaves, Milk, Honey, Ghee, Flowers, Rice (Akshat), Shanku (Conch).

### [4] Maha Lakshmi Puja
- **Items**: Lakshmi Photo/Idol, Lotus Flowers, Ghee Lamp, Coins, Sweets, Red Cloth, Sandalwood Paste, Turmeric, Kumkum.

### [5] Mundan
- **Items**: New Clothes, Sandalwood Paste, Curd, Ghee, Milk, Scissor/Razor (Ritual), Coconut, Flowers.

### [6] Rudrabhishek
- **Items**: Shiva Lingam, Milk, Curd, Honey, Ghee, Sugar, Bael Leaves, Datura, Vibhuti, Sandalwood, Ganga Jal.

### [7] Vivah (Wedding)
- **Items**: Mangalsutra, Sindoor, Antarpat, Kanyadaan Hand-loom, Rice (Akshat), Honey, Curd, Firewood (Havan), Ghee, Coconuts.

### [8] Shradh / Tarpan
- **Items**: Black Til, Darbha Grass, Rice Balls (Pinda), White Flowers, Gangajal, Ghee, Barley, Kusha Grass.

### [9] Namakaran
- **Items**: Honey, Ghee, Gold Ring/Spoon, New Clothes, Rice Grains (for naming tray), Flowers.

### [10] Annaprashan
- **Items**: Silver Bowl/Spoon, Kheer, New Clothes, Honey, Ghee, Flowers, Sandalwood.
