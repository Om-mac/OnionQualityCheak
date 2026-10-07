#!/bin/bash
set -euo pipefail

echo "Starting OnionQualityCheak services..."

# Function to cleanup background processes
cleanup() {
    echo "Shutting down services..."
    if [ ! -z "${python_pid:-}" ]; then
        kill "$python_pid" 2>/dev/null || true
    fi
    exit 0
}

# Setup signal handlers
trap cleanup INT TERM EXIT

# Start Python AI service in background
echo "Starting Python AI service on port ${PYTHON_PORT:-5000}..."
cd /app/onionsure/python
python onion_flask_service.py &
python_pid=$!

# Wait for Python service to be ready
echo "Waiting for Python AI service to start..."
timeout=60
counter=0
while [ $counter -lt $timeout ]; do
    if curl -f "http://127.0.0.1:${PYTHON_PORT:-5000}/api/health" >/dev/null 2>&1; then
        echo "Python AI service is ready!"
        break
    fi
    sleep 1
    counter=$((counter + 1))
done

if [ $counter -eq $timeout ]; then
    echo "Python AI service failed to start within ${timeout}s"
    exit 1
fi

# Start Node.js server (main process)
echo "Starting Node.js server on port 10000..."
cd /app/onionsure/server
exec node server.js
