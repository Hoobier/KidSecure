"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import "./parents.css";

export default function ParentDirectoryPage() {
  const [parents, setParents] = useState([]);
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const debounceRef = useRef(null);
  const [resendTarget, setResendTarget] = useState(null); // { id, name, email }
  const [resending, setResending] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message }

  const fetchParents = useCallback(async (search = "") => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await fetch(`/api/parents?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setParents(data.data || []);
    } catch {
      setError("Unable to load parent accounts right now.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchParents();
  }, [fetchParents]);

  function handleSearchChange(value) {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchParents(value), 300);
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

      if (!res.ok) throw new Error(data.message || "Failed");

      setFeedback({ type: "success", message: "✅ Login information has been resent." });
    } catch {
      setFeedback({ type: "error", message: "⚠️ Unable to resend login information. Please try again." });
    } finally {
      setResending(false);
      setResendTarget(null);
      setTimeout(() => setFeedback(null), 5000);
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
            className="parents-filter-input"
            placeholder="🔍 Search by parent name or email"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>

        <div className="parents-table-container">
          <table className="parents-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Linked Student(s)</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="parents-empty-state">Loading parent accounts...</td></tr>
              ) : error ? (
                <tr><td colSpan={5} className="parents-empty-state parents-error-text">{error}</td></tr>
              ) : parents.length === 0 ? (
                <tr><td colSpan={5} className="parents-empty-state">No parent accounts found.</td></tr>
              ) : (
                parents.map((p) => (
                  <tr key={p.id}>
                    <td>{p.name || "—"}</td>
                    <td>{p.email || "—"}</td>
                    <td>{p.phone || "—"}</td>
                    <td>
                      {p.children.length === 0 ? (
                        <span className="parents-no-children">No linked students</span>
                      ) : (
                        <div className="parents-children-list">
                          {p.children.map((c) => (
                            <Link
                              key={c.id}
                              href={`/students/${c.id}`}
                              className={`parents-child-pill ${c.status !== "active" ? "parents-child-pill-inactive" : ""}`}
                            >
                              {c.name}
                              {c.status !== "active" && <span className="parents-child-inactive-label"> (Inactive)</span>}
                            </Link>
                          ))}
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
                ))
              )}
            </tbody>
          </table>
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