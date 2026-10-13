# DMARC Sentinel: Enterprise Features & Capabilities Catalog

This document provides a comprehensive, categorized inventory of every feature, module, security control, and data visualization capability built into **DMARC Sentinel**.

---

## 📑 Feature Index

1. [Executive Dashboard & Real-Time Analytics](#1-executive-dashboard--real-time-analytics)
2. [Live Domain Health & DNS Protocol Analyzer](#2-live-domain-health--dns-protocol-analyzer)
3. [Authentication & 4-Way Alignment Engine](#3-authentication--4-way-alignment-engine)
4. [Threat Intelligence & SOC Forensics Feed](#4-threat-intelligence--soc-forensics-feed)
5. [Global Geolocation Mapping & Geographic Attribution](#5-global-geolocation-mapping--geographic-attribution)
6. [DMARC Policy Audit & Enforcement Readiness Rollout](#6-dmarc-policy-audit--enforcement-readiness-rollout)
7. [Raw Log Explorer & Full-Text Search](#7-raw-log-explorer--full-text-search)
8. [Automated Enterprise Reporting Engine (PDF, Excel, CSV)](#8-automated-enterprise-reporting-engine-pdf-excel-csv)
9. [Security Alerting & Notification Engine](#9-security-alerting--notification-engine)
10. [Outgoing SMTP Gateway & Email Queue Subsystem](#10-outgoing-smtp-gateway--email-queue-subsystem)
11. [Multi-Tenant User Management & Role-Based Access Control](#11-multi-tenant-user-management--role-based-access-control)
12. [Enterprise Security, Cryptography & Hardening](#12-enterprise-security-cryptography--hardening)
13. [Modern UI/UX, Multilingual Support & Theme Engine](#13-modern-uiux-multilingual-support--theme-engine)
14. [Grafana & OpenSearch Native Assets](#14-grafana--opensearch-native-assets)

---

## 1. Executive Dashboard & Real-Time Analytics

* **Weighted Volume Calculation**: Every single metric calculates the mathematical sum of `message_count` across DMARC XML records, guaranteeing that multi-message reports are weighted accurately.
* **Global Executive KPI Grid**:
  * **Total Messages Analyzed**: Absolute volume of emails evaluated during the selected time period.
  * **Overall DMARC Pass Rate (%)**: Percentage of traffic successfully complying with SPF and/or DKIM alignment.
  * **Total DMARC Failures**: Message volume failing DMARC verification.
  * **Monitored Domains Count**: Number of distinct RFC 5322 `header_from` domains currently under active supervision.
  * **Policy Enforcement Disposition Summary**: Direct counts for `none` (delivered), `quarantine` (spam/junk), and `reject` (blocked at the mail gateway).
* **Multi-Domain Scope Selector**: Switch views instantly between individual client domains or aggregate all domains across the enterprise.
* **Time Range Filtering**: Standard pre-configured time ranges (Last 24 Hours, Last 7 Days, Last 30 Days, Last 90 Days) plus custom ISO date range pickers.
* **Traffic & Compliance Timeseries Chart**:
  * Dual-area visualization displaying compliant (green) versus unaligned/threat (rose) traffic over time.
  * Granular date-histogram buckets (hourly for short intervals, daily for multi-week views).
  * Interactive hover tooltips showing exact volume counts and compliance percentages.
* **Auto-Refresh & Live Indicator**: Configurable background polling with visual pulsating status badge.

---

## 2. Live Domain Health & DNS Protocol Analyzer

Replicates the depth, rigor, and visual clarity of **PowerDMARC's Domain Analyzer**:

* **One-Click Live DNS Audit**: Query any apex domain or subdomain in real time using asynchronous recursive `node:dns/promises`.
* **Domain Security Score (0–100%) & Letter Grade**:
  * Evaluates overall risk based on a weighted scoring model: DMARC policy strength, SPF lookup count, DKIM availability, MTA-STS, TLS-RPT, and DNSSEC.
  * Computes letter grade (`A+`, `A`, `B`, `C`, `D`, `F`) with narrative risk analysis and actionable next steps.
* **Four-Pillar Status Overview**:
  * **Outgoing Email Security**: Evaluates DMARC, SPF, and DKIM enforcement.
  * **Incoming Email Security**: Evaluates MX mail exchange cluster and backup mail servers.
  * **Transport & Delivery Reporting**: Evaluates MTA-STS enforcement mode and TLS-RPT failure reporting.
  * **DNS Infrastructure Integrity**: Evaluates Authoritative Nameservers (NS), A/AAAA records, and DNSSEC signature validation.
* **Security Observations & Threat Impact Table**:
  * Categorizes each identified issue by Severity (**Critical**, **Warning**, **Info**).
  * Outlines immediate threat impact (e.g., *"SMTP TLS Downgrade Attack Risk"*, *"Spoofing Vulnerability"*).
  * Provides actionable remediation guidance and exact DNS record syntax.
* **Interactive Protocol Deep-Dives (Accordions)**:
  * **DMARC Deep-Dive**:
    * Raw DNS TXT record display with one-click copy.
    * Tag breakdown table parsing `v`, `p`, `sp`, `rua`, `ruf`, `fo`, `pct`, `adkim`, `aspf`, and `rf`.
    * Subdomain policy inheritance validation.
  * **SPF Deep-Dive**:
    * Visual RFC 7208 Lookup Counter meter (e.g., `3/10` lookups used).
    * Over-limit warning if DNS lookups exceed the RFC maximum of 10.
    * Recursive SPF Lookup Tree displaying nested `include:` directives and resolved IP ranges.
    * Policy qualifier inspection (`-all` hard fail vs `~all` soft fail).
  * **DKIM Selector Audit Tool**:
    * Interactive selector input field with presets (`google`, `zoho`, `s1`, `k1`, `default`).
    * Resolves `[selector]._domainkey.[domain]` and parses public key (`k=rsa; p=...`).
    * Key length validator warning against weak keys (<2048-bit).
  * **BIMI Inspection**:
    * Resolves `default._bimi.[domain]` TXT record.
    * Extracts published SVG brand logo URL and Verified Mark Certificate (VMC) indicator.
  * **MTA-STS & TLS-RPT Deep-Dive**:
    * Resolves `_mta-sts.[domain]` for strict transport security (`mode: enforce/testing/none`, `max_age`, `mx`).
    * Resolves `_smtp._tls.[domain]` for automated TLS delivery issue reporting.
  * **DNSSEC & DNS Infrastructure**:
    * Validates DS (Delegation Signer) and DNSKEY records to verify protection against DNS cache poisoning.
    * Resolves MX records with preference weights and IP resolution.
    * Inspects authoritative NS nameservers and root A/AAAA host records.

---

## 3. Authentication & 4-Way Alignment Engine

* **4-Way Alignment Matrix**:
  * **Fully Aligned (SPF Pass + DKIM Pass)**: Legitimate, fully authenticated mail.
  * **SPF Only Aligned (SPF Pass + DKIM Fail/None)**: Authenticated via SPF; highlights missing DKIM signatures.
  * **DKIM Only Aligned (DKIM Pass + SPF Fail/None)**: Authenticated via DKIM; typical for forwarded email or third-party mailing lists.
  * **Unaligned / Failed (SPF Fail + DKIM Fail)**: Spoofing suspects and rogue senders subject to DMARC policy enforcement.
* **SPF vs. DKIM Alignment Donut Charts**:
  * Interactive Recharts donuts depicting compliance proportions.
  * Center badges displaying percentage passes and total evaluated message counts.
* **Forwarding & Mailing List Identification**:
  * Tracks DMARC Policy Override reasons (`arc`, `local_policy`, `mailing_list`, `other`).
  * Identifies messages saved from rejection by Authenticated Received Chain (ARC).
* **DKIM Selector Inventory**:
  * Tracks high-volume DKIM selectors to monitor cryptographic key rotation schedules.

---

## 4. Threat Intelligence & SOC Forensics Feed

* **Live SOC Threat Feed**:
  * Real-time stream of unaligned, spoofed, and high-risk email events.
  * Highlights suspect sender IP, reverse DNS (PTR), originating country, sending organization, and applied disposition (`quarantine`, `reject`).
* **Attacker Network Attribution**:
  * Ranks top threat Autonomous System Numbers (ASNs) and Internet Service Providers (ISPs) delivering unaligned emails.
* **Rogue Sender Ranking**:
  * Itemized table of sending IPs delivering high volumes of failing messages.
  * Integrates with external threat intelligence tools (WHOIS, AbuseIPDB, Shodan).
* **Policy Enforcement & Containment Rate**:
  * Computes the exact percentage of malicious/failing traffic successfully blocked or quarantined vs. delivered to inboxes.
* **Legitimate vs. Spoofing Classification**:
  * Uses IP allowlists and reverse DNS heuristics to separate misconfigured internal servers from actual phishing campaigns.

---

## 5. Global Geolocation Mapping & Geographic Attribution

* **Interactive High-Definition GIS Map**:
  * Powered by Leaflet with fluid pan, scroll-zoom, bounding-box auto-fit, and responsive canvas resizing.
* **Multiple High-Definition Basemap Layers (Zero API Key Required)**:
  * **Dark Canvas**: High-contrast Esri World Dark Gray Base + Reference Labels (default dark theme).
  * **Light Canvas**: Esri World Light Gray Base + Reference Labels.
  * **Street Map**: OpenStreetMap (OSM) standard tile set.
  * **Satellite Imagery**: Esri World Imagery with international boundaries and place names.
  * **CARTO Dark Matter (Optional)**: Available for users with CARTO API keys.
* **Visual Geo-Marker Classification**:
  * **Emerald Markers**: High-compliance, legitimate email traffic clusters.
  * **Rose / Red Glowing Markers**: Malicious, failing, or spoofed email origin points.
  * Marker radius dynamically scaled by aggregate email volume.
* **Rich Interactive Popups**:
  * Displays Country name, Flag, Sending IP, Reverse DNS hostname, Message count, and DMARC Verdict.
* **Country Breakdown Cards**:
  * Top 10 sending countries ranked by legitimate traffic volume.
  * Top 10 threat countries ranked by failed email volume.
  * DMARC Forwarded origin tally.
* **Itemized Origin Locations Table**:
  * Searchable and filterable list of all detected origin IPs, PTR hostnames, country flags, volumes, and compliance statuses.

---

## 6. DMARC Policy Audit & Enforcement Readiness Rollout

* **Published Policy Inventory**:
  * Detects and displays published DMARC records for all domains (`p=none`, `p=quarantine`, `p=reject`).
  * Tracks subdomain policies (`sp`) and enforcement percentages (`pct=0` to `pct=100`).
* **Enforcement Readiness Score**:
  * Calculates whether a domain is ready to transition to strict enforcement (`p=reject`).
  * Benchmarked against an industry standard 98% legitimate traffic alignment threshold.
* **Would-Be Impact Simulator**:
  * Calculates how many legitimate emails would be blocked or quarantined if the domain advanced from `p=none` to `p=quarantine` or `p=reject` today.
* **Phased Rollout Guidance Engine**:
  * Step-by-step interactive workflow guiding administrators through:
    1. Monitoring Phase (`p=none, pct=100`)
    2. Quarantine Pilot Phase (`p=quarantine, pct=10` to `pct=50`)
    3. Full Quarantine Phase (`p=quarantine, pct=100`)
    4. Strict Enforcement Phase (`p=reject, pct=100`)

---

## 7. Raw Log Explorer & Full-Text Search

* **High-Performance OpenSearch Querying**:
  * Direct query interface supporting pagination, sorting, and field-level projections.
* **Lucene & Elasticsearch Filter Syntax**:
  * Search across raw documents using Lucene expressions (e.g., `source_ip_address:40.107.* AND passed_dmarc:false`).
* **Collapsible JSON Document Inspector**:
  * Inspect the full raw JSON document as ingested by parsedmarc, including raw XML headers, nested SPF/DKIM arrays, and policy evaluation details.
* **Export Filtered Results**:
  * Export matched raw logs directly to JSON or CSV for external security analysis.

---

## 8. Automated Enterprise Reporting Engine (PDF, Excel, CSV)

* **Multi-Format Export**:
  * **Branded Vector PDF**: High-resolution, printable PDF with executive cover page, KPI summary boxes, compliance charts, and tabular breakdowns generated via headless browser rendering.
  * **Formatted Multi-Sheet Excel (.xlsx)**: Professional Excel workbook with company logo, frozen headers, styled header columns, and color-coded conditional formatting (`openpyxl`).
  * **UTF-8 CSV**: Clean, machine-readable CSV for ingestion into SIEM or business intelligence platforms.
* **White-Label Branded Template System**:
  * Define and manage multiple report templates (`templates/*.json`).
  * Custom brand colors (primary, secondary, accent, surface, border).
  * Custom company logos (embedded base64 or public URL).
  * Multi-language report generation (English, Spanish, Arabic, French).
* **On-Demand Report Generation**:
  * Generate reports immediately from the UI with selected domain, date range, template, and formats.
* **Report History & Instant Download**:
  * Audit log of all previously generated reports with secure download tokens.
* **Automated Scheduled Report Deliveries**:
  * Configure recurring cron deliveries (Daily, Weekly, Monthly, Quarterly).
  * Timezone-aware scheduling respecting the user's local `time_of_day` and `timezone`.
  * Email delivery toggle with attached reports.
* **Email Report Dispatch**:
  * Send generated reports directly to stakeholders via email with one click.
* **Cryptographic One-Click Unsubscribe**:
  * HMAC-SHA256 signed unsubscribe URLs with a branded landing page.

---

## 9. Security Alerting & Notification Engine

* **7 Real-Time Security Conditions**:
  1. `failure_rate`: DMARC pass rate drops below threshold percentage over time window.
  2. `new_sender_ip`: Previously unseen sending IP detected (compared against 30-day baseline).
  3. `quarantine_reject_volume`: Surge in messages blocked by DMARC policy.
  4. `alignment_failures`: Absolute count of unaligned SPF or DKIM messages.
  5. `report_volume_drop`: Missing aggregate reports (% drop compared to previous interval).
  6. `volume_spike`: Sudden anomalous volume surge (% traffic increase).
  7. `disallowed_country_asn`: Traffic originating from unauthorized countries or ASNs.
* **Dry-Run Simulation Engine ("Test Rule")**:
  * Evaluates rule criteria against historical OpenSearch data over the specified time window.
  * Previews offending IPs, sample logs, and triggers without sending notifications.
* **Anti-Fatigue Cooldown Management**:
  * Configurable cooldown timer (e.g., 60 minutes) prevents repeated alerts for ongoing incidents.
* **Automated Recovery Notifications**:
  * Detects when an anomalous condition returns to normal and sends an "All Clear / Restored" recovery email.
* **Daily Security Digest Staging**:
  * Option to bundle non-critical alerts into a single consolidated daily executive digest.
* **Incident History & Audit Trail**:
  * Complete log of all triggered alerts, threshold values, current values, offending IPs, and delivery statuses.

---

## 10. Outgoing SMTP Gateway & Email Queue Subsystem

* **Zero Hardcoded SMTP Credentials**:
  * All SMTP gateway settings are configured via the Admin UI and stored encrypted at rest.
* **AES-256-GCM Secret Encryption**:
  * Passwords and API tokens are encrypted using authenticated AES-256-GCM with unique 12-byte IVs and authentication tags.
  * Masked as `••••••••` in all API responses.
* **One-Click Mail Server Presets**:
  * Pre-configured templates for **Mailpit (Local Dev)**, **Google Workspace / Gmail**, and **Microsoft 365 / Exchange Online**.
* **Live 3-Step Socket Diagnostic Modal**:
  * Runs an in-depth socket verification test:
    1. DNS Resolution of mail server hostname.
    2. TCP Handshake on target port (25, 465, 587, 1025).
    3. TLS Handshake & SMTP Authentication.
  * Human-friendly error diagnosis (`ECONNREFUSED`, `ETIMEDOUT`, `EAUTH`, certificate errors).
* **Reliable Asynchronous Queue Worker**:
  * Enqueued emails are persisted in SQLite `email_queue`.
  * Background worker runs every 5 seconds with atomic job claiming.
  * Exponential backoff retry logic (2 min, 10 min, max 3 attempts).
  * Rate-limiting caps delivery at 20 emails/hour per recipient to prevent spam listing.
  * 15-minute sliding window deduplication.
* **Admin Queue Inspector & Manual Retry**:
  * View pending, processing, sent, and failed email jobs.
  * Trigger manual retry on failed jobs with one click.
* **Full Delivery Audit Log**:
  * Records recipient, subject, email type, delivery status, attempts, error message, and timestamps.

---

## 11. Multi-Tenant User Management & Role-Based Access Control

* **Three-Tier Role Hierarchy**:
  * **Admin**: Unrestricted access to all domains, SMTP gateway, email logs, user management, and system settings.
  * **Manager**: Can manage users, templates, and scheduled reports within their assigned domain scope.
  * **Viewer**: Read-only access to analytics, reports, domain health, and alerts for assigned domains.
* **Domain-Level Tenancy Scoping**:
  * Restrict non-admin users to specific domains (`user_domains` table).
  * Server-side `enforceDomainAccess` middleware automatically verifies domain ownership on all API requests.
* **Self-Service Profile Management**:
  * Update display name, email, organization name, logo URL, preferred theme, and language.
  * Secure password change dialog requiring current password verification.
* **Active User Lifecycle Management**:
  * Admins can activate or deactivate user accounts instantly without deleting data.

---

## 12. Enterprise Security, Cryptography & Hardening

* **Authentication & Session Security**:
  * Cryptographically signed JWT tokens with configurable expiration.
  * Passwords hashed using bcrypt with salt rounds.
* **Brute-Force Protection & Rate Limiting**:
  * Dedicated rate limiter on `/api/auth/login` (10 attempts per 15 minutes in production).
  * General API rate limiter (1000 requests per 15 minutes).
* **HTTP Security Headers (Helmet)**:
  * `X-Content-Type-Options: nosniff`
  * `X-Frame-Options: SAMEORIGIN`
  * `Strict-Transport-Security` (HSTS)
  * `Content-Security-Policy` (CSP)
* **Server-Side Request Forgery (SSRF) Defenses**:
  * Domain health endpoint validates FQDN format using strict regex (`RFC 1123`).
  * Blocks IP addresses, port injection, URL schemes (`http://`), loopback ranges, and cloud metadata endpoints (`169.254.169.254`).
* **Path Traversal Defenses**:
  * File download endpoints use `path.basename()` and restrict resolution to authorized report directories.
* **CRLF Header Injection Sanitization**:
  * All outgoing email subjects and recipient addresses are stripped of carriage returns (`\r`) and line feeds (`\n`).
* **Dynamic CORS Origin Matching**:
  * Whitelist support for production domains (`*.voxera.net`), localhost dev ports, and Nginx reverse proxy headers (`X-Forwarded-Host`).

---

## 13. Modern UI/UX, Multilingual Support & Theme Engine

* **Glassmorphism Cyber Security Aesthetic**:
  * Sleek dark mode design with translucent glass panels, subtle borders, and vivid status accents.
* **Responsive Mobile & Desktop Layout**:
  * Fully responsive sidebar drawer on mobile with backdrop overlay.
  * Desktop persistent navigation with quick-access domain switchers.
* **Multilingual Internationalization (i18n)**:
  * Built-in support for 4 languages:
    * **English** (`en`)
    * **Arabic** (`ar`) — includes native Right-to-Left (RTL) layout switching!
    * **French** (`fr`)
    * **Spanish** (`es`)
  * Persisted in user preferences and `localStorage`.
* **Dynamic Theme Customization Engine**:
  * **Sentinel Dark** (High-contrast obsidian and cyan cyber theme)
  * **Nordic Frost** (Cool slate blue and arctic cyan)
  * **Emerald Security** (Deep charcoal with emerald green accents)
  * **Cyberpunk Neon** (Deep violet with neon magenta and cyan accents)
  * **Light Mode** (Clean, high-legibility enterprise daylight palette)
* **Accessible Component Architecture**:
  * Screen-reader friendly semantic HTML, ARIA attributes, and high-contrast color ratios.

---

## 14. Grafana & OpenSearch Native Assets

* **Provisioned Grafana Dashboard (`dashboards/dmarc-overview.json`)**:
  * 6-row executive dashboard with 25+ visual panels.
  * Automatic datasource provisioning via `provisioning/datasources/opensearch.yml`.
  * Pre-configured alert rules in `provisioning/alerting/dmarc-alerts.yml`.
* **OpenSearch Field Mapping Template (`opensearch/index-template.json`)**:
  * Explicit mapping template for `dmarc_aggregate-*` daily indices.
  * Keyword sub-fields on all string fields for aggregation performance.
* **OpenSearch Read-Only Role & Setup Script**:
  * Principle of least privilege role (`opensearch/read-only-role.json`).
  * Automation script (`opensearch/setup-opensearch-readonly.sh`) to provision read-only users.
* **Synthetic Test Data Generator (`scripts/seed-test-data.sh`)**:
  * Bulk-indexes synthetic DMARC records across multiple domains, sending IPs, and authentication scenarios for immediate testing and verification.
