# Backend Dockerfile - Multi-stage build for Python FastAPI

FROM python:3.11-slim as builder

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Production stage
FROM python:3.11-slim

WORKDIR /app

# Install PostgreSQL client and curl for health checks
RUN apt-get update && apt-get install -y \
    postgresql-client \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy Python dependencies from builder
COPY --from=builder /root/.local /root/.local

# Copy application code
COPY . .

# Update PATH and PYTHONPATH
ENV PATH=/root/.local/bin:$PATH
ENV PYTHONPATH=/app

# Expose port 8735
EXPOSE 8735

# Run the application on port 8735 with proxy headers enabled and extended timeout
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8735", "--proxy-headers", "--forwarded-allow-ips='*'", "--timeout-keep-alive", "120"]
