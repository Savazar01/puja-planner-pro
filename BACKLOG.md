# Product Backlog & Roadmap

## Technical Debt & Integration Tasks
The current Frontend relies heavily on `src/data/mockData.ts`. To reach a production-ready state, the following integration tasks must be completed to wire the UI to the FastAPI Backend:

- **[Integration] Pandit Discovery:** Replace `mockPandits` with `GET /api/discover/pandits`.
- **[Integration] Temple/Venue Discovery:** Replace `mockTemples` with `GET /api/discover/venues`.
- **[Integration] Universal Search:** Ensure `SearchResults.tsx` fully relies on `POST /api/search` rather than fallback mocks.
- **[Integration] Guest Management:** Build backend CRUD for `mockGuests` to allow users to save RSVPs to PostgreSQL.
- **[Integration] Samagri Checklist:** Build backend CRUD for `mockChecklist` to persist event supplies.
- **[Integration] Admin Discovery Logs:** Replace `discoveryLogs` with a real-time tracking endpoint from the Python AI agents payload pipeline.

---

## Epic 1: Universal AI Search & Discovery
**Priority: Must-Have (MVP)**

- **Story 1.1:** As a User, I want to search for Pandits, Temples, and Venues by free-text and location, so that I can easily discover relevant services for my ceremony. *(Must-have)*
- **Story 1.2:** As a User, I want the system to scrape and extract real-time contact details and pricing via AI, so that I have accurate and up-to-date vendor information. *(Must-have)*
- **Story 1.3:** As an Unauthenticated User, I want to perform at least 1 free search, so that I can evaluate the platform's value before signing up. *(Must-have)*
- **Story 1.4:** As a User, I want to see visual indicators (Verified badge, Ratings) on vendor cards, so that I can trust the services I am booking. *(Should-have)*

## Epic 2: User Authentication & Authorization
**Priority: Must-Have (MVP)**

- **Story 2.1:** As a User, I want to sign up and log in securely, so that my event data and searches are saved to my account. *(Must-have)*
- **Story 2.2:** As the System, I want to restrict detailed contact information (Phone/WhatsApp) to authenticated members, so that we can drive user registration. *(Must-have)*
- **Story 2.3:** As a User, I want my premium tier (Silver/Gold/Platinum) to be tied to my account, so that I can access gated features like the Dashboard. *(Should-have)*

## Epic 3: Event Dashboard & Coordination
**Priority: Should-Have**

- **Story 3.1:** As an Event Host, I want to add, edit, and track guests on a centralized list, so that I know who has RSVP'd. *(Should-have)*
- **Story 3.2:** As an Event Host, I want a dynamic Samagri checklist divided by categories (Havan, Essentials), so that I don't forget important ritual items. *(Should-have)*
- **Story 3.3:** As an Event Host, I want to trigger WhatsApp invitations directly from the Guest List, so that I can efficiently invite my network. *(Could-have)*

## Epic 4: Admin Command Center
**Priority: Should-Have**

- **Story 4.1:** As an Administrator, I want to view a real-time feed of AI Discovery Logs, so that I can monitor how the AI agents are performing and caching data. *(Should-have)*
- **Story 4.2:** As an Administrator, I want to securely configure API keys (Serper, Firecrawl, Gemini) from the UI, so that I don't need to manually edit environment variables on the server. *(Could-have)*
- **Story 4.3:** As an Administrator, I want to toggle feature entitlements across pricing tiers, so that I can rapidly adjust paywalls dynamically. *(Could-have)*

## Epic 5: Premium Services & Payments
**Priority: Could-Have**

- **Story 5.1:** As a User, I want to upgrade my tier using a payment gateway, so that I can unlock unlimited searches and the Event Dashboard. *(Could-have)*
- **Story 5.2:** As a Platinum User, I want a dedicated portal to chat with my Event Coordinator, so that I receive white-glove vendor negotiation services. *(Could-have)*
