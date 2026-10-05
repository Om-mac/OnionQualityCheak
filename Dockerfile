# One-service deployment: Node serves the frontend/API and supervises the
# internal Python inference service.
FROM python:3.11-slim AS runtime

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    NODE_ENV=production \
    ONIONCHECK_URL=http://127.0.0.1:5000 \
    PYTHON_PORT=5000

RUN apt-get update \
    && apt-get install -y --no-install-recommends nodejs npm libglib2.0-0 libgl1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY onioncheck/requirements.txt /app/onioncheck/requirements.txt
RUN pip install --no-cache-dir -r /app/onioncheck/requirements.txt

COPY onionsure/server/package*.json /app/onionsure/server/
RUN cd /app/onionsure/server && npm install --omit=dev

COPY onionsure/web/package*.json /app/onionsure/web/
RUN cd /app/onionsure/web && npm install

COPY onioncheck /app/onioncheck
COPY onionsure/python /app/onionsure/python
COPY onionsure/server /app/onionsure/server
COPY onionsure/web /app/onionsure/web

RUN cd /app/onionsure/web && npm run build

COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

WORKDIR /app/onionsure/server
EXPOSE 10000
CMD ["/app/docker-entrypoint.sh"]
