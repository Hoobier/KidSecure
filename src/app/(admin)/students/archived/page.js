"use client";
// src/app/(admin)/students/archived/page.js
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import "./archived-students.css";

const GRADE_OPTIONS = [
  "Nursery", "Kindergarten", "Preparatory",
  "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6",
];
const SECTION_OPTIONS = ["A", "B", "C"];

const REASON_OPTIONS = [
  { value: "graduated,transferred_out", label: "All archived" },
  { value: "graduated", label: "Graduated only" },
  { value: "transferred_out", label: "Transferred out only" },
];

function formatStatus(status) {
  if (status === "graduated") {
    return { label: "Graduated", cls: "arch-status-pill arch-status-graduated" };
  }
  if (status === "transferred_out") {
    return { label: "Transferred Out", cls: "arch-status-pill arch-status-transferred" };
  }
  return {
    label: status ? status.charAt(0).toUpperCase() + status.slice(1) : "Unknown",
    cls: "arch-status-pill",
  };
}

export default function ArchivedStudentsPage() {
  const [students, setStudents] = useState([]);
  const [meta, setMeta] = useState({ currentPage: 1, lastPage: 1, total: 0, perPage: 20 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [grade, setGrade] = useState("");
  const [section, setSection] = useState("");
  const [reason, setReason] = useState("graduated,transferred_out");
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState(null);
  const [unarchiveTarget, setUnarchiveTarget] = useState(null);
  const [unarchiving, setUnarchiving] = useState(false);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      per_page: "20",
      status: reason,
      ...(search ? { search } : {}),
      ...(grade ? { grade } : {}),
      ...(section ? { section } : {}),
    });

    try {
      const res = await fetch(`/api/students?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load archived students");
      const json = await res.json();
      setStudents(json.data || []);
      setMeta(json.meta || { currentPage: 1, lastPage: 1, total: 0, perPage: 20 });
    } catch {
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, grade, section, reason]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  function handleClearFilters() {
    setSearch("");
    setGrade("");
    setSection("");
    setReason("graduated,transferred_out");
    setPage(1);
  }

  async function handleUnarchive() {
    if (!unarchiveTarget || unarchiving) return;
    setUnarchiving(true);
    try {
      const res = await fetch(`/api/students/${unarchiveTarget.id}/unarchive`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Unable to unarchive this student.");
      setNotice({ type: "success", message: `${unarchiveTarget.fullName} unarchived.` });
      fetchStudents();
    } catch (error) {
      setNotice({ type: "error", message: error.message || "Unable to unarchive this student." });
    } finally {
      setUnarchiving(false);
      setUnarchiveTarget(null);
      setTimeout(() => setNotice(null), 5000);
    }
  }

  const hasAnyFilter = Boolean(search || grade || section || reason !== "graduated,transferred_out");

  return (
    <div className="arch-page">
      <div className="arch-header">
        <h1>Archived Students</h1>
        <div className="arch-header-actions">
          {hasAnyFilter && (
            <button type="button" className="arch-btn arch-btn-secondary" onClick={handleClearFilters}>
              ✕ Clear Filters
            </button>
          )}
          <Link href="/students" className="arch-btn arch-btn-secondary">
            ← Back to Students
          </Link>
        </div>
      </div>

      {notice && (
        <div className={`arch-notice arch-notice-${notice.type}`}>
          {notice.message}
        </div>
      )}

      <div className="arch-toolbar">
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="🔍 Search archived students by name or Student ID"
          className="arch-search"
        />
        <select value={reason} onChange={(e) => { setReason(e.target.value); setPage(1); }} className="arch-filter">
          {REASON_OPTIONS.map((r) => (
            <option key={r.value} value={r.value}>{r.label}</option>
          ))}
        </select>
        <select value={grade} onChange={(e) => { setGrade(e.target.value); setPage(1); }} className="arch-filter">
          <option value="">All Grade Levels</option>
          {GRADE_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select value={section} onChange={(e) => { setSection(e.target.value); setPage(1); }} className="arch-filter">
          <option value="">All Sections</option>
          {SECTION_OPTIONS.map((item) => <option key={item} value={item}>Section {item}</option>)}
        </select>
      </div>

      <div className="arch-table-wrap">
        <table className="arch-table">
          <thead>
            <tr>
              <th>Student ID</th>
              <th>Full Name</th>
              <th>Grade</th>
              <th>Section</th>
              <th>Reason</th>
              <th>Archived On</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && [...Array(5)].map((_, i) => (
              <tr key={i} className="arch-skeleton-row-wrap">
                {[...Array(7)].map((__, cell) => (
                  <td key={cell}><div className="arch-skeleton-cell" /></td>
                ))}
              </tr>
            ))}

            {!loading && students.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <div className="arch-empty">
                    No archived students match your filters.
                  </div>
                </td>
              </tr>
            )}

            {!loading && students.map((student) => {
              const status = formatStatus(student.status);
              const isTransferred = student.status === "transferred_out";
              return (
                <tr key={student.id}>
                  <td>{student.studentId || "—"}</td>
                  <td>
                    <Link href={`/students/${student.id}`} className="students-name-link">
                      {student.fullName || "—"}
                    </Link>
                  </td>
                  <td>{student.gradeLevel || "—"}</td>
                  <td>{student.section || "—"}</td>
                  <td><span className={status.cls}>{status.label}</span></td>
                  <td>
                    {student.archivedAt
                      ? new Date(student.archivedAt).toLocaleDateString()
                      : "—"}
                  </td>
                  <td>
                    <div className="arch-row-actions">
                      <Link
                        href={`/students/${student.id}`}
                        className="arch-btn arch-btn-small arch-btn-secondary"
                      >
                        View
                      </Link>
                      {isTransferred && (
                        <Link
                          href={`/students/${student.id}`}
                          className="arch-btn arch-btn-small arch-btn-secondary"
                          title="Re-enroll from the student detail page"
                        >
                          Re-enroll
                        </Link>
                      )}
                      <button
                        type="button"
                        className="arch-btn arch-btn-small arch-btn-restore"
                        onClick={() => setUnarchiveTarget({ id: student.id, fullName: student.fullName })}
                        disabled={unarchiving}
                      >
                        Unarchive
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!loading && (
        <div className="arch-pagination" aria-hidden={students.length === 0}>
          <span>
            Showing {meta.total === 0 ? "0" : `${(meta.currentPage - 1) * meta.perPage + 1}`}
            –{meta.total === 0 ? "0" : `${Math.min(meta.currentPage * meta.perPage, meta.total)}`} of {meta.total}
          </span>
          <div className="arch-pagination-controls">
            <button
              className="arch-pagination-btn"
              onClick={() => setPage((v) => Math.max(1, v - 1))}
              disabled={meta.currentPage <= 1 || students.length === 0}
            >
              Previous
            </button>
            <button
              className="arch-pagination-btn"
              onClick={() => setPage((v) => Math.min(meta.lastPage, v + 1))}
              disabled={meta.currentPage >= meta.lastPage || students.length === 0}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {unarchiveTarget && (
        <div className="arch-modal-overlay">
          <div className="arch-modal">
            <h3>Unarchive this student?</h3>
            <p>
              This clears {unarchiveTarget.fullName}&apos;s archived flag. Their
              status stays as Graduated or Transferred Out — this doesn&apos;t
              re-enroll them.
            </p>
            <div className="arch-modal-actions">
              <button
                type="button"
                className="arch-modal-btn arch-modal-btn-cancel"
                onClick={() => setUnarchiveTarget(null)}
                disabled={unarchiving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="arch-modal-btn arch-modal-btn-restore"
                onClick={handleUnarchive}
                disabled={unarchiving}
              >
                {unarchiving ? "Unarchiving..." : "Unarchive"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}