from fastapi import FastAPI, Query, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
from urllib.parse import urlparse
from datetime import datetime
import os

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

@app.post("/archive")
def archive_site(request: ArchiveRequest):
    # Grab HTML from the provided URL
    response = requests.get(request.url)
    html = response.text
    
    # Pull out the domain from the URL (e.g., 'example.com')
    parsed_url = urlparse(request.url)
    domain = parsed_url.netloc

    # Create timestamp for this archive (format: YYYYMMDDHHMMSS)
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")

    # Make directory to store this snapshot (if it doesn't exist)
    archive_path = f"archives/{domain}/{timestamp}"
    os.makedirs(archive_path, exist_ok=True)

    # Save HTML to a file in the archive directory
    with open(f"{archive_path}/index.html", "w", encoding="utf-8") as f:
        f.write(html)

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