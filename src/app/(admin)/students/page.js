"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import "./students.css";

const GRADE_OPTIONS = ["Kindergarten", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6"];
const SECTION_OPTIONS = ["A", "B", "C"];

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [meta, setMeta] = useState({ currentPage: 1, lastPage: 1, total: 0, perPage: 20 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [grade, setGrade] = useState("");
  const [section, setSection] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      per_page: "20",
      ...(search ? { search } : {}),
      ...(grade ? { grade } : {}),
      ...(section ? { section } : {}),
      ...(status ? { status } : {}),
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
  }, [page, search, grade, section, status]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  useEffect(() => {
    setPage(1);
  }, [search, grade, section, status]);

  return (
    <div className="students-page">
      <div className="students-header">
        <h1>Students</h1>
        <Link href="/enrollment" className="students-btn-primary">
          + Add Student
        </Link>
      </div>

      <div className="students-toolbar">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or Student ID"
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
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      <div className="students-table-card">
        <table className="students-table">
          <thead>
            <tr>
              <th>Student ID</th>
              <th>Name</th>
              <th>Grade &amp; Section</th>
              <th>RFID Tag</th>
              <th>Parent Linked</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading &&
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  <td colSpan={7}>
                    <div className="students-skeleton-row" />
                  </td>
                </tr>
              ))}

            {!loading && students.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <div className="students-empty">
                    No students found. Try adjusting your search or filters.
                  </div>
                </td>
              </tr>
            )}

            {!loading &&
              students.map((s) => (
                <tr key={s.id}>
                  <td>{s.studentId}</td>
                  <td className="students-name">{s.fullName}</td>
                  <td>{s.gradeLevel} - {s.section}</td>
                  <td>
                    {s.hasRfidTag ? (
                      <span className="students-badge students-badge-success">🟢 Assigned</span>
                    ) : (
                      <span className="students-badge students-badge-pending">🟡 Not Assigned</span>
                    )}
                  </td>
                  <td>{s.hasParentLink ? "✓" : "—"}</td>
                  <td>
                    <span
                      className={
                        "students-badge " +
                        (s.status === "active" ? "students-badge-success" : "students-badge-neutral")
                      }
                    >
                      {s.status}
                    </span>
                  </td>
                  <td>
                    <Link href={`/students/${s.id}`} className="students-view-link">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {!loading && students.length > 0 && (
        <div className="students-pagination">
          <span>
            Showing {(meta.currentPage - 1) * meta.perPage + 1}
            –{Math.min(meta.currentPage * meta.perPage, meta.total)} of {meta.total}
          </span>
          <div className="students-pagination-controls">
            <button
              className="students-pagination-btn"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={meta.currentPage <= 1}
            >
              Previous
            </button>
            <button
              className="students-pagination-btn"
              onClick={() => setPage((p) => Math.min(meta.lastPage, p + 1))}
              disabled={meta.currentPage >= meta.lastPage}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}