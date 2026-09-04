// src/app/(admin)/account/[id]/page.js

"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import "./parent-detail.css";

function formatRelationship(rel) {
  if (!rel) return "";
  const normalized = String(rel).toLowerCase();
  if (normalized === "mom" || normalized === "mother") return "Mom";
  if (normalized === "dad" || normalized === "father") return "Dad";
  if (normalized === "guardian") return "Guardian";
  return rel.charAt(0).toUpperCase() + rel.slice(1).toLowerCase();
}

export default function ParentDetailPage({ params }) {
  const { id } = use(params);
  const [parent, setParent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resending, setResending] = useState(false);
  const [showResendConfirm, setShowResendConfirm] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    async function fetchParent() {
      setLoading(true);
      try {
        const res = await fetch(`/api/parents/${id}`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error("not found");
        const json = await res.json();
        setParent(json.data);
      } catch {
        setParent(null);
      } finally {
        setLoading(false);
      }
    }
    fetchParent();
  }, [id]);

  async function handleResendCredentials() {
    setResending(true);
    setShowResendConfirm(false);
    try {
      const res = await fetch(`/api/parents/${id}/resend-credentials`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = (data && (data.debug || data.message)) || "Unable to resend login information. Please try again.";
        throw new Error(msg);
      }
      setFeedback({
        type: "success",
        message: "✅ Parent login information has been resent.",
      });
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
      setTimeout(() => setFeedback(null), 8000);
    }
  }

  if (loading) {
    return (
      <div className="detail-page">
        <div className="detail-header" style={{ opacity: 0, pointerEvents: "none" }}>
          <div><h1>Loading</h1></div>
          <div className="detail-header-actions">
            <span className="detail-back-btn" aria-hidden>Back</span>
            <span className="detail-btn-primary" aria-hidden>Edit</span>
          </div>
        </div>
        <div className="detail-skeleton-title" />
        <div className="detail-skeleton-block" />
      </div>
    );
  }

  if (!parent) {
    return (
      <div className="detail-page">
        <div className="detail-not-found">
          <p>We couldn&apos;t find this parent account.</p>
          <Link href="/account" className="detail-back-btn">← Back to Parents</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="detail-page">
      <div className="detail-header">
        <div>
          <h1>
            {parent.name || "Parent Account"}
            {formatRelationship(parent.relationship || "") && (
              <span className="detail-header-relationship">
                {" "}({formatRelationship(parent.relationship || "")})
              </span>
            )}
          </h1>
          <div className="detail-subline">
            <span>{parent.email || "No email on file"}</span>
            <span>•</span>
            <span>{parent.phone || "No phone on file"}</span>
          </div>
        </div>
        <div className="detail-header-actions">
          <Link href="/account" className="detail-back-btn">← Back to Parents</Link>
          <Link href={`/account/${id}/edit`} className="detail-btn-primary">
            Edit
          </Link>
        </div>
      </div>

      {feedback && (
        <div
          className={
            "detail-feedback " +
            (feedback.type === "success"
              ? "detail-feedback-success"
              : "detail-feedback-error")
          }
        >
          {feedback.message}
        </div>
      )}

      {/* Parent Information */}
      <section className="detail-section">
        <h2>Parent Information</h2>
        <dl className="detail-fields">
          <div className="detail-field">
            <dt>Full Name</dt>
            <dd>{parent.name || "—"}</dd>
          </div>
          <div className="detail-field">
            <dt>First Name</dt>
            <dd>{parent.firstName || "—"}</dd>
          </div>
          <div className="detail-field">
            <dt>Last Name</dt>
            <dd>{parent.lastName || "—"}</dd>
          </div>
          <div className="detail-field">
            <dt>Relationship</dt>
            <dd>
              {formatRelationship(parent.relationship || "") || "—"}
            </dd>
          </div>
          <div className="detail-field">
            <dt>Email</dt>
            <dd>{parent.email || "—"}</dd>
          </div>
          <div className="detail-field">
            <dt>Contact Number</dt>
            <dd>{parent.phone || "—"}</dd>
          </div>
          <div className="detail-field">
            <dt>Created On</dt>
            <dd>
              {parent.createdAt
                ? new Date(parent.createdAt).toLocaleDateString()
                : "—"}
            </dd>
          </div>
        </dl>
      </section>

      {/* Login Information */}
      <section className="detail-section">
        <h2>Login Information</h2>
        <div className="detail-login-block">
          <p className="detail-login-label">Parent Portal Sign In</p>
          <p className="detail-login-email">{parent.email || "—"}</p>
          <button
            className="detail-btn-secondary"
            onClick={() => setShowResendConfirm(true)}
            disabled={resending || !parent.email}
          >
            {resending ? "Resending…" : "Resend Parent Credentials"}
          </button>
        </div>
      </section>

      {/* Linked Students */}
      <section className="detail-section">
        <h2>Linked Student{parent.children.length === 1 ? "" : "s"}</h2>
        {parent.children.length === 0 ? (
          <p className="detail-empty-note">No students are linked to this parent account yet.</p>
        ) : (
          <div className="detail-linked-students">
            {parent.children.map((c) => {
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
                  className={`detail-student-card ${statusClass}`}
                >
                  <div className="detail-student-name">
                    {c.name}
                    {statusLabel !== "" && (
                      <span className={statusLabelClass}>{statusLabel}</span>
                    )}
                  </div>
                  <div className="detail-student-meta">
                    <span>Student ID: {c.studentId || "—"}</span>
                    <span>
                      {c.gradeLevel || "—"}
                      {c.gradeLevel ? " - " : ""}
                      {c.section || ""}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {showResendConfirm && (
        <div className="detail-modal-overlay">
          <div className="detail-modal">
            <h3>Resend Login Information?</h3>
            <p>
              This will send a new email with login details to {parent.email}.
            </p>
            <div className="detail-modal-actions">
              <button
                className="detail-modal-btn-cancel"
                onClick={() => setShowResendConfirm(false)}
              >
                Cancel
              </button>
              <button
                className="detail-modal-btn-confirm"
                onClick={handleResendCredentials}
              >
                Resend
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
