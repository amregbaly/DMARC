import os
import sys
import json
import argparse
from datetime import datetime
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

# Add current path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from engine.opensearch_client import DmarcOpenSearchClient
from engine.pdf_generator import DmarcPdfGenerator
from engine.excel_generator import DmarcExcelGenerator
from engine.csv_generator import DmarcCsvGenerator

app = FastAPI(
    title="DMARC Sentinel Reporting Service",
    description="Automated OpenSearch DMARC Report Generator with branded PDF, XLSX, and CSV exports",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
TEMPLATES_DIR = os.path.join(BASE_DIR, "templates")
OUTPUT_DIR = os.path.join(BASE_DIR, "output")
os.makedirs(OUTPUT_DIR, exist_ok=True)

class GenerateReportRequest(BaseModel):
    domain: Optional[str] = "all"
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    client_org: Optional[str] = None
    org_name: Optional[str] = None # alias for client_org
    user_logon: Optional[str] = None
    logo: Optional[str] = None
    reporter_org: Optional[str] = None
    disposition: Optional[str] = None
    template_id: Optional[str] = "default"
    formats: Optional[List[str]] = ["pdf", "xlsx", "csv"]
    allowed_domains: Optional[List[str]] = None
    language: Optional[str] = None

def load_template(template_id: str) -> dict:
    tpl_path = os.path.join(TEMPLATES_DIR, f"{template_id}.json")
    if not os.path.exists(tpl_path):
        # Fallback to default
        tpl_path = os.path.join(TEMPLATES_DIR, "default.json")
    if os.path.exists(tpl_path):
        with open(tpl_path, "r", encoding="utf-8") as f:
            return json.load(f)
    raise HTTPException(status_code=404, detail=f"Template '{template_id}' not found.")

def generate_report_bundle(
    domain: str = "all",
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    client_org: Optional[str] = None,
    user_logon: Optional[str] = None,
    logo: Optional[str] = None,
    reporter_org: Optional[str] = None,
    disposition: Optional[str] = None,
    template_id: str = "default",
    formats: Optional[List[str]] = None,
    output_dir: str = OUTPUT_DIR,
    allowed_domains: Optional[List[str]] = None,
    language: Optional[str] = None,
    org_name: Optional[str] = None, # backwards-compatible alias for client_org
    ai_summary: Optional[str] = None
) -> dict:
    if formats is None:
        formats = ["pdf", "xlsx", "csv"]
        
    tpl = load_template(template_id)
    if language and language.strip().lower() in ["en", "es"]:
        tpl["language"] = language.strip().lower()
    effective_org = (client_org or org_name or "").strip()
    if effective_org:
        tpl["prepared_for"] = effective_org
    if user_logon and user_logon.strip():
        if effective_org:
            tpl["prepared_by"] = f"{user_logon.strip()} ({effective_org})"
        else:
            tpl["prepared_by"] = user_logon.strip()
    if logo and logo.strip():
        tpl["logo"] = logo.strip()

    client = DmarcOpenSearchClient()
    # Note: client_org is used for report branding (prepared_for).
    # reporter_org is the OpenSearch filter for report sender (Google, Microsoft, etc.).
    effective_reporter = reporter_org.strip() if reporter_org and reporter_org.strip() != "all" else None
    effective_disp = disposition.strip() if disposition and disposition.strip() != "all" else None

    data = client.fetch_report_data(
        domain=domain,
        date_from=date_from,
        date_to=date_to,
        org_name=effective_reporter,
        disposition=effective_disp,
        allowed_domains=allowed_domains
    )

    if ai_summary and str(ai_summary).strip():
        data["ai_summary"] = str(ai_summary).strip()

    timestamp_str = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    safe_dom = (domain or "all").replace(".", "_")
    base_filename = f"DMARC_{tpl.get('id', 'report')}_{safe_dom}_{timestamp_str}"
    
    generated_files = {}

    if "pdf" in formats:
        pdf_path = os.path.join(output_dir, f"{base_filename}.pdf")
        pdf_gen = DmarcPdfGenerator(tpl)
        pdf_gen.render_pdf(data, pdf_path, domain=domain)
        generated_files["pdf"] = {
            "filename": f"{base_filename}.pdf",
            "path": pdf_path,
            "size_bytes": os.path.getsize(pdf_path)
        }

    if "xlsx" in formats:
        xlsx_path = os.path.join(output_dir, f"{base_filename}.xlsx")
        xlsx_gen = DmarcExcelGenerator(tpl)
        xlsx_gen.render_excel(data, xlsx_path, domain=domain)
        generated_files["xlsx"] = {
            "filename": f"{base_filename}.xlsx",
            "path": xlsx_path,
            "size_bytes": os.path.getsize(xlsx_path)
        }

    if "csv" in formats:
        csv_path = os.path.join(output_dir, f"{base_filename}.csv")
        csv_gen = DmarcCsvGenerator(tpl)
        csv_gen.render_csv(data, csv_path, domain=domain)
        generated_files["csv"] = {
            "filename": f"{base_filename}.csv",
            "path": csv_path,
            "size_bytes": os.path.getsize(csv_path)
        }

    return {
        "status": "success",
        "domain": domain,
        "template": tpl["name"],
        "template_id": tpl["id"],
        "generated_at": datetime.utcnow().isoformat() + "Z",
        "summary": data["summary"],
        "files": generated_files
    }

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "dmarc-reporting-service", "version": "2.0.0"}

@app.get("/templates")
def list_templates():
    templates = []
    if os.path.exists(TEMPLATES_DIR):
        for f in os.listdir(TEMPLATES_DIR):
            if f.endswith(".json"):
                try:
                    with open(os.path.join(TEMPLATES_DIR, f), "r", encoding="utf-8") as tf:
                        templates.append(json.load(tf))
                except Exception:
                    pass
    return {"templates": templates}

@app.get("/templates/{template_id}")
def get_template_by_id(template_id: str):
    return load_template(template_id)

@app.post("/templates")
def save_template(template: dict = Body(...)):
    tid = template.get("id")
    if not tid:
        raise HTTPException(status_code=400, detail="Template ID is required.")
    path = os.path.join(TEMPLATES_DIR, f"{tid}.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(template, f, indent=2)
    return {"status": "saved", "id": tid}

@app.delete("/templates/{template_id}")
def delete_template(template_id: str):
    if template_id in ["default", "acme_branded"]:
        raise HTTPException(status_code=400, detail="Cannot delete built-in system templates.")
    path = os.path.join(TEMPLATES_DIR, f"{template_id}.json")
    if os.path.exists(path):
        os.remove(path)
        return {"status": "deleted", "id": template_id}
    raise HTTPException(status_code=404, detail="Template not found.")

@app.post("/generate")
def generate_report_api(req: GenerateReportRequest):
    try:
        res = generate_report_bundle(
            domain=req.domain,
            date_from=req.date_from,
            date_to=req.date_to,
            client_org=req.client_org or req.org_name,
            user_logon=req.user_logon,
            logo=req.logo,
            reporter_org=req.reporter_org,
            disposition=req.disposition,
            template_id=req.template_id or "default",
            formats=req.formats or ["pdf", "xlsx", "csv"],
            allowed_domains=req.allowed_domains,
            language=req.language
        )
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/download/{filename}")
def download_report(filename: str):
    file_path = os.path.join(OUTPUT_DIR, os.path.basename(filename))
    if os.path.exists(file_path):
        media_type = "application/pdf" if filename.endswith(".pdf") else ("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" if filename.endswith(".xlsx") else "text/csv")
        return FileResponse(file_path, filename=filename, media_type=media_type)
    raise HTTPException(status_code=404, detail="Requested report file not found.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="DMARC Report Generation Engine")
    parser.add_argument("--domain", default="all", help="Target domain (default: all)")
    parser.add_argument("--template", default="default", help="Template ID (default, acme_branded)")
    parser.add_argument("--client-org", default="", help="Client / Organization Name for report branding")
    parser.add_argument("--org-name", default="", help="Alias for --client-org")
    parser.add_argument("--user-logon", default="", help="User Logon / Username")
    parser.add_argument("--logo", default="", help="Logo image path or data URI")
    parser.add_argument("--reporter-org", default="", help="OpenSearch Reporter Org filter (e.g. google.com, all)")
    parser.add_argument("--disposition", default="", help="OpenSearch Disposition filter (none, quarantine, reject, all)")
    parser.add_argument("--date-from", default="", help="Start date ISO string")
    parser.add_argument("--date-to", default="", help="End date ISO string")
    parser.add_argument("--allowed-domains", default="", help="Comma-separated allowed domains for non-admin")
    parser.add_argument("--language", default="", help="Report language (en, es)")
    parser.add_argument("--formats", default="pdf,xlsx,csv", help="Comma-separated formats (pdf,xlsx,csv)")
    parser.add_argument("--output-dir", default=OUTPUT_DIR, help="Output destination folder")
    parser.add_argument("--ai-summary", default="", help="Inline executive AI summary text")
    parser.add_argument("--ai-summary-file", default="", help="File containing executive AI summary text")
    parser.add_argument("--serve", action="store_true", help="Start the FastAPI HTTP server")
    parser.add_argument("--port", type=int, default=5050, help="Server port (default: 5050)")
    args = parser.parse_args()

    if args.serve:
        import uvicorn
        print(f"Starting DMARC Reporting Service on port {args.port}...")
        uvicorn.run("report_service:app", host="0.0.0.0", port=args.port, reload=True)
    else:
        fmt_list = [f.strip() for f in args.formats.split(",") if f.strip()]
        effective_client_org = (args.client_org or args.org_name or "").strip()
        allowed_dom_list = [d.strip() for d in args.allowed_domains.split(",") if d.strip()] if args.allowed_domains else None

        ai_summary_content = ""
        if args.ai_summary_file and os.path.exists(args.ai_summary_file):
            try:
                with open(args.ai_summary_file, "r", encoding="utf-8") as f:
                    ai_summary_content = f.read().strip()
            except Exception as e:
                print(f"Warning: could not read ai-summary-file: {e}", file=sys.stderr)
        elif args.ai_summary:
            ai_summary_content = args.ai_summary.strip()

        result = generate_report_bundle(
            domain=args.domain,
            date_from=args.date_from or None,
            date_to=args.date_to or None,
            client_org=effective_client_org or None,
            user_logon=args.user_logon or None,
            logo=args.logo or None,
            reporter_org=args.reporter_org or None,
            disposition=args.disposition or None,
            template_id=args.template,
            formats=fmt_list,
            output_dir=args.output_dir,
            allowed_domains=allowed_dom_list,
            language=args.language or None,
            ai_summary=ai_summary_content or None
        )
        print(json.dumps(result, indent=2))
