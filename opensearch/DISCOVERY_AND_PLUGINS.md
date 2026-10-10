# Step 1: OpenSearch Schema Discovery & Plugin Capabilities

## 1. Environment & Cluster Overview
- **OpenSearch Version**: 3.3.2 (Lucene 10.3.1, Tar Distribution)
- **Cluster Name**: `docker-cluster` (Status: `green`, 1 node, 22 active shards)
- **Index Pattern**: `dmarc_aggregate-*` (daily indices, e.g. `dmarc_aggregate-2024-02-01`, `dmarc_aggregate-2026-10-01`, etc.)
- **Active Data Ingestion**: Daily aggregate reports compliant with RFC 7489, produced by `parsedmarc` or custom ingestion pipelines.

---

## 2. Field Names, Types & Schema Mapping
From `GET dmarc_aggregate-*/_mapping`:

| Conceptual Attribute | Field Name | Storage Type | Aggregation Target | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Date Range (Start)** | `date_begin` | `date` | Date Histogram | Primary time field for dashboards & reports |
| **Date Range (End)** | `date_end` | `date` | Range filter | End of aggregation interval |
| **Date Range Array** | `date_range` | `date` | Range filter | Begin & end timestamps |
| **Reporting Org Name** | `org_name` | `text` (`.keyword`) | `org_name.keyword` | e.g. "google.com", "microsoft.com", "Google Inc." |
| **Reporting Org Email**| `org_email` | `text` (`.keyword`) | `org_email.keyword` | e.g. "noreply-dmarc-support@google.com" |
| **Report Identifier** | `report_id` | `text` (`.keyword`) | `report_id.keyword` | Unique ID issued by receiving mail receiver |
| **Header From Domain** | `header_from` | `text` (`.keyword`) | `header_from.keyword` | Primary organizational/subdomain being monitored |
| **Envelope From** | `envelope_from` | `text` (`.keyword`) | `envelope_from.keyword`| SMTP RFC 5321 MAIL FROM bounce address |
| **Envelope To** | `envelope_to` | `text` (`.keyword`) | `envelope_to.keyword` | Destination domain/tenant |
| **Source IP** | `source_ip_address` | `text` (`.keyword`) | `source_ip_address.keyword` | Sending server IPv4/IPv6 |
| **Message Volume** | `message_count` | `long` | `sum(message_count)` | **CRITICAL: Weight all metrics by this sum** |
| **Applied Disposition**| `disposition` | `text` (`.keyword`) | `disposition.keyword` | `none`, `quarantine`, `reject` |
| **DMARC Result** | `passed_dmarc` | `boolean` | Term filter / bool | `true` (aligned pass) or `false` (fail) |
| **SPF Alignment** | `spf_aligned` | `boolean` | Term filter / bool | `true` (RFC 5321 domain matches RFC 5322) |
| **DKIM Alignment** | `dkim_aligned` | `boolean` | Term filter / bool | `true` (d= tag matches RFC 5322 From) |
| **DKIM Selectors** | `dkim_results.selector` | `text` (`.keyword`) | `dkim_results.selector.keyword`| e.g. "google", "selector1", "s1", "s2" |
| **DKIM Results** | `dkim_results.result` | `text` (`.keyword`) | `dkim_results.result.keyword` | `pass`, `fail`, `temperror`, `permerror` |
| **Combined DKIM** | `dkim_results_combined` | `text` (`.keyword`) | `dkim_results_combined.keyword`| e.g. `google / example.com / pass` |
| **SPF Results** | `spf_results.result` | `text` (`.keyword`) | `spf_results.result.keyword` | `pass`, `fail`, `softfail`, `neutral` |
| **Combined SPF** | `spf_results_combined` | `text` (`.keyword`) | `spf_results_combined.keyword` | e.g. `mfrom / example.com / pass` |
| **Source ASN** | `source_asn` | `long` | Terms agg | Autonomous System Number (e.g. 15169) |
| **Source AS Name** | `source_as_name` | `text` (`.keyword`) | `source_as_name.keyword` | ISP / Cloud provider (e.g. "Google LLC") |
| **Source Base Domain** | `source_base_domain`| `text` (`.keyword`) | `source_base_domain.keyword`| e.g. "google.com", "amazonaws.com" |
| **Sender Service Name**| `source_name` | `text` (`.keyword`) | `source_name.keyword` | e.g. "Google Workspace", "Amazon SES" |
| **Reverse DNS** | `source_reverse_dns`| `text` (`.keyword`) | `source_reverse_dns.keyword`| PTR record (e.g. `mail-sor-f41.google.com`) |
| **Source Country** | `source_country` | `text` (`.keyword`) | `source_country.keyword`| 2-letter ISO code (e.g. "US", "RU", "FI") |
| **Source Type** | `source_type` | `text` (`.keyword`) | `source_type.keyword` | `forwarded`, `direct`, `suspicious` |
| **Policy Override Type**| `policy_overrides.type`| `text` (`.keyword`)| `policy_overrides.type.keyword`| `forwarded`, `mailing_list`, `local_policy` |
| **Published Policy (p)**| `published_policy.p`| `text` (`.keyword`) | `published_policy.p.keyword` | `none`, `quarantine`, `reject` |
| **Subdomain Policy (sp)**| `published_policy.sp`| `text` (`.keyword`)| `published_policy.sp.keyword`| `none`, `quarantine`, `reject` |
| **Published Pct** | `published_policy.pct`| `long` | Average / max | Policy enforcement percentage (0-100) |

---

## 3. Missing Fields & Recommended Enrichments
1. **`source_ip_address` Storage Type**:
   - *Current*: Mapped as `text` with a `.keyword` subfield.
   - *Limitation*: Cannot perform native CIDR range queries (e.g. `198.51.100.0/24`) without text wildcards.
   - *Enrichment*: Map as native `ip` type in the index template (`index-template-v2.json`).
2. **Geo Coordinates (`geo_point`)**:
   - *Current*: `source_country` provides 2-letter country codes ("US", "FI", "RU"), but no lat/lon coordinates exist.
   - *Limitation*: OpenSearch Dashboards Coordinate Maps require a `geo_point` field. Region Maps work with ISO country codes.
   - *Enrichment*: An OpenSearch Ingest Pipeline with a `geoip` processor maps `source_ip_address` to `source_geoip.location` (`geo_point`).
3. **Nested vs Flat Arrays**:
   - *Current*: `dkim_results` and `spf_results` are standard JSON arrays of objects (un-nested).
   - *Impact*: In standard multi-valued fields, cross-field queries (e.g. `selector=google AND result=pass`) match across any element in the array if a document has multiple DKIM signatures.
   - *Mitigation*: Fortunately, `parsedmarc` provides pre-combined fields:
     - `dkim_results_combined`: `["google / example.com / pass"]`
     - `spf_results_combined`: `["mfrom / example.com / pass"]`
     This allows exact single-field keyword aggregations without nested query overhead.

---

## 4. OpenSearch & Plugin Capability Assessment

### Installed Plugins on OpenSearch 3.3.2:
- `opensearch-alerting 3.3.2.0`: **Fully Supported**. Allows Query-level and Bucket-level monitors with trigger conditions, anomaly detection, and webhook/email actions.
- `opensearch-reports-scheduler 3.3.2.0`: **Installed**. Provides basic scheduled export within OpenSearch Dashboards.
- `opensearch-index-management 3.3.2.0`: **Installed**. Supports ISM rollover and retention policies.
- `opensearch-notifications 3.3.2.0`: **Installed**. Multi-channel alerting notifications.
- `opensearch-sql 3.3.2.0`: **Installed**. SQL & PPL query interface.

### Native Reporting Plugin Capabilities vs. Limitations:
| Capability | OpenSearch Dashboards Native Reporting | Custom Standalone Reporting Engine (Built Here) |
| :--- | :--- | :--- |
| **PDF Export** | Yes (screenshot-based raster render) | **Yes (high-resolution vector PDF, executive cover page, responsive layout)** |
| **PNG Export** | Yes | Yes (chart extraction) |
| **CSV Export** | Yes (raw saved search tabular export) | **Yes (clean UTF-8 with BOM, metadata header, multi-table bundles)** |
| **Excel (.xlsx)** | **No (Not supported natively)** | **Yes (native multi-sheet workbook, conditional formatting, formulas, auto widths)** |
| **Client Logo Branding** | Very Limited (cannot embed logo on cover/sheets) | **Yes (fully customizable logo: position, dimensions, cover & sheet headers)** |
| **Corporate Color Palettes**| Fixed dark/light theme | **Yes (custom primary, secondary, accent, table headers, pass/fail colors)** |
| **Executive Summary Text** | No (only shows raw charts) | **Yes (narrative analysis, readiness verdict, recommended actions)** |
| **Multi-Language (EN/ES)** | No | **Yes (English and Spanish templates supported)** |
| **Custom Template Config** | No (rigid UI) | **Yes (Declarative JSON/YAML templates, downloadable & editable)** |
