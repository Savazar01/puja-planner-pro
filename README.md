# SavazAI - MyPandits (Phase A Stable Baseline)

A robust, full-stack application designed for orchestration with container-based platforms like Coolify.

## 🏗 System Architecture
This project is built with a "Pure Docker" philosophy. It is intentionally decoupled from proxy-specific labels (like Traefik or Caddy labels) to ensure it can be deployed on any infrastructure with a standard load balancer.

### Service Status
- **Frontend:** React/Vite/Nginx (Internal Port: 8734) - **Operational**
- **Backend:** FastAPI/Python (Internal Port: 8735) - **Operational**
- **Privacy Gate:** Privacy Gate (Port 8740) - **Operational**
- **Customer Canvas:** Protected Event Workspace (RBAC enabled) - **Active**
- **Database:** Postgres/pgvector (v17)
- **Cache/Vault:** Redis (alpine)

## 🧠 Intelligence Infrastructure [STATUS: ACTIVE & VERIFIED]
The Savaz Intelligence Stack is completely stable and operational on ports 8737-8739:
- **Open WebUI (Model Management Control Center):** Port 8737
- **Ollama-API Engine (Local LLM Execution):** Port 8738
- **Redis (Intelligence Cache & PII Vault):** Port 8739
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

## Features

### Discovery Agent

The backend includes an intelligent Discovery Agent that:

1. **Searches** using Serper.dev for local businesses
2. **Scrapes** detailed information using Firecrawl
3. **Parses** unstructured data into JSON using Gemini AI
4. **Caches** results for 24 hours to minimize API costs
5. **Stores** discovered entities in PostgreSQL

### API Endpoints

- `POST /api/search` - Universal search across all categories
- `GET /api/discover/pandits` - Discover Pandits by location
- `GET /api/discover/venues` - Discover Venues by location
- `GET /api/discover/catering` - Discover Catering services
- `POST /api/auth/forgot-password` - Request a password reset email
- `POST /api/auth/reset-password` - Reset password using JWT token
- `GET /health` - Health check

### Frontend Features

- Search for Pandits, Temples, and Venues
- Event management dashboard
- Guest list management
- Event checklist tracking
- Protected Customer Workspace (Agentic Event Canvas)
- Authentication with tiered access & RBAC
- Password management & recovery
- Administrative Dashboard (Pending Requests & Active Users)
- Responsive design with premium UI

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for comprehensive deployment instructions including:

- Local development setup
- Coolify deployment on Debian 13 VPS
- Manual deployment with Docker
- Nginx configuration
- SSL setup with Certbot
- Troubleshooting guide

## Environment Variables

### Backend (.env)

```env
DATABASE_URL=postgresql://user:password@postgres:5432/puja_planner
SERPER_API_KEY=your_serper_api_key
FIRECRAWL_API_KEY=your_firecrawl_api_key
GEMINI_API_KEY=your_gemini_api_key
RESEND_API_KEY=your_resend_api_key
ENVIRONMENT=development
DEBUG=True
CORS_ORIGINS=http://localhost:5173,http://localhost:8734
CACHE_EXPIRY_HOURS=24
ADMIN_USER=your_admin_email@example.com
ADMIN_PASSWORD=your_admin_password_here
SECRET_KEY=your_secret_key
```

### Frontend (.env)

```env
VITE_API_URL=https://{YOUR_API_DOMAIN}
FRONTEND_HOST={YOUR_DOMAIN}
BACKEND_HOST={YOUR_API_DOMAIN}
FRONTEND_PORT=8734
BACKEND_PORT=8735
```

### Dynamic Port Forwarding
The infrastructure is strictly template-driven via Docker Compose. Ensure `FRONTEND_PORT` and `BACKEND_PORT` match any downstream proxy rules (Coolify / Traefik) and internal mappings will automatically decouple to the target without the need for static configurations.

## Scripts

```bash
# Frontend
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run test         # Run tests

# Docker
docker-compose up --build   # Build and start all services
docker-compose down         # Stop all services
docker-compose logs -f      # View logs
docker-compose ps           # List running containers
```

## Tech Stack

**Frontend:**
- React 18
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui components
- React Query
- React Router
- Framer Motion

**Backend:**
- FastAPI
- SQLAlchemy
- Postgres/pgvector (v17)
- Redis (alpine)
- Pydantic
- httpx
- Google Generative AI
  
**DevOps:**
- Docker
- Docker Compose
- Nginx
- Coolify (deployment)

## License

All rights reserved.

## Support

For deployment issues, see [DEPLOYMENT.md](./DEPLOYMENT.md#troubleshooting).

For API documentation, visit the `/docs` endpoint when the backend is running.

---
**Note**: As of v3.1.0, the **'Devotee'** role has been deprecated and Consolidated under the **'Customer'** role to streamline agentic orchestration.
