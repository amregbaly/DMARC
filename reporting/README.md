# DMARC Sentinel: Branded Executive Reporting Engine

High-performance, automated reporting and visualization solution for DMARC aggregate telemetry stored in OpenSearch (`dmarc_aggregate-*`). Generates pixel-perfect, branded **Executive PDFs**, multi-tab formatted **Excel workbooks (.xlsx)**, and **CSV bundles** weighted by `message_count`.

---

## 1. Quick Start

### Standalone CLI Execution
Generate a full branded report suite on demand:
```bash
# Generate Default Sentinel Corporate report
python3 report_service.py --domain example.com --template default --formats pdf,xlsx,csv

# Generate Client-Branded (Acme CyberSecurity) report
python3 report_service.py --domain example.com --template acme_branded --formats pdf,xlsx,csv
```
Generated reports are stored in `reporting/output/`:
- `DMARC_default_<domain>_<timestamp>.pdf`: High-resolution vector PDF with cover page, KPI metrics, SPF/DKIM matrix, sender inventory, threat list, and policy readiness recommendations.
- `DMARC_default_<domain>_<timestamp>.xlsx`: Multi-sheet Excel workbook with embedded company logo, Summary KPI sheet, Authentication sheet, Senders sheet, Threat Intelligence sheet, and Raw Audit Log sheet with conditional formatting and frozen headers.
- `DMARC_default_<domain>_<timestamp>.csv`: UTF-8 with BOM and metadata headers for Excel/SIEM compatibility.

### Standalone Microservice (FastAPI)
Run the dedicated reporting API server:
```bash
python3 report_service.py --serve --port 5050
```
Interactive OpenAPI documentation will be accessible at `http://localhost:5050/docs`.

### Docker Deployment
```bash
# Build and run with Docker Compose
docker compose up -d --build
```

---

## 2. Integrated Web Application Experience
The DMARC Sentinel React dashboard provides a dedicated **Reports** tab directly in the main navigation:
1. **On-Demand Report Generator**: Select target domain, time preset (7d / 30d / 90d / all time), reporting organization, disposition, choose branding template, and export format(s). Click **"Generate & Compile Branded Report"** for immediate download.
2. **Branding & Template Manager**: Visual card management for corporate templates. Create, customize, edit colors, upload/configure logos, set headers/footers, and select English or Spanish.
3. **Report History**: Full chronological record of all generated reports with download links for PDF, XLSX, and CSV.
4. **Automated Schedules**: Schedule daily, weekly, or monthly delivery to stakeholder distribution lists.
5. **OpenSearch Dashboards & Queries**: Instant download of the pre-built `opensearch-dmarc-dashboards.ndjson` bundle and reference DSL queries.

---

## 3. Creating Custom Templates & Adding Logos

Templates are declared in `reporting/templates/<template_id>.json`:
```json
{
  "id": "my_client_template",
  "name": "Global Corp Defense",
  "description": "Custom white-label reporting template for Global Corp",
  "logo": "templates/assets/my_client_logo.png",
  "logo_position": "left",
  "logo_max_height_px": 55,
  "brand_colors": {
    "primary": "#0f172a",
    "secondary": "#2563eb",
    "accent": "#06b6d4",
    "table_header": "#1e293b",
    "table_header_text": "#ffffff",
    "pass_color": "#10b981",
    "fail_color": "#ef4444",
    "warn_color": "#f59e0b"
  },
  "fonts": {
    "heading": "'Inter', sans-serif",
    "body": "'Inter', sans-serif"
  },
  "title": "DMARC Executive Authentication & Security Audit",
  "subtitle": "Domain Spoofing Protection and Sender Inventory Evaluation",
  "cover_page": true,
  "prepared_by": "Managed SOC Operations",
  "prepared_for": "Global Corp Executive Leadership",
  "header_text": "Global Corp • Confidential Mail Infrastructure Audit",
  "footer_text": "Internal & Authorized Recipient Distribution Only",
  "confidentiality_notice": "CONFIDENTIAL: Contains proprietary mail authentication telemetry.",
  "language": "en",
  "sections": [
    "executive_summary",
    "pass_rate_trend",
    "disposition_breakdown",
    "authentication_results",
    "top_sources_inventory",
    "security_threats",
    "recommended_actions",
    "raw_tables_appendix"
  ],
  "default_formats": ["pdf", "xlsx", "csv"]
}
```

### Adding a Logo:
1. Place a PNG or SVG logo in `reporting/templates/assets/<your_logo>.png`.
2. Reference the relative path in `"logo": "templates/assets/<your_logo>.png"`.
3. Set `"logo_position": "left"` (or `"center"` / `"right"`).
4. Both the **PDF cover page** and the **Excel Summary worksheet** will automatically embed and scale the logo.

---

## 4. OpenSearch Dashboards Import

An importable Saved Objects export containing all 5 pre-built dashboards is located at:
`opensearch/dashboards-export.ndjson`

### Import Instructions:
1. Log in to your OpenSearch Dashboards instance (e.g., port 5601).
2. Go to **Stack Management** > **Saved Objects**.
3. Click **Import** (top right) and select `opensearch/dashboards-export.ndjson`.
4. Select *"Automatically overwrite conflicts"* and click **Import**.
5. All 5 dashboards and 8 visualizations will be immediately imported and ready for use.

---

## 5. OpenSearch Alerting Monitors

Four enterprise monitor definitions are provided in `opensearch/alerting-monitors.json`:
1. **Pass Rate Drop Monitor**: Fires when 24h pass rate for any domain drops below 98%.
2. **New Unknown Source Volume**: Triggers when unaligned mail server sends >50 messages.
3. **Spoofing Burst Spike**: Triggers when fail/fail spoofing volume exceeds 100 messages within 2 hours.
4. **Tier-1 Ingestion Health**: Fires if no reports are received from Google or Microsoft in 48 hours.
