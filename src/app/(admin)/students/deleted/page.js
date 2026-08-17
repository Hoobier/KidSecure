"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import "./deleted-students.css";

const GRADE_OPTIONS = [
  "Kindergarten",
  "Grade 1",
  "Grade 2",
  "Grade 3",
  "Grade 4",
  "Grade 5",
  "Grade 6",
];
const SECTION_OPTIONS = ["A", "B", "C"];

function formatStatus(status) {
  if (!status) return "Unknown";
  const map = {
    deleted: { label: "Deleted", cls: "del-status-pill del-status-deleted" },
    inactive: { label: "Inactive", cls: "del-status-pill del-status-inactive" },
    active: { label: "Active", cls: "del-status-pill del-status-active" },
  };
  const info = map[status] || {
    label: status.charAt(0).toUpperCase() + status.slice(1),
    cls: "del-status-pill",
  };
  return info;
}

export default function DeletedStudentsPage() {
  const [students, setStudents] = useState([]);
  const [meta, setMeta] = useState({
    currentPage: 1,
    lastPage: 1,
    total: 0,
    perPage: 20,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [grade, setGrade] = useState("");
  const [section, setSection] = useState("");
  const [status, setStatus] = useState("deleted");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [restoring, setRestoring] = useState(false);
  const [notice, setNotice] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const selectedStudents = students.filter((s) => selectedIds.has(s.id));
  const singleSelected =
    selectedStudents.length === 1 ? selectedStudents[0] : null;

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      per_page: "20",
      ...(status ? { status } : {}),
      ...(search ? { search } : {}),
      ...(grade ? { grade } : {}),
      ...(section ? { section } : {}),
    });

    try {
      const res = await fetch(`/api/students?${params}`, {
        credentials: "include",
      });

      if (!res.ok) {
        const body = await res.text();
        console.error(
          `Failed to load deleted students — status ${res.status}:`,
          body
        );
        throw new Error("Failed to load deleted students");
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

  useEffect(() => {
    setSelectedIds(new Set());
  }, [students]);

  const hasAnyFilter = Boolean(search || grade || section || (status && status !== "deleted"));

  function handleClearFilters() {
    setSearch("");
    setGrade("");
    setSection("");
    setStatus("deleted");
    setPage(1);
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

  function requestRestoreSelected() {
    if (selectedIds.size === 0 || restoring) return;
    setConfirmOpen(true);
  }

  function handleCancelRestore() {
    if (restoring) return;
    setConfirmOpen(false);
  }

  async function handleConfirmRestore() {
    if (selectedIds.size === 0 || restoring) return;
    const snapshotCount = selectedIds.size;
    setRestoring(true);
    setNotice(null);
    let successCount = 0;
    let failedCount = 0;
    const failureMessages = [];

    const ids = Array.from(selectedIds);
    for (const id of ids) {
      try {
        const res = await fetch(`/api/students/${id}/restore`, {
          method: "POST",
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
            const label = student
              ? student.fullName || student.studentId
              : `#${id}`;
            failureMessages.push(`${label}: ${payload.message}`);
          }
        }
      } catch {
        failedCount++;
      }
    }

    setSelectedIds(new Set());
    setConfirmOpen(false);
    setRestoring(false);

    if (successCount > 0 && failedCount === 0) {
      setNotice({
        type: "success",
        message:
          snapshotCount === 1
            ? "Student restored to Students list."
            : `${successCount} students restored to Students list.`,
      });
    } else if (successCount > 0) {
      setNotice({
        type: "error",
        message: `${successCount} restored, ${failedCount} failed.${
          failureMessages.length > 0 ? " " + failureMessages[0] : ""
        }`,
      });
    } else {
      setNotice({
        type: "error",
        message:
          failureMessages.length > 0
            ? `Failed to restore. ${failureMessages[0]}`
            : "Failed to restore selected students. Please try again.",
      });
    }

    fetchStudents();
    setTimeout(() => setNotice(null), 5000);
  }

  return (
    <div className="del-page">
      <div className="del-header">
        <h1>Deleted Students</h1>
        <div className="del-header-actions">
          {hasAnyFilter && (
            <button
              type="button"
              className="del-btn del-btn-secondary"
              onClick={handleClearFilters}
            >
              ✕ Clear Filters
            </button>
          )}
          <Link href="/students" className="del-btn del-btn-secondary">
            ← Back to Students
          </Link>
          {selectedIds.size > 0 && (
            <button
              type="button"
              className="del-btn del-btn-restore"
              onClick={requestRestoreSelected}
              disabled={restoring}
            >
              {restoring
                ? "Restoring..."
                : selectedIds.size === 1
                  ? "↻ Restore Student"
                  : `↻ Restore (${selectedIds.size})`}
            </button>
          )}
        </div>
      </div>

      {notice && (
        <div className={`del-notice del-notice-${notice.type}`}>
          {notice.message}
        </div>
      )}

      <div className="del-toolbar">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Search deleted students by name or Student ID"
          className="del-search"
        />
        <select
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
          className="del-filter"
        >
          <option value="">All Grade Levels</option>
          {GRADE_OPTIONS.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        <select
          value={section}
          onChange={(e) => setSection(e.target.value)}
          className="del-filter"
        >
          <option value="">All Sections</option>
          {SECTION_OPTIONS.map((s) => (
            <option key={s} value={s}>
              Section {s}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="del-filter"
        >
          <option value="deleted">Deleted (default)</option>
        </select>
      </div>

      <div className="del-table-wrap">
        <table className="del-table">
          <thead>
            <tr>
              <th className="del-check-col">
                <input
                  type="checkbox"
                  checked={
                    students.length > 0 &&
                    selectedIds.size === students.length
                  }
                  onChange={toggleSelectAll}
                  disabled={students.length === 0 || loading}
                />
              </th>
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
            {loading &&
              [...Array(5)].map((_, i) => (
                <tr key={i} className="del-skeleton-row-wrap">
                  <td className="del-check-col">
                    <div className="del-skeleton-cell del-skeleton-check" />
                  </td>
                  <td>
                    <div className="del-skeleton-cell" />
                  </td>
                  <td>
                    <div className="del-skeleton-cell" />
                  </td>
                  <td>
                    <div className="del-skeleton-cell" />
                  </td>
                  <td>
                    <div className="del-skeleton-cell" />
                  </td>
                  <td>
                    <div className="del-skeleton-cell" />
                  </td>
                  <td>
                    <div className="del-skeleton-cell" />
                  </td>
                  <td>
                    <div className="del-skeleton-cell" />
                  </td>
                </tr>
              ))}

            {!loading && students.length === 0 && (
              <tr>
                <td colSpan={8}>
                  <div className="del-empty">
                    No deleted students. Use Filters or the Students list to
                    soft-delete students here.
                  </div>
                </td>
              </tr>
            )}

            {!loading &&
              students.map((student) => {
                const info = formatStatus(student.status);
                const isSelected = selectedIds.has(student.id);
                return (
                  <tr
                    key={student.id}
                    className={isSelected ? "del-row-selected" : ""}
                  >
                    <td className="del-check-col">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(student.id)}
                      />
                    </td>
                    <td>{student.studentId || "—"}</td>
                    <td>{student.fullName || "—"}</td>
                    <td>{student.gradeLevel || "—"}</td>
                    <td>{student.section || "—"}</td>
                    <td>
                      {student.hasRfidTag ? (
                        <span className="del-rfid del-rfid-has">Assigned</span>
                      ) : (
                        <span className="del-rfid del-rfid-none">None</span>
                      )}
                    </td>
                    <td>
                      {student.hasParentLink ? (
                        <span className="del-parent del-parent-has">
                          Linked
                        </span>
                      ) : (
                        <span className="del-parent del-parent-none">
                          No parent
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={info.cls}>{info.label}</span>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {!loading && (
        <div
          className="del-pagination"
          aria-hidden={students.length === 0}
        >
          <span>
            Showing{" "}
            {meta.total === 0
              ? "0"
              : `${(meta.currentPage - 1) * meta.perPage + 1}`}
            –
            {meta.total === 0
              ? "0"
              : `${Math.min(meta.currentPage * meta.perPage, meta.total)}`}{" "}
            of {meta.total}
          </span>
          <div className="del-pagination-controls">
            <button
              className="del-pagination-btn"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={
                meta.currentPage <= 1 ||
                students.length === 0 ||
                loading
              }
            >
              Previous
            </button>
            <button
              className="del-pagination-btn"
              onClick={() =>
                setPage((p) => Math.min(meta.lastPage, p + 1))
              }
              disabled={
                meta.currentPage >= meta.lastPage ||
                students.length === 0 ||
                loading
              }
            >
              Next
            </button>
          </div>
        </div>
      )}

      {confirmOpen && (
        <div className="del-modal-overlay">
          <div className="del-modal">
            <h3>
              {selectedIds.size === 1
                ? "Restore this student?"
                : `Restore ${selectedIds.size} students?`}
            </h3>
            <p>
              {singleSelected ? (
                <>
                  This will move{" "}
                  <strong>{singleSelected.fullName}</strong> back to the
                  Students list with their original records intact.
                </>
              ) : (
                <>
                  This will move the {selectedIds.size} selected students
                  back to the Students list with their original records
                  intact.
                </>
              )}
            </p>
            <div className="del-modal-actions">
              <button
                type="button"
                className="del-modal-btn del-modal-btn-cancel"
                onClick={handleCancelRestore}
                disabled={restoring}
              >
                Cancel
              </button>
              <button
                type="button"
                className="del-modal-btn del-modal-btn-restore"
                onClick={handleConfirmRestore}
                disabled={restoring}
              >
                {restoring ? "Restoring..." : "Restore"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
