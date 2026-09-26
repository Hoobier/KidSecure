"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import "./teachers.css";

// src/app/(admin)/teachers/page.js

export default function TeachersPage() {
  const [teachers, setTeachers] = useState([]);
  const [meta, setMeta] = useState({ total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("");
  const [status, setStatus] = useState("active");

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const selectedTeachers = teachers.filter((t) => selectedIds.has(t.id));
  const singleSelected = selectedTeachers.length === 1 ? selectedTeachers[0] : null;

  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      ...(search ? { search } : {}),
      ...(department ? { department } : {}),
      ...(status ? { status } : {}),
    });

    try {
      const res = await fetch(`/api/teachers?${params}`, { credentials: "include" });
      const raw = await res.text();
      let json = {};
      try { json = JSON.parse(raw); } catch { /* not JSON */ }
      if (!res.ok) {
        console.error(`/api/teachers returned ${res.status}:`, raw);
        throw new Error(json.message || `HTTP ${res.status}`);
      }
      setTeachers(json.data || []);
      setMeta(json.meta || { total: 0 });
    } catch (err) {
      console.error(err);
      setTeachers([]);
    } finally {
      setLoading(false);
    }
  }, [search, department, status]);

  useEffect(() => { fetchTeachers(); }, [fetchTeachers]);
  useEffect(() => { setSelectedIds(new Set()); }, [teachers]);

  const hasAnyFilter = Boolean(search || department);

  function handleClearFilters() {
    setSearch("");
    setDepartment("");
    setStatus("active");
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
    if (selectedIds.size === teachers.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(teachers.map((t) => t.id)));
  }

  function requestDeleteSelected() {
    if (selectedIds.size === 0 || deleting) return;
    setConfirmOpen(true);
  }

  async function handleConfirmDelete() {
    if (selectedIds.size === 0 || deleting) return;
    const snapshotCount = selectedIds.size;
    setDeleting(true);
    setNotice(null);

    let successCount = 0;
    let failedCount = 0;

    for (const id of Array.from(selectedIds)) {
      try {
        const res = await fetch(`/api/teachers/${id}/delete`, {
          method: "POST",
          credentials: "include",
          headers: { Accept: "application/json" },
        });
        if (res.ok) successCount++;
        else failedCount++;
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
          ? "Teacher moved to Deleted Teachers."
          : `${successCount} teachers moved to Deleted Teachers.`,
      });
    } else if (successCount > 0) {
      setNotice({ type: "error", message: `${successCount} deleted, ${failedCount} failed.` });
    } else {
      setNotice({ type: "error", message: "Failed to delete selected teachers. Please try again." });
    }

    fetchTeachers();
    setTimeout(() => setNotice(null), 5000);
  }

  return (
    <div className="teachers-page">
      <div className="teachers-header">
        <h1>Teachers</h1>
        <div className="teachers-header-actions">
          {hasAnyFilter && (
            <button type="button" className="teachers-btn-primary teachers-btn-secondary" onClick={handleClearFilters}>
              ✕ Clear Filters
            </button>
          )}
          <Link href="/teachers/deleted" className="teachers-btn-primary teachers-btn-secondary">
            🗑 Deleted Teachers
          </Link>
          {selectedIds.size > 0 && (
            <button
              type="button"
              className="teachers-btn-primary teachers-btn-danger"
              onClick={requestDeleteSelected}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : selectedIds.size === 1 ? "🗑 Delete Teacher" : `🗑 Delete (${selectedIds.size})`}
            </button>
          )}
          <Link href="/teachers/create" className="teachers-btn-primary">
            + Add Teacher
          </Link>
        </div>
      </div>

      {notice && (
        <div className={`teachers-notice teachers-notice-${notice.type}`}>{notice.message}</div>
      )}

      <div className="teachers-toolbar">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Search by name or email"
          className="teachers-search"
        />
        <select value={department} onChange={(e) => setDepartment(e.target.value)} className="teachers-filter">
          <option value="">All Departments</option>
          <option value="elementary">Elementary</option>
          <option value="preschool">Preschool</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="teachers-filter">
          <option value="active">Active</option>
          <option value="deleted">Deleted</option>
        </select>
      </div>

      <div className="teachers-table-card">
        <table className="teachers-table">
          <thead>
            <tr>
              <th className="teachers-check-col">
                <input
                  type="checkbox"
                  checked={!loading && teachers.length > 0 && selectedIds.size === teachers.length}
                  onChange={toggleSelectAll}
                  disabled={loading || teachers.length === 0}
                />
              </th>
              <th>Name</th>
              <th>Email</th>
              <th>Department</th>
              <th>Home Classes</th>
              <th>Visiting Classes</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7}>
                  <div className="teachers-empty">Loading…</div>
                </td>
              </tr>
            )}
            {!loading && teachers.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <div className="teachers-empty">No teachers found.</div>
                </td>
              </tr>
            )}
            {!loading &&
              teachers.map((t) => (
                <tr key={t.id} className={selectedIds.has(t.id) ? "teachers-row-selected" : ""}>
                  <td className="teachers-check-col">
                    <input type="checkbox" checked={selectedIds.has(t.id)} onChange={() => toggleSelect(t.id)} />
                  </td>
                  <td>
                    <Link href={`/teachers/${t.id}`} className="teachers-name-link">
                      {t.fullName || "—"}
                    </Link>
                  </td>
                  <td>{t.email || "—"}</td>
                  <td style={{ textTransform: "capitalize" }}>{t.department || "—"}</td>
                  <td>{t.homeAssignmentsCount ?? 0}</td>
                  <td>{t.visitingAssignmentsCount ?? 0}</td>
                  <td>
                    <span className={`teachers-status teachers-status-${t.status || "active"}`}>
                      {t.status === "deleted" ? "Deleted" : "Active"}
                    </span>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {confirmOpen && (
        <div className="teachers-modal-overlay">
          <div className="teachers-modal">
            <h3>
              {selectedIds.size === 1 ? "Delete this teacher?" : `Delete ${selectedIds.size} teachers?`}
            </h3>
            <p>
              {singleSelected ? (
                <>This will move <strong>{singleSelected.fullName}</strong> to Deleted Teachers. Their class assignments are kept and the record can be restored later.</>
              ) : (
                <>This will move the {selectedIds.size} selected teachers to Deleted Teachers. Their class assignments are kept and records can be restored later.</>
              )}
            </p>
            <div className="teachers-modal-actions">
              <button
                type="button"
                className="teachers-modal-btn teachers-modal-btn-cancel"
                onClick={() => setConfirmOpen(false)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="teachers-modal-btn teachers-modal-btn-danger"
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