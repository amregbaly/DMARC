# OpenSearch Queries Reference for DMARC Dashboards & Reports

All queries are executed against `dmarc_aggregate-*` and adhere to the strict principle:
> **All metrics, percentages, and volumes MUST be weighted by `sum(message_count)`**, never by document count.

---

## Dashboard 1: Overview

### 1.1 Total Messages & DMARC Pass Rate Over Time
Calculates daily volume and percentage of messages passing DMARC.
```json
POST dmarc_aggregate-*/_search
{
  "size": 0,
  "query": {
    "bool": {
      "filter": [
        { "range": { "date_begin": { "gte": "now-30d/d", "lte": "now/d" } } }
      ]
    }
  },
  "aggs": {
    "timeline": {
      "date_histogram": {
        "field": "date_begin",
        "calendar_interval": "1d",
        "min_doc_count": 0
      },
      "aggs": {
        "total_volume": { "sum": { "field": "message_count" } },
        "passed_volume": {
          "filter": { "term": { "passed_dmarc": true } },
          "aggs": { "volume": { "sum": { "field": "message_count" } } }
        },
        "pass_rate": {
          "bucket_script": {
            "buckets_path": {
              "passed": "passed_volume.volume",
              "total": "total_volume"
            },
            "script": "params.total > 0 ? (params.passed / params.total) * 100 : 0"
          }
        }
      }
    }
  }
}
```

### 1.2 Top Domains Volume & Pass Rate
```json
POST dmarc_aggregate-*/_search
{
  "size": 0,
  "aggs": {
    "top_domains": {
      "terms": { "field": "header_from.keyword", "size": 10, "order": { "volume": "desc" } },
      "aggs": {
        "volume": { "sum": { "field": "message_count" } },
        "passed": {
          "filter": { "term": { "passed_dmarc": true } },
          "aggs": { "volume": { "sum": { "field": "message_count" } } }
        },
        "pass_percentage": {
          "bucket_script": {
            "buckets_path": { "p": "passed.volume", "t": "volume" },
            "script": "params.t > 0 ? (params.p / params.t) * 100 : 0"
          }
        }
      }
    }
  }
}
```

### 1.3 Disposition Breakdown (none, quarantine, reject)
```json
POST dmarc_aggregate-*/_search
{
  "size": 0,
  "aggs": {
    "dispositions": {
      "terms": { "field": "disposition.keyword" },
      "aggs": { "volume": { "sum": { "field": "message_count" } } }
    }
  }
}
```

### 1.4 Enforcement Readiness (30-Day Pass Rate vs 98% Threshold)
```json
POST dmarc_aggregate-*/_search
{
  "size": 0,
  "query": {
    "bool": {
      "filter": [
        { "range": { "date_begin": { "gte": "now-30d/d" } } }
      ]
    }
  },
  "aggs": {
    "domains": {
      "terms": { "field": "header_from.keyword", "size": 50 },
      "aggs": {
        "volume": { "sum": { "field": "message_count" } },
        "passed": {
          "filter": { "term": { "passed_dmarc": true } },
          "aggs": { "volume": { "sum": { "field": "message_count" } } }
        },
        "pass_rate": {
          "bucket_script": {
            "buckets_path": { "p": "passed.volume", "t": "volume" },
            "script": "params.t > 0 ? (params.p / params.t) * 100 : 0"
          }
        },
        "current_policy": {
          "terms": { "field": "published_policy.p.keyword", "size": 1 }
        }
      }
    }
  }
}
```

---

## Dashboard 2: Authentication & Alignment

### 2.1 SPF x DKIM Result Matrix (4-Way Alignment)
```json
POST dmarc_aggregate-*/_search
{
  "size": 0,
  "aggs": {
    "spf_aligned": {
      "terms": { "field": "spf_aligned" },
      "aggs": {
        "dkim_aligned": {
          "terms": { "field": "dkim_aligned" },
          "aggs": { "volume": { "sum": { "field": "message_count" } } }
        }
      }
    }
  }
}
```

### 2.2 DKIM Selector & Domain Pass/Fail Breakdown
```json
POST dmarc_aggregate-*/_search
{
  "size": 0,
  "aggs": {
    "selectors": {
      "terms": { "field": "dkim_results.selector.keyword", "size": 20, "order": { "volume": "desc" } },
      "aggs": {
        "volume": { "sum": { "field": "message_count" } },
        "pass_volume": {
          "filter": { "term": { "dkim_aligned": true } },
          "aggs": { "volume": { "sum": { "field": "message_count" } } }
        },
        "fail_volume": {
          "filter": { "term": { "dkim_aligned": false } },
          "aggs": { "volume": { "sum": { "field": "message_count" } } }
        }
      }
    }
  }
}
```

### 2.3 Policy Override Reasons
```json
POST dmarc_aggregate-*/_search
{
  "size": 0,
  "aggs": {
    "overrides": {
      "terms": { "field": "policy_overrides.type.keyword", "size": 10 },
      "aggs": { "volume": { "sum": { "field": "message_count" } } }
    }
  }
}
```

---

## Dashboard 3: Traffic & Sender Inventory

### 3.1 Top Senders / Base Domains Inventory
```json
POST dmarc_aggregate-*/_search
{
  "size": 0,
  "aggs": {
    "senders": {
      "terms": { "field": "source_base_domain.keyword", "size": 20, "order": { "volume": "desc" } },
      "aggs": {
        "volume": { "sum": { "field": "message_count" } },
        "sender_name": { "terms": { "field": "source_name.keyword", "size": 1 } },
        "pass_volume": {
          "filter": { "term": { "passed_dmarc": true } },
          "aggs": { "volume": { "sum": { "field": "message_count" } } }
        },
        "pass_rate": {
          "bucket_script": {
            "buckets_path": { "p": "pass_volume.volume", "t": "volume" },
            "script": "params.t > 0 ? (params.p / params.t) * 100 : 0"
          }
        }
      }
    }
  }
}
```

### 3.2 Top Source IPs with Reverse DNS & Country
```json
POST dmarc_aggregate-*/_search
{
  "size": 0,
  "aggs": {
    "source_ips": {
      "terms": { "field": "source_ip_address.keyword", "size": 25, "order": { "volume": "desc" } },
      "aggs": {
        "volume": { "sum": { "field": "message_count" } },
        "ptr": { "terms": { "field": "source_reverse_dns.keyword", "size": 1 } },
        "country": { "terms": { "field": "source_country.keyword", "size": 1 } },
        "as_name": { "terms": { "field": "source_as_name.keyword", "size": 1 } },
        "passed": {
          "filter": { "term": { "passed_dmarc": true } },
          "aggs": { "volume": { "sum": { "field": "message_count" } } }
        }
      }
    }
  }
}
```

### 3.3 New Sources First Seen in Last 7 Days
```json
POST dmarc_aggregate-*/_search
{
  "size": 0,
  "aggs": {
    "all_senders": {
      "terms": { "field": "source_ip_address.keyword", "size": 200 },
      "aggs": {
        "first_seen": { "min": { "field": "date_begin" } },
        "recent_volume": {
          "filter": { "range": { "date_begin": { "gte": "now-7d" } } },
          "aggs": { "volume": { "sum": { "field": "message_count" } } }
        }
      }
    }
  }
}
```

---

## Dashboard 4: Security & Threat Hunting

### 4.1 Fail/Fail Traffic from Unknown Sources (Spoofing)
```json
POST dmarc_aggregate-*/_search
{
  "size": 0,
  "query": {
    "bool": {
      "filter": [
        { "term": { "spf_aligned": false } },
        { "term": { "dkim_aligned": false } }
      ]
    }
  },
  "aggs": {
    "spoofing_ips": {
      "terms": { "field": "source_ip_address.keyword", "size": 20, "order": { "volume": "desc" } },
      "aggs": {
        "volume": { "sum": { "field": "message_count" } },
        "country": { "terms": { "field": "source_country.keyword", "size": 1 } },
        "asn": { "terms": { "field": "source_as_name.keyword", "size": 1 } },
        "ptr": { "terms": { "field": "source_reverse_dns.keyword", "size": 1 } },
        "disposition": { "terms": { "field": "disposition.keyword", "size": 3 } }
      }
    }
  }
}
```

### 4.2 Spike Detection: Failing Volume vs Baseline
```json
POST dmarc_aggregate-*/_search
{
  "size": 0,
  "query": {
    "bool": {
      "filter": [
        { "term": { "passed_dmarc": false } }
      ]
    }
  },
  "aggs": {
    "recent_failures": {
      "filter": { "range": { "date_begin": { "gte": "now-24h" } } },
      "aggs": { "volume": { "sum": { "field": "message_count" } } }
    },
    "baseline_7d_failures": {
      "filter": { "range": { "date_begin": { "gte": "now-7d", "lt": "now-24h" } } },
      "aggs": {
        "volume": { "sum": { "field": "message_count" } }
      }
    }
  }
}
```

---

## Dashboard 5: Operational Health

### 5.1 Legitimate Senders Needing Configuration Fixes
Identifies recognized providers (Google, Microsoft, Amazon SES, SendGrid) that have partial alignment failures.
```json
POST dmarc_aggregate-*/_search
{
  "size": 0,
  "query": {
    "bool": {
      "filter": [
        { "terms": { "source_base_domain.keyword": ["google.com", "microsoft.com", "amazonaws.com", "sendgrid.net", "mailchimp.com"] } },
        { "term": { "passed_dmarc": false } }
      ]
    }
  },
  "aggs": {
    "misconfigured_senders": {
      "terms": { "field": "source_base_domain.keyword", "size": 10 },
      "aggs": {
        "failing_volume": { "sum": { "field": "message_count" } },
        "source_ips": {
          "terms": { "field": "source_ip_address.keyword", "size": 5 }
        }
      }
    }
  }
}
```

### 5.2 Published Policy Tracking Over Time
```json
POST dmarc_aggregate-*/_search
{
  "size": 0,
  "aggs": {
    "by_domain": {
      "terms": { "field": "header_from.keyword", "size": 20 },
      "aggs": {
        "policy_timeline": {
          "date_histogram": { "field": "date_begin", "calendar_interval": "1w" },
          "aggs": {
            "policy": { "terms": { "field": "published_policy.p.keyword", "size": 1 } },
            "pct": { "avg": { "field": "published_policy.pct" } }
          }
        }
      }
    }
  }
}
```
