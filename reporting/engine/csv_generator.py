import os
import csv
from datetime import datetime
from typing import Dict, Any

class DmarcCsvGenerator:
    def __init__(self, template_config: Dict[str, Any]):
        self.template = template_config

    def render_csv(self, data: Dict[str, Any], output_path: str, domain: str = "all") -> str:
        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        summary = data["summary"]
        
        # Write UTF-8 with BOM for Excel compatibility
        with open(output_path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.writer(f)
            
            # Metadata Header
            writer.writerow(["# DMARC AGGREGATE SECURITY & AUTHENTICATION AUDIT"])
            writer.writerow(["# Domain", domain.upper()])
            writer.writerow(["# Client / Organization", self.template.get("prepared_for", "Enterprise Security Team")])
            writer.writerow(["# Author / Logon", self.template.get("prepared_by", "DMARC Sentinel")])
            writer.writerow(["# Date", datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")])
            writer.writerow(["# Total Processed", summary["total_messages"]])
            writer.writerow(["# DMARC Pass Rate", f"{summary['pass_percentage']}%"])
            writer.writerow([])
            
            # Table 1: Domain Readiness
            writer.writerow(["=== DOMAIN READINESS & POLICIES ==="])
            writer.writerow(["Domain", "Total Messages", "Passed Messages", "Pass Rate (%)", "Current Policy", "Enforcement Recommendation"])
            for d in data["domains"]:
                writer.writerow([d["domain"], d["volume"], d["passed"], d["pass_rate"], d["current_policy"], d["readiness"]])
            writer.writerow([])
            
            # Table 2: Authentication Matrix
            writer.writerow(["=== AUTHENTICATION ALIGNMENT MATRIX ==="])
            writer.writerow(["Result State", "Volume (Messages)"])
            m = data["auth_matrix"]
            writer.writerow(["SPF Pass / DKIM Pass", m["pass_pass"]])
            writer.writerow(["SPF Pass / DKIM Fail", m["pass_fail"]])
            writer.writerow(["SPF Fail / DKIM Pass", m["fail_pass"]])
            writer.writerow(["SPF Fail / DKIM Fail (Spoofing)", m["fail_fail"]])
            writer.writerow([])

            # Table 3: Senders
            writer.writerow(["=== SENDER INFRASTRUCTURE INVENTORY ==="])
            writer.writerow(["Base Domain", "Service Provider", "Volume", "Passed", "Pass Rate (%)", "Classification"])
            for s in data["senders"]:
                writer.writerow([s["base_domain"], s["name"], s["volume"], s["passed"], s["pass_rate"], s["status"]])
            writer.writerow([])

            # Table 4: Threats
            writer.writerow(["=== SECURITY THREAT SOURCES & SPOOFING IPS ==="])
            writer.writerow(["Source IP", "Reverse DNS (PTR)", "Country", "ISP (ASN)", "Blocked Volume"])
            for t in data["threats"]:
                writer.writerow([t["ip"], t["ptr"], t["country"], t["as_name"], t["volume"]])
            writer.writerow([])

            # Table 5: Raw records
            writer.writerow(["=== RAW AUDIT RECORDS ==="])
            writer.writerow(["Report Date", "Header From", "Source IP", "Sender Domain", "Country", "Messages", "Disposition", "DMARC", "SPF Aligned", "DKIM Aligned"])
            for r in data["raw_records"]:
                writer.writerow([r["date"], r["header_from"], r["source_ip"], r["sender"], r["country"], r["count"], r["disposition"], r["dmarc"], r["spf_aligned"], r["dkim_aligned"]])

        return output_path
