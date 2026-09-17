"use client";
// src/app/(admin)/teachers/deleted/page.js
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import "../teachers.css";

export default function DeletedTeachersPage() {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/teachers?status=deleted`, { credentials: "include" });
      const json = await res.json();
      setTeachers(json.data || []);
    } catch {
      setTeachers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTeachers(); }, [fetchTeachers]);
  useEffect(() => { setSelectedIds(new Set()); }, [teachers]);

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

  async function handleRestore() {
    if (selectedIds.size === 0 || busy) return;
    setBusy(true);
    let ok = 0, fail = 0;
    for (const id of Array.from(selectedIds)) {
      try {
        const res = await fetch(`/api/teachers/${id}/restore`, { method: "POST", credentials: "include" });
        if (res.ok) ok++; else fail++;
      } catch { fail++; }
    }
    setSelectedIds(new Set());
    setBusy(false);
    setNotice({
      type: fail === 0 ? "success" : "error",
      message: fail === 0 ? `${ok} restored.` : `${ok} restored, ${fail} failed.`,
    });
    fetchTeachers();
    setTimeout(() => setNotice(null), 5000);
  }

  return (
    <div className="teachers-page">
      <div className="teachers-header">
        <h1>Deleted Teachers</h1>
        <div className="teachers-header-actions">
          <Link href="/teachers" className="teachers-btn-primary teachers-btn-secondary">← Back to Teachers</Link>
          {selectedIds.size > 0 && (
            <button className="teachers-btn-primary" onClick={handleRestore} disabled={busy}>
              {busy ? "Restoring…" : `↺ Restore (${selectedIds.size})`}
            </button>
          )}
        </div>
      </div>

      {notice && <div className={`teachers-notice teachers-notice-${notice.type}`}>{notice.message}</div>}

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
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={4}><div className="teachers-empty">Loading…</div></td></tr>}
            {!loading && teachers.length === 0 && (
              <tr><td colSpan={4}><div className="teachers-empty">No deleted teachers.</div></td></tr>
            )}
            {!loading && teachers.map((t) => (
              <tr key={t.id} className={selectedIds.has(t.id) ? "teachers-row-selected" : ""}>
                <td className="teachers-check-col">
                  <input type="checkbox" checked={selectedIds.has(t.id)} onChange={() => toggleSelect(t.id)} />
                </td>
                <td><Link href={`/teachers/${t.id}`} className="teachers-name-link">{t.fullName}</Link></td>
                <td>{t.email}</td>
                <td style={{ textTransform: "capitalize" }}>{t.department}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}