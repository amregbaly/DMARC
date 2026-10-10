# Domain Health & Security Analyzer Specification

**Reference Tool:** [PowerDMARC Domain Analyzer](https://powerdmarc.com/domain-analyzer/?domain=voxera.net)  
**Target Application:** DMARC Sentinel (Enterprise Security Dashboard)  
**Document File:** `DOMAIN_HEALTH_SPEC.md`  
**Status:** Ready to Resume & Implement

---

## 1. Executive Summary & Objective

The objective is to implement a new **"Domain Health"** tab in DMARC Sentinel that replicates the functionality, depth, and visual clarity of PowerDMARC's Domain Analyzer for any domain (tested and benchmarked against `voxera.net`).

The feature provides:
1. **Live Domain DNS Audit** across all email authentication & transport protocols (DMARC, SPF, DKIM, BIMI, MTA-STS, TLS-RPT, DNSSEC, MX, NS, A).
2. **Domain Security Score (0–100%) & Letter Grade** (e.g., `75% Fair`, Grade `C`, `B`, `A`, `A+`) with narrative risk analysis.
3. **Status Overview Grid** categorizing Outgoing Email, Incoming Email, DNS Infrastructure, and DNSSEC.
4. **Security Observations & Threat Impact Table** displaying Risk, Severity (High/Medium/Low), Impact, and actionable Mitigations.
5. **Interactive Protocol Deep-Dives (Accordions)**:
   - **DMARC**: Detected record, one-click copy, status badges, tag breakdown table (`v`, `p`, `sp`, `rua`, `ruf`, `fo`), and RFC default values (`pct`, `adkim`, `aspf`, `rf`).
   - **SPF**: Detected record, DNS lookup counter with visual meter (`3/10` lookups matching RFC 7208 limits), full verification checklist (Syntax, Config, Resource limits, Authorization scope, Third-party dependencies), and recursive **Lookup Tree**.
   - **DKIM**: Selector lookup tool (e.g., `google`, `zoho`, `s1`, `k1`, `default`), public key inspection (`k=rsa; p=...`), and key length validation.
   - **BIMI**: Status, logo SVG URL, and VMC certificate detection.
   - **MTA-STS & TLS-RPT**: Transport security enforcement (`mode: enforce/testing/none`, `max_age`, `mx`) and failure reporting (`rua`).
   - **DNS Infrastructure & DNSSEC**: MX priority table with resolved IPs, NS nameservers, A/AAAA IP list, and DS/DNSKEY records.

---

## 2. Benchmark Findings: `voxera.net` on PowerDMARC

During browser and live DNS analysis of `voxera.net`, the following ground-truth metrics were verified:

| Metric / Check | Value / Finding | PowerDMARC Interpretation |
| :--- | :--- | :--- |
| **Security Score** | **75% Fair** (Grade C) | Baseline protocols present, but missing transport encryption & DKIM selector verification. |
| **DMARC Record** | `v=DMARC1;p=reject;sp=reject;rua=mailto:dmarc@voxera.net;ruf=mailto:dmarc@voxera.net;fo=1;` | **Valid** (Policy: `Reject`, Subdomain: `Reject`, Reporting: `Enabled`, Issues: `0`). |
| **SPF Record** | `v=spf1 include:zohomail.com include:_spf.google.com ~all` | **Valid** (Lookup Count: `3/10` — 2 direct includes + 1 nested in Zoho; Qual: SoftFail). |
| **DKIM** | Requires selector (Apex TXT has no DKIM by design) | **Not Found** (Without selector input; prompt user to test selector). |
| **BIMI** | `default._bimi.voxera.net` | **Not Found** (No logo or VMC published). |
| **MTA-STS** | `_mta-sts.voxera.net` | **Not Found** (SMTP TLS downgrade attack vulnerability). |
| **TLS-RPT** | `_smtp._tls.voxera.net` | **Not Found** (No TLS delivery reporting). |
| **DNSSEC** | DS / DNSKEY records | **Not Found** (DNS cache poisoning vulnerability). |
| **MX Records** | `mx.zoho.com (10)`, `mx2.zoho.com (20)`, `mx3.zoho.com (50)` | **Valid** (Zoho Mail cluster). |
| **NS Records** | `alina.ns.cloudflare.com`, `alec.ns.cloudflare.com` | **Valid** (Cloudflare DNS). |
| **A Records** | `104.21.68.119`, `172.67.195.11` | **Valid** (Cloudflare edge proxy). |

---

## 3. Architecture & Technical Design

### A. Backend Architecture (`web/server/server.js`)

Add a dedicated endpoint:
`GET /api/domain-health?domain=:domain&selector=:selector`

#### 1. DNS Resolution using `node:dns/promises`:
- `dns.resolveTxt('_dmarc.' + domain)` $\rightarrow$ DMARC record.
- `dns.resolveTxt(domain)` $\rightarrow$ SPF record (`v=spf1 ...`).
- `dns.resolveTxt((selector || 'default') + '._domainkey.' + domain)` $\rightarrow$ DKIM record.
- `dns.resolveTxt('default._bimi.' + domain)` $\rightarrow$ BIMI record.
- `dns.resolveTxt('_mta-sts.' + domain)` $\rightarrow$ MTA-STS record.
- `dns.resolveTxt('_smtp._tls.' + domain)` $\rightarrow$ TLS-RPT record.
- `dns.resolveMx(domain)` $\rightarrow$ MX exchange records with priority.
- `dns.resolveNs(domain)` $\rightarrow$ Nameservers.
- `dns.resolve4(domain)` & `dns.resolve6(domain)` $\rightarrow$ A & AAAA IP records.
- `dns.resolve(domain, 'DS')` / `dns.resolve(domain, 'DNSKEY')` $\rightarrow$ DNSSEC status.

#### 2. Recursive SPF Lookup Counter & Tree Builder:
Calculates the exact RFC 7208 DNS lookup limit (max 10 lookups) by traversing `include:`, `a`, `mx`, `redirect=`, and `exists:` mechanisms with cycle detection and depth limiting.
```javascript
async function analyzeSpf(domain, visited = new Set()) {
  // Recursively inspects mechanisms and counts lookups
  // Tested: yields exactly 3/10 for voxera.net (zohomail.com + _spf.google.com)
}
```

#### 3. Scoring & Grade Engine:
- **Max Score: 100 points**:
  - DMARC: 35 pts (`reject` = 35, `quarantine` = 25, `none` = 12, missing = 0)
  - SPF: 25 pts (Valid + lookups $\le 10$ + `-all` = 25; `~all` = 20; lookups $> 10$ = 5; missing = 0)
  - DKIM: 15 pts (Configured & verified = 15; partial = 8; missing = 0)
  - MTA-STS & TLS-RPT: 15 pts (MTA-STS = 10; TLS-RPT = 5)
  - BIMI: 5 pts (Valid logo & cert)
  - DNSSEC: 5 pts (Active signed zone)
- **Grade Scale**:
  - $\ge 90$: **Grade A+ / A** (Optimal email defense)
  - $80 - 89$: **Grade B** (Good security posture)
  - $70 - 79$: **Grade C** (Fair — baseline active, transport/DKIM gaps)
  - $50 - 69$: **Grade D** (Weak — spoofing vulnerabilities exist)
  - $< 50$: **Grade F** (Critical — missing core policies)

#### 4. Automated Security Observations:
Generates actionable risk items:
- Missing DKIM selector / key $\rightarrow$ Severity: **High**
- Missing MTA-STS $\rightarrow$ Severity: **High**
- Missing TLS-RPT $\rightarrow$ Severity: **Medium**
- SPF SoftFail (`~all`) $\rightarrow$ Severity: **Medium**
- DMARC `p=none` $\rightarrow$ Severity: **High**
- SPF lookups $> 10$ $\rightarrow$ Severity: **Critical**

---

### B. Frontend Architecture (`web/client`)

#### 1. Files to Create/Update:
1. `src/components/DomainHealth.jsx` (New component):
   - **Search Bar**: Domain text input with quick pill selectors (`voxera.net`, OpenSearch domains) + DKIM selector field + "Analyze" button + "Export / Print" button.
   - **Score Hero Banner**: Letter grade badge (e.g. C, B, A), percentage score (`75% Fair`), narrative description, and protocol count chips.
   - **Status Overview Grid**: 4 sections (Outgoing Email, Incoming Email, DNS Infrastructure, DNSSEC) with clean status badges (`Valid`, `Not Found`, `Warning`).
   - **Security Observations Table**: `RISK` | `SEVERITY` | `IMPACT` | `MITIGATION` | `ACTION`.
   - **Protocol Accordions**:
     - DMARC accordion with copyable record, status chips, configured tags table, default tags table.
     - SPF accordion with copyable record, `3/10` lookup progress meter, 5-point verification checklist, and interactive nested Lookup Tree.
     - DKIM accordion with selector tester.
     - BIMI, MTA-STS, TLS-RPT accordions.
     - MX & Infrastructure table with priorities and IPs.
2. `src/services/api.js`:
   - Export `fetchDomainHealth(domain, selector)`.
3. `src/components/Navbar.jsx`:
   - Add `{ id: 'health', label: 'Domain Health' }` to `tabs`.
4. `src/App.jsx`:
   - Render `<DomainHealth selectedDomain={selectedDomain} onSelectDomain={setSelectedDomain} />` when `activeTab === 'health'`.

---

## 4. Step-by-Step Resume Checklist

To resume and complete this task, follow these steps:

1. **Update `web/server/server.js`**:
   - Add helper functions: `parseDmarcRecord`, `analyzeSpfRecursive`, `checkDkimSelector`, `checkMtaSts`, `calculateDomainScore`.
   - Add `GET /api/domain-health` endpoint.
   - Verify with: `curl http://localhost:5000/api/domain-health?domain=voxera.net`.

2. **Update `web/client/src/services/api.js`**:
   - Add:
     ```javascript
     export async function fetchDomainHealth(domain = 'voxera.net', selector = '') {
       const query = new URLSearchParams({ domain, selector }).toString();
       const res = await fetch(`${BASE_URL}/domain-health?${query}`);
       if (!res.ok) throw new Error('Failed to analyze domain health');
       return res.json();
     }
     ```

3. **Create `web/client/src/components/DomainHealth.jsx`**:
   - Implement the complete UI matching PowerDMARC's cards, tables, score hero, observations, and deep-dive accordions.

4. **Update `web/client/src/components/Navbar.jsx`**:
   - Add `{ id: 'health', label: 'Domain Health' }` to the navigation tabs list.

5. **Update `web/client/src/App.jsx`**:
   - Import `DomainHealth` and render it when `activeTab === 'health'`.

6. **Validation & Verification**:
   - Test `voxera.net` (verify 75% score, 3/10 lookups, DMARC reject, MX Zoho records).
   - Test other domains (e.g. `example.com`, `google.com`, `microsoft.com`).
   - Confirm export/print and responsive mobile views.
