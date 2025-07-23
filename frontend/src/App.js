import React, { useState, useEffect } from "react";
import "./App.css";

function App() {
  // State for archiving
  const [url, setUrl] = useState("");
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [archiveResult, setArchiveResult] = useState("");
  const [urlError, setUrlError] = useState("");

  // State for all archives
  const [allArchives, setAllArchives] = useState({});
  const [loadingArchives, setLoadingArchives] = useState(true);
  const [archivesError, setArchivesError] = useState("");

  // State for viewing a snapshot
  const [selectedArchive, setSelectedArchive] = useState(null);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Fetch all archives on mount and after archiving
  const fetchAllArchives = async () => {
    setLoadingArchives(true);
    setArchivesError("");
    try {
      const res = await fetch("http://localhost:8000/api/archives/all");
      const data = await res.json();
      setAllArchives(data.archives || {});
    } catch (err) {
      setArchivesError("Error loading archives: " + err.message);
    }
    setLoadingArchives(false);
  };

  useEffect(() => {
    fetchAllArchives();
  }, []);

  // URL validation: must start with https:// and end with .com
  const validateUrl = (input) => {
    return /^https:\/\/.+\.com(\/.*)?$/.test(input);
  };

  // Archive a URL
  const handleArchive = async () => {
    setArchiveResult("");
    setUrlError("");
    if (!validateUrl(url)) {
      setUrlError("Please enter a valid URL that starts with https:// and ends with .com");
      return;
    }
    setArchiveLoading(true);
    try {
      const res = await fetch("http://localhost:8000/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      setArchiveResult(data.message || "Success");
      fetchAllArchives(); // Refresh the list after archiving
    } catch (err) {
      setArchiveResult("Error: " + err.message);
    }
    setArchiveLoading(false);
  };

  // Helper to build the correct snapshot URL
  const getSnapshotUrl = (domainPath, timestamp) => {
    const parts = domainPath.split("/");
    const domain = parts[0];
    const path = parts.slice(1).join("/");
    return path
      ? `http://localhost:8000/archive/${domain}/${path}/${timestamp}`
      : `http://localhost:8000/archive/${domain}/${timestamp}`;
  };

  // Helper to format timestamp (YYYYMMDDHHMMSS -> YYYY-MM-DD HH:MM:SS)
  const formatTimestamp = (ts) => {
    if (!/^\d{14}$/.test(ts)) return ts;
    return `${ts.slice(0,4)}-${ts.slice(4,6)}-${ts.slice(6,8)} ${ts.slice(8,10)}:${ts.slice(10,12)}:${ts.slice(12,14)}`;
  };

  return (
    <div className="gb-container">
      <h1 className="gb-title">Greenboard Web Archiver</h1>

      {/* Archive a URL */}
      <section className="gb-card gb-archive-section">
        <h2 className="gb-section-title">Archive a Website</h2>
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
        {urlError && <div className="gb-msg gb-msg-error">{urlError}</div>}
        <button
          className="gb-btn gb-btn-primary"
          onClick={handleArchive}
          disabled={archiveLoading || !url}
        >
          {archiveLoading ? "Archiving..." : "Archive"}
        </button>
        <div className={archiveResult.startsWith("Error") ? "gb-msg gb-msg-error" : "gb-msg gb-msg-success"}>
          {archiveResult}
        </div>
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
              {Object.entries(allArchives).map(([domain, timestamps]) => (
                <tr key={domain}>
                  <td>{domain}</td>
                  <td>
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
            Snapshot: {selectedArchive.domain} @ {selectedArchive.timestamp}
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
      <footer className="gb-footer">
        <span>Greenboard Interview Project &middot; Website Archiving Tool</span>
      </footer>
    </div>
  );
}

export default App;