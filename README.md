# Puja Planner Pro

A comprehensive platform for planning Pujas, Weddings, and religious ceremonies. Features an intelligent Discovery Agent that finds local Pandits, Venues, and Catering services using AI-powered web scraping and parsing.

## Architecture

### Frontend
- **Framework**: Vite + React + TypeScript
- **UI Library**: shadcn/ui with Tailwind CSS
- **State Management**: React Query (TanStack Query)
- **Routing**: React Router v6

### Backend
- **Framework**: FastAPI (Python 3.11)
- **Database**: PostgreSQL 15
- **AI Services**:
  - **Serper.dev**: Local business search
  - **Firecrawl**: Web scraping
  - **Google Gemini 1.5 Flash**: Data parsing and structuring

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Deployment**: Coolify on Debian 13 VPS
- **Web Server**: Nginx (for production frontend)

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
- `GET /health` - Health check

### Frontend Features

- Search for Pandits, Temples, and Venues
- Event management dashboard
- Guest list management
- Event checklist tracking
- Authentication with tiered access
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
ENVIRONMENT=development
DEBUG=True
CORS_ORIGINS=http://localhost:5173,http://localhost:8734
CACHE_EXPIRY_HOURS=24
```

### Frontend (.env)

```env
VITE_API_URL=https://api.savaz.fossone.app
FRONTEND_HOST=savaz.fossone.app
BACKEND_HOST=api.savaz.fossone.app
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
- PostgreSQL
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
