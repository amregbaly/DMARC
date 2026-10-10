# DMARC Sentinel: Enterprise Aggregate Reporting Solution on OpenSearch

This document provides the complete technical architecture, discovery audit, query specifications, alerting rules, and export documentation for the DMARC Aggregate Reporting and Visualization solution.

---

## 1. Discovered Field Mapping & OpenSearch Capability Summary

### 1.1 Cluster Telemetry
- **OpenSearch Version**: 3.3.2 (Lucene 10.3.1)
- **Active Indices**: `dmarc_aggregate-2024-02-01`, `dmarc_aggregate-2026-10-01`, `dmarc_aggregate-2026-10-02`, `dmarc_aggregate-2026-10-03`, `dmarc_aggregate-2026-10-04`
- **Total Processed Messages**: **4,542 messages** across 3 test domains (`example.com`, `corp.example.org`, `shop.example.com`).

### 1.2 Schema Mapping & Field Dictionary
All metrics, percentages, and readiness evaluations strictly calculate sums of `message_count`.

| Field Name | Type | Purpose | Aggregation Role |
| :--- | :--- | :--- | :--- |
| `date_begin` | `date` | Report interval start | Date histogram primary time field |
| `date_end` | `date` | Report interval end | Time range bounds |
| `header_from` | `text` (`.keyword`) | RFC 5322 From Domain | Primary domain segmentation |
| `source_ip_address` | `text` (`.keyword`) | Sending mail server IP | Source IP breakdown and threat analysis |
| `source_country` | `text` (`.keyword`) | ISO 3166-1 alpha-2 code | Geographic traffic distribution |
| `source_asn` | `long` | Autonomous System Number | Network attribution |
| `source_as_name` | `text` (`.keyword`) | ISP / Hosting provider | Cloud / ISP classification |
| `source_base_domain`| `text` (`.keyword`) | Provider base domain | Sender inventory (Google, Microsoft, etc.) |
| `source_name` | `text` (`.keyword`) | Sender service label | User-friendly sender classification |
| `source_reverse_dns`| `text` (`.keyword`) | PTR DNS record | Mail server hostname verification |
| `message_count` | `long` | Message count in report | **Weight metric for all calculations** |
| `disposition` | `text` (`.keyword`) | Applied policy action | Breakdown: `none`, `quarantine`, `reject` |
| `passed_dmarc` | `boolean` | DMARC pass/fail result | Compliance rate numerator |
| `spf_aligned` | `boolean` | RFC 5321 alignment | SPF authentication compliance |
| `dkim_aligned` | `boolean` | RFC 6376 alignment | DKIM authentication compliance |
| `dkim_results.selector`| `text` (`.keyword`)| DKIM selector tag | Key rotation and selector tracking |
| `policy_overrides.type`| `text` (`.keyword`)| Policy override reason | Forwarding and mailing list identification |
| `published_policy.p`| `text` (`.keyword`) | Published domain policy| Policy state (`none`, `quarantine`, `reject`)|
| `published_policy.pct`| `long` | Enforcement percentage | Enforcement rollout tracker (0-100) |

### 1.3 Schema Gaps & Recommended Enrichments
1. **`source_ip_address` Type**: Mapped as `text`/`keyword`. Provided `opensearch/index-template-v2.json` to map as native `ip` type for CIDR range filtering.
2. **GeoIP Coordinates**: Provided `opensearch/ingest-pipeline-geoip.json` to enrich IPs with `geo_point` coordinates for OpenSearch Coordinate Maps.
3. **Array Nesting**: `dkim_results` and `spf_results` are standard JSON arrays. Parsedmarc's `dkim_results_combined` and `spf_results_combined` keywords provide single-field combinations (`"google / example.com / pass"`).

### 1.4 OpenSearch Reporting Plugin Capabilities vs. Custom Reporting Engine
- **OpenSearch Reports Scheduler (3.3.2)**: Generates basic PDF/PNG screenshots of dashboards and raw CSV of saved searches. It **cannot** generate formatted multi-sheet Excel (.xlsx) workbooks, does not support custom conditional formatting, does not embed company logos onto report sheets, and lacks executive narrative text.
- **Custom Reporting Engine (`reporting/`)**: Built with FastAPI, Playwright, and `openpyxl`. Delivers branded vector PDFs with cover pages and executive summaries, multi-sheet formatted Excel workbooks (.xlsx) with embedded logos, frozen headers, and conditional color highlighting, plus clean UTF-8 CSVs.

---

## 2. OpenSearch Dashboards (5 Built-in Dashboards)

Importable via `opensearch/dashboards-export.ndjson`:
- **Dashboard 1: Executive Overview**: Pass rate timeline weighted by `message_count`, total messages per domain, disposition distribution (pie chart), enforcement readiness (vs 98% threshold), and reports per day.
- **Dashboard 2: Authentication & Alignment**: 4-way SPF x DKIM result matrix (Pass/Pass, Pass/Fail, Fail/Pass, Fail/Fail), alignment failures, DKIM selector volume, and policy override reasons.
- **Dashboard 3: Traffic & Sender Inventory**: Sender base domain inventory (Google, Microsoft 365, Amazon SES, Mailchimp), top source IPs with PTR hostnames, country distribution, and reporting orgs.
- **Dashboard 4: Security & Threat Hunting**: Fail/fail spoofing IP ranking, spike detection against baseline, mail quarantined/rejected, and high-fail IP export table for firewall/blocklist feeds.
- **Dashboard 5: Operational Health**: Misconfigured legitimate sender identification, published policy tracking (`p`, `sp`, `pct`), and report ingestion health.

---

## 3. OpenSearch Alerting Monitors

Defined in `opensearch/alerting-monitors.json`:
1. **Domain Pass Rate Drop (<98%)**: Query-level monitor checking 24h pass rate for high-volume domains.
2. **New Unknown Source Volume (>50 msgs)**: Detects rogue mail servers exceeding message thresholds.
3. **Spoofing Burst Spike**: Detects sudden spikes in fail/fail traffic (>100 messages in 2 hours).
4. **Ingestion Health Alert**: Alerts when no aggregate reports are received from Google or Microsoft in 48 hours.

---

## 4. Branded Template System & Report Formats

Configured via `reporting/templates/`:
- **Sentinel Corporate (`default.json`)**: High-contrast navy (`#0f172a`) and cyan (`#06b6d4`) cyber security theme with embedded Sentinel shield logo.
- **Acme CyberSecurity (`acme_branded.json`)**: Purple (`#4c1d95`) and gold (`#d97706`) white-label theme in Spanish (`"es"`) with Acme logo.

### Deliverable Sample Files Generated:
- **PDF**: `reporting/output/DMARC_default_example_com_20261010_003319.pdf`
- **Excel (.xlsx)**: `reporting/output/DMARC_default_example_com_20261010_003319.xlsx`
- **CSV**: `reporting/output/DMARC_default_example_com_20261010_003319.csv`
- **Acme PDF**: `reporting/output/DMARC_acme_branded_example_com_20261010_002640.pdf`
- **Acme Excel (.xlsx)**: `reporting/output/DMARC_acme_branded_example_com_20261010_002640.xlsx`
- **Acme CSV**: `reporting/output/DMARC_acme_branded_example_com_20261010_002640.csv`

---

## 5. Web Application Integration

A new **Reports** tab is fully integrated in the web application:
- Accessible directly from the top navigation bar.
- On-Demand Generation with interactive template picker, date range filters, and format toggles.
- Template Manager with live brand color pickers, logo placement, and language options.
- Complete Report History table with instant download links.
- Automated Scheduled Deliveries manager.
- OpenSearch Dashboards NDJSON download button.
