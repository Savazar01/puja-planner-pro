# CLAUDE.md — Technical Guide & Standards

## Project DNA
- **Backend**: FastAPI (Python 3.11)
- **Frontend**: Next.js / Vite (React 18+)
- **Database**: PostgreSQL with `pgvector` extension
- **Caching/Memory**: Redis (Standard Alpine image)
- **AI/LLM**: Gemini (Primary via Privacy Gate), Claude (Developer Interface)

## Build & Development Commands
### Backend
- **Install**: `pip install -r backend/requirements.txt`
- **Dev Server**: `python -m uvicorn main:app --reload --port 8735`
- **Test**: `pytest`
- **Lint**: `flake8 backend`

### Frontend
- **Install**: `npm install`
- **Dev Server**: `npm run dev`
- **Build**: `npm run build`
- **Lint**: `npm run lint`

### Infrastructure
- **Full Boot**: `docker compose up -d`
- **Build All**: `docker compose build --no-cache`
- **Stop**: `docker compose down`

## Infrastructure Lockdown (Immutable Defaults)
The following files are **READ-ONLY** and must not be modified without explicit chat proposal/approval:
- `docker-compose.yml`
- `Dockerfile` (Root & Backend)
- `backend/database.py` (Engine Configuration)
- `nginx/` (Proxy Configurations)

### Configuration Rules
1. **Variable Safety**: Use `$$` for all literal `$` characters in configuration files to prevent interpolation errors.
2. **Resource Caps**: No new service or image pull exceeding **500MB** is permitted without approval.
3. **Internal Networking**: Services MUST communicate via the `savaz-prod-net` internal bridge using service names (e.g., `http://backend:8735`).

## Backend Stability Standards
1. **DB Pooling**: All SQLAlchemy engines must use:
   - `pool_pre_ping=True`
   - `pool_recycle=300`
   - `connect_timeout=10`
2. **Timeouts**: A global **25-second** request timeout middleware is mandatory.
3. **Auth**: Use `SECRET_KEY` as the primary JWT signing variable.

## Development Workflow
- **Commit Messages**: Use [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:`, `docs:`).
- **Sequential Boot**: Always verify `savaz_db` and `redis` health before launching application containers.
- **Privacy Gate**: All LLM calls must pass through the Privacy Gate (Port 8740) for PII masking.
