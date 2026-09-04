"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import "./online-enrollment.css";

function formatRelationship(rel) {
  if (!rel) return "";
  const n = String(rel).toLowerCase();
  if (n === "mom" || n === "mother") return "Mom";
  if (n === "dad" || n === "father") return "Dad";
  if (n === "guardian") return "Guardian";
  return rel.charAt(0).toUpperCase() + rel.slice(1).toLowerCase();
}

function get(obj, path, fallback = null) {
  if (!obj || typeof obj !== "object") return fallback;
  const parts = Array.isArray(path) ? path : String(path).split(".");
  let cur = obj;
  for (const k of parts) {
    if (cur == null || typeof cur !== "object" || !(k in cur)) return fallback;
    cur = cur[k];
  }
  if (cur === undefined || cur === null || cur === "") return fallback;
  return cur;
}

function normalizeItem(raw) {
  const s = get(raw, "student") || get(raw, "student_info") || {};
  const p = get(raw, "parent") || get(raw, "parent_info") || {};
  const a = get(raw, "academic") || get(raw, "academic_info") || get(raw, "program_info") || {};

  const firstName = get(raw, "student_first_name") || get(s, ["firstName"]) || get(s, ["first_name"]) || "";
  const middleName = get(s, ["middleName"]) || get(s, ["middle_name"]) || "";
  const lastName = get(raw, "student_last_name") || get(s, ["lastName"]) || get(s, ["last_name"]) || "";
  const studentFullName =
    get(raw, "student_full_name") ||
    get(s, ["fullName"]) ||
    get(s, ["full_name"]) ||
    [firstName, middleName, lastName].filter(Boolean).join(" ").trim();

  const parentFirst = get(p, ["firstName"]) || get(p, ["first_name"]) || "";
  const parentLast = get(p, ["lastName"]) || get(p, ["last_name"]) || "";
  const parentFullName =
    get(raw, "parent_full_name") ||
    get(p, ["fullName"]) ||
    get(p, ["full_name"]) ||
    [parentFirst, parentLast].filter(Boolean).join(" ").trim();
  const parentRel = get(raw, "parent_relationship") || get(p, ["relationship"]) || "";

  const phone = get(raw, "student_phone") || get(s, ["phone"]) || get(s, ["contact_number"]) || "";
  const email = get(raw, "student_email") || get(s, ["email"]) || "";
  const address = get(raw, "student_address") || get(s, ["address"]) || get(s, ["full_address"]) || "";
  const birthDate = get(raw, "student_birth_date") || get(s, ["birthDate"]) || get(s, ["birth_date"]) || "";
  const gender = get(raw, "student_gender") || get(s, ["gender"]) || "";
  const parentEmail = get(raw, "parent_email") || get(p, ["email"]) || "";
  const parentPhone = get(raw, "parent_phone") || get(p, ["phone"]) || "";

  const grade = get(raw, "grade_level") || get(a, ["gradeLevel"]) || get(a, ["grade_level"]) || "";
  const section = get(raw, "section") || get(a, ["section"]) || "";
  const previousSchool =
    get(raw, "previous_school") ||
    get(a, ["previousSchool"]) ||
    get(a, ["previous_school"]) ||
    "";

  const files = get(raw, ["files"]) || get(raw, ["documents"]) || {};

  const submittedAt = get(raw, ["submitted_at"]) || get(raw, ["created_at"]) || "";
  const status = get(raw, ["status"]) || "pending";

  return {
    id: String(raw.id),
    studentFullName, firstName, lastName,
    phone, address, birthDate, gender, email,
    parentFullName, parentRel, parentEmail, parentPhone,
    grade, section, previousSchool,
    files,
    status,
    submittedAt,
    _raw: raw,
  };
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(+d)) return String(value).slice(0, 10);
  return d.toLocaleDateString("en-PH", { month: "short", day: "2-digit", year: "numeric" });
}

function formatDateLong(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(+d)) return String(value).slice(0, 16).replace("T", " ");
  return d.toLocaleString("en-PH", {
    month: "short", day: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const STATUS_META = {
  pending: { label: "Pending", cls: "pending" },
  reviewed: { label: "Reviewed", cls: "reviewed" },
  converted: { label: "Converted", cls: "converted" },
  rejected: { label: "Rejected", cls: "rejected" },
  cancelled: { label: "Cancelled", cls: "rejected" },
};

function hasFile(item, key) {
  const keyMap = {
    birth_certificate: [
      ["files","birth_certificate"], ["files","birthCertificate"],
      ["files","birth_certificate_url"], ["files","birth_certificate_path"],
      ["_raw","birth_certificate"], ["_raw","birth_certificate_path"],
      ["_raw","birth_certificate_url"], ["_raw","birthCertificate"],
    ],
    id_picture_1x1: [
      ["files","id_picture_1x1"], ["files","idPicture1x1"],
      ["files","id_picture_1x1_url"], ["files","id_picture_1x1_path"],
      ["files","id_picture"], ["_raw","id_picture_1x1"],
      ["_raw","id_picture_1x1_path"], ["_raw","id_picture_1x1_url"],
      ["_raw","id_picture"], ["_raw","idPicture1x1"],
    ],
  };
  const paths = keyMap[key] || [];
  return paths.some((path) => {
    const v = get(item, path);
    if (!v) return false;
    if (typeof v === "boolean") return v;
    if (typeof v === "object") return Boolean(v.url || v.name || v.path);
    if (typeof v === "string") return v.length > 0;
    return true;
  });
}

export default function OnlineEnrollmentListPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0, per_page: 20 });
  const debounceRef = useRef(null);
  const seqRef = useRef(0);

  const fetchList = useCallback(async (overrides = {}) => {
    const s = overrides.search ?? search;
    const st = overrides.status ?? status;
    const p = overrides.page ?? page;
    const my = ++seqRef.current;
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("page", String(p));
      params.set("per_page", "20");
      if (s) params.set("search", s);
      if (st !== "all") params.set("status", st);

      const res = await fetch(`/api/guest/enrollments?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (my !== seqRef.current) return;
      const list = data?.data ?? data ?? [];
      setItems(Array.isArray(list) ? list.map(normalizeItem) : []);
      const m = data?.meta || {};
      setMeta({
        current_page: Number(m.current_page ?? p),
        last_page: Number(m.last_page ?? 1),
        total: Number(m.total ?? list?.length ?? 0),
        per_page: Number(m.per_page ?? 20),
      });
    } catch {
      if (my === seqRef.current) {
        setError("Unable to load online enrollments right now.");
        setItems([]);
      }
    } finally {
      if (my === seqRef.current) setLoading(false);
    }
  }, [search, status, page]);

  useEffect(() => { fetchList(); }, [fetchList]);

  function handleSearchChange(v) {
    setSearch(v); setPage(1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchList({ search: v, page: 1 }), 300);
  }

  function handleStatusChange(v) {
    setStatus(v); setPage(1);
    fetchList({ status: v, page: 1 });
  }

  function handleClear() {
    setSearch(""); setStatus("all"); setPage(1);
    fetchList({ search: "", status: "all", page: 1 });
  }

  const total = Number(meta.total ?? 0);
  const byStatus = (st) => items.filter((x) => (x.status || "pending") === st).length;

  const Badge = ({ count, label, cls }) => (
    <div className={`oe-overview-badge oe-overview-${cls}`}>
      <div className="oe-overview-count">{count}</div>
      <div className="oe-overview-label">{label}</div>
    </div>
  );

  return (
    <div className="online-enrollment-page">
      <div className="page-header">
        <div>
          <h1>Online Enrollment</h1>
          <p className="page-title-note">Guest submissions submitted via the public /guest enrollment form.</p>
        </div>
        <Link href="/dashboard" className="oe-back-btn">
          ← Back to Dashboard
        </Link>
      </div>

      <div className="oe-overview-row">
        <Badge count={total} label="Total Submissions" cls="total" />
        <Badge count={byStatus("pending")} label="Pending" cls="pending" />
        <Badge count={byStatus("converted")} label="Converted" cls="converted" />
        <Badge count={byStatus("rejected") + byStatus("cancelled")} label="Rejected" cls="rejected" />
      </div>

      <div className="oe-card">
        <div className="oe-card-header">
          <input
            className="oe-filter-input"
            placeholder="Search by student name, parent name, email, previous school…"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
          <select
            className="oe-filter-select"
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="reviewed">Reviewed</option>
            <option value="converted">Converted</option>
            <option value="rejected">Rejected</option>
          </select>
          <button className="oe-clear-btn" onClick={handleClear}>Clear</button>
        </div>

        {error && <div className="oe-banner oe-banner-error">⚠️ {error}</div>}
        {loading && items.length === 0 && (
          <div className="oe-empty oe-loading">Loading online submissions…</div>
        )}

        {!loading && !error && (
          <div className="oe-table-wrap">
            <table className="oe-table">
              <thead>
                <tr>
                  <th style={{ width: "26%" }}>Student Information</th>
                  <th style={{ width: "20%" }}>Parent / Guardian</th>
                  <th style={{ width: "18%" }}>Academic Information</th>
                  <th style={{ width: "16%" }}>Documents</th>
                  <th style={{ width: "12%" }}>Submitted</th>
                  <th style={{ width: "8%" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="oe-empty">
                      No online enrollment submissions yet. When families submit via the /guest page, they will appear here.
                    </td>
                  </tr>
                ) : (
                  items.map((it) => {
                    const rel = formatRelationship(it.parentRel);
                    const stat = STATUS_META[it.status] || STATUS_META.pending;
                    return (
                      <tr key={it.id}>
                        <td className="oe-cell-student">
                          <Link href={`/online-enrollment/${it.id}`} className="oe-name-link">
                            {it.studentFullName || "Unnamed Student"}
                          </Link>
                          <div className="oe-meta-row">
                            {it.birthDate && (
                              <span className="oe-pill oe-pill-muted">🎂 {formatDate(it.birthDate)}</span>
                            )}
                            {it.gender && (
                              <span className="oe-pill oe-pill-muted">
                                {it.gender === "Male" ? "♂ Male" : it.gender === "Female" ? "♀ Female" : it.gender}
                              </span>
                            )}
                          </div>
                          {it.email && <div className="oe-muted">📧 {it.email}</div>}
                          {it.phone && <div className="oe-muted">📞 {it.phone}</div>}
                          {it.address && (
                            <div className="oe-muted oe-address" title={it.address}>📍 {it.address}</div>
                          )}
                        </td>
                        <td className="oe-cell-parent">
                          <div className="oe-parent-name">
                            {it.parentFullName || "—"}
                            {rel && (
                              <span className={`oe-rel-pill oe-rel-${rel.toLowerCase()}`}>
                                {rel}
                              </span>
                            )}
                          </div>
                          {it.parentEmail && <div className="oe-muted">📧 {it.parentEmail}</div>}
                          {it.parentPhone && <div className="oe-muted">📞 {it.parentPhone}</div>}
                        </td>
                        <td className="oe-cell-academic">
                          {it.grade || it.section ? (
                            <div className="oe-grade-block">
                              {it.grade && <span className="oe-pill oe-pill-grade">{it.grade}</span>}
                              {it.section && <span className="oe-pill oe-pill-section">Sec. {it.section}</span>}
                            </div>
                          ) : (
                            <div className="oe-muted">—</div>
                          )}
                          {it.previousSchool && (
                            <div className="oe-prev-school" title={it.previousSchool}>
                              <span className="oe-prev-label">Previous school:</span>{" "}
                              {it.previousSchool}
                            </div>
                          )}
                        </td>
                        <td className="oe-cell-docs">
                          <DocChip label="Birth Certificate" uploaded={hasFile(it, "birth_certificate")} />
                          <DocChip label="1x1 ID Picture" uploaded={hasFile(it, "id_picture_1x1")} />
                        </td>
                        <td className="oe-cell-date">{formatDateLong(it.submittedAt)}</td>
                        <td className="oe-cell-status">
                          <span className={`oe-status-pill oe-status-${stat.cls}`}>
                            {stat.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && items.length > 0 && meta.last_page > 1 && (
          <div className="oe-pagination">
            <button
              className="oe-page-btn"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >← Prev</button>
            <div className="oe-page-info">
              Page <strong>{meta.current_page}</strong> of {meta.last_page} · {meta.total} total
            </div>
            <button
              className="oe-page-btn"
              disabled={page >= meta.last_page}
              onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
            >Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}

function DocChip({ label, uploaded }) {
  return (
    <span className={`oe-doc-chip oe-doc-${uploaded ? "ok" : "miss"}`}>
      {uploaded ? "✅" : "⚠️"} {label}
    </span>
  );
}
