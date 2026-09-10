"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import "./deleted-parents.css";

function formatBlockingStudent(student) {
  if (typeof student === "string") return student;
  const name = student.name || student.fullName || student.full_name || "Unnamed student";
  const grade = student.gradeLevel || student.grade || student.gradeSection;
  return grade ? `${name} (${grade})` : name;
}

function renderChildren(children) {
  if (!children || children.length === 0) {
    return <span className="delp-no-children">No linked students</span>;
  }

  return (
    <div className="delp-children-list">
      {children.map((child) => {
        const statusClass =
          child.status === "deleted"
            ? "delp-child-pill-deleted"
            : child.status === "graduated"
              ? "delp-child-pill-graduated"
              : child.status === "inactive"
                ? "delp-child-pill-inactive"
                : "";
        const statusLabel =
          child.status === "deleted"
            ? " (Deleted)"
            : child.status === "graduated"
              ? " (Graduated)"
              : child.status === "inactive"
                ? " (Inactive)"
                : "";
        const statusLabelClass =
          child.status === "deleted"
            ? "delp-child-deleted-label"
            : child.status === "graduated"
              ? "delp-child-graduated-label"
              : child.status === "inactive"
                ? "delp-child-inactive-label"
                : "";

        return (
          <Link
            key={child.id}
            href={`/students/${child.id}`}
            className={`delp-child-pill ${statusClass}`}
          >
            {child.name}
            {statusLabel && <span className={statusLabelClass}>{statusLabel}</span>}
          </Link>
        );
      })}
    </div>
  );
}

export default function DeletedParentsPage() {
  const [parents, setParents] = useState([]);
  const [meta, setMeta] = useState({
    current_page: 1,
    from: 0,
    to: 0,
    total: 0,
    per_page: 20,
    last_page: 1,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [restoreTarget, setRestoreTarget] = useState(null);
  const [restoring, setRestoring] = useState(false);
  const [permanentTarget, setPermanentTarget] = useState(null);
  const [permanentConfirmText, setPermanentConfirmText] = useState("");
  const [permanentDeleting, setPermanentDeleting] = useState(false);
  const [notice, setNotice] = useState(null);

  const fetchParents = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      per_page: "20",
      status: "deleted",
      ...(search ? { search } : {}),
    });

    try {
      const res = await fetch(`/api/parents?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load deleted parents");
      const data = await res.json();
      setParents(data.data || []);
      setMeta((currentMeta) => ({ ...currentMeta, ...(data.meta || {}) }));
    } catch {
      setParents([]);
      setNotice({ type: "error", message: "Unable to load deleted parent accounts right now." });
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    const timer = setTimeout(fetchParents, 0);
    return () => clearTimeout(timer);
  }, [fetchParents]);

  async function handleRestore() {
    if (!restoreTarget || restoring) return;
    setRestoring(true);
    try {
      const res = await fetch(`/api/parents/${restoreTarget.id}/restore`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Unable to restore this parent account.");
      setNotice({ type: "success", message: "Parent account restored to the Parent Directory." });
      fetchParents();
    } catch (error) {
      setNotice({ type: "error", message: error.message || "Unable to restore this parent account." });
    } finally {
      setRestoring(false);
      setRestoreTarget(null);
      setTimeout(() => setNotice(null), 5000);
    }
  }

  async function handlePermanentDelete() {
    if (!permanentTarget || permanentDeleting) return;
    setPermanentDeleting(true);
    try {
      const res = await fetch(`/api/parents/${permanentTarget.id}/permanent`, {
        method: "DELETE",
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      const data = await res.json();

      if (res.status === 409 && Array.isArray(data.blockingStudents)) {
        const linkedStudents = data.blockingStudents.map(formatBlockingStudent).join(", ");
        setNotice({
          type: "error",
          message: `Unable to delete this account. ${permanentTarget.name} is still linked to: ${linkedStudents}. Please unlink or reassign these students first.`,
        });
        return;
      }

      if (!res.ok) throw new Error(data.message || "Unable to permanently delete this account.");
      setNotice({ type: "success", message: "Parent account was permanently deleted." });
      fetchParents();
    } catch (error) {
      setNotice({ type: "error", message: error.message || "Unable to permanently delete this account." });
    } finally {
      setPermanentDeleting(false);
      setPermanentTarget(null);
      setPermanentConfirmText("");
      setTimeout(() => setNotice(null), 8000);
    }
  }

  return (
    <div className="delp-page">
      <div className="delp-header">
        <h1>Deleted Parents</h1>
        <div className="delp-header-actions">
          <Link href="/account" className="delp-btn delp-btn-secondary">
            ← Back to Parent Directory
          </Link>
        </div>
      </div>

      {notice && <div className={`delp-notice delp-notice-${notice.type}`}>{notice.message}</div>}

      <div className="delp-toolbar">
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="🔍 Search deleted parents by name or email"
          className="delp-search"
        />
      </div>

      <div className="delp-table-wrap">
        <table className="delp-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Linked Student(s)</th>
              <th>Deleted On</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="delp-empty">Loading deleted parent accounts...</td></tr>}
            {!loading && parents.length === 0 && (
              <tr><td colSpan={6} className="delp-empty">No deleted parent accounts found.</td></tr>
            )}
            {!loading && parents.map((parent) => (
              <tr key={parent.id}>
                <td>{parent.name || "—"}</td>
                <td>{parent.email || "—"}</td>
                <td>{parent.phone || "—"}</td>
                <td>{renderChildren(parent.children)}</td>
                <td>{parent.deletedAt || "—"}</td>
                <td>
                  <div className="delp-row-actions">
                    <button
                      type="button"
                      className="delp-btn delp-btn-restore"
                      onClick={() => setRestoreTarget({ id: parent.id, name: parent.name })}
                      disabled={restoring || permanentDeleting}
                    >
                      ↻ Restore
                    </button>
                    <button
                      type="button"
                      className="delp-btn delp-btn-danger"
                      onClick={() => {
                        setPermanentTarget({ id: parent.id, name: parent.name });
                        setPermanentConfirmText("");
                      }}
                      disabled={restoring || permanentDeleting}
                    >
                      🗑 Permanently Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && (
        <div className="delp-pagination">
          <span>Showing {meta.from ?? 0}–{meta.to ?? 0} of {meta.total ?? 0}</span>
          <div className="delp-pagination-controls">
            <button className="delp-pagination-btn" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1 || loading}>Previous</button>
            <button className="delp-pagination-btn" onClick={() => setPage((value) => Math.min(meta.last_page || 1, value + 1))} disabled={page >= (meta.last_page || 1) || loading}>Next</button>
          </div>
        </div>
      )}

      {restoreTarget && (
        <div className="delp-modal-overlay">
          <div className="delp-modal">
            <h3>Restore this parent account?</h3>
            <p>
              This will restore {restoreTarget.name}&apos;s account and re-enable their login, unless they&apos;re still frozen due to a graduated sibling policy.
            </p>
            <div className="delp-modal-actions">
              <button className="delp-modal-btn delp-modal-btn-cancel" onClick={() => setRestoreTarget(null)} disabled={restoring}>Cancel</button>
              <button className="delp-modal-btn delp-modal-btn-restore" onClick={handleRestore} disabled={restoring}>{restoring ? "Restoring..." : "Restore"}</button>
            </div>
          </div>
        </div>
      )}

      {permanentTarget && (
        <div className="delp-modal-overlay">
          <div className="delp-modal">
            <h3>Permanently delete this parent account?</h3>
            <p>This will permanently remove {permanentTarget.name}&apos;s account and cannot be undone.</p>
            <input
              type="text"
              className="delp-confirm-input"
              placeholder={`Type ${permanentTarget.name} to confirm`}
              value={permanentConfirmText}
              onChange={(e) => setPermanentConfirmText(e.target.value)}
            />
            <div className="delp-modal-actions">
              <button className="delp-modal-btn delp-modal-btn-cancel" onClick={() => { setPermanentTarget(null); setPermanentConfirmText(""); }} disabled={permanentDeleting}>Cancel</button>
              <button
                className="delp-modal-btn delp-modal-btn-danger"
                onClick={handlePermanentDelete}
                disabled={permanentDeleting || permanentConfirmText.trim() !== permanentTarget.name.trim()}
              >
                {permanentDeleting ? "Deleting..." : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}