# Puja Planner Pro - Deployment Guide

## Prerequisites

### Required API Keys

Before deploying, ensure you have the following API keys:

1. **Serper.dev API Key**
   - Sign up at [https://serper.dev](https://serper.dev)
   - Free tier: 2,500 queries/month
   - Get your API key from the dashboard

2. **Firecrawl API Key**
   - Sign up at [https://firecrawl.dev](https://firecrawl.dev)
   - Free tier available
   - Get your API key from account settings

3. **Google Gemini API Key**
   - Visit [https://makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)
   - Create a new API key
   - Free tier: 60 requests per minute

### Server Requirements

- **VPS**: Debian 13 (or Ubuntu 22.04+)
- **RAM**: Minimum 2GB (4GB recommended)
- **Storage**: Minimum 20GB
- **CPU**: 2 cores recommended
- **Docker**: Version 20.10+
- **Docker Compose**: Version 2.0+

---

## Local Development

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd puja-planner-pro
```

### 2. Set Up Backend Environment

```bash
cd backend
cp .env.example .env
```

Edit `.env` and add your API keys:

```env
DATABASE_URL=postgresql://puja_user:puja_password@localhost:5432/puja_planner
SERPER_API_KEY=your_actual_serper_key
FIRECRAWL_API_KEY=your_actual_firecrawl_key
GEMINI_API_KEY=your_actual_gemini_key
ENVIRONMENT=development
DEBUG=True
CORS_ORIGINS=http://localhost:5173,http://localhost:8734
CACHE_EXPIRY_HOURS=24
```

### 3. Set Up Frontend Environment

```bash
cd ..
cp .env.example .env
```

Add:

```env
VITE_API_URL=http://localhost:8735
```

### 4. Start Services with Docker Compose

```bash
# Build and start all services
docker-compose up --build

# Or run in detached mode
docker-compose up -d --build
```

Services will be available at:
- **Frontend**: http://localhost:8734
- **Backend API**: http://localhost:8735
- **API Docs**: http://localhost:8735/docs
- **PostgreSQL**: localhost:5432 (internal only)

### 5. Verify Setup

```bash
# Check all services are running
docker-compose ps

# Check backend health
curl http://localhost:8735/health

# Check frontend
curl http://localhost:8734
```

### 6. View Logs

```bash
# All logs
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### 7. Stop Services

```bash
docker-compose down

# Stop and remove volumes (WARNING: This deletes all data)
docker-compose down -v
```

---

## Coolify Deployment on Debian 13 VPS

> [!IMPORTANT]
> **Reverse Proxy Architecture**
> - **Coolify uses Traefik** as its reverse proxy (NOT Nginx)
> - Traefik automatically handles:
>   - SSL/TLS certificates (Let's Encrypt)
>   - Domain routing
>   - Load balancing
>   - Service discovery
> - The `nginx.conf` in this project is used **inside the frontend container** to serve static files
> - You do NOT need to configure external Nginx when using Coolify

### Step 1: Server Setup

#### 1.1 Update System

```bash
sudo apt update && sudo apt upgrade -y
```

#### 1.2 Install Docker

```bash
# Install prerequisites
sudo apt install -y apt-transport-https ca-certificates curl gnupg lsb-release

# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Set up the repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Verify installation
docker --version
docker compose version
```

#### 1.3 Install Coolify

```bash
# Install Coolify
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash

# Check Coolify status
systemctl status coolify
```

Access Coolify at: `http://YOUR_VPS_IP:3000`

### Step 2: Configure Coolify

#### 2.1 Initial Setup

1. Open browser to `http://YOUR_VPS_IP:3000`
2. Create admin account
3. Set up your deployment server (localhost)

#### 2.2 Create New Project

1. Click "New Project"
2. Name: "Puja Planner Pro"
3. Environment: "Production"

#### 2.3 Add Environment Variables

In Coolify dashboard, navigate to your project and add these environment variables:

```env
# Backend API Keys (REQUIRED)
SERPER_API_KEY=<your-serper-key>
FIRECRAWL_API_KEY=<your-firecrawl-key>
GEMINI_API_KEY=<your-gemini-key>

# Database
DATABASE_URL=postgresql://puja_user:STRONG_RANDOM_PASSWORD@postgres:5432/puja_planner

# Application Settings
ENVIRONMENT=production
DEBUG=False
CORS_ORIGINS=https://yourdomain.com,https://api.yourdomain.com

# Frontend
VITE_API_URL=https://api.yourdomain.com
```

### Step 3: Deploy with Coolify

> [!NOTE]
> **How Coolify + Traefik Works**
> 
> Coolify automatically:
> 1. Detects your `docker-compose.yml`
> 2. Builds and starts containers
> 3. Configures Traefik labels for routing
> 4. Provisions SSL certificates
> 5. Routes traffic: `yourdomain.com` → frontend container, `api.yourdomain.com` → backend container

#### 3.1 Deploy from Git Repository

1. In Coolify, click "New Resource" → "Docker Compose"
2. Select "Git Repository"
3. Enter your repository URL: `https://github.com/Savazar01/puja-planner-pro`
4. Select branch (e.g., `main`)
5. Coolify will detect `docker-compose.yml` automatically

#### 3.2 Configure Domains

In Coolify's domain settings, assign domains to your services:

1. **Frontend Service** (`frontend` container):
   - Domain: `yourdomain.com` (or `www.yourdomain.com`)
   - Port: 80 (internal container port)
   - Traefik will route external traffic to this container

2. **Backend Service** (`backend` container):
   - Domain: `api.yourdomain.com`
   - Port: 8000 (internal container port)
   - Traefik will route external traffic to this container

> [!IMPORTANT]
> **Port Mapping with Traefik**
> - The ports in `docker-compose.yml` (8734, 8735) are for **local development only**
> - Coolify/Traefik ignores these port mappings and routes via domains
> - Traefik connects to **internal container ports** (80 for frontend, 8000 for backend)
> - No need to expose ports when deploying with Coolify

Coolify will automatically provision SSL certificates via Let's Encrypt.

#### 3.3 Update Environment Variables for Production

Make sure to update these environment variables in Coolify:

```env
# Update CORS to use your actual domains
CORS_ORIGINS=https://yourdomain.com,https://api.yourdomain.com

# Update frontend API URL
VITE_API_URL=https://api.yourdomain.com
```

#### 3.4 Deploy

Click "Deploy" and monitor the build logs. Coolify will:
1. Clone your repository
2. Build Docker images
3. Start all services
4. Configure Traefik reverse proxy with SSL
5. Route traffic based on domain names

### Step 4: Verify Deployment

```bash
# Check if services are running
docker ps

# Check backend health
curl https://api.yourdomain.com/health

# Check frontend
curl https://yourdomain.com
```

### Step 5: Database Initialization

The database tables are created automatically when the backend starts (via SQLAlchemy's `Base.metadata.create_all()`). However, if you want to use Alembic migrations:

```bash
# Access backend container
docker exec -it puja-backend bash

# Run migrations (once Alembic is set up)
# alembic upgrade head
```

---

## Alternative: Manual Deployment (Without Coolify)

> [!WARNING]
> **This Section Uses Nginx as External Reverse Proxy**
> 
> This manual deployment method is an **alternative** to Coolify and does NOT use Traefik.
> - If you're using Coolify, skip this entire section
> - This is for users who want to deploy without Coolify
> - Uses Nginx as the external reverse proxy (NOT Traefik)

### 1. Clone Repository on Server

```bash
git clone <your-repo-url>
cd puja-planner-pro
```

### 2. Set Up Environment Variables

```bash
# Copy production environment template
cp .env.production.example .env.production

# Edit with your values
nano .env.production
```

### 3. Build and Start

```bash
# Load environment variables
export $(cat .env.production | xargs)

# Start services
docker-compose up -d --build
```

### 4. Set Up Nginx Reverse Proxy

```bash
sudo apt install nginx

# Create nginx config
sudo nano /etc/nginx/sites-available/puja-planner
```

Add:

```nginx
# Backend API
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:8735;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Frontend
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:8734;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable site and restart nginx:

```bash
sudo ln -s /etc/nginx/sites-available/puja-planner /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 5. Set Up SSL with Certbot

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d api.yourdomain.com
```

---

## Troubleshooting

### Backend Issues

#### 1. API Keys Not Working

```bash
# Check environment variables in container
docker exec puja-backend env | grep API_KEY

# Restart with new env vars
docker-compose down
docker-compose up -d
```

#### 2. Database Connection Failed

```bash
# Check postgres logs
docker-compose logs postgres

# Check if postgres is ready
docker exec puja-postgres pg_isready -U puja_user

# Restart database
docker-compose restart postgres
```

#### 3. Discovery Agent Errors

```bash
# Check backend logs for specific API errors
docker-compose logs backend | grep -i error

# Test Serper API manually
curl -X POST https://google.serper.dev/search \
  -H "X-API-KEY: YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"q":"test"}'
```

### Frontend Issues

#### 1. Can't Connect to Backend

- Check `VITE_API_URL` environment variable
- Verify CORS settings in backend
- Check browser console for CORS errors

#### 2. Build Failures

```bash
# Clear build cache
docker-compose build --no-cache frontend

# Check for npm errors
docker-compose logs frontend
```

### Database Issues

#### 1. Data Persistence

```bash
# List volumes
docker volume ls

# Inspect postgres volume
docker volume inspect puja-planner-pro_postgres_data
```

#### 2. Reset Database (CAUTION)

```bash
docker-compose down -v
docker-compose up -d
```

---

## Monitoring & Maintenance

### Health Checks

```bash
# Check all services
curl https://api.yourdomain.com/health
curl https://yourdomain.com

# View service status
docker-compose ps
```

### Logs

```bash
# Tail all logs
docker-compose logs -f

# Last 100 lines
docker-compose logs --tail=100

# Filter by time
docker-compose logs --since 30m
```

### Updates

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose up -d --build

# Check status
docker-compose ps
```

### Backup Database

```bash
# Create backup
docker exec puja-postgres pg_dump -U puja_user puja_planner > backup_$(date +%Y%m%d).sql

# Restore backup
cat backup_20260214.sql | docker exec -i puja-postgres psql -U puja_user puja_planner
```

---

## Performance Optimization

### Backend

1. **Increase workers** in production:
   ```dockerfile
   CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
   ```

2. **Enable caching**: The system already caches search results for 24 hours

3. **Database indexing**: Already configured on location and query_hash fields

### Frontend

1. **CDN**: Use a CDN for static assets
2. **Compression**: Gzip already enabled in nginx config
3. **Caching**: Static assets cached for 1 year

---

## Security Checklist

- [ ] Change default PostgreSQL password
- [ ] Use strong API keys
- [ ] Enable SSL/TLS certificates (Certbot)
- [ ] Set `DEBUG=False` in production
- [ ] Configure firewall (UFW)
- [ ] Regular backups
- [ ] Keep Docker and packages updated
- [ ] Monitor logs for suspicious activity

---

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review Docker logs
3. Check backend API documentation at `/docs`
4. Verify all environment variables are set correctly

---

## Quick Reference

### Useful Commands

```bash
# View all running containers
docker ps

# Restart specific service
docker-compose restart backend

# View resource usage
docker stats

# Clean up old images
docker system prune -a

# Access database
docker exec -it puja-postgres psql -U puja_user puja_planner

# Access backend shell
docker exec -it puja-backend bash
```

### URLs

- **Frontend**: https://yourdomain.com
- **Backend API**: https://api.yourdomain.com
- **API Docs**: https://api.yourdomain.com/docs
- **ReDoc**: https://api.yourdomain.com/redoc
-**Health Check**: https://api.yourdomain.com/health
