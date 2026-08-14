"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import "./rfid.css";

export default function RfidPage() {
  const [logs, setLogs] = useState([]);
  const [dateFilter, setDateFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [section, setSection] = useState("");
  const [gradeOptions, setGradeOptions] = useState([]);
  const [sectionOptions, setSectionOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const debounceRef = useRef(null);

  // Load dropdown options once on mount
  useEffect(() => {
    async function loadFilterOptions() {
      try {
        const res = await fetch("/api/attendance-logs/filter-options", {
          credentials: "include",
        });
        if (!res.ok) return;
        const data = await res.json();
        setGradeOptions(data.gradeLevels || []);
        setSectionOptions(data.sections || []);
      } catch {
        // Non-critical — dropdowns just stay empty if this fails.
      }
    }
    loadFilterOptions();
  }, []);

  const fetchLogs = useCallback(async (overrides = {}) => {
    setLoading(true);
    setError("");

    const params = new URLSearchParams();
    const date = overrides.date ?? dateFilter;
    const name = overrides.name ?? searchInput;
    const grade = overrides.gradeLevel ?? gradeLevel;
    const sec = overrides.section ?? section;

    if (date) params.set("date", date);
    if (name) params.set("name", name);
    if (grade) params.set("gradeLevel", grade);
    if (sec) params.set("section", sec);

    try {
      const res = await fetch(`/api/attendance-logs?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load.");
      const data = await res.json();
      setLogs(data.data || []);
    } catch {
      setError("Unable to load attendance logs right now.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter, searchInput, gradeLevel, section]);

  // Initial load
  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce the search box — wait 300ms after typing stops before calling the API
  function handleSearchChange(value) {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchLogs({ name: value });
    }, 300);
  }

  function handleDateChange(value) {
    setDateFilter(value);
    fetchLogs({ date: value });
  }

  function handleGradeChange(value) {
    setGradeLevel(value);
    setSection(""); // reset section when grade changes
    fetchLogs({ gradeLevel: value, section: "" });
  }

  function handleSectionChange(value) {
    setSection(value);
    fetchLogs({ section: value });
  }

  function handleClearFilters() {
    setDateFilter("");
    setSearchInput("");
    setGradeLevel("");
    setSection("");
    fetchLogs({ date: "", name: "", gradeLevel: "", section: "" });
  }

  function formatTimestamp(ts) {
    const d = new Date(ts);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  return (
    <main className="rfid-page">
      <div className="page-header">
        <h1>RFID Attendance Logs</h1>
        <p>Tap in / tap out records from the RFID reader.</p>
      </div>

      <div className="log-card">
        <div className="log-card-header">
          <div className="filter-container">
            <input
              type="text"
              className="filter-input filter-search"
              placeholder="🔍 Search by student name"
              value={searchInput}
              onChange={(e) => handleSearchChange(e.target.value)}
            />

            <select
              className="filter-select"
              value={gradeLevel}
              onChange={(e) => handleGradeChange(e.target.value)}
            >
              <option value="">All Grade Levels</option>
              {gradeOptions.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>

            <select
              className="filter-select"
              value={section}
              onChange={(e) => handleSectionChange(e.target.value)}
            >
              <option value="">All Sections</option>
              {sectionOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <input
              type="date"
              className="filter-input"
              value={dateFilter}
              onChange={(e) => handleDateChange(e.target.value)}
            />

            <button className="btn btn-primary" type="button" onClick={() => fetchLogs()}>
              Refresh
            </button>
            <button className="btn btn-ghost" type="button" onClick={handleClearFilters}>
              Clear Filters
            </button>
          </div>
        </div>

        <div className="log-table-container">
          <table className="log-table">
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Name</th>
                <th>Timestamp</th>
                <th>Scan Type</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="empty-state">Loading logs...</td></tr>
              ) : error ? (
                <tr><td colSpan={4} className="empty-state error-text">{error}</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={4} className="empty-state">No attendance records found.</td></tr>
              ) : (
                logs.map((log, i) => (
                  <tr key={`${log.studentId}-${log.timestamp}-${i}`}>
                    <td>{log.studentId || "-"}</td>
                    <td>{log.name || "-"}</td>
                    <td>{formatTimestamp(log.timestamp)}</td>
                    <td>
                      <span className={`scan-badge scan-badge--${log.type}`}>
                        {log.type ? log.type.toUpperCase() : "-"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}