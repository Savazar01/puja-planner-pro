# Deployment Guide (Coolify / Docker Compose)

This guide outlines how to deploy this stack using a Docker Compose build pack.

## 🚀 Critical Setup Steps

### 1. Environment Variables
You must set the following variables in your deployment dashboard:

| Variable | Recommended Value | Description |
| :--- | :--- | :--- |
| `FRONTEND_PORT` | `8734` | The port the web container listens on. |
| `BACKEND_PORT` | `8735` | The port the API container listens on. |
| `VITE_API_URL` | `https://{YOUR_API_DOMAIN}` | The public URL for your Backend. |
| `POSTGRES_PASSWORD` | `{GENERATED_SECRET}` | Database credentials. |
| `RESEND_API_KEY` | `re_123456789...` | API Key for transactional email dispatch. |
| `ADMIN_USER` | `admin@example.com` | Automated master account creation email (First Boot). |
| `ADMIN_PASSWORD` | `{GENERATED_SECRET}` | Automated master account password (First Boot). |
| `SECRET_KEY` | `{GENERATED_SECRET}` | Encryption key for securing JWT tokens. |

### 2. The Proxy Handshake (Port Mapping)
If you are using a proxy (like Traefik or Caddy) through a UI like Coolify, you must explicitly bridge the domain to the container port. 

**Configure your domains as follows:**
- **Web Interface:** `https://{YOUR_DOMAIN}:8734`
- **API Service:** `https://{YOUR_API_DOMAIN}:8735`
- **Intelligence Stack (Open WebUI):** `https://owebui.fossone.app:8737` (or your custom alias)

#### ☁️ Cloudflare Integration (Critical Security)
It is strictly required to enable **Cloudflare Proxy (Orange Cloud)** for `owebui.fossone.app` (and any AI-related subdomains). This masks the VPS origin IP and adds an essential layer of security over your intelligence endpoints. It requires HTTPS strictly.

#### 🛡️ Verified Connectivity & The "Green Link"
The Docker Compose stack natively leverages the `depends_on: service_healthy` pattern. The Open WebUI container is securely gated to only start once the `ollama-api` has completed its health checks, eradicating "Network Problem" errors on cold boots.
For this handshake to permanently stay connected, the internal connection URL must be **`http://ollama-api:11434`** (this is the "Green Link").

*Note: The `:PORT` suffix tells the internal load balancer which container port to target. The public will still access your site via standard HTTPS (443).*

### 3. Networking
The stack expects an external network named `savaz-prod-net` for database isolation. Ensure this network is created on your host before deploying:
`docker network create savaz-prod-net`

### 4. Internal Service Discovery
For the backend to successfully connect to the database, explicitly set `DB_HOST=savaz_db` in your environment variables. This matches the internal Docker Compose service name.
Using generic hostnames like `postgres` or `localhost` will fail to resolve via the internal Docker DNS on Coolify and will cause persistent **Gateway Timeouts**.

### 5. Model Management (Open WebUI)
The Savaz Intelligence Stack relies on **Open WebUI** for model management instead of automated startup scripts.

#### Model Baseline
After initial deployment, the following standard baseline models must be pulled via the Admin UI:
- `qwen2.5:3b`
- `nomic-embed-text`

To pull required models (e.g., `qwen2.5:3b` and `nomic-embed-text`):
1. Navigate to your Open WebUI dashboard.
2. Go to **Settings > Admin > Models**.
3. Enter the model's name in the text input and click the download button to pull it.
