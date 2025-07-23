import React, { useState, useEffect } from "react";

function App() {
  // State for archiving
  const [url, setUrl] = useState("");
  const [archiveLoading, setArchiveLoading] = useState(false);
  const [archiveResult, setArchiveResult] = useState("");

  // State for all archives
  const [allArchives, setAllArchives] = useState({});
  const [loadingArchives, setLoadingArchives] = useState(true);
  const [archivesError, setArchivesError] = useState("");

  // State for viewing a snapshot
  const [selectedArchive, setSelectedArchive] = useState(null);

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

  // Archive a URL
  const handleArchive = async () => {
    setArchiveLoading(true);
    setArchiveResult("");
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

  return (
    <div style={{ maxWidth: 800, margin: "40px auto", fontFamily: "sans-serif" }}>
      <h1>Greenboard Web Archiver</h1>

      {/* Archive a URL */}
      <section style={{ marginBottom: 32, padding: 16, border: "1px solid #ccc", borderRadius: 8 }}>
        <h2>Archive a Website</h2>
        <input
          type="text"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder="Enter URL to archive"
          style={{ width: "70%", marginRight: 8, padding: 6 }}
        />
        <button onClick={handleArchive} disabled={archiveLoading || !url}>
          {archiveLoading ? "Archiving..." : "Archive"}
        </button>
        <div style={{ marginTop: 8, color: archiveResult.startsWith("Error") ? "red" : "green" }}>
          {archiveResult}
        </div>
      </section>

      {/* List all archives in a table */}
      <section style={{ marginBottom: 32, padding: 16, border: "1px solid #ccc", borderRadius: 8 }}>
        <h2>All Archived Snapshots</h2>
        {loadingArchives ? (
          <div>Loading archives...</div>
        ) : archivesError ? (
          <div style={{ color: "red" }}>{archivesError}</div>
        ) : Object.keys(allArchives).length === 0 ? (
          <div>No archives found.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ border: "1px solid #ccc", padding: 8 }}>Domain</th>
                <th style={{ border: "1px solid #ccc", padding: 8 }}>Timestamps</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(allArchives).map(([domain, timestamps]) => (
                <tr key={domain}>
                  <td style={{ border: "1px solid #ccc", padding: 8 }}>{domain}</td>
                  <td style={{ border: "1px solid #ccc", padding: 8 }}>
                    {timestamps.length === 0
                      ? "No snapshots"
                      : timestamps.map(ts => (
                          <button
                            key={ts}
                            style={{
                              margin: "0 4px 4px 0",
                              background: "#f0f0f0",
                              border: "1px solid #ccc",
                              borderRadius: 4,
                              padding: "4px 12px",
                              cursor: "pointer",
                            }}
                            onClick={() => setSelectedArchive({ domain, timestamp: ts })}
                          >
                            {ts}
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
        <section style={{ padding: 16, border: "1px solid #ccc", borderRadius: 8 }}>
          <h2>
            Snapshot: {selectedArchive.domain} @ {selectedArchive.timestamp}
          </h2>
          <button
            onClick={() => setSelectedArchive(null)}
            style={{ marginBottom: 8, padding: "4px 12px" }}
          >
            Close
          </button>
          <div style={{ border: "1px solid #aaa", borderRadius: 4, overflow: "hidden" }}>
            <iframe
              title="Archived Snapshot"
              src={getSnapshotUrl(selectedArchive.domain, selectedArchive.timestamp)}
              style={{ width: "100%", height: 500, border: "none" }}
            />
          </div>
        </section>
      )}
    </div>
  );
}

export default App;