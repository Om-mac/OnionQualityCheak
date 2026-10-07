# Production Dockerfile for OnionQualityCheak
# Multi-stage build optimized for Render deployment

# Stage 1: Build frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/web
COPY onionsure/web/package.json ./
RUN npm install

COPY onionsure/web ./
RUN npm run build

# Stage 2: Runtime with Python 3.11
FROM python:3.11-slim-bookworm

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    NODE_ENV=production \
    ONIONCHECK_URL=http://127.0.0.1:5000 \
    PYTHON_PORT=5000 \
    DEBIAN_FRONTEND=noninteractive

# Install Node.js 20 and system dependencies for OpenCV and YOLO
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    gnupg \
    && mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list \
    && apt-get update \
    && apt-get install -y --no-install-recommends \
    nodejs \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libgomp1 \
    libgl1 \
    libgthread-2.0-0 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

WORKDIR /app

# Install Python dependencies
COPY onioncheck/requirements.txt /app/onioncheck/requirements.txt
RUN pip install --no-cache-dir --upgrade pip setuptools wheel \
    && pip install --no-cache-dir -r /app/onioncheck/requirements.txt

# Install Node.js server dependencies
COPY onionsure/server/package.json /app/onionsure/server/
RUN cd /app/onionsure/server && npm install --omit=dev

# Copy application code
COPY onioncheck /app/onioncheck
COPY onionsure/python /app/onionsure/python
COPY onionsure/server /app/onionsure/server

# Copy built frontend from builder stage
COPY --from=frontend-builder /app/web/dist /app/onionsure/web/dist

# Copy entrypoint script
COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

# Create necessary directories
RUN mkdir -p /app/onionsure/server/uploads /app/logs

WORKDIR /app/onionsure/server

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:${PORT:-10000}/api/health || exit 1

EXPOSE 10000

CMD ["/app/docker-entrypoint.sh"]
