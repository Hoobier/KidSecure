"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import "./rfid.css";

export default function RfidPage() {
  const [logs, setLogs] = useState([]);
  const [dateFilter, setDateFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [section, setSection] = useState("");
  const [sort, setSort] = useState(""); // "" | "name" | "studentId"
  const [sortDir, setSortDir] = useState("asc"); // "asc" | "desc"
  const [gradeOptions, setGradeOptions] = useState([]);
  const [sectionOptions, setSectionOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({
    current_page: 1,
    from: 0,
    to: 0,
    total: 0,
    per_page: 20,
    last_page: 1,
  });

  const debounceRef = useRef(null);
  const requestSeqRef = useRef(0);

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
    const date = overrides.date ?? dateFilter;
    const name = overrides.name ?? searchInput;
    const grade = overrides.gradeLevel ?? gradeLevel;
    const sec = overrides.section ?? section;
    const sortVal = overrides.sort ?? sort;
    const dir = overrides.sortDir ?? sortDir;
    const pageVal = overrides.page ?? page;

    const params = new URLSearchParams();
    params.set("page", String(pageVal));
    params.set("per_page", "20");
    if (date) params.set("date", date);
    if (name) params.set("name", name);
    if (grade) params.set("gradeLevel", grade);
    if (sec) params.set("section", sec);
    if (sortVal) {
      params.set("sort", sortVal);
      params.set("dir", dir);
    }

    // Prevent old slow requests from clobbering newer requests when typing fast
    const mySeq = ++requestSeqRef.current;
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/attendance-logs?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load.");
      const data = await res.json();

      if (mySeq === requestSeqRef.current) {
        setLogs(data.data || []);
        const m = data.meta || {};
        setMeta({
          current_page: m.current_page ?? pageVal,
          from: m.from ?? 0,
          to: m.to ?? 0,
          total: m.total ?? 0,
          per_page: m.per_page ?? 20,
          last_page: m.last_page ?? 1,
        });
      }
    } catch {
      if (mySeq === requestSeqRef.current) {
        setError("Unable to load attendance logs right now.");
      }
    } finally {
      if (mySeq === requestSeqRef.current) {
        setLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter, searchInput, gradeLevel, section, sort, sortDir, page]);

  // Initial load
  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce the search box — wait 300ms after typing stops before calling the API
  function handleSearchChange(value) {
    setSearchInput(value);
    setPage(1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchLogs({ name: value, page: 1 });
    }, 300);
  }

  function handleDateChange(value) {
    setDateFilter(value);
    setPage(1);
    fetchLogs({ date: value, page: 1 });
  }

  function handleGradeChange(value) {
    setGradeLevel(value);
    setSection(""); // reset section when grade changes
    setPage(1);
    fetchLogs({ gradeLevel: value, section: "", page: 1 });
  }

  function handleSectionChange(value) {
    setSection(value);
    setPage(1);
    fetchLogs({ section: value, page: 1 });
  }

  function handleSortChange(nextSort) {
    let nextDir = "asc";
    if (nextSort === sort) {
      nextDir = sortDir === "asc" ? "desc" : "asc";
    }
    setSort(nextSort);
    setSortDir(nextDir);
    setPage(1);
    fetchLogs({ sort: nextSort, sortDir: nextDir, page: 1 });
  }

  function handleClearFilters() {
    setDateFilter("");
    setSearchInput("");
    setGradeLevel("");
    setSection("");
    setSort("");
    setSortDir("asc");
    setPage(1);
    fetchLogs({
      date: "",
      name: "",
      gradeLevel: "",
      section: "",
      sort: "",
      sortDir: "asc",
      page: 1,
    });
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

  function sortIndicator(col) {
    if (sort !== col) return "";
    return sortDir === "asc" ? " ▲" : " ▼";
  }

  const hasAnyFilter = Boolean(
    searchInput || dateFilter || gradeLevel || section || sort
  );

  return (
    <main className="rfid-page">
      <div className="page-header">
        <h1>RFID Attendance Logs</h1>
        <p>Tap in / tap out records from the RFID reader.</p>
      </div>

      <div className="log-card">
        <div className="log-card-header">
          <div className="log-toolbar-row log-toolbar-row--single">
            <input
              type="text"
              className={`filter-input filter-search${hasAnyFilter ? " filter-search--shrink" : ""}`}
              placeholder="🔍 Search by name or Student ID"
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

            <select
              className="filter-select"
              value={sort ? `${sort}:${sortDir}` : ""}
              onChange={(e) => {
                const val = e.target.value;
                if (!val) {
                  setSort("");
                  setSortDir("asc");
                  setPage(1);
                  fetchLogs({ sort: "", sortDir: "asc", page: 1 });
                  return;
                }
                const [s, d] = val.split(":");
                setSort(s);
                setSortDir(d);
                setPage(1);
                fetchLogs({ sort: s, sortDir: d, page: 1 });
              }}
            >
              <option value="">Sort: Default (newest)</option>
              <option value="name:asc">Sort: Name A → Z</option>
              <option value="name:desc">Sort: Name Z → A</option>
              <option value="studentId:asc">Sort: Student ID ↑</option>
              <option value="studentId:desc">Sort: Student ID ↓</option>
            </select>

            <div className="log-toolbar-actions">
              <button className="btn btn-primary" type="button" onClick={() => fetchLogs()}>
                Refresh
              </button>
              {hasAnyFilter && (
                <button className="btn btn-ghost" type="button" onClick={handleClearFilters}>
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="log-table-container">
          <table className="log-table">
            <thead>
              <tr>
                <th
                  role="columnheader button"
                  tabIndex={0}
                  className="log-sortable"
                  onClick={() => handleSortChange("studentId")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleSortChange("studentId");
                    }
                  }}
                >
                  Student ID{sortIndicator("studentId")}
                </th>
                <th
                  role="columnheader button"
                  tabIndex={0}
                  className="log-sortable"
                  onClick={() => handleSortChange("name")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      handleSortChange("name");
                    }
                  }}
                >
                  Name{sortIndicator("name")}
                </th>
                <th>Grade</th>
                <th>Section</th>
                <th>Timestamp</th>
                <th>Scan Type</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="empty-state">Loading logs...</td></tr>
              ) : error ? (
                <tr><td colSpan={6} className="empty-state error-text">{error}</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={6} className="empty-state">No attendance records found.</td></tr>
              ) : (
                logs.map((log, i) => (
                  <tr key={`${log.studentId}-${log.timestamp}-${i}`}>
                    <td>{log.studentId || "-"}</td>
                    <td>{log.name || "-"}</td>
                    <td>{log.gradeLevel || "-"}</td>
                    <td>{log.section || "-"}</td>
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

        <div className="log-pagination">
          <div className="log-pagination-info">
            Showing {meta.from ?? 0}–{meta.to ?? 0} of {meta.total ?? 0}
          </div>
          <div className="log-pagination-buttons">
            <button
              type="button"
              className="log-pagination-btn"
              disabled={page <= 1 || loading}
              onClick={() => {
                const next = Math.max(1, page - 1);
                setPage(next);
                fetchLogs({ page: next });
              }}
            >
              Previous
            </button>
            <button
              type="button"
              className="log-pagination-btn"
              disabled={page >= (meta.last_page || 1) || loading}
              onClick={() => {
                const next = Math.min(meta.last_page || 1, page + 1);
                setPage(next);
                fetchLogs({ page: next });
              }}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}