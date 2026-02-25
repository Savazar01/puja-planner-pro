# Coolify Deployment Guide

This project is optimized for Coolify v4+ using the **Docker Compose Build Pack**.

## 🚀 Critical Deployment Steps

### 1. Environment Variables
Ensure the following are set in the Coolify Service UI:
| Variable | Description |
| :--- | :--- |
| `FRONTEND_PORT` | Set to `8734` |
| `BACKEND_PORT` | Set to `8735` |
| `VITE_API_URL` | `https://pujaapi.fossone.app` |
| `POSTGRES_PASSWORD` | Strong generated string |

### 2. The "Domain-Port" Bridge (Traefik/Caddy)
To ensure the proxy routes traffic correctly without manual labels in the YAML, you **must** include the port in the domain field in the Coolify UI:

- **Frontend Domain:** `https://puja.fossone.app:8734`
- **Backend Domain:** `https://pujaapi.fossone.app:8735`

*Note: The proxy will still serve traffic on standard 443; the port suffix tells Coolify's internal load balancer which container port to target.*

### 3. Healthchecks
The project uses `curl`-based healthchecks. If the container remains "Unhealthy" in the UI, verify that the `FRONTEND_PORT` inside the container matches the healthcheck URL.
