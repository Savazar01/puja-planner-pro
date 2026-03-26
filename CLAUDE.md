# Puja Planner Pro Technical Constitution

## 🛠 Tech Stack
- **Frontend**: Next.js, Vite, TailwindCSS (for specific components), Lucide-React.
- **Backend**: FastAPI, SQLAlchemy (PostgreSQL/pgvector), Redis.
- **LLM Context**: Gemini-1.5-Pro/Flash.
- **Standard Port**: 8740 (Privacy Gate).

## 🏗 Build & Test Commands
- **Install Dependencies**: `npm install` (Frontend), `pip install -r backend/requirements.txt` (Backend).
- **Build Infrastructure**: `docker compose build`.
- **Run Locally**: `docker compose up`.
- **Linting**: `npm run lint`.
- **Testing**: `pytest backend/`.

## 📜 Absolute Development Laws

### 1. Immutable Infrastructure
> [!IMPORTANT]
> The following files are **READ-ONLY**. Propose changes in chat before editing:
> - `docker-compose.yml`
> - `Dockerfile` / `backend/Dockerfile`
> - `backend/database.py`
> - `nginx.conf`

### 2. Variable Safety
- **Interpolation**: Use `$$` for all environment variables in config files (e.g., `docker-compose.yml`) to prevent shell interpolation errors.
- **Escaping**: No unescaped `$` signatures allowed in `.env` or configuration templates.

### 3. Stability & Networking
- **Database**: Mandate `pool_pre_ping=True`, `pool_recycle=300`, and `connect_timeout=10`.
- **Middleware**: Every backend request must pass through the **25s Global Timeout Middleware** to prevent proxy hangs.
- **Service Discovery**: Use internal service names (`savaz_db`, `backend`, `redis`) for container communication.

## 👥 Definitive 11-Role Mapping Truth

| Agent/File Role | Database user_type | UI Display Name | Role Description |
| :--- | :--- | :--- | :--- |
| **PANDIT** | `pandit` | Pandit | Vedic Priest / Lead |
| **SUPPLIER** | `supplier` | Supplier | Samagri & Ritual Items |
| **CATERER** | `caterer` | Caterer | Food & Prasadam Services |
| **DECORATOR** | `decorator` | Decorator | Mandap & Floral Arrangements |
| **DJ_COMPERE** | `dj_compere` | DJ & Compere | Audio, Chanting & Announcements |
| **MEDIA** | `media` | Media | Photography & Videography |
| **TEMPLE_ADMIN** | `temple_admin` | Temple Admin | Temple Event/Venue Management |
| **LOCATION_MANAGER** | `location_manager` | Location Manager | Commercial Hall/Venue Management |
| **COORDINATOR** | `coordinator` | Coordinator | Day-of Logistical Support |
| **MEHENDI_ARTIST** | `mehendi_artist` | Mehendi Artist | Traditional Henna Art |
| **CUSTOMER** | `customer` | Customer | The Primary Stakeholder / Host |

> [!NOTE]
> All search logic in `Finder` and all UI labels in `Frontend` must strictly adhere to the **UI Display Name** and **Database user_type** defined above.
