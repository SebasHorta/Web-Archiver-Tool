from fastapi import FastAPI, HTTPException, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
from urllib.parse import urlparse, urljoin
from datetime import datetime
import os
from bs4 import BeautifulSoup

# Initialize FastAPI app
app = FastAPI()

# Set up CORS so the frontend (on a different port) can talk to this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow requests from any origin (for development only)
    allow_credentials=True,  # Allow cookies and authentication headers
    allow_methods=["*"],    # Allow all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],    # Allow all headers
)

# Define the expected structure for archive requests
class ArchiveRequest(BaseModel):
    url: str

# Helper functions
def archive_page(url, base_path, visited, depth=0, max_depth=1):
    if url in visited or depth > max_depth:
        return
    visited.add(url)
    try:
        # Grab HTML from the provided URL
        response = requests.get(url)
        if response.status_code != 200:
            raise ValueError(f"Status code {response.status_code}")
        html = response.text
        if not html.strip():
            raise ValueError("Empty content")
    except Exception as e:
        print(f"Failed to fetch {url}: {e}")
        return

    # Save HTML to a file in the archive directory
    if not os.path.exists(base_path):
        os.makedirs(base_path, exist_ok=True)
    with open(f"{base_path}/index.html", "w", encoding="utf-8") as f:
        f.write(html)

    # Parse internal links if not too deep
    if depth < max_depth:
        soup = BeautifulSoup(html, "html.parser")
        assets_folder = os.path.join(base_path, "assets")
        html = download_and_rewrite_assets(soup, url, assets_folder)
        for a in soup.find_all("a", href=True):
            link = a["href"]
            # Resolve relative URLs
            full_link = urljoin(url, link)
            # Only follow links on same domain
            if urlparse(full_link).netloc == urlparse(url).netloc:
                # Create subdirectory for the internal page
                path_part = urlparse(full_link).path.strip("/")
                sub_path = os.path.join(base_path, path_part)
                archive_page(full_link, sub_path, visited, depth+1, max_depth)


def download_and_rewrite_assets(soup, page_url, asset_folder):
    for tag, attr in [("img", "src"), ("link", "href"), ("script", "src")]:
        for el in soup.find_all(tag):
            url = el.get(attr)
            if url:
                asset_url = urljoin(page_url, url)
                asset_name = os.path.basename(urlparse(asset_url).path)
                if not asset_name: # skip if no filename
                    continue
                local_path = os.path.join(asset_folder, asset_name)
                try:
                    asset_resp = requests.get(asset_url, timeout=5)
                    if asset_resp.status_code == 200:
                        os.makedirs(asset_folder, exist_ok=True)
                        with open(local_path, "wb") as f:
                            f.write(asset_resp.content)
                        # Rewrite the URL in the HTML to point to the local asset
                        el[attr] = os.path.relpath(local_path, start=os.path.dirname(asset_folder))
                except Exception as e:
                    print(f"Failed to download asset {asset_url}: {e}")
    return str(soup)


@app.post("/archive")
def archive_site(request: ArchiveRequest):
    # Pull out the domain from the URL (e.g., 'example.com')
    parsed_url = urlparse(request.url)
    domain = parsed_url.netloc

    # Create timestamp for this archive (format: YYYYMMDDHHMMSS)
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")

    # Make directory to store this snapshot (if it doesn't exist)
    archive_path = f"archives/{domain}/{timestamp}"
    os.makedirs(archive_path, exist_ok=True)
    
    # Call recursive archiver
    visited = set()
    try:
        archive_page(request.url, archive_path, visited, depth=0, max_depth=1)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    # Respond with info about archive
    return {
        "message": "Archive created!",
        "domain": domain,
        "timestamp": timestamp,
        "path": f"{archive_path}/index.html"
    }



@app.get("/archive")
def list_archive(domain: str = Query(..., description="Domain to list archives for")):
    # Build path to domain's archive folder
    archive_root = f"archives/{domain}"
    if not os.path.exists(archive_root):
        return {"archives": []}
    # List all timestamp folders
    timestamps = [name for name in os.listdir(archive_root) if os.path.isdir(os.path.join(archive_root, name))]
    return {"archives": timestamps}

@app.get("/archive/{domain}/{timestamp}")
def snapShot(domain: str, timestamp: str):
    # Build file path and check if it exists (if not return 404)
    filepath = f"archives/{domain}/{timestamp}/index.html"
    if not os.path.exists(filepath):
             return Response(content="Snapshot not found", status_code=404)
    # Read HTML file
    with open(filepath, "r", encoding="utf-8") as f:
        html = f.read() 
    # Return HTML as Response
    return Response(content=html, media_type="text/html")