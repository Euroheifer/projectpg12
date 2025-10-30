FROM python:3.11-slim-bookworm

WORKDIR /app

# 1. install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        build-essential \
        libpq-dev \
        libssl-dev \
        openssl && \
    rm -rf /var/lib/apt/lists/*

# deploy dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 3. self signed certificate
# Production cert (443)
# CN: localhost for production can change to VM IP or domain
RUN openssl req -x509 -newkey rsa:4096 -nodes -out prod.pem -keyout prod.key -days 365 \
    -subj "/C=SG/ST=Singapore/L=NUS/O=TCX2004/OU=Production/CN=localhost"
    
# Staging cert (8080)
RUN openssl req -x509 -newkey rsa:4096 -nodes -out stag.pem -keyout stag.key -days 365 \
    -subj "/C=SG/ST=Singapore/L=NUS/O=TCX2004/OU=Staging/CN=localhost"

# Copy application code
COPY app/ ./app


