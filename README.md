# Web Archiver

Web Archiver is a lightweight web archiving tool that lets users archive static snapshots of `.com` websites. It features a React frontend and a FastAPI backend, and is designed to be simple, responsive, and easy to use.

## 🔍 Features

- Crawl and archive `.com` websites up to 1 level deep
- Downloads pages and linked assets (images, scripts, stylesheets)
- Browse archived snapshots with timestamps
- UI warnings for external (live) links
- Responsive interface built with React
- FastAPI-powered backend for high performance and async support

## 🛠 Tech Stack

- **Frontend**: React, JavaScript, CSS
- **Backend**: FastAPI, Python, BeautifulSoup, `requests`
- **Storage**: Filesystem (`archives/domain/path/timestamp/`)
- **Cross-Origin Requests**: Enabled with `CORSMiddleware`

## 📦 Setup Instructions

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd Web-Archiver
```

### 2. Backend Setup (FastAPI)

> Requires Python 3.9+ and pip

Create virtual environment:

```bash
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Run the backend:

```bash
uvicorn main:app --reload
```

The backend will start on http://localhost:8000

### 3. Frontend Setup (React)

> Requires Node.js installed (v16+ recommended)

```bash
cd frontend
npm install
npm start
```

React dev server will start on http://localhost:3000

## 🧪 Example Usage

1. Launch the frontend and backend.
2. Enter a website URL (must start with https:// and end with .com)
3. Click “Archive”.
4. View and open archived snapshots listed below.

Example archive folder structure:

```
archives/
└── www.example.com/
    └── path/
        └── 20250723183022/
            ├── index.html
            └── assets/
```

## ⚠️ Notes & Limitations

- Designed for static or lightly dynamic .com sites
- Does not support JavaScript-rendered content (no headless browser)
- Asset downloading is best-effort; missing assets will be skipped
- Crawl depth is limited to 1 by default
- No authentication, search, or user management (MVP)

## 📈 Future Improvements

- Deeper recursive crawling with improved link parsing
- JavaScript rendering using Selenium or Playwright
- Background job queue (e.g. Celery)
- Cloud storage support (e.g. AWS S3)
- Archive search, progress indicators, and error reporting
- User accounts and private archives

## 📄 License

MIT License — see LICENSE for details.

## 🙌 Acknowledgments

Built as a personal project by [@SebasHorta](https://github.com/SebasHorta).
