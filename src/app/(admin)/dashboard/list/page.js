"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import "./list.css";

export default function MissingRfidListPage() {
  const [students, setStudents] = useState([]);
  const [searchInput, setSearchInput] = useState("");
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

  const fetchList = useCallback(async (overrides = {}) => {
    const search = overrides.search ?? searchInput;
    const pageVal = overrides.page ?? page;

    const params = new URLSearchParams();
    params.set("page", String(pageVal));
    params.set("per_page", "20");
    params.set("rfid_status", "missing");
    params.set("status", "active,inactive");
    if (search) params.set("search", search);

    const mySeq = ++requestSeqRef.current;
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/students?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      const data = await res.json();

      if (mySeq === requestSeqRef.current) {
        setStudents(data.data || []);
        const m = data.meta || {};
        setMeta({
          current_page: m.current_page ?? m.currentPage ?? pageVal,
          from: m.from ?? 0,
          to: m.to ?? 0,
          total: m.total ?? 0,
          per_page: m.per_page ?? m.perPage ?? 20,
          last_page: m.last_page ?? m.lastPage ?? 1,
        });
      }
    } catch {
      if (mySeq === requestSeqRef.current) {
        setError("Unable to load students missing RFID tags right now.");
      }
    } finally {
      if (mySeq === requestSeqRef.current) {
        setLoading(false);
      }
    }
  }, [searchInput, page]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  function handleSearchChange(value) {
    setSearchInput(value);
    setPage(1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchList({ search: value, page: 1 }), 300);
  }

  function handleClearFilters() {
    setSearchInput("");
    setPage(1);
    fetchList({ search: "", page: 1 });
  }

  return (
    <div className="mr-page">
      <div className="mr-page-header">
        <div className="mr-page-title">
          <h1>Students without RFID Tags</h1>
          <p className="mr-subtitle">
            The following active and inactive students do not have an RFID card assigned.
            Click a name to open the student edit form and assign a tag.
          </p>
        </div>
        <Link href="/dashboard" className="mr-back-btn">
          ← Back to Dashboard
        </Link>
      </div>

      <div className="mr-card">
        <div className="mr-card-header">
          <input
            type="text"
            className="mr-search-input"
            placeholder="🔍 Search by student name or ID"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
          {searchInput && (
            <button
              type="button"
              className="mr-clear-btn"
              onClick={handleClearFilters}
            >
              Clear Filter
            </button>
          )}
        </div>

        <div className="mr-banner">
          <div className="mr-banner-icon">🔔</div>
          <div>
            <p className="mr-banner-title">
              {meta.total || (loading ? "…" : 0)} student
              {(meta.total || 0) === 1 ? "" : "s"} missing RFID card
              {(meta.total || 0) === 1 ? "" : "s"}
            </p>
            <p className="mr-banner-detail">
              Tags must be assigned before students can be tracked via the school RFID
              entrance scanner.
            </p>
          </div>
        </div>

        <div className="mr-table-container">
          <table className="mr-table">
            <thead>
              <tr>
                <th>Student Name</th>
                <th>Student ID</th>
                <th>Grade &amp; Section</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="mr-empty-state">
                    Loading students...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={5} className="mr-empty-state mr-error-text">
                    {error}
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={5} className="mr-empty-state">
                    All students have an RFID tag assigned. 🎉
                  </td>
                </tr>
              ) : (
                students.map((s) => (
                  <tr key={s.id} className="mr-row">
                    <td>
                      <Link
                        href={`/students/${s.id}/edit`}
                        className="mr-name-link"
                      >
                        {s.fullName || "—"}
                      </Link>
                    </td>
                    <td>{s.studentId || "—"}</td>
                    <td>
                      {(s.gradeLevel || s.section)
                        ? `${s.gradeLevel || "—"}${s.gradeLevel ? " - " : ""}${s.section || ""}`
                        : "—"}
                    </td>
                    <td>
                      <span
                        className={
                          "mr-chip " +
                          (s.status === "inactive"
                            ? "mr-chip-inactive"
                            : "mr-chip-active")
                        }
                      >
                        {s.status || "Active"}
                      </span>
                    </td>
                    <td>
                      <Link
                        href={`/students/${s.id}/edit`}
                        className="mr-action-btn"
                      >
                        Assign RFID
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mr-pagination">
          <div className="mr-pagination-info">
            Showing {meta.from ?? 0}–{meta.to ?? 0} of {meta.total ?? 0}
          </div>
          <div className="mr-pagination-buttons">
            <button
              type="button"
              className="mr-pagination-btn"
              disabled={page <= 1 || loading}
              onClick={() => {
                const next = Math.max(1, page - 1);
                setPage(next);
                fetchList({ page: next });
              }}
            >
              Previous
            </button>
            <button
              type="button"
              className="mr-pagination-btn"
              disabled={page >= (meta.last_page || 1) || loading}
              onClick={() => {
                const next = Math.min(meta.last_page || 1, page + 1);
                setPage(next);
                fetchList({ page: next });
              }}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
