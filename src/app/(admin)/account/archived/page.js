"use client";
// src/app/(admin)/account/archived/page.js
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import "./archived-parents.css";

function formatRelationship(rel) {
  if (!rel) return "";
  const normalized = String(rel).toLowerCase();
  if (normalized === "mom" || normalized === "mother") return "Mom";
  if (normalized === "dad" || normalized === "father") return "Dad";
  if (normalized === "guardian") return "Guardian";
  return rel.charAt(0).toUpperCase() + rel.slice(1).toLowerCase();
}

export default function ArchivedParentsPage() {
  const [parents, setParents] = useState([]);
  const [meta, setMeta] = useState({
    current_page: 1, from: 0, to: 0, total: 0, per_page: 20, last_page: 1,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState(null);

  const fetchParents = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      per_page: "20",
      status: "archived",
      ...(search ? { search } : {}),
    });

    try {
      const res = await fetch(`/api/parents?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load archived parents");
      const data = await res.json();
      setParents(data.data || []);
      setMeta((m) => ({ ...m, ...(data.meta || {}) }));
    } catch {
      setParents([]);
      setNotice({ type: "error", message: "Unable to load archived parent accounts right now." });
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchParents();
  }, [fetchParents]);

  return (
    <div className="archp-page">
      <div className="archp-header">
        <h1>Archived Parents</h1>
        <div className="archp-header-actions">
          <Link href="/account" className="archp-btn archp-btn-secondary">
            ← Back to Parent Directory
          </Link>
        </div>
      </div>

      {notice && (
        <div className={`archp-notice archp-notice-${notice.type}`}>
          {notice.message}
        </div>
      )}

      <div className="archp-toolbar">
        <input
          type="text"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="🔍 Search archived parents by name or email"
          className="archp-search"
        />
      </div>

      <div className="archp-table-wrap">
        <table className="archp-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Linked Student(s)</th>
              <th>Archived On</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={6} className="archp-empty">Loading archived parent accounts...</td></tr>}
            {!loading && parents.length === 0 && (
              <tr><td colSpan={6} className="archp-empty">No archived parent accounts found.</td></tr>
            )}
            {!loading && parents.map((p) => {
              const rel = formatRelationship(p.relationship || "");
              const displayName = rel ? `${p.name || "—"} (${rel})` : (p.name || "—");
              return (
                <tr key={p.id}>
                  <td>
                    <Link href={`/account/${p.id}`} className="archp-name-link">
                      {displayName}
                    </Link>
                  </td>
                  <td>{p.email || "—"}</td>
                  <td>{p.phone || "—"}</td>
                  <td>
                    {(!p.children || p.children.length === 0) ? (
                      <span className="archp-no-children">No linked students</span>
                    ) : (
                      <div className="archp-children-list">
                        {p.children.map((c) => (
                          <Link
                            key={c.id}
                            href={`/students/${c.id}`}
                            className="archp-child-pill"
                          >
                            {c.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </td>
                  <td>
                    {p.archivedAt
                      ? new Date(p.archivedAt).toLocaleDateString()
                      : "—"}
                  </td>
                  <td>
                    <Link
                      href={`/account/${p.id}`}
                      className="archp-btn archp-btn-small archp-btn-secondary"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {!loading && (
        <div className="archp-pagination">
          <span>Showing {meta.from ?? 0}–{meta.to ?? 0} of {meta.total ?? 0}</span>
          <div className="archp-pagination-controls">
            <button
              className="archp-pagination-btn"
              onClick={() => setPage((v) => Math.max(1, v - 1))}
              disabled={page <= 1 || loading}
            >
              Previous
            </button>
            <button
              className="archp-pagination-btn"
              onClick={() => setPage((v) => Math.min(meta.last_page || 1, v + 1))}
              disabled={page >= (meta.last_page || 1) || loading}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}