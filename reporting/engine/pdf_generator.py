import os
import json
import base64
from datetime import datetime
from typing import Dict, Any
from playwright.sync_api import sync_playwright

class DmarcPdfGenerator:
    def __init__(self, template_config: Dict[str, Any]):
        self.template = template_config
        self.colors = self.template.get("brand_colors", {})
        self.lang = self.template.get("language", "en")

    def _get_logo_data_uri(self) -> str:
        logo_rel = self.template.get("logo", "templates/assets/sentinel_logo.png")
        if not logo_rel:
            return ""
        if logo_rel.startswith("data:image/") or logo_rel.startswith("http://") or logo_rel.startswith("https://"):
            return logo_rel
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        logo_full = os.path.join(base_dir, logo_rel) if not os.path.isabs(logo_rel) else logo_rel
        
        if os.path.exists(logo_full):
            with open(logo_full, "rb") as f:
                encoded = base64.b64encode(f.read()).decode("utf-8")
                mime = "image/svg+xml" if logo_full.endswith(".svg") else "image/png"
                return f"data:{mime};base64,{encoded}"
        return ""

    def generate_html(self, data: Dict[str, Any], domain: str = "all", date_str: str = "") -> str:
        summary = data["summary"]
        matrix = data["auth_matrix"]
        disp = summary["disposition"]
        colors = self.colors
        logo_uri = self._get_logo_data_uri()
        logo_pos = self.template.get("logo_position", "left")
        max_h = self.template.get("logo_max_height_px", 50)
        
        # Translation dict
        is_es = self.lang == "es"
        labels = {
            "title": self.template.get("title", "DMARC Executive Authentication & Security Report"),
            "subtitle": self.template.get("subtitle", "PowerDMARC-Aligned Multi-View Domain Protection Audit"),
            "exec_summary": "Resumen Ejecutivo de Seguridad" if is_es else "Executive Security Summary",
            "journey_title": "Ruta de Implementación y Cumplimiento DMARC" if is_es else "DMARC Enforcement Journey",
            "score_title": "Puntuación de Seguridad de Dominio" if is_es else "Domain Security Score",
            "compliance_audit_title": "Auditoría de Cumplimiento Regulatorio e Industria" if is_es else "Regulatory & Industry Compliance Scorecard",
            "kpi_total": "Total de Mensajes" if is_es else "Total Messages Processed",
            "kpi_pass": "Tasa de Aprobación DMARC" if is_es else "DMARC Pass Rate",
            "kpi_compliant": "Mensajes Cumplientes" if is_es else "Compliant Volume",
            "kpi_threats": "Tráfico No Alineado / Amenazas" if is_es else "Unaligned / Threat Volume",
            "auth_matrix_title": "Matriz de Alineación de Autenticación (SPF x DKIM)" if is_es else "Authentication Alignment Matrix (SPF x DKIM)",
            "pass_pass": "SPF Aprobado & DKIM Aprobado (Alineación Completa)" if is_es else "SPF Pass & DKIM Pass (Fully Compliant)",
            "pass_fail": "SPF Aprobado & DKIM Fallido" if is_es else "SPF Pass & DKIM Fail",
            "fail_pass": "SPF Fallido & DKIM Aprobado (Reenvío)" if is_es else "SPF Fail & DKIM Pass (Forwarded)",
            "fail_fail": "SPF Fallido & DKIM Fallido (Suplantación Total)" if is_es else "SPF Fail & DKIM Fail (Total Spoofing)",
            "senders_title": "Inventario de Fuentes de Envío y Servicios" if is_es else "Sender Inventory & Authorized Infrastructure",
            "security_title": "Inteligencia de Amenazas y Fuentes de Suplantación" if is_es else "Threat Intelligence & Spoofing Sources",
            "recommendations_title": "Evaluación de Preparación de Políticas y Acciones Recomendadas" if is_es else "Policy Enforcement Readiness & Recommended Actions",
            "prepared_for": self.template.get("prepared_for", "Enterprise Security Team"),
            "prepared_by": self.template.get("prepared_by", "DMARC Sentinel Engine"),
            "confidential": self.template.get("confidentiality_notice", "CONFIDENTIAL: Sensitive mail security metrics."),
            "date": date_str or datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC")
        }

        # Calculate percentages
        tot = summary["total_messages"] or 1
        pass_rate = summary.get("pass_percentage", 0.0)
        pp_pct = round((matrix["pass_pass"] / tot) * 100, 1)
        pf_pct = round((matrix["pass_fail"] / tot) * 100, 1)
        fp_pct = round((matrix["fail_pass"] / tot) * 100, 1)
        ff_pct = round((matrix["fail_fail"] / tot) * 100, 1)

        # Policy & Journey computation
        dom_info = data.get("domains", [{}])[0] if data.get("domains") else {}
        current_policy = dom_info.get("current_policy", "none").lower()
        
        # Calculate Security Score (0-100)
        policy_pts = 30 if current_policy == "reject" else (20 if current_policy == "quarantine" else 10)
        alignment_pts = min(70, round((pass_rate / 100.0) * 70))
        security_score = min(100, policy_pts + alignment_pts)
        if security_score >= 95:
            grade = "A+"
            grade_color = "#10b981"
        elif security_score >= 85:
            grade = "A"
            grade_color = "#10b981"
        elif security_score >= 75:
            grade = "B"
            grade_color = "#3b82f6"
        elif security_score >= 60:
            grade = "C"
            grade_color = "#f59e0b"
        else:
            grade = "F"
            grade_color = "#ef4444"

        # Compliance checklist flags
        google_yahoo_compliant = pass_rate >= 95.0 and current_policy in ["quarantine", "reject"]
        pci_dss_compliant = current_policy in ["quarantine", "reject"]
        rfc7489_aligned = pass_rate >= 90.0

        html = f"""<!DOCTYPE html>
<html lang="{self.lang}">
<head>
<meta charset="UTF-8">
<title>{labels['title']}</title>
<style>
  @page {{
    size: A4;
    margin: 18mm 15mm 18mm 15mm;
    @bottom-left {{
      content: "{self.template.get('footer_text', 'DMARC Sentinel • PowerDMARC Compatible Reporting')}";
      font-size: 8pt;
      color: #64748b;
      font-family: sans-serif;
    }}
    @bottom-right {{
      content: counter(page) " / " counter(pages);
      font-size: 8pt;
      color: #64748b;
      font-family: sans-serif;
    }}
  }}

  body {{
    font-family: {self.template.get('fonts', {}).get('body', "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif")};
    color: #1e293b;
    background-color: #ffffff;
    line-height: 1.5;
    font-size: 9.5pt;
    margin: 0;
    padding: 0;
  }}

  .cover-page {{
    page-break-after: always;
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-height: 85vh;
    padding: 40px 24px;
    border-left: 8px solid {colors.get('primary', '#0f172a')};
  }}

  .logo {{
    max-height: {max_h}px;
    margin-bottom: 30px;
  }}

  .cover-title {{
    font-size: 26pt;
    font-weight: 800;
    color: {colors.get('primary', '#0f172a')};
    line-height: 1.2;
    margin-bottom: 10px;
  }}

  .cover-subtitle {{
    font-size: 13pt;
    font-weight: 500;
    color: {colors.get('secondary', '#0284c7')};
    margin-bottom: 36px;
  }}

  .meta-grid {{
    display: grid;
    grid-template-columns: 140px 1fr;
    gap: 10px 16px;
    font-size: 9.5pt;
    margin-bottom: 36px;
    background: {colors.get('background_light', '#f8fafc')};
    padding: 20px;
    border-radius: 8px;
    border: 1px solid {colors.get('border_color', '#e2e8f0')};
  }}

  .meta-label {{
    font-weight: 700;
    color: #475569;
  }}

  .meta-val {{
    color: #0f172a;
    font-weight: 600;
  }}

  .notice-box {{
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #991b1b;
    padding: 14px 18px;
    border-radius: 8px;
    font-size: 8.5pt;
    line-height: 1.4;
  }}

  .section {{
    margin-bottom: 28px;
    page-break-inside: avoid;
  }}

  .section-title {{
    font-size: 13pt;
    font-weight: 700;
    color: {colors.get('primary', '#0f172a')};
    border-bottom: 2px solid {colors.get('secondary', '#0284c7')};
    padding-bottom: 6px;
    margin-bottom: 14px;
    page-break-after: avoid;
  }}

  /* PowerDMARC Journey Stepper */
  .journey-container {{
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 16px 20px;
    margin-bottom: 24px;
  }}

  .journey-step {{
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    position: relative;
    z-index: 2;
    flex: 1;
  }}

  .step-circle {{
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: #e2e8f0;
    color: #64748b;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    font-size: 11pt;
    margin-bottom: 6px;
    border: 2px solid #cbd5e1;
  }}

  .journey-step.step-complete .step-circle {{
    background: #10b981;
    color: #ffffff;
    border-color: #059669;
  }}

  .journey-step.step-active .step-circle {{
    background: #0284c7;
    color: #ffffff;
    border-color: #0369a1;
    box-shadow: 0 0 0 4px #e0f2fe;
  }}

  .step-label {{
    font-size: 9pt;
    font-weight: 700;
    color: #0f172a;
  }}

  .step-desc {{
    font-size: 7.5pt;
    color: #64748b;
  }}

  .journey-line {{
    flex: 1;
    height: 3px;
    background: #e2e8f0;
    margin: 0 -10px 20px -10px;
    position: relative;
    z-index: 1;
  }}

  .journey-line.line-done {{
    background: #10b981;
  }}

  /* KPI container */
  .kpi-container {{
    display: flex;
    gap: 12px;
    margin-bottom: 20px;
  }}

  .kpi-card {{
    flex: 1;
    background: {colors.get('background_light', '#f8fafc')};
    border: 1px solid {colors.get('border_color', '#e2e8f0')};
    border-radius: 8px;
    padding: 12px 14px;
    text-align: center;
  }}

  .kpi-num {{
    font-size: 18pt;
    font-weight: 800;
    color: {colors.get('primary', '#0f172a')};
  }}

  .kpi-label {{
    font-size: 7.5pt;
    font-weight: 700;
    text-transform: uppercase;
    color: #64748b;
    margin-top: 4px;
  }}

  /* Score container */
  .score-box {{
    display: flex;
    align-items: center;
    gap: 20px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 10px;
    padding: 16px;
    margin-bottom: 20px;
  }}

  .score-badge {{
    width: 65px;
    height: 65px;
    border-radius: 50%;
    background: {grade_color};
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22pt;
    font-weight: 900;
    flex-shrink: 0;
  }}

  .score-details {{
    flex: 1;
  }}

  .score-val {{
    font-size: 15pt;
    font-weight: 800;
    color: #0f172a;
  }}

  table {{
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 18px;
    font-size: 8.5pt;
  }}

  th {{
    background-color: {colors.get('table_header', '#1e293b')};
    color: {colors.get('table_header_text', '#f8fafc')};
    padding: 8px 10px;
    text-align: left;
    font-weight: 600;
  }}

  td {{
    padding: 7px 10px;
    border-bottom: 1px solid #e2e8f0;
  }}

  tr:nth-child(even) td {{
    background-color: {colors.get('background_light', '#f8fafc')};
  }}

  .badge {{
    display: inline-block;
    padding: 2px 7px;
    border-radius: 4px;
    font-size: 7.5pt;
    font-weight: 700;
  }}

  .badge-pass {{
    background: #dcfce7;
    color: #166534;
  }}

  .badge-fail {{
    background: #fee2e2;
    color: #991b1b;
  }}

  .badge-warn {{
    background: #fef3c7;
    color: #92400e;
  }}

  .badge-info {{
    background: #e0f2fe;
    color: #0369a1;
  }}

  .rec-card {{
    background: #f0fdf4;
    border-left: 4px solid {colors.get('pass_color', '#10b981')};
    padding: 10px 14px;
    margin-bottom: 8px;
    font-size: 8.5pt;
    border-radius: 0 6px 6px 0;
  }}

  .bar-container {{
    display: flex;
    height: 14px;
    border-radius: 4px;
    overflow: hidden;
    margin: 10px 0 16px 0;
  }}

  .bar-segment {{
    height: 100%;
  }}
</style>
</head>
<body>

<!-- Cover Page -->
<div class="cover-page">
  <div style="text-align: {logo_pos};">
    {"<img class='logo' src='" + logo_uri + "' alt='Logo' />" if logo_uri else ""}
  </div>
  <div class="cover-title">{labels['title']}</div>
  <div class="cover-subtitle">{labels['subtitle']}</div>

  <div class="meta-grid">
    <div class="meta-label">Target Domain:</div>
    <div class="meta-val">{domain.upper()}</div>
    <div class="meta-label">Prepared For:</div>
    <div class="meta-val">{labels['prepared_for']}</div>
    <div class="meta-label">Prepared By:</div>
    <div class="meta-val">{labels['prepared_by']}</div>
    <div class="meta-label">Date Generated:</div>
    <div class="meta-val">{labels['date']}</div>
    <div class="meta-label">Enforcement Policy:</div>
    <div class="meta-val">p={current_policy} ({'Enforced (Protected)' if current_policy == 'reject' else ('Quarantined (Spam)' if current_policy == 'quarantine' else 'Monitoring Mode (None)')})</div>
  </div>

  <div class="notice-box">
    <strong>Notice:</strong> {labels['confidential']}
  </div>
</div>

<!-- Section 1: DMARC Journey & Executive Score -->
<div class="section">
  <div class="section-title">{labels['journey_title']}</div>
  <div class="journey-container">
    <div class="journey-step step-complete">
      <div class="step-circle">&#10003;</div>
      <div class="step-label">p=none</div>
      <div class="step-desc">Monitoring</div>
    </div>
    <div class="journey-line {'line-done' if current_policy in ['quarantine', 'reject'] else ''}"></div>
    <div class="journey-step {'step-complete' if current_policy == 'reject' else ('step-active' if current_policy == 'quarantine' else '')}">
      <div class="step-circle">{'&#10003;' if current_policy == 'reject' else '2'}</div>
      <div class="step-label">p=quarantine</div>
      <div class="step-desc">Spam Folder</div>
    </div>
    <div class="journey-line {'line-done' if current_policy == 'reject' else ''}"></div>
    <div class="journey-step {'step-active' if current_policy == 'reject' else ''}">
      <div class="step-circle">{'&#10003;' if current_policy == 'reject' else '3'}</div>
      <div class="step-label">p=reject</div>
      <div class="step-desc">Full Block</div>
    </div>
    <div class="journey-line"></div>
    <div class="journey-step">
      <div class="step-circle">4</div>
      <div class="step-label">BIMI + VMC</div>
      <div class="step-desc">Brand In-Inbox</div>
    </div>
  </div>

  <div class="score-box">
    <div class="score-badge">{grade}</div>
    <div class="score-details">
      <div class="score-val">Overall Security Rating: {security_score} / 100</div>
      <p style="margin: 4px 0 0 0; color: #475569; font-size: 8.5pt;">
        Calculated from RFC 7489 alignment pass rate ({pass_rate}%) and active policy enforcement rigor (p={current_policy}).
      </p>
    </div>
  </div>

  <div class="kpi-container">
    <div class="kpi-card">
      <div class="kpi-num">{summary['total_messages']:,}</div>
      <div class="kpi-label">{labels['kpi_total']}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-num" style="color: {colors.get('pass_color', '#10b981')};">{pass_rate}%</div>
      <div class="kpi-label">{labels['kpi_pass']}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-num" style="color: {colors.get('secondary', '#0284c7')};">{summary['passed_messages']:,}</div>
      <div class="kpi-label">{labels['kpi_compliant']}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-num" style="color: {colors.get('fail_color', '#ef4444')};">{summary['failed_messages']:,}</div>
      <div class="kpi-label">{labels['kpi_threats']}</div>
    </div>
  </div>
</div>

<!-- Section 2: Regulatory & Compliance Scorecard -->
<div class="section">
  <div class="section-title">{labels['compliance_audit_title']}</div>
  <table>
    <thead>
      <tr>
        <th>Regulatory Mandate / Security Standard</th>
        <th>Technical Requirement</th>
        <th style="text-align: center;">Audit Verdict</th>
        <th>Audit Implication & Remediation</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Google & Yahoo 2024 Bulk Senders</strong></td>
        <td>DMARC p=none or strict, SPF/DKIM aligned, spam &lt;0.3%</td>
        <td style="text-align: center;">
          <span class="badge {'badge-pass' if google_yahoo_compliant else 'badge-warn'}">
            {'COMPLIANT' if google_yahoo_compliant else 'PARTIAL / ACTION NEEDED'}
          </span>
        </td>
        <td>
          {'Mandate met. Mail delivered reliably to Gmail and Yahoo inboxes.' if google_yahoo_compliant else 'Domain must enforce policy and maintain high alignment to avoid bulk throttling.'}
        </td>
      </tr>
      <tr>
        <td><strong>PCI DSS v4.0 Requirement 5.4.1</strong></td>
        <td>Processes and automated mechanisms to detect and prevent phishing</td>
        <td style="text-align: center;">
          <span class="badge {'badge-pass' if pci_dss_compliant else 'badge-fail'}">
            {'COMPLIANT' if pci_dss_compliant else 'NON-COMPLIANT'}
          </span>
        </td>
        <td>
          {'DMARC active at quarantine/reject satisfies PCI DSS Requirement 5.4.1.' if pci_dss_compliant else 'p=none does NOT satisfy PCI DSS anti-phishing requirements. Advance to p=quarantine.'}
        </td>
      </tr>
      <tr>
        <td><strong>RFC 7489 Alignment Standard</strong></td>
        <td>Header From domain alignment with SPF/DKIM</td>
        <td style="text-align: center;">
          <span class="badge {'badge-pass' if rfc7489_aligned else 'badge-warn'}">
            {'ALIGNED' if rfc7489_aligned else 'NEEDS FIXES'}
          </span>
        </td>
        <td>
          {f'Achieved {pass_rate}% alignment across sending infrastructure.'}
        </td>
      </tr>
    </tbody>
  </table>
</div>

<!-- Section 3: Auth Matrix -->
<div class="section">
  <div class="section-title">{labels['auth_matrix_title']}</div>
  <div class="bar-container">
    <div class="bar-segment" style="width: {pp_pct}%; background-color: {colors.get('pass_color', '#10b981')};" title="Pass/Pass"></div>
    <div class="bar-segment" style="width: {pf_pct}%; background-color: {colors.get('warn_color', '#f59e0b')};" title="Pass/Fail"></div>
    <div class="bar-segment" style="width: {fp_pct}%; background-color: #3b82f6;" title="Fail/Pass"></div>
    <div class="bar-segment" style="width: {ff_pct}%; background-color: {colors.get('fail_color', '#ef4444')};" title="Fail/Fail"></div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Authentication Result State</th>
        <th style="text-align: right;">Volume (Messages)</th>
        <th style="text-align: right;">Percentage</th>
        <th>Security Implication</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>{labels['pass_pass']}</strong></td>
        <td style="text-align: right; font-weight: 700;">{matrix['pass_pass']:,}</td>
        <td style="text-align: right; font-weight: 700;">{pp_pct}%</td>
        <td><span class="badge badge-pass">Fully Compliant</span> Legitimate corporate email</td>
      </tr>
      <tr>
        <td><strong>{labels['pass_fail']}</strong></td>
        <td style="text-align: right; font-weight: 700;">{matrix['pass_fail']:,}</td>
        <td style="text-align: right; font-weight: 700;">{pf_pct}%</td>
        <td><span class="badge badge-warn">Partial Pass</span> SPF valid, DKIM missing or broken</td>
      </tr>
      <tr>
        <td><strong>{labels['fail_pass']}</strong></td>
        <td style="text-align: right; font-weight: 700;">{matrix['fail_pass']:,}</td>
        <td style="text-align: right; font-weight: 700;">{fp_pct}%</td>
        <td><span class="badge badge-info">Forwarded / Delegated</span> DKIM intact, SPF invalidated by forwarder relay</td>
      </tr>
      <tr>
        <td><strong>{labels['fail_fail']}</strong></td>
        <td style="text-align: right; font-weight: 700;">{matrix['fail_fail']:,}</td>
        <td style="text-align: right; font-weight: 700;">{ff_pct}%</td>
        <td><span class="badge badge-fail">Spoofing / Phishing</span> Unauthorized spoofing sources</td>
      </tr>
    </tbody>
  </table>
</div>

<!-- Section 4: Senders Inventory -->
<div class="section">
  <div class="section-title">{labels['senders_title']}</div>
  <table>
    <thead>
      <tr>
        <th>Sender Infrastructure / Base Domain</th>
        <th>Service Name</th>
        <th style="text-align: right;">Volume</th>
        <th style="text-align: right;">Pass Rate</th>
        <th>Status Classification</th>
      </tr>
    </thead>
    <tbody>
      {"".join(f'''<tr>
        <td><strong>{s['base_domain']}</strong></td>
        <td>{s['name']}</td>
        <td style="text-align: right; font-weight: 700;">{s['volume']:,}</td>
        <td style="text-align: right; font-weight: 700;">{s['pass_rate']}%</td>
        <td><span class="badge {'badge-pass' if s['status'] == 'Legitimate' else ('badge-warn' if s['status'] == 'Misconfigured' else 'badge-fail')}">{s['status']}</span></td>
      </tr>''' for s in data['senders'][:12])}
    </tbody>
  </table>
</div>

<!-- Section 5: Security Threats -->
<div class="section">
  <div class="section-title">{labels['security_title']}</div>
  <table>
    <thead>
      <tr>
        <th>Attacking / Unauthorized IP</th>
        <th>Reverse DNS (PTR)</th>
        <th>Country</th>
        <th>Autonomous System (ISP)</th>
        <th style="text-align: right;">Blocked Volume</th>
      </tr>
    </thead>
    <tbody>
      {"".join(f'''<tr>
        <td style="font-family: monospace; font-weight: 700;">{t['ip']}</td>
        <td style="font-family: monospace; font-size: 8pt;">{t['ptr']}</td>
        <td>{t['country']}</td>
        <td>{t['as_name']}</td>
        <td style="text-align: right; color: #ef4444; font-weight: 700;">{t['volume']:,}</td>
      </tr>''' for t in data['threats'][:10])}
    </tbody>
  </table>
</div>

<!-- Section 6: Recommendations -->
<div class="section">
  <div class="section-title">{labels['recommendations_title']}</div>
  {"".join(f'<div class="rec-card"><strong>Action:</strong> {r}</div>' for r in data['recommendations'])}
</div>

</body>
</html>"""
        return html

    def render_pdf(self, data: Dict[str, Any], output_path: str, domain: str = "all", date_str: str = "") -> str:
        html = self.generate_html(data, domain, date_str)
        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
        
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_page()
            page.set_content(html, wait_until="networkidle")
            page.pdf(
                path=output_path,
                format="A4",
                print_background=True,
                margin={"top": "15mm", "bottom": "15mm", "left": "15mm", "right": "15mm"}
            )
            browser.close()
            
        return output_path
