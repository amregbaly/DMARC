# DMARC Aggregate Analysis Dashboard for Grafana + OpenSearch

A fully provisioned Grafana dashboard and supporting OpenSearch assets for analyzing DMARC aggregate reports from [parsedmarc](https://domainaware.github.io/parsedmarc/) or compatible tools.

## 📁 Repository Structure

```
.
├── README.md
├── web/                             # Custom React + Vite + Express Web Dashboard
│   ├── client/                      # React 19 + Tailwind CSS v4 + Recharts UI
│   └── server/                      # Express.js OpenSearch API proxy
├── dashboards/
│   └── dmarc-overview.json          # Main Grafana dashboard (uid: dmarc-overview)
├── provisioning/
│   ├── datasources/
│   │   └── opensearch.yml            # OpenSearch datasource with env-var credentials
│   ├── dashboards/
│   │   └── dmarc.yml                 # Dashboard auto-provisioning config
│   └── alerting/
│       └── dmarc-alerts.yml          # 4 alert rules (disabled by default)
├── opensearch/
│   ├── index-template.json           # Explicit field mappings for dmarc_aggregate-*
│   ├── read-only-role.json           # Security role definition
│   └── setup-opensearch-readonly.sh  # Script to create role + user
└── scripts/
    └── seed-test-data.sh             # Bulk-index ~45 synthetic test records
```

## 🚀 Quick Start

### 1. Set environment variables

```bash
export OPENSEARCH_USER=grafana_reader
export OPENSEARCH_PASSWORD=<your-password>
```

### 2. Apply the index template (optional, for new indices)

```bash
curl -sk -X PUT "https://172.105.135.195:9200/_index_template/dmarc_aggregate_template" \
  -u admin:<admin-password> \
  -H 'Content-Type: application/json' \
  -d @opensearch/index-template.json
```

### 3. Create the read-only OpenSearch user

```bash
export OPENSEARCH_ADMIN_USER=admin
export OPENSEARCH_ADMIN_PASS=<admin-password>
export GRAFANA_OS_USER=grafana_reader
export GRAFANA_OS_PASS=<choose-a-strong-password>
bash opensearch/setup-opensearch-readonly.sh
```

### 4. Deploy provisioning files to Grafana

Copy into your Grafana config directory:

```bash
# Datasource
cp provisioning/datasources/opensearch.yml /etc/grafana/provisioning/datasources/

# Dashboard provisioning
cp provisioning/dashboards/dmarc.yml /etc/grafana/provisioning/dashboards/

# Dashboard JSON
mkdir -p /etc/grafana/dashboards
cp dashboards/dmarc-overview.json /etc/grafana/dashboards/

# Alert rules (optional)
cp provisioning/alerting/dmarc-alerts.yml /etc/grafana/provisioning/alerting/

# Restart Grafana
sudo systemctl restart grafana-server
```

### 5. Seed test data (optional)

```bash
export OPENSEARCH_PASSWORD=<password>
bash scripts/seed-test-data.sh
```

Then set the Grafana time range to **2026-10-01 to 2026-10-05** to see all test data.

## 📊 Dashboard Layout

| Row | Title | Panels |
|-----|-------|--------|
| 1 | **Overview** | Total Emails, DMARC Pass Rate (%), DMARC Failures, Messages Affected, Domains Monitored, Reports Received, Unique Sending IPs |
| 2 | **Authentication & Alignment** | SPF Result Pie, DKIM Result Pie, SPF Alignment Pie, DKIM Alignment Pie, Alignment Matrix Table, Disposition Over Time, Authenticated but Not Aligned, Auth Method That Saved the Message (pie + time series) |
| 3 | **Traffic Analysis** | Messages Over Time (pass/fail), Top Sending IPs, Top Domains, Top Source Orgs, Reporting Orgs, Country Breakdown, Header/Envelope From Mismatch |
| 4 | **Security & Threat Intelligence** | 🌍 Global Attack Origin & Threat Heatmap (Geomap), 🏴‍☠️ Attacker Geolocation Breakdown, 🏢 Top Threat Networks (ASNs & ISPs), 🛡️ Attack Containment & Blocking Rate, 🚨 SOC Live Threat Feed & Forensics, DMARC Failures by IP, Unauthorized Senders, SPF Failures, DKIM Failures, Quarantine/Reject Over Time, Spoofing Suspects |
| 5 | **Policy & Enforcement** | Published Policies Table, Policy State Timeline, Enforcement Readiness %, Would-Be Impact, Readiness Guide |
| 6 | **Data Health** | Reports Per Day, Last Report Per Reporting Org |

## 🔑 Field Mapping Decisions

All string fields in the live `dmarc_aggregate-*` mapping are typed as `text` with a `.keyword` sub-field. This means:

| Usage | Field Suffix |
|-------|-------------|
| **Terms aggregation** (group-by, pie charts, variables) | `.keyword` |
| **Full-text search** (Lucene query) | `.keyword` (for exact match) or bare (for analyzed) |
| **Boolean fields** (`passed_dmarc`, `dkim_aligned`, `spf_aligned`) | No suffix needed |
| **Numeric fields** (`message_count`, `published_policy.pct`) | No suffix needed |
| **Date fields** (`date_begin`, `date_end`) | No suffix needed |

**Every volume metric uses `Sum of message_count`**, never document count. This is critical because a single DMARC aggregate record can represent hundreds of emails.

### Enrichment fields

The following fields are populated by parsedmarc's IP enrichment and may be absent in older data:

- `source_name` — Human-readable name of the sending organization
- `source_base_domain` — Base domain of the sending IP's reverse DNS
- `source_reverse_dns` — Full reverse DNS of the source IP
- `source_country` — ISO country code of the source IP
- `source_type` — Classification (e.g., "forwarded", "direct", "suspicious")

Panels using these fields include `_exists_:` guards in their Lucene queries so they degrade gracefully (show empty) when the fields are missing.

## 🛡️ IP Allowlist (known_ips)

The **Unauthorized Senders** and **Spoofing Suspects** panels use the `known_ips` dashboard variable to exclude legitimate senders from the "bad actors" view.

### How it works

1. The `known_ips` variable is a **textbox** variable at the top of the dashboard
2. Enter your authorized sending IPs, **space-separated** (Lucene OR syntax)
3. The panels use `NOT source_ip_address.keyword:($known_ips)` to exclude them

### Example value

```
209.85.220.41 40.107.22.100 192.0.2.50 185.70.40.5
```

### Maintaining the allowlist

- **Add IPs**: Click the variable dropdown, edit the text, add new IPs separated by spaces
- **Remove IPs**: Edit the variable and remove the IP
- **Persist changes**: To make the default permanent, edit `known_ips` in `dashboards/dmarc-overview.json` → `templating.list` → find `"name": "known_ips"` → update `"query"` and `"current.text"`/`"current.value"`

### For alert rules

The alert rule "Non-allowlisted IP sending >50 failing messages" has its own `NOT source_ip_address.keyword:(...)` clause hardcoded in the query. Update it in `provisioning/alerting/dmarc-alerts.yml` when your allowlist changes.

## ⚠️ Alert Rules

Four alert rules are provisioned in `provisioning/alerting/dmarc-alerts.yml`, all **disabled (paused) by default**:

| Alert | Condition | Severity |
|-------|-----------|----------|
| DMARC pass rate below 90% | Pass rate < 90% for any domain over 24h | Warning |
| Non-allowlisted IP volume | >50 failing messages from unknown IP in 24h | Critical |
| Missing major reporter | No reports from Google/Microsoft/Yahoo in 48h | Warning |
| High-volume reject | >100 messages with reject disposition in 24h | Critical |

To enable alerts:
1. Navigate to **Alerting → Alert rules** in Grafana
2. Find the DMARC rules
3. Click **Enable** (un-pause) on the ones you want active
4. Configure a **notification policy** and **contact point** (email, Slack, etc.)

## 🔍 Troubleshooting

### Panels show "No data"

1. **Check the time range**: Ensure it covers the dates of your indexed data
2. **Check variable values**: Click each variable dropdown and verify values are loaded. If empty, the datasource may not be connecting
3. **Check the index pattern**: The datasource must point to `dmarc_aggregate-*` with `date_begin` as the time field

### Panels show errors about field types

If you see aggregation errors:
- Verify the mapping with `GET dmarc_aggregate-*/_mapping`
- String fields must be aggregated on their `.keyword` sub-field
- If a field is mapped as `text` without a `.keyword` sub-field, you need to reindex with the template from `opensearch/index-template.json`

### .keyword issues

All string fields in the dashboard use `.keyword` for aggregations. If your mapping uses direct `keyword` type (without `text` parent), remove the `.keyword` suffix from:
- All `field` references in `bucketAggs`
- All `field` references in `metrics` (for `cardinality`)
- All variable queries

### Time zone issues

The dashboard uses UTC timezone. If your `date_begin` values are in a different timezone, either:
- Change the dashboard timezone setting (gear icon → Settings → Time Options)
- Normalize dates to UTC before indexing

### Pass rate doesn't match expected value

The pass rate calculation uses:
- **Query A**: Sum of `message_count` (all records matching filters)
- **Query B**: Sum of `message_count` where `passed_dmarc:true`
- **Transformation**: `B / A × 100`

If it looks wrong:
1. Check that `passed_dmarc` is a `boolean` field (not a string "true"/"false")
2. Verify the time range captures all relevant data
3. Cross-check with: `GET dmarc_aggregate-*/_search` with appropriate aggregation

### Seed data validation

After running `seed-test-data.sh`, with the time range set to `2026-10-01 to 2026-10-05`:
- **Total emails**: 2870
- **DMARC pass rate**: 85.78%
- **DMARC failures**: 408
- **Domains monitored**: 3 (example.com, shop.example.com, corp.example.org)
- **Unique sending IPs**: 9

## 🖥️ Custom Web Dashboard (DMARC Sentinel)

A standalone, custom-branded web dashboard built with **React 19**, **Vite**, **Tailwind CSS v4**, and **Express.js** that connects directly to OpenSearch.

### Running the Custom Web App

1. **Start the Backend API Server (Port 5000)**:
   ```bash
   cd web/server
   npm install
   npm run dev
   ```

2. **Start the Frontend Client (Port 3000)**:
   ```bash
   cd web/client
   npm install
   npm run dev
   ```

3. Open **http://localhost:3000** in your browser.

Features:
- **Executive KPI Grid**: Total emails, real-time pass rate, quarantine/reject count.
- **Authentication & Alignment**: SPF and DKIM donut charts with 4-way alignment matrix.
- **Volume & Trends**: Area chart showing daily traffic and authentication outcomes.
- **SOC Threat Feed**: Live unaligned and spoofed email events, top attack geo and ASNs.
- **Policy Audit**: Evaluates `p=none`, `quarantine`, `reject` policies and readiness.
- **Raw Log Explorer**: Search and inspect full OpenSearch parsed aggregate documents.

## 📋 Requirements

- **Grafana** ≥ 10.0 with the `grafana-opensearch-datasource` plugin installed
- **OpenSearch** ≥ 2.x with the Security plugin enabled (for role-based access)
- **Data source**: parsedmarc or compatible tool writing to `dmarc_aggregate-*` daily indices

## 🏗️ Panel Limitations & Known Issues

| Panel | Limitation | Workaround |
|-------|-----------|------------|
| Header/Envelope-From Mismatch | Uses `raw_document` with extract transform; limited to 100 docs | Increase `size` in the query or add stricter filters |
| Published Policy Table | Uses `raw_document` + `groupBy` transform; heavy on large datasets | Narrow the time range or filter by domain |
| Policy State Timeline | Requires `extractFields` from `_source`; may be slow with many records | Narrow time range |
| Country Breakdown | No geomap (requires lat/lon); uses bar chart instead | Add geo-IP coordinates to index for map visualization |
| Auth Method Pie | Uses 4 separate queries (one per category) | Inherent to the calculation approach; cannot be simplified |
| Authenticated but Not Aligned stat | Complex compound Lucene query may miss edge cases with multiple results in nested arrays | Verified against seed data |

## 📄 License

MIT
