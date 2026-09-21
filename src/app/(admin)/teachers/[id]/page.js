"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "./teacher-detail.css";

// src/app/(admin)/teachers/[id]/page.js

export default function TeacherDetailPage({ params }) {
  const { id } = use(params);
  const router = useRouter();

  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    async function fetchTeacher() {
      setLoading(true);
      try {
        const res = await fetch(`/api/teachers/${id}`, { credentials: "include" });
        if (!res.ok) throw new Error("not found");
        const json = await res.json();
        setTeacher(json.data);
      } catch {
        setTeacher(null);
      } finally {
        setLoading(false);
      }
    }
    fetchTeacher();
  }, [id]);

  async function handleSoftDelete() {
    setBusy(true);
    setShowDeleteConfirm(false);
    try {
      const res = await fetch(`/api/teachers/${id}/delete`, { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error();
      setTeacher((prev) => ({ ...prev, status: "deleted" }));
      setFeedback({ type: "success", message: "✅ Teacher deactivated." });
    } catch {
      setFeedback({ type: "error", message: "⚠️ Unable to deactivate teacher. Please try again." });
    } finally {
      setBusy(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  }

  async function handleRestore() {
    setBusy(true);
    setShowRestoreConfirm(false);
    try {
      const res = await fetch(`/api/teachers/${id}/restore`, { method: "POST", credentials: "include" });
      if (!res.ok) throw new Error();
      setTeacher((prev) => ({ ...prev, status: "active" }));
      setFeedback({ type: "success", message: "✅ Teacher restored." });
    } catch {
      setFeedback({ type: "error", message: "⚠️ Unable to restore teacher. Please try again." });
    } finally {
      setBusy(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  }

  async function handleResendCredentials() {
    setResending(true);
    try {
      const res = await fetch(`/api/teachers/${id}/resend-credentials`, { method: "POST", credentials: "include" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || "Failed");
      setFeedback({ type: "success", message: "✅ Login information has been resent." });
    } catch (err) {
      setFeedback({ type: "error", message: `⚠️ ${err.message || "Unable to resend credentials."}` });
    } finally {
      setResending(false);
      setTimeout(() => setFeedback(null), 5000);
    }
  }

  if (loading) {
    return (
      <div className="detail-page">
        <div className="detail-skeleton-title" />
        <div className="detail-skeleton-block" />
      </div>
    );
  }

  if (!teacher) {
    return (
      <div className="detail-page">
        <div className="detail-not-found">
          <p>We couldn&apos;t find this teacher record.</p>
          <Link href="/teachers" className="detail-back-btn">← Back to Teachers</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="detail-page">
      <div className="detail-header">
        <div>
          <h1>{teacher.fullName}</h1>
          <div className="detail-subline">
            <span>{teacher.email}</span>
            <span>•</span>
            <span className={`detail-badge ${teacher.status === "active" ? "detail-badge-active" : "detail-badge-inactive"}`}>
              {teacher.status}
            </span>
          </div>
        </div>
        <div className="detail-header-actions">
          <Link href="/teachers" className="detail-back-btn">← Back to Teachers</Link>
          <Link href={`/teachers/${id}/edit`} className="detail-btn-primary">Edit</Link>
        </div>
      </div>

      {feedback && (
        <div className={`detail-feedback ${feedback.type === "success" ? "detail-feedback-success" : "detail-feedback-error"}`}>
          {feedback.message}
        </div>
      )}

      <section className="detail-section">
        <h2>Teacher Information</h2>
        <dl className="detail-fields">
          <div className="detail-field">
            <dt>Full Name</dt>
            <dd>{teacher.fullName}</dd>
          </div>
          <div className="detail-field">
            <dt>Email</dt>
            <dd>{teacher.email}</dd>
          </div>
          <div className="detail-field">
            <dt>Department</dt>
            <dd style={{ textTransform: "capitalize" }}>{teacher.department}</dd>
          </div>
          <div className="detail-field">
            <dt>Assigned Subjects</dt>
            <dd>{(teacher.subjects || []).join(", ") || "—"}</dd>
          </div>
          <div className="detail-field">
            <dt>Status</dt>
            <dd>{teacher.status === "deleted" ? "Deleted" : "Active"}</dd>
          </div>
        </dl>

        <div className="detail-login-block">
          <p className="detail-login-label">Login Information</p>
          <p className="detail-login-email">{teacher.email}</p>
          <button className="detail-btn-secondary" onClick={handleResendCredentials} disabled={resending}>
            {resending ? "Resending…" : "Resend Teacher Credentials"}
          </button>
        </div>
      </section>

      <section className="detail-section">
        <h2>Home Classes</h2>
        {teacher.homeAssignments && teacher.homeAssignments.length > 0 ? (
          <ul className="detail-assignment-list">
            {teacher.homeAssignments.map((a, i) => (
              <li key={i}>{a.gradeLevel} - {a.section}</li>
            ))}
          </ul>
        ) : (
          <p className="detail-empty-note">No home classes assigned.</p>
        )}
      </section>

      {teacher.department === "elementary" && (
        <section className="detail-section">
          <h2>Visiting Classes</h2>
          {teacher.visitingAssignments && teacher.visitingAssignments.length > 0 ? (
            <ul className="detail-assignment-list">
              {teacher.visitingAssignments.map((a, i) => (
                <li key={i}>{a.gradeLevel} - {a.section} · {(a.subjects || []).join(", ")}</li>
              ))}
            </ul>
          ) : (
            <p className="detail-empty-note">No visiting classes assigned.</p>
          )}
        </section>
      )}

      {teacher.status === "active" ? (
        <section className="detail-danger-zone">
          <h2>Deactivate Teacher</h2>
          <p>This will mark the teacher as deleted. Their class assignments are kept, and this can be reversed later.</p>
          <button className="detail-btn-danger-outline" onClick={() => setShowDeleteConfirm(true)} disabled={busy}>
            Deactivate Teacher
          </button>
        </section>
      ) : (
        <section className="detail-danger-zone">
          <h2>Restore Teacher</h2>
          <p>This will mark the teacher as active again.</p>
          <button className="detail-btn-secondary" onClick={() => setShowRestoreConfirm(true)} disabled={busy}>
            Restore Teacher
          </button>
        </section>
      )}

      {showDeleteConfirm && (
        <div className="detail-modal-overlay">
          <div className="detail-modal">
            <h3>Deactivate this teacher?</h3>
            <p>This will mark {teacher.fullName} as deleted. You can restore them later.</p>
            <div className="detail-modal-actions">
              <button className="detail-modal-btn-cancel" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
              <button className="detail-modal-btn-confirm" style={{ background: "#c0392b" }} onClick={handleSoftDelete}>
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}

      {showRestoreConfirm && (
        <div className="detail-modal-overlay">
          <div className="detail-modal">
            <h3>Restore this teacher?</h3>
            <p>This will mark {teacher.fullName} as active again.</p>
            <div className="detail-modal-actions">
              <button className="detail-modal-btn-cancel" onClick={() => setShowRestoreConfirm(false)}>Cancel</button>
              <button className="detail-modal-btn-confirm" onClick={handleRestore}>Restore</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}