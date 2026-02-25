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

### 2. The Proxy Handshake (Port Mapping)
If you are using a proxy (like Traefik or Caddy) through a UI like Coolify, you must explicitly bridge the domain to the container port. 

**Configure your domains as follows:**
- **Web Interface:** `https://{YOUR_DOMAIN}:8734`
- **API Service:** `https://{YOUR_API_DOMAIN}:8735`

*Note: The `:PORT` suffix tells the internal load balancer which container port to target. The public will still access your site via standard HTTPS (443).*

### 3. Networking
The stack expects an external network named `savaz-prod-net` for database isolation. Ensure this network is created on your host before deploying:
`docker network create savaz-prod-net`

### 4. Internal Service Discovery
For the backend to successfully connect to the database, explicitly set `DB_HOST=savaz_db` in your environment variables. This matches the internal Docker Compose service name.
Using generic hostnames like `postgres` or `localhost` will fail to resolve via the internal Docker DNS on Coolify and will cause persistent **Gateway Timeouts**.
