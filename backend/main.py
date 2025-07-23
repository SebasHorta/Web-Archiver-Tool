from fastapi import FastAPI, HTTPException, Query, Response, Path
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import requests
from urllib.parse import urlparse, urljoin
from datetime import datetime
import os
from bs4 import BeautifulSoup

# Initialize FastAPI app
app = FastAPI()

# Ensure 'archives' directory exists before mounting
os.makedirs("archives", exist_ok=True)

# Serve archived snapshots and assets statically
app.mount("/archives", StaticFiles(directory="archives"), name="archives")

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (adjust for production)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request model
class ArchiveRequest(BaseModel):
    url: str

# Helper: Download assets and rewrite URLs in the HTML
def download_and_rewrite_assets(soup, page_url, asset_folder, url_prefix):
    for tag, attr in [("img", "src"), ("link", "href"), ("script", "src")]:
        for el in soup.find_all(tag):
            url = el.get(attr)
            if url:
                asset_url = urljoin(page_url, url)
                asset_name = os.path.basename(urlparse(asset_url).path)
                if not asset_name:
                    continue
                local_path = os.path.join(asset_folder, asset_name)
                try:
                    asset_resp = requests.get(asset_url, timeout=5)
                    if asset_resp.status_code == 200:
                        os.makedirs(asset_folder, exist_ok=True)
                        with open(local_path, "wb") as f:
                            f.write(asset_resp.content)
                        # Calculate relative path from HTML file to asset
                        el[attr] = os.path.relpath(local_path, start=os.path.dirname(html_path))  # ✅ better for browser

                except Exception as e:
                    print(f"Failed to download asset {asset_url}: {e}")
    return str(soup)

# Helper: Rewrite internal links to route through /archive/{domain}/{path}/{timestamp}
def rewrite_internal_links(soup, domain, timestamp, base_path):
    for a in soup.find_all("a", href=True):
        href = a["href"]
        parsed_href = urlparse(href)

        # Skip external links
        if parsed_href.netloc and parsed_href.netloc != domain:
            continue

        path = parsed_href.path.strip("/")
        # Remove the base_path prefix from the path if present
        if base_path and path.startswith(base_path):
            sub_path = path[len(base_path):].strip("/")
        else:
            sub_path = path
        if sub_path:
            a["href"] = f"/archive/{domain}/{base_path}/{timestamp}/{sub_path}"
        else:
            a["href"] = f"/archive/{domain}/{base_path}/{timestamp}"

# Helper: Recursively archive page and internal links
def archive_page(url, base_dir, timestamp, base_path, visited, depth=0, max_depth=2, is_root=False):
    if url in visited or depth > max_depth:
        return
    visited.add(url)

    try:
        response = requests.get(url)
        response.raise_for_status()
        html = response.text
        if not html.strip():
            raise ValueError("Empty content")
    except Exception as e:
        print(f"Failed to fetch {url}: {e}")
        return

    soup = BeautifulSoup(html, "html.parser")
    parsed = urlparse(url)
    path_parts = parsed.path.strip("/").split("/") if parsed.path.strip("/") else []
    url_prefix = "/archives/" + "/".join([parsed.netloc] + path_parts + [timestamp, "assets"])

    rel_path = parsed.path.strip("/")
    page_dir = os.path.join(base_dir, rel_path) if rel_path else base_dir
    os.makedirs(page_dir, exist_ok=True)
    html_path = os.path.join(page_dir, "index.html")

    download_and_rewrite_assets(soup, url, os.path.join(page_dir, "assets"), url_prefix)

    # --- Crawl internal links BEFORE rewriting them ---
    if depth < max_depth:
        for a in soup.find_all("a", href=True):
            orig_href = a["href"]  # Use the original href for crawling
            link = urljoin(url, orig_href)
            if urlparse(link).netloc == parsed.netloc:
                archive_page(link, base_dir, timestamp, base_path, visited, depth + 1, max_depth, is_root=False)

    # --- Now rewrite internal links for the saved HTML ---
    rewrite_internal_links(soup, parsed.netloc, timestamp, base_path)

    with open(html_path, "w", encoding="utf-8") as f:
        f.write(str(soup))

# POST /archive: Archive a website snapshot
@app.post("/archive")
def archive_site(request: ArchiveRequest):
    parsed_url = urlparse(request.url)
    domain = parsed_url.netloc
    path = parsed_url.path.strip("/")

    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    # Build the archive directory: archives/domain/path/timestamp
    if path:
        timestamp_dir = os.path.join("archives", domain, path, timestamp)
    else:
        timestamp_dir = os.path.join("archives", domain, timestamp)
    os.makedirs(timestamp_dir, exist_ok=True)

    visited = set()
    base_path = path  # The path you started crawling from
    try:
        archive_page(request.url, timestamp_dir, timestamp, base_path, visited, depth=0, max_depth=1, is_root=True)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {
        "message": "Archive created!",
        "domain": f"{domain}/{path}" if path else domain,
        "timestamp": timestamp,
        "path": f"{timestamp_dir}/index.html"
    }

# GET /archive: List all timestamps for a given domain or subpath
@app.get("/archive")
def list_archive(domain: str = Query(..., description="Domain or domain/path to list archives for")):
    # Normalize the domain input: strip leading/trailing slashes, collapse multiple slashes
    norm = domain.strip("/").replace("//", "/")
    archive_root = os.path.join("archives", *norm.split("/"))
    if not os.path.exists(archive_root):
        return {"archives": []}
    timestamps = [
        name for name in os.listdir(archive_root)
        if os.path.isdir(os.path.join(archive_root, name))
    ]
    return {"archives": timestamps}

@app.get("/archive/{domain}/{timestamp}")
def snapShot_root(domain: str, timestamp: str):
    filepath = os.path.join("archives", domain, timestamp, "index.html")
    if not os.path.exists(filepath):
        return Response(content="Snapshot not found", status_code=404)
    with open(filepath, "r", encoding="utf-8") as f:
        html = f.read()
    return Response(content=html, media_type="text/html")

# GET /archive/{domain}/{path}/{timestamp}: Serve archived page HTML
@app.get("/archive/{domain}/{path:path}/{timestamp}")
def snapShot(
    domain: str = Path(..., description="Domain (e.g. www.greenboard.com)"),
    path: str = Path(..., description="Path inside domain (can be empty)"),
    timestamp: str = Path(..., description="Archive timestamp")
):
    relative_path = path.strip("/")  # No fallback to "root" here
    # Correct structure: archives/domain/path/timestamp/index.html
    if relative_path:
        filepath = os.path.join("archives", domain, relative_path, timestamp, "index.html")
    else:
        filepath = os.path.join("archives", domain, timestamp, "index.html")

    if not os.path.exists(filepath):
        return Response(content="Snapshot not found", status_code=404)

    with open(filepath, "r", encoding="utf-8") as f:
        html = f.read()

    return Response(content=html, media_type="text/html")

# GET /api/archives/all: List all domains and their timestamps
@app.get("/api/archives/all")
def list_all_archives():
    archive_root = "archives"
    if not os.path.exists(archive_root):
        return {"archives": {}}

    all_archives = {}

    for root, dirs, _ in os.walk(archive_root):
        for d in dirs:
            full_path = os.path.join(root, d)
            # If this directory is a timestamp directory (14-digit name)
            if d.isdigit() and len(d) == 14:
                domain_path = os.path.relpath(root, archive_root)
                key = domain_path.replace(os.sep, "/")  # Convert to URL-style path
                all_archives.setdefault(key, []).append(d)

    return {"archives": all_archives}