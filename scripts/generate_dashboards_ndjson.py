import json

objects = []

# 1. Index Pattern
index_pattern_id = "dmarc_aggregate-pattern"
objects.append({
    "id": index_pattern_id,
    "type": "index-pattern",
    "attributes": {
        "title": "dmarc_aggregate-*",
        "timeFieldName": "date_begin",
        "fields": "[]"
    }
})

# Helper to create visualization saved object
def create_vis(vis_id, title, vis_state, search_source=None):
    if search_source is None:
        search_source = {
            "query": {"query": "", "language": "kuery"},
            "filter": [],
            "index": index_pattern_id
        }
    return {
        "id": vis_id,
        "type": "visualization",
        "attributes": {
            "title": title,
            "visState": json.dumps(vis_state),
            "uiStateJSON": "{}",
            "description": f"DMARC Visualization: {title}",
            "kibanaSavedObjectMeta": {
                "searchSourceJSON": json.dumps(search_source)
            }
        },
        "references": [
            {
                "id": index_pattern_id,
                "name": "kibanaSavedObjectMeta.searchSourceJSON.index",
                "type": "index-pattern"
            }
        ]
    }

# Visualizations
# Vis 1: Pass Rate Over Time
vis_timeline = create_vis(
    "vis-dmarc-pass-rate-timeline",
    "DMARC Pass Rate Over Time",
    {
        "title": "DMARC Pass Rate Over Time",
        "type": "line",
        "params": {"type": "line", "addTooltip": True, "addLegend": True},
        "aggs": [
            {"id": "1", "enabled": True, "type": "sum", "schema": "metric", "params": {"field": "message_count", "customLabel": "Total Messages"}},
            {"id": "2", "enabled": True, "type": "date_histogram", "schema": "segment", "params": {"field": "date_begin", "interval": "auto", "min_doc_count": 1}}
        ]
    }
)
objects.append(vis_timeline)

# Vis 2: Disposition Breakdown Pie
vis_disp = create_vis(
    "vis-dmarc-disposition-pie",
    "Message Disposition Breakdown",
    {
        "title": "Message Disposition Breakdown",
        "type": "pie",
        "params": {"type": "pie", "addTooltip": True, "addLegend": True, "isDonut": True},
        "aggs": [
            {"id": "1", "enabled": True, "type": "sum", "schema": "metric", "params": {"field": "message_count", "customLabel": "Volume"}},
            {"id": "2", "enabled": True, "type": "terms", "schema": "segment", "params": {"field": "disposition.keyword", "size": 5}}
        ]
    }
)
objects.append(vis_disp)

# Vis 3: Top Domains Volume Table
vis_top_domains = create_vis(
    "vis-dmarc-top-domains",
    "Total Messages Per Domain",
    {
        "title": "Total Messages Per Domain",
        "type": "table",
        "params": {"perPage": 10, "showPartialRows": False},
        "aggs": [
            {"id": "1", "enabled": True, "type": "sum", "schema": "metric", "params": {"field": "message_count", "customLabel": "Total Volume"}},
            {"id": "2", "enabled": True, "type": "terms", "schema": "bucket", "params": {"field": "header_from.keyword", "size": 10}}
        ]
    }
)
objects.append(vis_top_domains)

# Vis 4: Auth Matrix (SPF x DKIM)
vis_auth_matrix = create_vis(
    "vis-dmarc-auth-matrix",
    "SPF x DKIM Authentication Matrix",
    {
        "title": "SPF x DKIM Authentication Matrix",
        "type": "table",
        "params": {"perPage": 10},
        "aggs": [
            {"id": "1", "enabled": True, "type": "sum", "schema": "metric", "params": {"field": "message_count", "customLabel": "Volume"}},
            {"id": "2", "enabled": True, "type": "terms", "schema": "bucket", "params": {"field": "spf_aligned", "customLabel": "SPF Aligned"}},
            {"id": "3", "enabled": True, "type": "terms", "schema": "bucket", "params": {"field": "dkim_aligned", "customLabel": "DKIM Aligned"}}
        ]
    }
)
objects.append(vis_auth_matrix)

# Vis 5: DKIM Selectors
vis_dkim_sel = create_vis(
    "vis-dmarc-dkim-selectors",
    "DKIM Selectors Volume",
    {
        "title": "DKIM Selectors Volume",
        "type": "histogram",
        "params": {"type": "histogram", "addLegend": True},
        "aggs": [
            {"id": "1", "enabled": True, "type": "sum", "schema": "metric", "params": {"field": "message_count", "customLabel": "Messages"}},
            {"id": "2", "enabled": True, "type": "terms", "schema": "segment", "params": {"field": "dkim_results.selector.keyword", "size": 10}}
        ]
    }
)
objects.append(vis_dkim_sel)

# Vis 6: Top Senders / Base Domains
vis_senders = create_vis(
    "vis-dmarc-top-senders",
    "Top Sender Base Domains",
    {
        "title": "Top Sender Base Domains",
        "type": "histogram",
        "params": {"type": "histogram", "addLegend": True},
        "aggs": [
            {"id": "1", "enabled": True, "type": "sum", "schema": "metric", "params": {"field": "message_count", "customLabel": "Messages"}},
            {"id": "2", "enabled": True, "type": "terms", "schema": "segment", "params": {"field": "source_base_domain.keyword", "size": 10}}
        ]
    }
)
objects.append(vis_senders)

# Vis 7: Top Source IPs
vis_ips = create_vis(
    "vis-dmarc-top-ips",
    "Top Source IPs & PTR",
    {
        "title": "Top Source IPs & PTR",
        "type": "table",
        "params": {"perPage": 10},
        "aggs": [
            {"id": "1", "enabled": True, "type": "sum", "schema": "metric", "params": {"field": "message_count", "customLabel": "Messages"}},
            {"id": "2", "enabled": True, "type": "terms", "schema": "bucket", "params": {"field": "source_ip_address.keyword", "size": 20}},
            {"id": "3", "enabled": True, "type": "terms", "schema": "bucket", "params": {"field": "source_reverse_dns.keyword", "size": 1}},
            {"id": "4", "enabled": True, "type": "terms", "schema": "bucket", "params": {"field": "source_country.keyword", "size": 1}}
        ]
    }
)
objects.append(vis_ips)

# Vis 8: Fail/Fail Spoofing Traffic
vis_spoofing = create_vis(
    "vis-dmarc-spoofing-ips",
    "Security: Fail/Fail Spoofing Sources",
    {
        "title": "Security: Fail/Fail Spoofing Sources",
        "type": "table",
        "params": {"perPage": 10},
        "aggs": [
            {"id": "1", "enabled": True, "type": "sum", "schema": "metric", "params": {"field": "message_count", "customLabel": "Failing Volume"}},
            {"id": "2", "enabled": True, "type": "terms", "schema": "bucket", "params": {"field": "source_ip_address.keyword", "size": 15}},
            {"id": "3", "enabled": True, "type": "terms", "schema": "bucket", "params": {"field": "source_country.keyword", "size": 1}},
            {"id": "4", "enabled": True, "type": "terms", "schema": "bucket", "params": {"field": "source_as_name.keyword", "size": 1}}
        ]
    },
    search_source={
        "query": {"query": "spf_aligned: false AND dkim_aligned: false", "language": "kuery"},
        "filter": [],
        "index": index_pattern_id
    }
)
objects.append(vis_spoofing)

# Dashboards Definition Helper
def create_dashboard(dash_id, title, panels, desc=""):
    panels_json = []
    refs = []
    for i, p in enumerate(panels):
        panel_ref = f"panel_{i}"
        panels_json.append({
            "version": "7.10.2",
            "gridData": {"x": (i % 2) * 24, "y": (i // 2) * 15, "w": 24, "h": 15, "i": str(i)},
            "panelIndex": str(i),
            "panelRefName": panel_ref
        })
        refs.append({
            "name": panel_ref,
            "type": "visualization",
            "id": p["id"]
        })

    return {
        "id": dash_id,
        "type": "dashboard",
        "attributes": {
            "title": title,
            "description": desc,
            "panelsJSON": json.dumps(panels_json),
            "optionsJSON": json.dumps({"useMargins": True, "hidePanelTitles": False}),
            "timeRestore": False,
            "kibanaSavedObjectMeta": {
                "searchSourceJSON": json.dumps({
                    "query": {"query": "", "language": "kuery"},
                    "filter": []
                })
            }
        },
        "references": refs
    }

# 5 Dashboards
d1 = create_dashboard("dash-dmarc-overview", "DMARC - 1. Executive Overview", [vis_timeline, vis_disp, vis_top_domains], "Executive view of DMARC pass rates, volumes, and dispositions")
d2 = create_dashboard("dash-dmarc-auth", "DMARC - 2. Authentication & Alignment", [vis_auth_matrix, vis_dkim_sel], "SPF and DKIM alignment matrix, DKIM selectors, and policy overrides")
d3 = create_dashboard("dash-dmarc-traffic", "DMARC - 3. Traffic & Sender Inventory", [vis_senders, vis_ips], "Top sender domains, mail server IPs, reverse DNS, and geographic distribution")
d4 = create_dashboard("dash-dmarc-security", "DMARC - 4. Security & Threat Hunting", [vis_spoofing], "Detection of spoofing campaigns, unauthorized IPs, and malicious volume")
d5 = create_dashboard("dash-dmarc-operational", "DMARC - 5. Operational Health & Policy Readiness", [vis_top_domains, vis_disp], "Legitimate sender hygiene, policy readiness (p=quarantine/reject), and report ingestion health")

objects.extend([d1, d2, d3, d4, d5])

with open("opensearch/dashboards-export.ndjson", "w", encoding="utf-8") as f:
    for obj in objects:
        f.write(json.dumps(obj) + "\n")

print(f"Generated opensearch/dashboards-export.ndjson with {len(objects)} saved objects.")
