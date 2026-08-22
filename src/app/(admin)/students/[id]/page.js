"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import "./student-detail.css";

// src/app/(admin)/students/[id]/page.js

export default function StudentDetailPage({ params }) {
  const { id } = use(params);
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resending, setResending] = useState(false);
  const [showResendConfirm, setShowResendConfirm] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message }

  function calculateAge(dobString) {
    const dob = new Date(dobString);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    return age;
  }

  useEffect(() => {
    async function fetchStudent() {
      setLoading(true);
      try {
        const res = await fetch(`/api/students/${id}`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error("not found");
        const json = await res.json();
        setStudent(json.data);
      } catch (err) {
        setStudent(null);
      } finally {
        setLoading(false);
      }
    }
    fetchStudent();
  }, [id]);

    async function handleResendCredentials() {
        setResending(true);
        setShowResendConfirm(false);
        try {
            const res = await fetch(`/api/students/${id}/resend-credentials`, {
            method: "POST",
            credentials: "include",
            });

            const data = await res.json();

            if (!res.ok) {
            console.error("Resend failed — status", res.status, data);
            throw new Error(data.message || "Failed");
            }

            setFeedback({ type: "success", message: "✅ Parent login information has been resent." });
        } catch (err) {
            console.error(err);
            setFeedback({ type: "error", message: "⚠️ Unable to resend login information. Please try again." });
        } finally {
            setResending(false);
            setTimeout(() => setFeedback(null), 5000);
        }
    }

    const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
    const [deactivating, setDeactivating] = useState(false);

        async function handleDeactivate() {
          setDeactivating(true);
          setShowDeactivateConfirm(false);
          try {
              const res = await fetch(`/api/students/${id}/deactivate`, {
              method: "POST",
              credentials: "include",
              });
              if (!res.ok) throw new Error();
              setFeedback({ type: "success", message: "✅ Student has been deactivated." });
              setStudent((prev) => ({ ...prev, status: "inactive" }));
          } catch {
              setFeedback({ type: "error", message: "⚠️ Unable to deactivate student. Please try again." });
          } finally {
              setDeactivating(false);
              setTimeout(() => setFeedback(null), 5000);
          }
        }
    const [showReactivateConfirm, setShowReactivateConfirm] = useState(false);
    const [reactivating, setReactivating] = useState(false);

    async function handleReactivate() {
      setReactivating(true);
      setShowReactivateConfirm(false);
      try {
        const res = await fetch(`/api/students/${id}/reactivate`, {
          method: "POST",
          credentials: "include",
        });
        if (!res.ok) throw new Error();
        setFeedback({ type: "success", message: "✅ Student has been reactivated." });
        setStudent((prev) => ({ ...prev, status: "active" }));
      } catch {
        setFeedback({ type: "error", message: "⚠️ Unable to reactivate student. Please try again." });
      } finally {
        setReactivating(false);
        setTimeout(() => setFeedback(null), 5000);
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

  if (!student) {
    return (
      <div className="detail-page">
        <div className="detail-not-found">
          <p>We couldn&apos;t find this student record.</p>
          <Link href="/students" className="detail-back-btn">← Back to Students</Link>
        </div>
      </div>
    );
  }

  const fullName = [student.firstName, student.middleName, student.lastName].filter(Boolean).join(" ");

  return (
    <div className="detail-page">
      <div className="detail-header">
        <div>
          <h1>{fullName}</h1>
          <div className="detail-subline">
            <span>Student ID: {student.studentId}</span>
            <span>•</span>
            <span className={"detail-badge " + (student.status === "active" ? "detail-badge-active" : "detail-badge-inactive")}>
              {student.status}
            </span>
          </div>
        </div>
        <div className="detail-header-actions">
          <Link href="/students" className="detail-back-btn">← Back to Students</Link>
          <Link href={`/students/${id}/edit`} className="detail-btn-primary">
            Edit
          </Link>
        </div>
      </div>

      {feedback && (
        <div className={"detail-feedback " + (feedback.type === "success" ? "detail-feedback-success" : "detail-feedback-error")}>
          {feedback.message}
        </div>
      )}

      {/* Student Information */}
      <section className="detail-section">
        <h2>Student Information</h2>
        <dl className="detail-fields">
          <div className="detail-field">
            <dt>Student ID</dt>
            <dd>{student.studentId || "—"}</dd>
          </div>
          <div className="detail-field">
            <dt>Date of Birth</dt>
            <dd>{student.dateOfBirth || "—"}</dd>
          </div>
          <div className="detail-field">
            <dt>Grade &amp; Section</dt>
            <dd>{student.gradeLevel} - {student.section}</dd>
          </div>
          <div className="detail-field">
            <dt>Age</dt>
            <dd>{student.dateOfBirth ? calculateAge(student.dateOfBirth) + " yrs" : "—"}</dd>
          </div>
          <div className="detail-field">
            <dt>Full Name</dt>
            <dd>{fullName}</dd>
          </div>
          <div className="detail-field">
            <dt>Enrolled On</dt>
            <dd>{new Date(student.enrolledAt).toLocaleDateString()}</dd>
          </div>
        </dl>
      </section>

      {/* Parent / Guardian Information */}
      <section className="detail-section">
        <h2>Parent / Guardian Information</h2>
        {student.parent ? (
          <>
            <dl className="detail-fields" style={{ marginBottom: "1.25rem" }}>
              <div className="detail-field">
                <dt>Full Name</dt>
                <dd>{student.parent.fullName}</dd>
              </div>
              <div className="detail-field">
                <dt>Contact Number</dt>
                <dd>{student.parent.phone || "—"}</dd>
              </div>
              <div className="detail-field">
                <dt>Email</dt>
                <dd>{student.parent.email || "—"}</dd>
              </div>
            </dl>
            <div className="detail-login-block">
              <p className="detail-login-label">Login Information</p>
              <p className="detail-login-email">{student.parent.email}</p>
              <button
                className="detail-btn-secondary"
                onClick={() => setShowResendConfirm(true)}
                disabled={resending}
              >
                {resending ? "Resending…" : "Resend Parent Credentials"}
              </button>
            </div>
          </>
        ) : (
          <p className="detail-empty-note">No parent or guardian is linked to this student yet.</p>
        )}
      </section>

      {/* RFID Tag */}
      <section className="detail-section">
        <h2>RFID Tag</h2>
        {student.rfidTag ? (
          <p className="detail-rfid-assigned">🟢 Tag ID: {student.rfidTag}</p>
        ) : (
          <p className="detail-rfid-empty">🟡 No RFID tag has been assigned yet.</p>
        )}
        <Link href={`/students/${id}/edit`} className="detail-rfid-edit-link">
          {student.rfidTag ? "Change RFID Tag" : "Assign RFID Tag"} →
        </Link>
      </section>

      {/* Danger Zone */}
      {student.status === "active" ? (
        <section className="detail-danger-zone">
          <h2>Deactivate Student</h2>
          <p>This will mark the student as inactive. Their records will be kept, and this can be reversed later.</p>
          <button className="detail-btn-danger-outline" onClick={() => setShowDeactivateConfirm(true)}>
            Deactivate Student
          </button>
        </section>
      ) : (
        <section className="detail-danger-zone">
          <h2>Reactivate Student</h2>
          <p>This will mark the student as active again and restore their status in the system.</p>
          <button className="detail-btn-secondary" onClick={() => setShowReactivateConfirm(true)}>
            Reactivate Student
          </button>
        </section>
      )}

      {showDeactivateConfirm && (
        <div className="detail-modal-overlay">
            <div className="detail-modal">
            <h3>Deactivate this student?</h3>
            <p>This will mark {fullName} as inactive. Their records will be kept, and this can be reversed later.</p>
            <div className="detail-modal-actions">
                <button className="detail-modal-btn-cancel" onClick={() => setShowDeactivateConfirm(false)}>
                Cancel
                </button>
                <button
                className="detail-modal-btn-confirm"
                style={{ background: "#c0392b" }}
                onClick={handleDeactivate}
                >
                Deactivate
                </button>
            </div>
            </div>
        </div>
        )}

      {/* Resend Confirmation Modal */}
      {showResendConfirm && (
        <div className="detail-modal-overlay">
          <div className="detail-modal">
            <h3>Resend Login Information?</h3>
            <p>This will send a new email with login details to {student.parent.email}.</p>
            <div className="detail-modal-actions">
              <button className="detail-modal-btn-cancel" onClick={() => setShowResendConfirm(false)}>
                Cancel
              </button>
              <button className="detail-modal-btn-confirm" onClick={handleResendCredentials}>
                Resend
              </button>
            </div>
          </div>
        </div>
      )}

      {showReactivateConfirm && (
        <div className="detail-modal-overlay">
          <div className="detail-modal">
            <h3>Reactivate this student?</h3>
            <p>This will mark {fullName} as active again.</p>
            <div className="detail-modal-actions">
              <button className="detail-modal-btn-cancel" onClick={() => setShowReactivateConfirm(false)}>
                Cancel
              </button>
              <button className="detail-modal-btn-confirm" onClick={handleReactivate}>
                Reactivate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    
    
  );
}