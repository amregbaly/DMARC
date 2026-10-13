# DMARC Sentinel: REST API Reference & Developer Guide

This document provides complete documentation for the DMARC Sentinel REST API.

---

## 📌 API Overview & Conventions

* **Base URL**: `https://dmarc.voxera.net/api` (Production) or `http://localhost:5000/api` (Local Dev)
* **Authentication**: All protected endpoints require a JSON Web Token (JWT) passed in the `Authorization` header:
  ```http
  Authorization: Bearer <jwt_token>
  ```
  *Note*: File download endpoints also accept an optional `?token=<jwt_token>` query parameter for direct browser downloads.
* **Content-Type**: `application/json` for all request and response bodies (except binary file downloads).
* **Rate Limits**:
  * `/api/auth/login`: 10 requests per 15 minutes in production (100 in development).
  * All other `/api/*` endpoints: 1000 requests per 15 minutes.
* **Error Response Format**:
  ```json
  {
    "error": "Human readable error description"
  }
  ```

---

## 1. Authentication & User Profile

### `POST /api/auth/login`
Authenticates a user and returns a signed JWT token.

* **Rate Limited**: Yes (Brute-force protection).
* **Request Body**:
  ```json
  {
    "username": "admin",
    "password": "Password123!"
  }
  ```
* **Response `200 OK`**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "usr_9a8b7c",
      "username": "admin",
      "email": "admin@voxera.net",
      "role": "admin",
      "organization_name": "Voxera Security",
      "logo_url": null,
      "language": "en",
      "theme": "dark",
      "domains": ["all"]
    }
  }
  ```

---

### `GET /api/auth/me`
Retrieves the currently authenticated user's profile and assigned domain scope.

* **Headers**: `Authorization: Bearer <token>`
* **Response `200 OK`**: Same user object as login response.

---

### `PUT /api/auth/profile`
Updates self-service profile attributes (language, theme, organization name, logo URL).

* **Headers**: `Authorization: Bearer <token>`
* **Request Body**:
  ```json
  {
    "email": "user@voxera.net",
    "organization_name": "Acme Corp",
    "logo_url": "https://example.com/logo.png",
    "language": "es",
    "theme": "nordic"
  }
  ```
* **Response `200 OK`**: Updated user profile object.

---

### `POST /api/auth/change-password`
Updates the authenticated user's password. Requires current password verification.

* **Headers**: `Authorization: Bearer <token>`
* **Request Body**:
  ```json
  {
    "currentPassword": "OldPassword123!",
    "newPassword": "NewSecurePassword456!"
  }
  ```
* **Response `200 OK`**:
  ```json
  {
    "message": "Password changed successfully."
  }
  ```

---

## 2. User Management & RBAC (`admin`, `manager`)

### `GET /api/users`
Lists all users. Admins see all accounts; managers see accounts created under their hierarchy.

* **Headers**: `Authorization: Bearer <token>` (Role: `admin` or `manager`)
* **Response `200 OK`**: Array of user objects including assigned domains and status.

---

### `POST /api/users`
Creates a new user account with role assignment and domain scope.

* **Headers**: `Authorization: Bearer <token>` (Role: `admin` or `manager`)
* **Request Body**:
  ```json
  {
    "username": "security_analyst",
    "email": "analyst@voxera.net",
    "password": "InitialTempPassword99!",
    "role": "viewer",
    "domains": ["voxera.net", "corp.example.org"],
    "organization_name": "SOC Team",
    "language": "en",
    "theme": "dark"
  }
  ```
* **Response `201 Created`**: Created user object.

---

### `PUT /api/users/:id`
Updates user details, assigned domains, role, or active status.

* **Headers**: `Authorization: Bearer <token>` (Role: `admin` or `manager`)
* **Request Body**:
  ```json
  {
    "email": "analyst@voxera.net",
    "role": "manager",
    "domains": ["voxera.net"],
    "is_active": 1
  }
  ```
* **Response `200 OK`**: Updated user object.

---

### `DELETE /api/users/:id`
Deletes a user account. Prevents self-deletion.

* **Headers**: `Authorization: Bearer <token>` (Role: `admin` or `manager`)
* **Response `200 OK`**:
  ```json
  {
    "message": "User deleted successfully."
  }
  ```

---

## 3. DMARC Telemetry & Analytics

### `GET /api/filters`
Returns available filter options (monitored domains, reporting organizations) based on user scope.

* **Query Parameters**: None
* **Response `200 OK`**:
  ```json
  {
    "domains": ["example.com", "shop.example.com", "voxera.net"],
    "reporting_orgs": ["google.com", "protection.outlook.com", "yahoo.com"]
  }
  ```

---

### `GET /api/overview`
Computes executive KPI summary metrics weighted by `message_count`.

* **Query Parameters**:
  * `domain` *(optional)*: Specific domain or `all`.
  * `date_from` *(optional)*: ISO 8601 string.
  * `date_to` *(optional)*: ISO 8601 string.
* **Response `200 OK`**:
  ```json
  {
    "total_messages": 4542,
    "pass_rate": 88.4,
    "total_failures": 527,
    "monitored_domains": 3,
    "disposition_breakdown": {
      "none": 4120,
      "quarantine": 180,
      "reject": 242
    },
    "alignment": {
      "spf_pass": 4100,
      "dkim_pass": 3950
    }
  }
  ```

---

### `GET /api/alignment`
Computes the 4-way alignment matrix (Pass/Pass, Pass/Fail, Fail/Pass, Fail/Fail) and policy override reasons.

* **Query Parameters**: `domain`, `date_from`, `date_to`
* **Response `200 OK`**:
  ```json
  {
    "matrix": {
      "both_pass": 3800,
      "spf_only": 300,
      "dkim_only": 150,
      "both_fail": 292
    },
    "overrides": [
      { "reason": "arc", "count": 140 },
      { "reason": "forwarded", "count": 65 }
    ]
  }
  ```

---

### `GET /api/timeseries`
Returns traffic volume and pass/fail distribution bucketed over time.

* **Query Parameters**: `domain`, `date_from`, `date_to`, `interval` (`hour` | `day`)
* **Response `200 OK`**: Array of time-bucket points (`{ date, total, compliant, threat }`).

---

### `GET /api/traffic`
Returns top sending IP addresses, PTR hostnames, source ASNs, and countries.

* **Query Parameters**: `domain`, `date_from`, `date_to`
* **Response `200 OK`**:
  ```json
  {
    "top_ips": [
      { "ip": "209.85.220.41", "hostname": "mail-sor-f41.google.com", "count": 1250, "compliant": true },
      { "ip": "198.51.100.25", "hostname": "unknown", "count": 210, "compliant": false }
    ],
    "top_countries": [
      { "country": "US", "count": 3200 },
      { "country": "DE", "count": 450 }
    ]
  }
  ```

---

### `GET /api/threats`
Returns unaligned and spoofed email traffic events, rogue IP rankings, and attacker ASN breakdown.

* **Query Parameters**: `domain`, `date_from`, `date_to`
* **Response `200 OK`**: Detailed threat intelligence summary object.

---

### `GET /api/policies`
Returns published domain policy records (`p`, `sp`, `pct`) and calculated enforcement readiness percentages.

* **Query Parameters**: `domain`
* **Response `200 OK`**: Array of domain policy evaluations.

---

### `GET /api/records`
Searchable raw DMARC aggregate records from OpenSearch with pagination.

* **Query Parameters**:
  * `domain` *(optional)*: Filter by domain.
  * `query` *(optional)*: Full-text or Lucene search term.
  * `page` *(optional, default: 1)*: Page number.
  * `limit` *(optional, default: 20)*: Page size.
* **Response `200 OK`**:
  ```json
  {
    "records": [ ... ],
    "total": 4542,
    "page": 1,
    "pages": 228
  }
  ```

---

## 4. Live Domain Health Analyzer (PowerDMARC Parity)

### `GET /api/domain-health`
Performs an asynchronous live DNS protocol audit for a specified domain across DMARC, SPF, DKIM, BIMI, MTA-STS, TLS-RPT, and DNSSEC.

* **Headers**: `Authorization: Bearer <token>`
* **Query Parameters**:
  * `domain` *(required)*: FQDN to audit (e.g., `voxera.net`).
  * `selector` *(optional, default: `default`)*: DKIM selector to check (e.g., `google`, `zoho`).
* **SSRF Protected**: Validates domain against strict FQDN regex; blocks IPs and URLs.
* **Response `200 OK`**:
  ```json
  {
    "domain": "voxera.net",
    "score": 75,
    "grade": "C",
    "rating": "Fair",
    "protocols": {
      "dmarc": {
        "status": "valid",
        "record": "v=DMARC1; p=reject; sp=reject; rua=mailto:dmarc@voxera.net; ruf=mailto:dmarc@voxera.net; fo=1;",
        "policy": "reject",
        "subdomainPolicy": "reject",
        "tags": { "v": "DMARC1", "p": "reject", "sp": "reject", "rua": "mailto:dmarc@voxera.net", "fo": "1" }
      },
      "spf": {
        "status": "valid",
        "record": "v=spf1 include:zohomail.com include:_spf.google.com ~all",
        "lookupCount": 3,
        "lookupLimit": 10,
        "lookupTree": [ ... ],
        "qualifier": "SoftFail (~all)"
      },
      "dkim": {
        "selector": "google",
        "status": "valid",
        "record": "v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8A...",
        "keyLength": 2048
      },
      "bimi": { "status": "not_found" },
      "mtaSts": { "status": "not_found" },
      "tlsRpt": { "status": "not_found" },
      "dnssec": { "status": "not_found" }
    },
    "observations": [
      {
        "protocol": "MTA-STS",
        "severity": "Warning",
        "issue": "MTA-STS record not found",
        "impact": "Inbound SMTP traffic is vulnerable to TLS downgrade and Man-in-the-Middle attacks.",
        "mitigation": "Publish an MTA-STS policy at _mta-sts.voxera.net"
      }
    ]
  }
  ```

---

## 5. Geolocation & Map Aggregates

### `GET /api/reports/aggregate-views`
Provides map coordinates and country rollups for the interactive Leaflet Geolocation Map.

* **Query Parameters**: `domain`, `date_from`, `date_to`
* **Response `200 OK`**:
  ```json
  {
    "geoPoints": [
      {
        "ip": "209.85.220.41",
        "hostname": "mail-sor-f41.google.com",
        "country": "US",
        "lat": 37.751,
        "lng": -122.419,
        "volume": 1250,
        "compliant": true
      }
    ],
    "topOriginCountries": [ ... ]
  }
  ```

---

## 6. Enterprise Reporting Engine

### `POST /api/reports/generate`
Generates a branded report in PDF, Excel (.xlsx), and/or CSV formats via the Python engine.

* **Headers**: `Authorization: Bearer <token>`
* **Request Body**:
  ```json
  {
    "domain": "example.com",
    "template_id": "default",
    "formats": ["pdf", "xlsx", "csv"],
    "date_from": "2026-10-01",
    "date_to": "2026-10-05",
    "client_org": "Voxera Security",
    "language": "en"
  }
  ```
* **Response `200 OK`**:
  ```json
  {
    "report_id": "rep_3f81e",
    "status": "completed",
    "files": {
      "pdf": "/api/reports/download/DMARC_default_example_com_20261010_003319.pdf",
      "xlsx": "/api/reports/download/DMARC_default_example_com_20261010_003319.xlsx",
      "csv": "/api/reports/download/DMARC_default_example_com_20261010_003319.csv"
    }
  }
  ```

---

### `GET /api/reports/download/:filename`
Downloads a generated report file.

* **Authentication**: Supports `Authorization: Bearer <token>` header OR `?token=<token>` query string parameter.
* **Path Traversal Protected**: Restricts downloads to sanitized filenames in `reporting/output`.
* **Response `200 OK`**: File binary stream with appropriate MIME type (`application/pdf`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `text/csv`).

---

### `POST /api/reports/send-email`
Sends an on-demand report email with generated files attached.

* **Headers**: `Authorization: Bearer <token>`
* **Request Body**:
  ```json
  {
    "recipient": "executive@voxera.net",
    "domain": "example.com",
    "template_id": "default",
    "formats": ["pdf", "xlsx"],
    "date_from": "2026-10-01",
    "date_to": "2026-10-05"
  }
  ```
* **Response `200 OK`**:
  ```json
  {
    "message": "Report successfully generated and enqueued for delivery.",
    "queue_id": "87b0fdf4-3319-4374-9dcb-76c29c5747e6"
  }
  ```

---

## 7. Security Alert Rules & Incidents

### `GET /api/alerts/rules`
Lists alert rules created by the authenticated user.

* **Headers**: `Authorization: Bearer <token>`
* **Response `200 OK`**: Array of alert rule definitions.

---

### `POST /api/alerts/rules`
Creates a new automated security alert rule.

* **Headers**: `Authorization: Bearer <token>`
* **Request Body**:
  ```json
  {
    "name": "DMARC Pass Rate Degradation Alert",
    "domains": ["all"],
    "recipients": ["soc@voxera.net", "security-lead@voxera.net"],
    "condition_type": "failure_rate",
    "threshold_value": 90.0,
    "time_window_minutes": 60,
    "severity": "critical",
    "cooldown_minutes": 120,
    "digest_mode": 0,
    "notify_recovery": 1
  }
  ```
* **Response `201 Created`**: Created rule object.

---

### `POST /api/alerts/rules/test`
Dry-run simulation engine: Evaluates rule logic against historical OpenSearch data without triggering email notifications.

* **Headers**: `Authorization: Bearer <token>`
* **Request Body**: Same schema as `POST /api/alerts/rules`.
* **Response `200 OK`**:
  ```json
  {
    "would_trigger": true,
    "current_value": 85.4,
    "threshold_value": 90.0,
    "message": "Condition met: Pass rate is 85.4% (below threshold of 90%)",
    "offenders": [ ... ]
  }
  ```

---

### `GET /api/alerts/history`
Returns incident history of triggered alerts.

* **Headers**: `Authorization: Bearer <token>`
* **Response `200 OK`**: Array of historical incident logs.

---

## 8. Outgoing SMTP Settings & Queue (`admin`)

### `GET /api/admin/smtp`
Retrieves outgoing SMTP gateway settings. Secrets are masked as `••••••••`.

* **Headers**: `Authorization: Bearer <token>` (Role: `admin`)
* **Response `200 OK`**:
  ```json
  {
    "host": "127.0.0.1",
    "port": 1025,
    "encryption": "none",
    "username": "mailpit_user",
    "password": "••••••••",
    "from_name": "DMARC Sentinel",
    "from_address": "dmarc-alerts@voxera.net",
    "reply_to": "support@voxera.net",
    "connection_timeout": 10000
  }
  ```

---

### `PUT /api/admin/smtp`
Updates outgoing SMTP gateway settings. Credentials encrypted with AES-256-GCM.

* **Headers**: `Authorization: Bearer <token>` (Role: `admin`)
* **Request Body**:
  ```json
  {
    "host": "smtp.gmail.com",
    "port": 587,
    "encryption": "starttls",
    "username": "alerts@voxera.net",
    "password": "app-specific-password",
    "from_name": "DMARC Sentinel",
    "from_address": "alerts@voxera.net"
  }
  ```
* **Response `200 OK`**: Success message.

---

### `POST /api/admin/smtp/test`
Performs an active 3-step live socket diagnostic test and sends a test email.

* **Headers**: `Authorization: Bearer <token>` (Role: `admin`)
* **Request Body**:
  ```json
  {
    "recipient": "admin@voxera.net",
    "host": "127.0.0.1",
    "port": 1025,
    "encryption": "none"
  }
  ```
* **Response `200 OK`**:
  ```json
  {
    "success": true,
    "diagnostics": {
      "dns": { "status": "passed", "address": "127.0.0.1" },
      "tcp": { "status": "passed", "latencyMs": 4 },
      "tls_auth": { "status": "passed" },
      "delivery": { "status": "passed", "messageId": "<...>" }
    }
  }
  ```

---

### `GET /api/admin/email-queue`
Inspects pending, processing, sent, and failed jobs in the SQLite `email_queue`.

* **Headers**: `Authorization: Bearer <token>` (Role: `admin`)
* **Response `200 OK`**: Array of queue items.

---

### `POST /api/admin/email-queue/:id/retry`
Resets a failed email job to `pending` with `attempts = 0` for immediate retry.

* **Headers**: `Authorization: Bearer <token>` (Role: `admin`)
* **Response `200 OK`**:
  ```json
  {
    "message": "Job successfully rescheduled for immediate delivery."
  }
  ```
