# DMARC Sentinel: Production Deployment & Operations Guide

This guide covers installing, configuring, hardening, and operating **DMARC Sentinel** in a production Linux environment (tested on Ubuntu 22.04/24.04 LTS).

---

## 📋 System Prerequisites

* **OS**: Ubuntu 22.04 LTS / 24.04 LTS (or Debian 12+)
* **Node.js**: `v20.x` or `v22.x` LTS + `npm 10+`
* **Python**: `Python 3.10+` + `pip` + `python3-venv`
* **OpenSearch**: `OpenSearch 2.x` or `3.x` cluster with Security Plugin enabled
* **Web Server**: `Nginx 1.20+` with Certbot Let's Encrypt SSL
* **Docker & Docker Compose**: Docker Engine 24+ (for Mailpit and containerized services)

---

## 1. Directory Structure & Permissions

Recommended installation path: `/opt/dmarc` (or `/home/amr/dev/dmarc` in dev):

```bash
sudo mkdir -p /opt/dmarc
sudo chown -R $USER:$USER /opt/dmarc
git clone https://github.com/amregbaly/DMARC.git /opt/dmarc
cd /opt/dmarc
```

---

## 2. OpenSearch Configuration & Index Template

### 2.1 Apply Index Template
Apply the explicit field mapping template to OpenSearch before ingesting data:

```bash
curl -sk -u admin:<admin_password> \
  -X PUT "https://<opensearch_host>:9200/_index_template/dmarc_aggregate_template" \
  -H "Content-Type: application/json" \
  -d @opensearch/index-template.json
```

### 2.2 Provision Read-Only User (Recommended)
Create a dedicated read-only user (`dmarc_reader`) for the web application:

```bash
export OPENSEARCH_ADMIN_USER=admin
export OPENSEARCH_ADMIN_PASS=<admin_password>
export GRAFANA_OS_USER=dmarc_reader
export GRAFANA_OS_PASS=<strong_random_password>
bash opensearch/setup-opensearch-readonly.sh
```

---

## 3. Environment Variables Configuration

### 3.1 Backend Server Environment (`web/server/.env`)
Create `/opt/dmarc/web/server/.env`:

```env
PORT=5000
NODE_ENV=production

# OpenSearch Cluster Connection
OPENSEARCH_URL=https://172.105.135.195:9200
OPENSEARCH_USER=admin
OPENSEARCH_PASSWORD=YourStrongOpenSearchPassword
INDEX_PATTERN=dmarc_aggregate-*
OPENSEARCH_ALLOW_SELF_SIGNED=false

# Security & CORS Whitelist (comma-separated origins)
ALLOWED_ORIGINS=https://dmarc.voxera.net,http://dmarc.voxera.net
JWT_SECRET=generate_with_openssl_rand_hex_32
SMTP_ENCRYPTION_KEY=generate_with_openssl_rand_hex_32

# Rate Limiting
RATE_LIMIT_LOGIN_MAX=10
```

> [!TIP]
> Generate secure secrets using `openssl`:
> ```bash
> openssl rand -hex 32
> ```

### 3.2 Frontend Client Environment (`web/client/.env`)
Create `/opt/dmarc/web/client/.env`:

```env
# Optional: Only needed if you want CARTO Dark tiles without the "API Key Required" watermark.
# The default Esri Dark Canvas, Light Canvas, OSM, and Satellite layers require NO API key.
VITE_CARTO_API_KEY=
```

---

## 4. Backend Service Installation & Systemd Service

### 4.1 Install Node.js Dependencies & Rebuild Native Modules
```bash
cd /opt/dmarc/web/server
npm install --production
# Rebuild better-sqlite3 for the host's exact Node.js ABI
npm rebuild better-sqlite3 --build-from-source
```

### 4.2 Create Systemd Unit (`dmarc-backend.service`)
Create `/etc/systemd/system/dmarc-backend.service`:

```ini
[Unit]
Description=DMARC Sentinel Express Backend API
After=network.target

[Service]
Type=simple
User=amr
WorkingDirectory=/opt/dmarc/web/server
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now dmarc-backend
sudo systemctl status dmarc-backend
```

---

## 5. Python Reporting Engine Setup

### 5.1 Create Virtual Environment & Install Dependencies
```bash
cd /opt/dmarc/reporting
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

# Install Playwright browser dependencies (for PDF generation)
playwright install chromium
playwright install-deps chromium
```

### 5.2 Create Systemd Unit (`dmarc-reporting.service`)
Create `/etc/systemd/system/dmarc-reporting.service`:

```ini
[Unit]
Description=DMARC Sentinel Python Reporting Service
After=network.target

[Service]
Type=simple
User=amr
WorkingDirectory=/opt/dmarc/reporting
ExecStart=/opt/dmarc/reporting/venv/bin/uvicorn report_service:app --host 127.0.0.1 --port 5050
Restart=always
RestartSec=5
Environment=OPENSEARCH_URL=https://172.105.135.195:9200
Environment=OPENSEARCH_USER=admin
Environment=OPENSEARCH_PASSWORD=YourStrongOpenSearchPassword

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable --now dmarc-reporting
sudo systemctl status dmarc-reporting
```

---

## 6. Frontend Production Build

Compile the React 19 application using Vite:

```bash
cd /opt/dmarc/web/client
npm install
npm run build
```

This compiles static assets into `/opt/dmarc/web/client/dist`.

---

## 7. Nginx Reverse Proxy Configuration

Configure Nginx to serve the compiled frontend, proxy `/api` requests to Express, and handle SSL termination.

Create `/etc/nginx/sites-available/dmarc.voxera.net`:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name dmarc.voxera.net;

    # Redirect HTTP to HTTPS
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name dmarc.voxera.net;

    # SSL Certificates (managed via Certbot)
    ssl_certificate /etc/letsencrypt/live/dmarc.voxera.net/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dmarc.voxera.net/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Frontend Single Page App (Static Files)
    root /opt/dmarc/web/client/dist;
    index index.html;

    # Security Headers
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options SAMEORIGIN always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Handle React Router (SPA Routing)
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy REST API requests to Backend Server
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        
        # Proxy Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        
        # Timeouts for Long Report Generation
        proxy_connect_timeout 60s;
        proxy_send_timeout 120s;
        proxy_read_timeout 120s;
        
        # Buffer Sizes
        proxy_buffer_size 128k;
        proxy_buffers 4 256k;
        proxy_busy_buffers_size 256k;
    }

    # Static Cache Rules
    location ~* \.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2)$ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }
}
```

Enable site and test configuration:
```bash
sudo ln -sf /etc/nginx/sites-available/dmarc.voxera.net /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Obtain Let's Encrypt SSL certificate:
```bash
sudo certbot --nginx -d dmarc.voxera.net
```

---

## 8. Mailpit Local Development Gateway (Optional)

For local development or testing without sending real emails:

```bash
docker compose up -d mailpit
```

* **Inbound SMTP Port**: `127.0.0.1:1025`
* **Web Mail Inspector**: `http://127.0.0.1:8025`

---

## 9. Verification & Smoke Test Checklist

Execute the automated verification test suite:

```bash
# 1. Run backend unit & integration tests
node /opt/dmarc/web/server/test-suite.js

# 2. Check health endpoint
curl -s https://dmarc.voxera.net/api/health | jq .

# 3. Verify OpenSearch connectivity
curl -sk -u admin:<password> https://172.105.135.195:9200/_cluster/health | jq .
```

---

## 10. Database Backup & Maintenance

The SQLite database is located at `/opt/dmarc/web/server/data/sentinel.db`.

To create an online, consistent backup without downtime:

```bash
sqlite3 /opt/dmarc/web/server/data/sentinel.db ".backup '/opt/dmarc/backups/sentinel_$(date +%Y%m%d_%H%M%S).db'"
```

Add this command to root `cron` for daily automated backups.
