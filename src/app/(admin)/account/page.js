// src/app/(admin)/account/page.js

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import "./parents.css";

function formatRelationship(rel) {
  if (!rel) return "";
  const normalized = String(rel).toLowerCase();
  if (normalized === "mom" || normalized === "mother") return "Mom";
  if (normalized === "dad" || normalized === "father") return "Dad";
  if (normalized === "guardian") return "Guardian";
  return rel.charAt(0).toUpperCase() + rel.slice(1).toLowerCase();
}

export default function ParentDirectoryPage() {
  const [parents, setParents] = useState([]);
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
  const [resendTarget, setResendTarget] = useState(null);
  const [resending, setResending] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const fetchParents = useCallback(async (overrides = {}) => {
    const search = overrides.search ?? searchInput;
    const pageVal = overrides.page ?? page;

    const params = new URLSearchParams();
    params.set("page", String(pageVal));
    params.set("per_page", "20");
    if (search) params.set("search", search);

    const mySeq = ++requestSeqRef.current;
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/parents?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      const data = await res.json();

      if (mySeq === requestSeqRef.current) {
        setParents(data.data || []);
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
        setError("Unable to load parent accounts right now.");
      }
    } finally {
      if (mySeq === requestSeqRef.current) {
        setLoading(false);
      }
    }
  }, [searchInput, page]);

  useEffect(() => {
    fetchParents();
  }, [fetchParents]);

  function handleSearchChange(value) {
    setSearchInput(value);
    setPage(1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchParents({ search: value, page: 1 }), 300);
  }

  function handleClearFilters() {
    setSearchInput("");
    setPage(1);
    fetchParents({ search: "", page: 1 });
  }

  async function handleResendCredentials() {
    if (!resendTarget) return;
    setResending(true);
    try {
      const res = await fetch(`/api/parents/${resendTarget.id}/resend-credentials`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();

      if (!res.ok) {
        const msg = (data && (data.debug || data.message)) || "Unable to resend login information. Please try again.";
        throw new Error(msg);
      }

      setFeedback({ type: "success", message: "✅ Login information has been resent." });
    } catch (err) {
      setFeedback({
        type: "error",
        message:
          err && typeof err === "object" && "message" in err
            ? `⚠️ ${err.message}`
            : "⚠️ Unable to resend login information. Please try again.",
      });
    } finally {
      setResending(false);
      setResendTarget(null);
      setTimeout(() => setFeedback(null), 8000);
    }
  }

  return (
    <main className="parents-page">
      <div className="parents-page-header">
        <h1>Parent Directory</h1>
        <p>All parent and guardian accounts linked to enrolled students.</p>
      </div>

      {feedback && (
        <div className={`parents-feedback ${feedback.type === "success" ? "parents-feedback-success" : "parents-feedback-error"}`}>
          {feedback.message}
        </div>
      )}

      <div className="parents-card">
        <div className="parents-card-header">
          <input
            type="text"
            className="parents-filter-input parents-filter-search"
            placeholder="🔍 Search by parent name or email"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
          {searchInput && (
            <button
              type="button"
              className="parents-clear-btn"
              onClick={handleClearFilters}
            >
              Clear Filters
            </button>
          )}
        </div>

        <div className="parents-table-container">
          <table className="parents-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Relationship</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Linked Student(s)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="parents-empty-state">Loading parent accounts...</td></tr>
              ) : error ? (
                <tr><td colSpan={6} className="parents-empty-state parents-error-text">{error}</td></tr>
              ) : parents.length === 0 ? (
                <tr><td colSpan={6} className="parents-empty-state">No parent accounts found.</td></tr>
              ) : (
                parents.map((p) => {
                  const rel = formatRelationship(p.relationship || "");
                  const displayName = rel ? `${p.name || "—"} (${rel})` : (p.name || "—");
                  return (
                  <tr key={p.id}>
                    <td>
                      <Link href={`/account/${p.id}`} className="parents-name-link">
                        {displayName}
                      </Link>
                    </td>
                    <td>
                      {rel ? (
                        <span className={`parents-relationship-pill parents-relationship-${rel.toLowerCase()}`}>
                          {rel}
                        </span>
                      ) : (
                        <span className="parents-no-children">—</span>
                      )}
                    </td>
                    <td>{p.email || "—"}</td>
                    <td>{p.phone || "—"}</td>
                    <td>
                      {p.children.length === 0 ? (
                        <span className="parents-no-children">No linked students</span>
                      ) : (
                        <div className="parents-children-list">
                          {p.children.map((c) => {
                            const statusClass =
                              c.status === "deleted"
                                ? "parents-child-pill-deleted"
                                : c.status === "inactive"
                                ? "parents-child-pill-inactive"
                                : "";
                            const statusLabel =
                              c.status === "deleted"
                                ? " (Deleted)"
                                : c.status === "inactive"
                                ? " (Inactive)"
                                : "";
                            const statusLabelClass =
                              c.status === "deleted"
                                ? "parents-child-deleted-label"
                                : c.status === "inactive"
                                ? "parents-child-inactive-label"
                                : "";
                            return (
                              <Link
                                key={c.id}
                                href={`/students/${c.id}`}
                                className={`parents-child-pill ${statusClass}`}
                              >
                                {c.name}
                                {statusLabel !== "" && (
                                  <span className={statusLabelClass}>{statusLabel}</span>
                                )}
                              </Link>
                            );
                          })}
                        </div>
                      )}
                    </td>
                    <td>
                      <button
                        className="parents-resend-btn"
                        onClick={() => setResendTarget({ id: p.id, name: p.name, email: p.email })}
                      >
                        Resend Credentials
                      </button>
                    </td>
                  </tr>
                );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="parents-pagination">
          <div className="parents-pagination-info">
            Showing {meta.from ?? 0}–{meta.to ?? 0} of {meta.total ?? 0}
          </div>
          <div className="parents-pagination-buttons">
            <button
              type="button"
              className="parents-pagination-btn"
              disabled={page <= 1 || loading}
              onClick={() => {
                const next = Math.max(1, page - 1);
                setPage(next);
                fetchParents({ page: next });
              }}
            >
              Previous
            </button>
            <button
              type="button"
              className="parents-pagination-btn"
              disabled={page >= (meta.last_page || 1) || loading}
              onClick={() => {
                const next = Math.min(meta.last_page || 1, page + 1);
                setPage(next);
                fetchParents({ page: next });
              }}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {resendTarget && (
        <div className="parents-modal-overlay">
          <div className="parents-modal">
            <h3>Resend Login Information?</h3>
            <p>This will send a new email with login details to {resendTarget.email}.</p>
            <div className="parents-modal-actions">
              <button
                className="parents-modal-btn-cancel"
                onClick={() => setResendTarget(null)}
                disabled={resending}
              >
                Cancel
              </button>
              <button
                className="parents-modal-btn-confirm"
                onClick={handleResendCredentials}
                disabled={resending}
              >
                {resending ? "Resending…" : "Resend"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}