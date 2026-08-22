"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import "./students.css";

// src/app/(admin)/students/page.js

const GRADE_OPTIONS = ["Kindergarten", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6"];
const SECTION_OPTIONS = ["A", "B", "C"];

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [meta, setMeta] = useState({ currentPage: 1, lastPage: 1, total: 0, perPage: 20 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [grade, setGrade] = useState("");
  const [section, setSection] = useState("");
  const [status, setStatus] = useState("active,inactive");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState(""); // "" | "name" | "studentId"
  const [sortDir, setSortDir] = useState("asc"); // "asc" | "desc"

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const selectedStudents = students.filter((s) => selectedIds.has(s.id));
  const singleSelected = selectedStudents.length === 1 ? selectedStudents[0] : null;

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      per_page: "20",
      ...(search ? { search } : {}),
      ...(grade ? { grade } : {}),
      ...(section ? { section } : {}),
      ...(status ? { status } : {}),
      ...(sort ? { sort_by: sort, sort_dir: sortDir } : {}),
    });

    try {
      const res = await fetch(`/api/students?${params}`, {
        credentials: "include",
      });

      if (!res.ok) {
        const body = await res.text();
        console.error(`Failed to load students — status ${res.status}:`, body);
        throw new Error("Failed to load students");
      }

      const json = await res.json();
      setStudents(json.data);
      setMeta(json.meta);
    } catch (err) {
      console.error(err);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, grade, section, status, sort, sortDir]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  useEffect(() => {
    setPage(1);
  }, [search, grade, section, status, sort, sortDir]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [students]);

  const hasAnyFilter = Boolean(search || grade || section || status);

  function handleClearFilters() {
    setSearch("");
    setGrade("");
    setSection("");
    setStatus("");
    setSort("");
    setSortDir("asc");
    setPage(1);
  }

  function handleSortChange(next) {
    if (!next) {
      setSort("");
      setSortDir("asc");
      setPage(1);
      return;
    }
    const [s, d] = next.split(":");
    setSort(s);
    setSortDir(d || "asc");
    setPage(1);
  }

  function sortIndicator(col) {
    if (sort !== col) return "";
    return sortDir === "asc" ? " ▲" : " ▼";
  }

  function toggleSelect(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === students.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(students.map((s) => s.id)));
    }
  }

  function requestDeleteSelected() {
    if (selectedIds.size === 0 || deleting) return;
    setConfirmOpen(true);
  }

  function handleCancelDelete() {
    if (deleting) return;
    setConfirmOpen(false);
  }

  async function handleConfirmDelete() {
    if (selectedIds.size === 0 || deleting) return;
    const snapshotCount = selectedIds.size;
    setDeleting(true);
    setNotice(null);
    let successCount = 0;
    let failedCount = 0;
    const failureMessages = [];

    const ids = Array.from(selectedIds);
    for (const id of ids) {
      try {
        const res = await fetch(`/api/students/${id}`, {
          method: "DELETE",
          credentials: "include",
          headers: { Accept: "application/json" },
        });

        let payload = null;
        try {
          const ct = res.headers.get("content-type") || "";
          if (ct.includes("application/json")) payload = await res.json();
        } catch {
          // ignore parse error
        }

        if (res.ok) {
          successCount++;
        } else {
          failedCount++;
          if (payload && payload.message) {
            const student = students.find((s) => s.id === id);
            const label = student ? student.fullName || student.studentId : `#${id}`;
            failureMessages.push(`${label}: ${payload.message}`);
          }
        }
      } catch {
        failedCount++;
      }
    }

    setSelectedIds(new Set());
    setConfirmOpen(false);
    setDeleting(false);

    if (successCount > 0 && failedCount === 0) {
      setNotice({
        type: "success",
        message: snapshotCount === 1
          ? "Student moved to Deleted Students."
          : `${successCount} students moved to Deleted Students.`,
      });
    } else if (successCount > 0) {
      setNotice({
        type: "error",
        message: `${successCount} deleted, ${failedCount} failed.${failureMessages.length > 0 ? " " + failureMessages[0] : ""}`,
      });
    } else {
      setNotice({
        type: "error",
        message: failureMessages.length > 0
          ? `Failed to delete. ${failureMessages[0]}`
          : "Failed to delete selected students. Please try again.",
      });
    }

    fetchStudents();
    setTimeout(() => setNotice(null), 5000);
  }

  return (
    <div className="students-page">
      <div className="students-header">
        <h1>Students</h1>
        <div className="students-header-actions">
          {hasAnyFilter && (
            <button
              type="button"
              className="students-btn-primary students-btn-secondary"
              onClick={handleClearFilters}
            >
              ✕ Clear Filters
            </button>
          )}
          <Link href="/students/deleted" className="students-btn-primary students-btn-secondary">
            🗑 Deleted Students
          </Link>
          {selectedIds.size > 0 && (
            <button
              type="button"
              className="students-btn-primary students-btn-danger"
              onClick={requestDeleteSelected}
              disabled={deleting}
            >
              {deleting
                ? "Deleting..."
                : selectedIds.size === 1
                  ? "🗑 Delete Student"
                  : `🗑 Delete (${selectedIds.size})`}
            </button>
          )}
          <Link href="/enrollment" className="students-btn-primary">
            + Add Student
          </Link>
        </div>
      </div>

      {notice && (
        <div className={`students-notice students-notice-${notice.type}`}>
          {notice.message}
        </div>
      )}

      <div className="students-toolbar">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Search by name or Student ID"
          className="students-search"
        />
        <select value={grade} onChange={(e) => setGrade(e.target.value)} className="students-filter">
          <option value="">All Grade Levels</option>
          {GRADE_OPTIONS.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
        <select value={section} onChange={(e) => setSection(e.target.value)} className="students-filter">
          <option value="">All Sections</option>
          {SECTION_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="students-filter">
          <option value="active,inactive">Active &amp; Inactive (default)</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select
          value={sort ? `${sort}:${sortDir}` : ""}
          onChange={(e) => handleSortChange(e.target.value)}
          className="students-filter students-filter-sort"
        >
          <option value="">Sort: Default (Newest first)</option>
          <option value="name:asc">Sort: Name A → Z</option>
          <option value="name:desc">Sort: Name Z → A</option>
          <option value="studentId:asc">Sort: Student ID ↑</option>
          <option value="studentId:desc">Sort: Student ID ↓</option>
        </select>
      </div>

      <div className="students-table-card">
        <table className="students-table">
          <thead>
            <tr>
              <th className="students-check-col">
                <input
                  type="checkbox"
                  checked={!loading && students.length > 0 && selectedIds.size === students.length}
                  onChange={toggleSelectAll}
                  disabled={loading || students.length === 0}
                />
              </th>

              <th>
                <button
                  type="button"
                  className="students-sortable"
                  onClick={() => {
                    const next = sort === "studentId" && sortDir === "asc" ? "studentId:desc" : "studentId:asc";
                    handleSortChange(next);
                  }}
                >
                  Student ID{sortIndicator("studentId")}
                </button>
              </th>
              <th>
                <button
                  type="button"
                  className="students-sortable"
                  onClick={() => {
                    const next = sort === "name" && sortDir === "asc" ? "name:desc" : "name:asc";
                    handleSortChange(next);
                  }}
                >
                  Full Name{sortIndicator("name")}
                </button>
              </th>

              <th>Grade</th>
              <th>Section</th>
              <th>RFID Tag</th>
              <th>Parent</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading &&
              [...Array(5)].map((_, i) => (
                <tr key={i} className="students-skeleton-row-wrap">
                  <td className="students-check-col">
                    <div className="students-skeleton-cell students-skeleton-check" />
                  </td>
                  <td><div className="students-skeleton-cell" /></td>
                  <td><div className="students-skeleton-cell" /></td>
                  <td><div className="students-skeleton-cell" /></td>
                  <td><div className="students-skeleton-cell" /></td>
                  <td><div className="students-skeleton-cell" /></td>
                  <td><div className="students-skeleton-cell" /></td>
                </tr>
              ))}

            {!loading && students.length === 0 && (
              <tr>
                <td colSpan={8}>
                  <div className="students-empty">
                    No students found. Try adjusting your search or filters.
                  </div>
                </td>
              </tr>
            )}

            {!loading &&
              students.map((s) => (
                <tr key={s.id} className={selectedIds.has(s.id) ? "students-row-selected" : ""}>
                  <td className="students-check-col">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(s.id)}
                      onChange={() => toggleSelect(s.id)}
                    />
                  </td>
                  <td>{s.studentId || "—"}</td>
                  <td>
                    <Link href={`/students/${s.id}`} className="students-name-link">
                      {s.fullName || "—"}
                    </Link>
                  </td>
                  <td>{s.gradeLevel || "—"}</td>
                  <td>{s.section || "—"}</td>
                  <td>
                    {s.hasRfidTag ? (
                      <span className="students-rfid students-rfid-has">Assigned</span>
                    ) : (
                      <span className="students-rfid students-rfid-none">None</span>
                    )}
                  </td>
                  <td>
                    {s.hasParentLink ? (
                      <span className="students-parent students-parent-has">Linked</span>
                    ) : (
                      <span className="students-parent students-parent-none">No parent</span>
                    )}
                  </td>
                  <td>
                    <span
                      className={
                        "students-status " +
                        (s.status === "active"
                          ? "students-status-active"
                          : s.status === "inactive"
                            ? "students-status-inactive"
                            : s.status === "deleted"
                              ? "students-status-deleted"
                              : "students-status-neutral")
                      }
                    >
                      {s.status
                        ? s.status.charAt(0).toUpperCase() + s.status.slice(1)
                        : "Active"}
                    </span>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {!loading && (
        <div className="students-pagination" aria-hidden={students.length === 0}>
          <span>
            Showing {meta.total === 0 ? "0" : `${(meta.currentPage - 1) * meta.perPage + 1}`}
            –{meta.total === 0 ? "0" : `${Math.min(meta.currentPage * meta.perPage, meta.total)}`} of {meta.total}
          </span>
          <div className="students-pagination-controls">
            <button
              className="students-pagination-btn"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={meta.currentPage <= 1 || students.length === 0 || loading}
            >
              Previous
            </button>
            <button
              className="students-pagination-btn"
              onClick={() => setPage((p) => Math.min(meta.lastPage, p + 1))}
              disabled={meta.currentPage >= meta.lastPage || students.length === 0 || loading}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {confirmOpen && (
        <div className="students-modal-overlay">
          <div className="students-modal">
            <h3>
              {selectedIds.size === 1
                ? "Delete this student?"
                : `Delete ${selectedIds.size} students?`}
            </h3>
            <p>
              {singleSelected ? (
                <>
                  This will move <strong>{singleSelected.fullName}</strong> to Deleted Students.
                  Their records will be kept, and this can be reversed later.
                </>
              ) : (
                <>
                  This will move the {selectedIds.size} selected students to Deleted Students.
                  Their records will be kept, and this can be reversed later.
                </>
              )}
            </p>
            <div className="students-modal-actions">
              <button
                type="button"
                className="students-modal-btn students-modal-btn-cancel"
                onClick={handleCancelDelete}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="students-modal-btn students-modal-btn-danger"
                onClick={handleConfirmDelete}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}