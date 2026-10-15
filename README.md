# DMARC Sentinel: Enterprise Email Authentication, Threat Intelligence & Reporting Platform

[![Node.js](https://img.shields.io/badge/Node.js-20%20%7C%2022-brightgreen.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![OpenSearch](https://img.shields.io/badge/OpenSearch-2.x%20%7C%203.x-005BBB.svg)](https://opensearch.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**DMARC Sentinel** is an enterprise-grade cybersecurity platform for monitoring, analyzing, forensics, and reporting on DMARC aggregate reports (`rua`). It transforms raw XML aggregate reports from major email receivers (Google, Microsoft 365, Yahoo, etc.) into executive dashboards, 4-way alignment matrices, live SOC threat feeds, high-definition GIS maps, automated multi-format PDF/Excel reports, and proactive security alerts.

---

## 📚 Documentation Index

For complete and detailed technical documentation, please consult the dedicated guides in the [`docs/`](docs/) directory:

| Document | Description |
| :--- | :--- |
| **[📑 Features Catalog](docs/FEATURES_LIST.md)** | Exhaustive, itemized breakdown of all features across all 14 platform modules. |
| **[🏗️ System Architecture](docs/ARCHITECTURE.md)** | End-to-end topology, data flows, database schema, entity relationships, and security model. |
| **[🔌 REST API Reference](docs/API_REFERENCE.md)** | Complete developer guide with endpoints, payloads, query parameters, and auth contracts. |
| **[🚀 Deployment & Operations Guide](docs/DEPLOYMENT_GUIDE.md)** | Production setup on Linux with systemd, Nginx reverse proxy, SSL/TLS, and maintenance procedures. |
| **[🛡️ Security Audit](SECURITY_AUDIT.md)** | Comprehensive penetration testing report, vulnerability assessments, and mitigations. |
| **[🩺 Domain Health Spec](DOMAIN_HEALTH_SPEC.md)** | Deep-dive specification for the live DNS protocol analyzer. |
| **[✉️ Email Alerting Module](EMAIL_ALERTING_MODULE.md)** | Technical specification for the asynchronous SMTP queue and alerting engine. |
| **[📊 Reporting Solution Spec](REPORTING_SOLUTION.md)** | Architectural specification for the branded multi-sheet Excel, PDF, and CSV reporting engine. |

---

## 🌟 Key Platform Highlights

```
┌────────────────────────────────────────────────────────────────────────┐
│                        DMARC SENTINEL CAPABILITIES                     │
├──────────────────────────────────┬─────────────────────────────────────┤
│ 1. Executive Telemetry           │ 2. Live Domain Health Analyzer      │
│    • Real-time pass rate KPIs    │    • Live DNS RFC protocol audit    │
│    • Message-count weighting     │    • SPF 10-lookup counter tree     │
│    • Volume trends over time     │    • DMARC, DKIM, BIMI, MTA-STS     │
├──────────────────────────────────┼─────────────────────────────────────┤
│ 3. 4-Way Alignment Engine        │ 4. SOC Threat Feed & Forensics      │
│    • SPF & DKIM pass/fail matrix │    • Attacker ASN/ISP attribution   │
│    • Override reason tracking    │    • Rogue IP rankings              │
│    • DKIM selector inventory     │    • Containment & blocking rate    │
├──────────────────────────────────┼─────────────────────────────────────┤
│ 5. Global Geolocation GIS Map    │ 6. Automated Enterprise Reporting   │
│    • Esri Dark/Light, OSM, Sat   │    • Branded Vector PDFs            │
│    • Zero API Key required       │    • Multi-sheet formatted Excel    │
│    • Origin threat clusters      │    • Scheduled timezone cron email  │
├──────────────────────────────────┼─────────────────────────────────────┤
│ 7. Real-Time Alert Engine        │ 8. Secure SMTP & Email Queue        │
│    • 7 security conditions       │    • AES-256-GCM secret encryption  │
│    • Dry-run simulation engine   │    • 3-step live socket test modal  │
│    • Recovery notifications      │    • Atomic transactional worker    │
└──────────────────────────────────┴─────────────────────────────────────┘
```

---

## 📁 Repository Structure

```
.
├── docs/                               # Comprehensive System Documentation
│   ├── FEATURES_LIST.md                # Exhaustive features & capabilities matrix
│   ├── ARCHITECTURE.md                 # System topology, data flow, DB schema, security
│   ├── API_REFERENCE.md                # Complete REST API reference & payload specs
│   └── DEPLOYMENT_GUIDE.md             # Production Linux, Nginx, systemd, SSL setup
├── web/                                # Full-Stack Web Application
│   ├── client/                         # React 19 + Vite + Tailwind CSS v4 + Recharts UI
│   │   ├── src/components/             # UI Tab views, charts, GIS map, modals
│   │   ├── src/i18n/                   # Multilingual translations (EN, AR [RTL], FR, ES)
│   │   └── src/theme/                  # Dynamic themes (Sentinel Dark, Nordic, Emerald)
│   └── server/                         # Express.js API & Background Services
│       ├── db.js                       # SQLite database manager (better-sqlite3)
│       ├── auth.js                     # JWT authentication & domain scoping RBAC
│       ├── services/crypto.js          # AES-256-GCM authenticated encryption
│       ├── services/emailService.js    # Nodemailer transport & template renderer
│       ├── workers/emailQueueWorker.js # Transactional email queue background worker
│       ├── workers/alertEvaluator.js   # 60s rule evaluation & incident generator
│       ├── workers/reportScheduler.js  # Timezone-aware cron report scheduler
│       ├── templates/                  # Responsive HTML email templates
│       └── server.js                   # REST API routes & reverse proxy handlers
├── reporting/                          # Standalone Python Reporting Microservice
│   ├── report_service.py               # FastAPI microservice for report generation
│   ├── engine/pdf_generator.py         # Playwright Chromium vector PDF generator
│   ├── engine/excel_generator.py       # openpyxl multi-sheet formatted Excel (.xlsx)
│   ├── engine/csv_generator.py         # UTF-8 raw CSV generator
│   ├── templates/                      # Branded report templates (default, acme)
│   └── output/                         # Generated report artifacts
├── dashboards/                         # Native Grafana Dashboards
│   └── dmarc-overview.json             # 6-row, 25-panel Grafana dashboard
├── provisioning/                       # Grafana Auto-Provisioning Assets
│   ├── datasources/opensearch.yml      # OpenSearch datasource configuration
│   ├── dashboards/dmarc.yml            # Dashboard auto-loader
│   └── alerting/dmarc-alerts.yml       # Grafana alert rules
├── opensearch/                         # OpenSearch Cluster Assets
│   ├── index-template.json             # Explicit mapping template for dmarc_aggregate-*
│   ├── read-only-role.json             # Least-privilege read-only role definition
│   └── setup-opensearch-readonly.sh    # User provisioning automation script
└── docker-compose.yml                  # Docker Compose configuration (Mailpit, Python)
```

---

## ⚡ Quick Start (Development)

### 1. Prerequisites
* Node.js `v20+` or `v22+`
* Python `3.10+` with virtual environment
* OpenSearch `2.x` or `3.x` cluster (or remote endpoint)

### 2. Configure Backend Server
```bash
cd web/server
npm install
npm rebuild better-sqlite3 --build-from-source

# Copy and edit environment variables
cp .env.example .env # edit with your OPENSEARCH_URL & OPENSEARCH_PASSWORD
```

### 3. Start Backend Services
```bash
npm run dev
# Server listens on http://localhost:5000
```

### 4. Start Frontend Client
```bash
cd ../client
npm install
npm run dev
# Frontend runs on http://localhost:3000 (proxies /api to :5000)
```

Open **http://localhost:3000** in your browser. Default admin credentials seeded automatically:
* **Username**: `admin`
* **Password**: `admin123` *(Prompted to change on first login)*

---

## 🧪 Automated Testing

Execute the backend automated test suite verifying cryptography, RFC sanitization, responsive email templates, alert conditions, and mock SMTP socket delivery:

```bash
node web/server/test-suite.js
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
