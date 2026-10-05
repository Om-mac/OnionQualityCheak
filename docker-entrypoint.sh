#!/bin/sh
set -eu

python /app/onionsure/python/onion_flask_service.py &
python_pid=$!

cleanup() {
  kill "$python_pid" 2>/dev/null || true
}
trap cleanup INT TERM EXIT

node /app/onionsure/server/server.js
