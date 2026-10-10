import os
import ssl
import json
import urllib.request
from typing import Dict, Any, Optional

try:
    from dotenv import load_dotenv
    # Check parent web/server/.env, then local .env
    env_paths = [
        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "web", "server", ".env"),
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env"),
        ".env"
    ]
    for p in env_paths:
        if os.path.exists(p):
            load_dotenv(p)
            break
except ImportError:
    pass

class DmarcOpenSearchClient:
    def __init__(
        self,
        url: Optional[str] = None,
        username: Optional[str] = None,
        password: Optional[str] = None,
        index_pattern: Optional[str] = None,
        allow_self_signed: bool = True
    ):
        self.url = (url or os.getenv("OPENSEARCH_URL", "https://localhost:9200")).rstrip("/")
        self.username = username or os.getenv("OPENSEARCH_USER", "admin")
        self.password = password or os.getenv("OPENSEARCH_PASSWORD", "Asdard11@@")
        self.index_pattern = index_pattern or os.getenv("INDEX_PATTERN", "dmarc_aggregate-*")
        
        # Scoped SSL Context for internal/self-signed OpenSearch
        self.ssl_context = ssl.create_default_context()
        if allow_self_signed or os.getenv("OPENSEARCH_ALLOW_SELF_SIGNED") == "true":
            self.ssl_context.check_hostname = False
            self.ssl_context.verify_mode = ssl.CERT_NONE

    def _execute_search(self, body: Dict[str, Any]) -> Dict[str, Any]:
        endpoint = f"{self.url}/{self.index_pattern}/_search"
        req = urllib.request.Request(
            endpoint,
            data=json.dumps(body).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "Authorization": "Basic " + urllib.request.base64.b64encode(
                    f"{self.username}:{self.password}".encode("utf-8")
                ).decode("ascii")
            }
        )
        with urllib.request.urlopen(req, context=self.ssl_context, timeout=30) as resp:
            return json.loads(resp.read().decode("utf-8"))

    def build_query(
        self,
        domain: Optional[str] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        org_name: Optional[str] = None,
        disposition: Optional[str] = None
    ) -> Dict[str, Any]:
        filters = []
        if domain and domain != "all":
            filters.append({"term": {"header_from.keyword": domain}})
        if org_name and org_name != "all":
            filters.append({"term": {"org_name.keyword": org_name}})
        if disposition and disposition != "all":
            filters.append({"term": {"disposition.keyword": disposition}})
        
        date_range = {}
        if date_from:
            date_range["gte"] = date_from
        if date_to:
            date_range["lte"] = date_to
        if date_range:
            filters.append({"range": {"date_begin": date_range}})

        return {"bool": {"filter": filters}} if filters else {"match_all": {}}

    def fetch_report_data(
        self,
        domain: Optional[str] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        org_name: Optional[str] = None,
        disposition: Optional[str] = None
    ) -> Dict[str, Any]:
        q = self.build_query(domain, date_from, date_to, org_name, disposition)
        
        search_body = {
            "size": 100,
            "query": q,
            "sort": [{"date_begin": "desc"}],
            "aggs": {
                "total_volume": {"sum": {"field": "message_count"}},
                "passed_volume": {
                    "filter": {"term": {"passed_dmarc": True}},
                    "aggs": {"volume": {"sum": {"field": "message_count"}}}
                },
                "dispositions": {
                    "terms": {"field": "disposition.keyword"},
                    "aggs": {"volume": {"sum": {"field": "message_count"}}}
                },
                "spf_aligned": {
                    "terms": {"field": "spf_aligned"},
                    "aggs": {
                        "dkim_aligned": {
                            "terms": {"field": "dkim_aligned"},
                            "aggs": {"volume": {"sum": {"field": "message_count"}}}
                        }
                    }
                },
                "timeline": {
                    "date_histogram": {
                        "field": "date_begin",
                        "calendar_interval": "1d",
                        "min_doc_count": 0
                    },
                    "aggs": {
                        "volume": {"sum": {"field": "message_count"}},
                        "passed": {
                            "filter": {"term": {"passed_dmarc": True}},
                            "aggs": {"volume": {"sum": {"field": "message_count"}}}
                        }
                    }
                },
                "senders": {
                    "terms": {"field": "source_base_domain.keyword", "size": 15, "order": {"volume": "desc"}},
                    "aggs": {
                        "volume": {"sum": {"field": "message_count"}},
                        "passed": {
                            "filter": {"term": {"passed_dmarc": True}},
                            "aggs": {"volume": {"sum": {"field": "message_count"}}}
                        },
                        "source_name": {"terms": {"field": "source_name.keyword", "size": 1}}
                    }
                },
                "top_ips": {
                    "terms": {"field": "source_ip_address.keyword", "size": 20, "order": {"volume": "desc"}},
                    "aggs": {
                        "volume": {"sum": {"field": "message_count"}},
                        "passed": {
                            "filter": {"term": {"passed_dmarc": True}},
                            "aggs": {"volume": {"sum": {"field": "message_count"}}}
                        },
                        "ptr": {"terms": {"field": "source_reverse_dns.keyword", "size": 1}},
                        "country": {"terms": {"field": "source_country.keyword", "size": 1}},
                        "as_name": {"terms": {"field": "source_as_name.keyword", "size": 1}}
                    }
                },
                "selectors": {
                    "terms": {"field": "dkim_results.selector.keyword", "size": 15, "order": {"volume": "desc"}},
                    "aggs": {
                        "volume": {"sum": {"field": "message_count"}},
                        "passed": {
                            "filter": {"term": {"dkim_aligned": True}},
                            "aggs": {"volume": {"sum": {"field": "message_count"}}}
                        }
                    }
                },
                "domains": {
                    "terms": {"field": "header_from.keyword", "size": 25, "order": {"volume": "desc"}},
                    "aggs": {
                        "volume": {"sum": {"field": "message_count"}},
                        "passed": {
                            "filter": {"term": {"passed_dmarc": True}},
                            "aggs": {"volume": {"sum": {"field": "message_count"}}}
                        },
                        "policy": {"terms": {"field": "published_policy.p.keyword", "size": 1}}
                    }
                },
                "countries": {
                    "terms": {"field": "source_country.keyword", "size": 15, "order": {"volume": "desc"}},
                    "aggs": {"volume": {"sum": {"field": "message_count"}}}
                }
            }
        }

        res = self._execute_search(search_body)
        aggs = res.get("aggregations", {})

        total_vol = float(aggs.get("total_volume", {}).get("value", 0))
        passed_vol = float(aggs.get("passed_volume", {}).get("volume", {}).get("value", 0))
        failed_vol = max(0.0, total_vol - passed_vol)
        pass_pct = round((passed_vol / total_vol * 100), 2) if total_vol > 0 else 0.0

        # Dispositions
        disp_map = {"none": 0.0, "quarantine": 0.0, "reject": 0.0}
        for b in aggs.get("dispositions", {}).get("buckets", []):
            disp_map[b["key"].lower()] = float(b["volume"]["value"])

        # Auth Matrix 4-way
        matrix = {
            "pass_pass": 0.0,
            "pass_fail": 0.0,
            "fail_pass": 0.0,
            "fail_fail": 0.0
        }
        for spf_b in aggs.get("spf_aligned", {}).get("buckets", []):
            spf_val = bool(spf_b["key"])
            for dkim_b in spf_b.get("dkim_aligned", {}).get("buckets", []):
                dkim_val = bool(dkim_b["key"])
                vol = float(dkim_b["volume"]["value"])
                if spf_val and dkim_val:
                    matrix["pass_pass"] += vol
                elif spf_val and not dkim_val:
                    matrix["pass_fail"] += vol
                elif not spf_val and dkim_val:
                    matrix["fail_pass"] += vol
                else:
                    matrix["fail_fail"] += vol

        # Timeline
        timeline = []
        for b in aggs.get("timeline", {}).get("buckets", []):
            t_vol = float(b.get("volume", {}).get("value", 0))
            if t_vol > 0:
                p_vol = float(b.get("passed", {}).get("volume", {}).get("value", 0))
                rate = round((p_vol / t_vol * 100), 1) if t_vol > 0 else 0.0
                timeline.append({
                    "date": b.get("key_as_string", "")[:10],
                    "total": int(t_vol),
                    "passed": int(p_vol),
                    "failed": int(t_vol - p_vol),
                    "pass_rate": rate
                })

        # Senders
        senders = []
        for b in aggs.get("senders", {}).get("buckets", []):
            s_vol = float(b["volume"]["value"])
            s_pass = float(b.get("passed", {}).get("volume", {}).get("value", 0))
            s_rate = round((s_pass / s_vol * 100), 1) if s_vol > 0 else 0.0
            def get_sub_bucket(bucket, name, fallback="N/A"):
                bkts = bucket.get(name, {}).get("buckets", [])
                if bkts and len(bkts) > 0:
                    return bkts[0].get("key", fallback)
                return fallback

            s_name = get_sub_bucket(b, "source_name", b["key"])
            senders.append({
                "base_domain": b["key"],
                "name": s_name,
                "volume": int(s_vol),
                "passed": int(s_pass),
                "pass_rate": s_rate,
                "status": "Legitimate" if s_rate >= 90 else ("Misconfigured" if s_vol > 50 and s_rate < 50 and any(legit in b["key"] for legit in ["google", "microsoft", "amazon", "mailchimp"]) else "Suspicious")
            })

        # Top IPs
        top_ips = []
        for b in aggs.get("top_ips", {}).get("buckets", []):
            def get_sub_bucket(bucket, name, fallback="N/A"):
                bkts = bucket.get(name, {}).get("buckets", [])
                if bkts and len(bkts) > 0:
                    return bkts[0].get("key", fallback)
                return fallback

            ip_vol = float(b["volume"]["value"])
            ip_pass = float(b.get("passed", {}).get("volume", {}).get("value", 0))
            ip_rate = round((ip_pass / ip_vol * 100), 1) if ip_vol > 0 else 0.0
            top_ips.append({
                "ip": b["key"],
                "volume": int(ip_vol),
                "passed": int(ip_pass),
                "failed": int(ip_vol - ip_pass),
                "pass_rate": ip_rate,
                "ptr": get_sub_bucket(b, "ptr"),
                "country": get_sub_bucket(b, "country"),
                "as_name": get_sub_bucket(b, "as_name")
            })

        # Security Threats: fail/fail sources
        threats = [ip for ip in top_ips if ip["pass_rate"] == 0.0 and ip["volume"] > 0]

        # Selectors
        selectors = []
        for b in aggs.get("selectors", {}).get("buckets", []):
            sel_vol = float(b["volume"]["value"])
            sel_pass = float(b.get("passed", {}).get("volume", {}).get("value", 0))
            sel_rate = round((sel_pass / sel_vol * 100), 1) if sel_vol > 0 else 0.0
            selectors.append({
                "selector": b["key"],
                "volume": int(sel_vol),
                "pass_rate": sel_rate
            })

        # Domains Summary & Readiness
        domain_list = []
        for b in aggs.get("domains", {}).get("buckets", []):
            def get_sub_bucket(bucket, name, fallback="N/A"):
                bkts = bucket.get(name, {}).get("buckets", [])
                if bkts and len(bkts) > 0:
                    return bkts[0].get("key", fallback)
                return fallback

            d_vol = float(b["volume"]["value"])
            d_pass = float(b.get("passed", {}).get("volume", {}).get("value", 0))
            d_rate = round((d_pass / d_vol * 100), 1) if d_vol > 0 else 0.0
            pol = get_sub_bucket(b, "policy", "none")
            
            ready_for_reject = d_rate >= 98.0 and pol != "reject"
            ready_for_quarantine = d_rate >= 95.0 and pol == "none"

            domain_list.append({
                "domain": b["key"],
                "volume": int(d_vol),
                "passed": int(d_pass),
                "pass_rate": d_rate,
                "current_policy": pol,
                "readiness": "Enforce Reject (p=reject)" if ready_for_reject else ("Enforce Quarantine (p=quarantine)" if ready_for_quarantine else ("Protected" if pol == "reject" else "Needs Alignment Fixes"))
            })

        # Recommendations engine
        recommendations = []
        for dom in domain_list:
            if dom["pass_rate"] >= 98.0 and dom["current_policy"] != "reject":
                recommendations.append(f"Domain '{dom['domain']}' achieves {dom['pass_rate']}% authentication pass rate. Ready to advance DMARC policy from p={dom['current_policy']} to p=reject to block all spoofing.")
            elif dom["pass_rate"] >= 95.0 and dom["current_policy"] == "none":
                recommendations.append(f"Domain '{dom['domain']}' authentication is healthy ({dom['pass_rate']}%). Recommended to advance to p=quarantine with pct=100.")
            elif dom["pass_rate"] < 90.0:
                recommendations.append(f"Domain '{dom['domain']}' shows low pass rate ({dom['pass_rate']}%). Investigate unauthorized senders or missing SPF/DKIM records before enforcing strict policy.")

        for s in senders:
            if s["status"] == "Misconfigured":
                recommendations.append(f"Legitimate email service '{s['name']}' ({s['base_domain']}) is unaligned. Configure SPF include and DKIM CNAME records for '{s['base_domain']}'.")

        if matrix["fail_fail"] > 0:
            recommendations.append(f"Detected {int(matrix['fail_fail'])} spoofed messages completely failing both SPF and DKIM. Ensure firewall / mail gateway blocklists include identified abusive IPs.")

        # Raw records
        raw_hits = []
        for hit in res.get("hits", {}).get("hits", []):
            src = hit.get("_source", {})
            raw_hits.append({
                "date": src.get("date_begin", "")[:10],
                "header_from": src.get("header_from", ""),
                "source_ip": src.get("source_ip_address", ""),
                "sender": src.get("source_base_domain", ""),
                "country": src.get("source_country", ""),
                "count": src.get("message_count", 0),
                "disposition": src.get("disposition", ""),
                "dmarc": "PASS" if src.get("passed_dmarc") else "FAIL",
                "spf_aligned": "YES" if src.get("spf_aligned") else "NO",
                "dkim_aligned": "YES" if src.get("dkim_aligned") else "NO"
            })

        return {
            "summary": {
                "total_messages": int(total_vol),
                "passed_messages": int(passed_vol),
                "failed_messages": int(failed_vol),
                "pass_percentage": pass_pct,
                "disposition": {k: int(v) for k, v in disp_map.items()}
            },
            "auth_matrix": {k: int(v) for k, v in matrix.items()},
            "timeline": timeline,
            "senders": senders,
            "top_ips": top_ips,
            "threats": threats,
            "selectors": selectors,
            "domains": domain_list,
            "recommendations": recommendations,
            "raw_records": raw_hits
        }
