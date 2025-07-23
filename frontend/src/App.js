// Greenboard Web Archiver - React Frontend
// Lets users archive a website, view all snapshots, and browse archived pages

import React, { useState, useEffect } from "react";
import "./App.css";

// Helper: Format timestamp (YYYYMMDDHHMMSS -> YYYY-MM-DD HH:MM:SS)
const formatTimestamp = (ts) => {
  if (!/^\d{14}$/.test(ts)) return ts;
  return `${ts.slice(0,4)}-${ts.slice(4,6)}-${ts.slice(6,8)} ${ts.slice(8,10)}:${ts.slice(10,12)}:${ts.slice(12,14)}`;
};

function App() {
  // User input for URL to archive
  const [url, setUrl] = useState("");
  // Show spinner while archiving
  const [archiveLoading, setArchiveLoading] = useState(false);
  // Result message after archiving
  const [archiveResult, setArchiveResult] = useState("");
  // Error for invalid URL
  const [urlError, setUrlError] = useState("");
  // Show progress spinner/message
  const [showProgress, setShowProgress] = useState(false);

  // All archived domains and their timestamps
  const [allArchives, setAllArchives] = useState({});
  // Loading state for archive list
  const [loadingArchives, setLoadingArchives] = useState(true);
  // Error loading archive list
  const [archivesError, setArchivesError] = useState("");

  // Which snapshot is currently being viewed (domain/timestamp)
  const [selectedArchive, setSelectedArchive] = useState(null);

  // Fetch all archives from backend
  const fetchAllArchives = async () => {
    setLoadingArchives(true);
    setArchivesError("");
    try {
      // Hit backend endpoint to get all archived domains/timestamps
      const res = await fetch("http://localhost:8000/api/archives/all");
      const data = await res.json();
      setAllArchives(data.archives || {});
    } catch (err) {
      setArchivesError("Error loading archives: " + err.message);
    }
    setLoadingArchives(false);
  };

  // On mount, load all archives
  useEffect(() => {
    fetchAllArchives();
  }, []);

  // Validate URL: must start with https:// and end with .com
  const validateUrl = (input) => {
    return /^https:\/\/.+\.com(\/.*)?$/.test(input);
  };

  // Archive a URL (POST to backend)
  const handleArchive = async () => {
    setArchiveResult("");
    setUrlError("");
    if (!validateUrl(url)) {
      setUrlError("Please enter a valid URL that starts with https:// and ends with .com");
      return;
    }
    setArchiveLoading(true);
    setShowProgress(true);
    try {
      // Send archive request to backend
      const res = await fetch("http://localhost:8000/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      setArchiveResult(data.message || "Success");
      fetchAllArchives(); // Refresh archive list
    } catch (err) {
      setArchiveResult("Error: " + err.message);
    }
    setArchiveLoading(false);
    setShowProgress(false);
  };

  // Build the correct snapshot URL for iframe
  const getSnapshotUrl = (domainPath, timestamp) => {
    const parts = domainPath.split("/");
    const domain = parts[0];
    const path = parts.slice(1).join("/");
    return path
      ? `http://localhost:8000/archive/${domain}/${path}/${timestamp}`
      : `http://localhost:8000/archive/${domain}/${timestamp}`;
  };

  return (
    <div className="gb-container">
      <h1 className="gb-title">Greenboard Web Archiver V1</h1>

      {/* Archive a URL */}
      <section className="gb-card gb-archive-section">
        <h2 className="gb-section-title">Archive a Website</h2>
        {/* Tell user about URL requirements */}
        <div className="gb-note">URLs must start with <b>https://</b> and end with <b>.com</b></div>
        <input
          type="text"
          value={url}
          onChange={e => {
            setUrl(e.target.value);
            setUrlError("");
          }}
          placeholder="Enter URL to archive"
          className="gb-input"
        />
        {/* Show error if URL is invalid */}
        {urlError && <div className="gb-msg gb-msg-error">{urlError}</div>}
        <button
          className="gb-btn gb-btn-primary"
          onClick={handleArchive}
          disabled={archiveLoading || !url}
        >
          {archiveLoading ? "Archiving..." : "Archive"}
        </button>
        {/* Show result message after archiving */}
        <div className={archiveResult.startsWith("Error") ? "gb-msg gb-msg-error" : "gb-msg gb-msg-success"}>
          {archiveResult}
        </div>
        {/* Show spinner and message while archiving */}
        {showProgress && (
          <div className="gb-progress-area">
            <div className="gb-spinner" />
            <div className="gb-progress-msg">Archiving... this may take a minute for larger sites.</div>
          </div>
        )}
      </section>

      {/* List all archives in a table */}
      <section className="gb-card gb-archives-list-section">
        <h2 className="gb-section-title">All Archived Snapshots</h2>
        {loadingArchives ? (
          <div className="gb-loading">Loading archives...</div>
        ) : archivesError ? (
          <div className="gb-msg gb-msg-error">{archivesError}</div>
        ) : Object.keys(allArchives).length === 0 ? (
          <div className="gb-empty">No archives found.</div>
        ) : (
          <table className="gb-table">
            <thead>
              <tr>
                <th>Domain</th>
                <th>Timestamps</th>
              </tr>
            </thead>
            <tbody>
              {/* Sort domains by latest snapshot timestamp (newest first) */}
              {Object.entries(allArchives)
                .sort((a, b) => {
                  // Sort by latest timestamp (descending)
                  const aLatest = a[1].length > 0 ? a[1].slice().sort((x, y) => y.localeCompare(x))[0] : "";
                  const bLatest = b[1].length > 0 ? b[1].slice().sort((x, y) => y.localeCompare(x))[0] : "";
                  return bLatest.localeCompare(aLatest);
                })
                .map(([domain, timestamps]) => (
                  <tr key={domain}>
                    <td>{domain}</td>
                    <td>
                      {/* Show timestamps (newest first) as clickable pills */}
                      {timestamps.length === 0
                        ? "No snapshots"
                        : [...timestamps].sort((a, b) => b.localeCompare(a)).map(ts => (
                            <button
                              key={ts}
                              className="gb-pill gb-btn gb-btn-secondary"
                              onClick={() => setSelectedArchive({ domain, timestamp: ts })}
                            >
                              {formatTimestamp(ts)}
                            </button>
                          ))}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </section>

      {/* View a snapshot in an iframe */}
      {selectedArchive && (
        <section className="gb-card gb-snapshot-section">
          <h2 className="gb-section-title">
            Snapshot: {selectedArchive.domain} @ {formatTimestamp(selectedArchive.timestamp)}
          </h2>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <button
              className="gb-btn gb-btn-secondary gb-close-btn"
              onClick={() => setSelectedArchive(null)}
            >
              Close
            </button>
            <button
              className="gb-btn gb-btn-primary"
              onClick={() => window.open(getSnapshotUrl(selectedArchive.domain, selectedArchive.timestamp), "_blank", "noopener,noreferrer")}
            >
              Open in New Tab
            </button>
          </div>
          <div className="gb-iframe-wrapper">
            <iframe
              title="Archived Snapshot"
              src={getSnapshotUrl(selectedArchive.domain, selectedArchive.timestamp)}
              className="gb-iframe"
            />
          </div>
        </section>
      )}

      {/* Footer with project info */}
      <footer className="gb-footer">
        <span>Greenboard Interview Project &middot; Website Archiving Tool</span>
      </footer>
    </div>
  );
}

export default App;