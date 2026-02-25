# Frontend Dockerfile - Multi-stage build for Vite React app

# Build stage
FROM node:20-alpine as builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (legacy-peer-deps to handle version conflicts)
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Accept API URL as build argument (Vite bakes env vars at build time)
ARG VITE_API_URL=http://localhost:8735
ENV VITE_API_URL=${VITE_API_URL}

# Build the application
RUN npm run build

# Production stage - Serve with nginx
FROM nginx:alpine

# Install curl and gettext for envsubst
RUN apk add --no-cache curl gettext

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration template
COPY nginx.conf /etc/nginx/templates/default.conf.template

# Expose dynamic port
ARG FRONTEND_PORT=8734
ENV FRONTEND_PORT=${FRONTEND_PORT}
EXPOSE ${FRONTEND_PORT}

# Start nginx with dynamic port injection
# Start nginx by substituting port and running daemon
CMD ["/bin/sh", "-c", "envsubst '${FRONTEND_PORT}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
