"use client";
// src/app/(admin)/students/transferred/page.js
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import "../deleted/deleted-students.css";

const GRADE_OPTIONS = [
  "Nursery",
  "Kindergarten",
  "Preparatory",
  "Grade 1",
  "Grade 2",
  "Grade 3",
  "Grade 4",
  "Grade 5",
  "Grade 6",
];
const SECTION_OPTIONS = ["A", "B", "C"];

function formatStatus(status) {
  if (status === "transferred_out") {
    return { label: "Transferred Out", cls: "del-status-pill del-status-transferred" };
  }
  return {
    label: status ? status.charAt(0).toUpperCase() + status.slice(1) : "Unknown",
    cls: "del-status-pill",
  };
}

export default function TransferredStudentsPage() {
  const [students, setStudents] = useState([]);
  const [meta, setMeta] = useState({ currentPage: 1, lastPage: 1, total: 0, perPage: 20 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [grade, setGrade] = useState("");
  const [section, setSection] = useState("");
  const [page, setPage] = useState(1);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      per_page: "20",
      status: "transferred_out",
      ...(search ? { search } : {}),
      ...(grade ? { grade } : {}),
      ...(section ? { section } : {}),
    });

    try {
      const res = await fetch(`/api/students?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load transferred students");
      const json = await res.json();
      setStudents(json.data || []);
      setMeta(json.meta || { currentPage: 1, lastPage: 1, total: 0, perPage: 20 });
    } catch {
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, grade, section]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchStudents();
  }, [fetchStudents]);

  function handleClearFilters() {
    setSearch("");
    setGrade("");
    setSection("");
    setPage(1);
  }

  const hasAnyFilter = Boolean(search || grade || section);

  return (
    <div className="del-page">
      <div className="del-header">
        <h1>Transferred Students</h1>
        <div className="del-header-actions">
          {hasAnyFilter && (
            <button type="button" className="del-btn del-btn-secondary" onClick={handleClearFilters}>
              ✕ Clear Filters
            </button>
          )}
          <Link href="/students" className="del-btn del-btn-secondary">
            ← Back to Students
          </Link>
        </div>
      </div>

      <div className="del-toolbar">
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="🔍 Search transferred students by name or Student ID"
          className="del-search"
        />
        <select value={grade} onChange={(e) => { setGrade(e.target.value); setPage(1); }} className="del-filter">
          <option value="">All Grade Levels</option>
          {GRADE_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select value={section} onChange={(e) => { setSection(e.target.value); setPage(1); }} className="del-filter">
          <option value="">All Sections</option>
          {SECTION_OPTIONS.map((item) => <option key={item} value={item}>Section {item}</option>)}
        </select>
      </div>

      <div className="del-table-wrap">
        <table className="del-table">
          <thead>
            <tr>
              <th>Student ID</th>
              <th>Full Name</th>
              <th>Grade</th>
              <th>Section</th>
              <th>RFID Tag</th>
              <th>Parent</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && [...Array(5)].map((_, index) => (
              <tr key={index} className="del-skeleton-row-wrap">
                {[...Array(7)].map((__, cell) => (
                  <td key={cell}><div className="del-skeleton-cell" /></td>
                ))}
              </tr>
            ))}
            {!loading && students.length === 0 && (
              <tr><td colSpan={7}><div className="del-empty">No transferred students found.</div></td></tr>
            )}
            {!loading && students.map((student) => {
              const status = formatStatus(student.status);
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
                  <td>
                    {student.hasRfidTag
                      ? <span className="del-rfid del-rfid-has">Assigned</span>
                      : <span className="del-rfid del-rfid-none">None</span>}
                  </td>
                  <td>
                    {student.hasParentLink
                      ? <span className="del-parent del-parent-has">Linked</span>
                      : <span className="del-parent del-parent-none">No parent</span>}
                  </td>
                  <td><span className={status.cls}>{status.label}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!loading && (
        <div className="del-pagination" aria-hidden={students.length === 0}>
          <span>
            Showing {meta.total === 0 ? "0" : `${(meta.currentPage - 1) * meta.perPage + 1}`}
            –{meta.total === 0 ? "0" : `${Math.min(meta.currentPage * meta.perPage, meta.total)}`} of {meta.total}
          </span>
          <div className="del-pagination-controls">
            <button className="del-pagination-btn" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={meta.currentPage <= 1 || students.length === 0}>
              Previous
            </button>
            <button className="del-pagination-btn" onClick={() => setPage((value) => Math.min(meta.lastPage, value + 1))} disabled={meta.currentPage >= meta.lastPage || students.length === 0}>
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
