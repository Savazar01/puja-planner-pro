# SavazAI - MyPandits (Phase A Stable Baseline)

A robust, full-stack application designed for orchestration with container-based platforms like Coolify.

## 🏗 System Architecture
This project is built with a "Pure Docker" philosophy. It is intentionally decoupled from proxy-specific labels (like Traefik or Caddy labels) to ensure it can be deployed on any infrastructure with a standard load balancer.

### Service Status
- **Frontend:** React/Vite/Nginx (**Internal Port: 8734**) - Operational on port 443 (HTTPS) via Cloudflare.
- **Backend:** FastAPI/Python (**Internal Port: 8735**) - Operational on port 443 (HTTPS) via Cloudflare.
- **Privacy Gate:** Redaction Proxy (**Port 8740**) - Operational.
- **Customer Workspace**: Professional Event Canvas (RBAC enabled) - Active.
- **Database**: Postgres/pgvector (v17) - Supports Local Intelligence & PII Vault.
- **Cache/Vault**: Redis (alpine) - Search & Agentic Memory.
- **Sourcing Engine (Port 8735)**: Parallel Discovery (Internal DB + Web).

## 🧠 Intelligence Infrastructure [STATUS: ACTIVE & VERIFIED]
The Savaz Intelligence Stack is completely stable and operational on ports 8737-8739:
- **Open WebUI (Model Management Control Center):** Port 8737
- **Ollama-API Engine (Local LLM Execution):** Port 8738
- **Intelligence Handshake:** Parallel Search Logic (Internal + External)
- **Privacy Gate (8740):** Automated Anonymization for external LLM/Search calls.
## 🔌 Networking & Configuration
Connectivity is managed entirely through environment variables to allow for environment-specific scaling:
- `FRONTEND_PORT`: Controls the internal Nginx listener and external mapping.
- `BACKEND_PORT`: Controls the API listener and internal service discovery.
- `VITE_API_URL`: The public-facing URL of your Backend API.
- **Service Discovery**: The Backend and Database communicate seamlessly over the internal `savaz-prod-net` bridging network using strict service-name resolution (e.g., `DB_HOST=savaz_db`).

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 20+ (for local development)
- Python 3.11+ (for local development)
- API Keys:
  - [Serper.dev](https://serper.dev)
  - [Firecrawl](https://firecrawl.dev)
  - [Google Gemini](https://makersuite.google.com/app/apikey)

### Local Development with Docker

1. **Clone the repository**

```bash
git clone <your-repo-url>
cd puja-planner-pro
```

2. **Set up environment variables**

```bash
# Backend
cd backend
cp .env.example .env
# Edit .env and add your API keys

# Frontend
cd ..
cp .env.example .env
# Edit .env if needed
```

3. **Start all services**

```bash
docker-compose up --build
```

4. **Access the application**

- Frontend: http://localhost:8734
- Backend API: http://localhost:8735
- API Documentation: http://localhost:8735/docs

### Local Development without Docker

#### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Start PostgreSQL (or use Docker for just the database)
docker run -d -p 5432:5432 -e POSTGRES_USER=puja_user -e POSTGRES_PASSWORD=puja_password -e POSTGRES_DB=puja_planner postgres:15

# Run backend
uvicorn main:app --reload --port 8000
```

#### Frontend

```bash
npm install
npm run dev
```

## Project Structure

```
puja-planner-pro/
├── backend/
│   ├── main.py              # FastAPI application
│   ├── config.py            # Configuration settings
│   ├── database.py          # Database connection
│   ├── models.py            # SQLAlchemy models
│   ├── schemas.py           # Pydantic schemas
│   ├── routes.py            # API endpoints
│   ├── discovery_agent.py   # AI Discovery Agent
│   ├── requirements.txt     # Python dependencies
│   └── Dockerfile
├── src/
│   ├── components/          # React components
│   ├── pages/              # Page components
│   ├── lib/                # API client and utilities
│   ├── contexts/           # React contexts
│   └── data/               # Mock data (for fallback)
├── docker-compose.yml       # Multi-container setup
├── Dockerfile               # Frontend container
├── nginx.conf              # Nginx configuration
├── DEPLOYMENT.md           # Deployment guide
└── README.md
```

### User-Facing Roles (Architecture Registry)
**CRITICAL**: The application strictly forbids the creation or hallucination of new user types. All roles MUST map to the registered `/agents` and `/humans` directories.

- **Customer**: The primary host and decision-maker. Accesses the **Event Canvas** (`/event-orchestration`) and the **Customer Dashboard** (`/dashboard`).
- **Human Specialists**: Verified professionals (e.g., **Pandit**, **Caterer**, **Decorator**, **Location Manager**, **Media**, **Mehendi Artist**, **DJ/Compere**). Managed via their respective Dashboards.
- **Admin**: System administrator overseeing the ecosystem. Accesses the **Admin Center**.

## 🚀 Key Features
- **Event Planning Hub**: Family-focused workspace at `/event-orchestration` for managing rituals.
  - **Planning**: Agent-driven sourcing for Pandits and services.
  - **Guests**: Simple RSVP and guest list management.
  - **Supplies**: Friendly checklists for ritual items.
- **My Events**: Warm, centralized hub at `/customer-dashboard` for tracking upcoming rituals.
- **Agentic Sourcing Engine**: Fully activated parallel discovery.
  - **Live Web Research**: Real-time results via SerpAPI and Firecrawl.
  - **Internal Prioritization**: Automatic flagging of registered "Verified Members".
  - **Privacy First**: All external intelligence calls are routed through the Privacy Gate (8740).
  - **Handshake Flow**: Seamless partner selection and ritual planning integration.
- **Production-Ready Canvas**:
  - **Zero Demo Data**: All hardcoded mock events and legacy seed data have been purged.
  - **Metadata Management**: Customers can now edit event core details (Title, Date, Time, Location) with persistent backend synchronization.

---
**Note**: The UI has been simplified to use warm, non-technical language (**"Event Planning"**, **"My Events"**) to serve Customers as a helpful assistant rather than a technical tool.
