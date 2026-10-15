import os
import io
import re
import base64
import urllib.request
import urllib.parse
from typing import Optional, Tuple
from PIL import Image as PILImage
from openpyxl.drawing.image import Image as OpenpyxlImage

# Default fallback logo paths
ENGINE_DIR = os.path.dirname(os.path.abspath(__file__))
REPORTING_DIR = os.path.dirname(ENGINE_DIR)
PROJECT_ROOT = os.path.dirname(REPORTING_DIR)

DEFAULT_LOGO_CANDIDATES = [
    os.path.join(REPORTING_DIR, "templates", "assets", "sentinel_logo.png"),
    os.path.join(PROJECT_ROOT, "web", "client", "public", "sentinel_logo.png"),
    os.path.join(ENGINE_DIR, "templates", "assets", "sentinel_logo.png")
]

def _get_default_logo_path() -> Optional[str]:
    for cand in DEFAULT_LOGO_CANDIDATES:
        if os.path.exists(cand):
            return cand
    return None

def resolve_logo_bytes(logo_spec: Optional[str], fallback: bool = True) -> Tuple[Optional[bytes], Optional[str], str]:
    """
    Resolves a logo specification (URL, data URI, or file path) into raw bytes and MIME type.
    Returns: (bytes, mime_type, description)
    """
    clean_spec = (logo_spec or "").strip()

    # 1. Base64 Data URI
    if clean_spec.startswith("data:image/"):
        try:
            match = re.match(r"^data:(image/[a-zA-Z0-9\+\-\.]+);base64,(.+)$", clean_spec, re.DOTALL)
            if match:
                mime = match.group(1).lower()
                raw = base64.b64decode(match.group(2))
                return raw, mime, "data_uri"
            # Fallback split
            header, payload = clean_spec.split(",", 1)
            mime = "image/png"
            if ";" in header and ":" in header:
                mime = header.split(":")[1].split(";")[0].lower()
            raw = base64.b64decode(payload)
            return raw, mime, "data_uri"
        except Exception as e:
            print(f"[LogoResolver] Failed to parse data URI: {e}")

    # 2. Remote HTTP / HTTPS URL
    if clean_spec.startswith("http://") or clean_spec.startswith("https://"):
        try:
            req = urllib.request.Request(
                clean_spec,
                headers={"User-Agent": "DMARC-Sentinel-ReportEngine/1.0"}
            )
            with urllib.request.urlopen(req, timeout=5) as response:
                raw = response.read()
                content_type = response.headers.get_content_type()
                mime = content_type if content_type and content_type.startswith("image/") else "image/png"
                return raw, mime, clean_spec
        except Exception as e:
            print(f"[LogoResolver] Failed to fetch remote logo URL '{clean_spec}': {e}")

    # 3. Local File System & Web Paths
    if clean_spec:
        stripped = clean_spec.lstrip("/\\")
        candidate_paths = [
            clean_spec,  # Exact path given
            os.path.join(REPORTING_DIR, clean_spec),
            os.path.join(PROJECT_ROOT, clean_spec),
            os.path.join(REPORTING_DIR, "templates", "assets", os.path.basename(clean_spec)),
            os.path.join(PROJECT_ROOT, "web", "client", "public", stripped),
            os.path.join(PROJECT_ROOT, "web", "client", "public", os.path.basename(clean_spec)),
            os.path.join(REPORTING_DIR, stripped),
            os.path.join(PROJECT_ROOT, stripped),
        ]

        for path in candidate_paths:
            if os.path.exists(path) and os.path.isfile(path):
                try:
                    with open(path, "rb") as f:
                        raw = f.read()
                    ext = os.path.splitext(path)[1].lower()
                    if ext == ".svg":
                        mime = "image/svg+xml"
                    elif ext in (".jpg", ".jpeg"):
                        mime = "image/jpeg"
                    elif ext == ".webp":
                        mime = "image/webp"
                    elif ext == ".gif":
                        mime = "image/gif"
                    else:
                        mime = "image/png"
                    return raw, mime, path
                except Exception as e:
                    print(f"[LogoResolver] Error reading local logo path '{path}': {e}")

    # 4. Fallback to default corporate logo if requested
    if fallback:
        def_path = _get_default_logo_path()
        if def_path and os.path.exists(def_path):
            try:
                with open(def_path, "rb") as f:
                    return f.read(), "image/png", def_path
            except Exception as e:
                print(f"[LogoResolver] Error reading fallback logo: {e}")

    return None, None, ""

def get_logo_data_uri(logo_spec: Optional[str], fallback: bool = True) -> str:
    """
    Returns a data URI string (e.g. data:image/png;base64,...) for embedding in HTML/PDF.
    If image resolution fails and clean_spec was a URL, returns the original URL.
    """
    raw, mime, _ = resolve_logo_bytes(logo_spec, fallback=fallback)
    if raw and mime:
        b64 = base64.b64encode(raw).decode("utf-8")
        return f"data:{mime};base64,{b64}"

    clean = (logo_spec or "").strip()
    if clean.startswith("http://") or clean.startswith("https://") or clean.startswith("data:image/"):
        return clean
    return ""

def get_logo_openpyxl_image(
    logo_spec: Optional[str],
    max_width: int = 180,
    max_height: int = 45,
    fallback: bool = True
) -> Optional[OpenpyxlImage]:
    """
    Loads and proportionally scales an image for Openpyxl worksheet embedding.
    Supports PNG, JPEG, WebP, GIF, data URIs, and remote URLs.
    If the logo is SVG, falls back to a raster fallback logo since Openpyxl only accepts raster images.
    """
    raw, mime, _ = resolve_logo_bytes(logo_spec, fallback=fallback)
    
    # If SVG, Openpyxl cannot parse SVG directly — use raster fallback if allowed
    if mime == "image/svg+xml" and fallback:
        def_path = _get_default_logo_path()
        if def_path and os.path.exists(def_path):
            try:
                with open(def_path, "rb") as f:
                    raw = f.read()
                    mime = "image/png"
            except Exception:
                pass

    if not raw or mime == "image/svg+xml":
        return None

    try:
        pil_im = PILImage.open(io.BytesIO(raw))
        
        # Convert image to PNG in BytesIO
        out_buf = io.BytesIO()
        if pil_im.mode in ("RGBA", "LA") or (pil_im.mode == "P" and "transparency" in pil_im.info):
            pil_im.save(out_buf, format="PNG")
        else:
            # Convert RGB/Grayscale to PNG
            pil_im.convert("RGB").save(out_buf, format="PNG")
        
        out_buf.seek(0)
        img = OpenpyxlImage(out_buf)

        # Proportional scaling
        w, h = img.width, img.height
        if w > 0 and h > 0:
            ratio = min(max_width / float(w), max_height / float(h), 1.0)
            img.width = int(round(w * ratio))
            img.height = int(round(h * ratio))

        return img
    except Exception as e:
        print(f"[LogoResolver] Failed to create Openpyxl image: {e}")
        return None
