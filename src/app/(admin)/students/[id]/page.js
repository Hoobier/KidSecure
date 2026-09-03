"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import "./student-detail.css";

// src/app/(admin)/students/[id]/page.js

const BASE_DOCUMENTS = [
  { type: "birth_certificate", label: "Birth Certificate" },
  { type: "id_photo", label: "1x1 ID Picture" },
];

const TRANSFEREE_DOCUMENTS = [
  { type: "form_138", label: "Form 138 (Report Card)" },
  { type: "good_moral", label: "Good Moral Certificate" },
];

function formatRelationship(rel) {
  if (!rel) return "";
  const normalized = String(rel).toLowerCase();
  if (normalized === "mom" || normalized === "mother") return "Mom";
  if (normalized === "dad" || normalized === "father") return "Dad";
  if (normalized === "guardian") return "Guardian";
  return rel.charAt(0).toUpperCase() + rel.slice(1).toLowerCase();
}

const KINDERGARTEN_SUBJECTS = [
  { code: "CL", name: "Christian Living / Bible Studies", isGroup: false },
  { code: "COM", name: "Communication Skills (English & Filipino)", isGroup: false },
  { code: "MATH", name: "Mathematics", isGroup: false },
  { code: "SEN", name: "Sensory-Perceptual & Socio-Emotional Development", isGroup: false },
];

const GRADE1_6_SUBJECTS = [
  { code: "CLVE", name: "Christian Living / Values Education", isGroup: false },
  { code: "MATH", name: "Mathematics", isGroup: false },
  { code: "SCI", name: "Science", isGroup: false },
  { code: "FIL", name: "Filipino", isGroup: false },
  {
    code: "MAPEH",
    name: "MAPEH",
    isGroup: true,
    children: [
      { code: "MA", name: "Music & Arts" },
      { code: "PE", name: "Physical Education" },
      { code: "H", name: "Health" },
    ],
  },
  { code: "EPP", name: "Edukasyong Pantahanan at Praktikal", isGroup: false },
];

function getSubjectsForGrade(gradeLevel) {
  if (!gradeLevel) return { levelLabel: "", subjects: [] };
  const normalized = String(gradeLevel).toLowerCase().trim();
  if (normalized.includes("kindergarten")) {
    return { levelLabel: "Kindergarten", subjects: KINDERGARTEN_SUBJECTS };
  }
  return { levelLabel: gradeLevel, subjects: GRADE1_6_SUBJECTS };
}

function computeAverage(grades) {
  const vals = Object.values(grades)
    .map((v) => Number(v))
    .filter((v) => !isNaN(v) && v > 0);
  if (vals.length === 0) return "—";
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  return avg.toFixed(2);
}

const DEFAULT_GRADES = () => ({ Q1: "", Q2: "", Q3: "", Q4: "" });

export default function StudentDetailPage({ params }) {
  const { id } = use(params);
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resending, setResending] = useState(false);
  const [showResendConfirm, setShowResendConfirm] = useState(false);
  const [feedback, setFeedback] = useState(null); // { type: 'success' | 'error', message }
  const [uploadingType, setUploadingType] = useState(null);
  const [docError, setDocError] = useState({});
  const [viewingType, setViewingType] = useState(null);

  const [showReportCard, setShowReportCard] = useState(false);
  const [reportGrades, setReportGrades] = useState({});
  const [reportSaving, setReportSaving] = useState(false);
  const [reportFeedback, setReportFeedback] = useState(null);

  function initReportGrades() {
    if (!student) return {};
    const { subjects } = getSubjectsForGrade(student.gradeLevel);
    const grades = {};
    subjects.forEach((s) => {
      grades[s.code] = DEFAULT_GRADES();
      if (s.isGroup) {
        s.children.forEach((c) => {
          grades[c.code] = DEFAULT_GRADES();
        });
      }
    });
    return grades;
  }

  useEffect(() => {
    if (showReportCard && student) {
      setReportGrades(initReportGrades());
      setReportFeedback(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showReportCard, student?.id]);

  function updateGrade(code, quarter, value) {
    const sanitized = value === "" ? "" : value.replace(/[^\d.]/g, "").slice(0, 6);
    setReportGrades((prev) => ({
      ...prev,
      [code]: { ...prev[code], [quarter]: sanitized },
    }));
  }

  async function handleSaveReport() {
    setReportSaving(true);
    setReportFeedback(null);
    try {
      await new Promise((r) => setTimeout(r, 500));
      setReportFeedback({ type: "success", message: "✅ Report card saved." });
      setTimeout(() => setReportFeedback(null), 2500);
    } catch {
      setReportFeedback({ type: "error", message: "⚠️ Unable to save report card." });
    } finally {
      setReportSaving(false);
    }
  }

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

      function getDocumentFor(type) {
    return (student?.documents || []).find((doc) => doc.type === type);
  }

  async function handleDocumentUpload(type, file) {
    if (!file) return;

    setUploadingType(type);
    setDocError((prev) => ({ ...prev, [type]: "" }));

    const body = new FormData();
    body.append("type", type);
    body.append("file", file);

    try {
      const res = await fetch(`/api/students/${id}/documents`, {
        method: "POST",
        credentials: "include",
        body,
      });

      const json = await res.json();

      if (!res.ok) {
        setDocError((prev) => ({ ...prev, [type]: json.message || "Upload failed. Please try again." }));
        return;
      }

      setStudent((prev) => {
        const updatedDocuments = [
          ...(prev.documents || []).filter((doc) => doc.type !== type),
          json.document,
        ];
        return { ...prev, documents: updatedDocuments };
      });
    } catch {
      setDocError((prev) => ({ ...prev, [type]: "Unable to reach the server. Please try again." }));
    } finally {
      setUploadingType(null);
    }
  }

  async function handleViewDocument(type) {
    setViewingType(type);
    try {
      const res = await fetch(`/api/students/${id}/documents/${type}`, {
        credentials: "include",
      });
      const json = await res.json();

      if (!res.ok) {
        setDocError((prev) => ({ ...prev, [type]: json.message || "Unable to open this document." }));
        return;
      }

      window.open(json.view_url, "_blank", "noopener,noreferrer");
    } catch {
      setDocError((prev) => ({ ...prev, [type]: "Unable to reach the server. Please try again." }));
    } finally {
      setViewingType(null);
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
        <div className="detail-section-header-row">
          <h2>Student Information</h2>
          <button
            type="button"
            className="detail-btn-report-card"
            onClick={() => setShowReportCard(true)}
          >
            📋 Report Card
          </button>
        </div>
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
                <dd>
                  {student.parent.fullName}
                  {formatRelationship(student.parent.relationship || "") && (
                    <span style={{ color: "#8a94a6", fontWeight: 500 }}>
                      {" "}({formatRelationship(student.parent.relationship)})
                    </span>
                  )}
                </dd>
              </div>
              <div className="detail-field">
                <dt>Relationship</dt>
                <dd>{formatRelationship(student.parent.relationship || "") || "—"}</dd>
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

      {/* Requirements */}
      <section className="detail-section">
        <h2>Requirements</h2>
        <div className="detail-requirements-list">
          {(student.isTransferee ? [...BASE_DOCUMENTS, ...TRANSFEREE_DOCUMENTS] : BASE_DOCUMENTS).map(
            ({ type, label }) => {
              const uploaded = getDocumentFor(type);
              const isUploading = uploadingType === type;
              const isViewing = viewingType === type;

              return (
                <div key={type} className="detail-requirement-row">
                  <div>
                    <div className="detail-requirement-label">{label}</div>
                    {uploaded ? (
                      <div className="detail-requirement-status detail-requirement-status-yes">
                        ✅ {uploaded.original_filename}
                      </div>
                    ) : (
                      <div className="detail-requirement-status detail-requirement-status-no">
                        ⚠ Not uploaded
                      </div>
                    )}
                    {docError[type] && (
                      <p className="detail-requirement-error">{docError[type]}</p>
                    )}
                  </div>

                  <div className="detail-requirement-actions">
                    {uploaded && (
                      <button
                        type="button"
                        className="detail-btn-secondary"
                        onClick={() => handleViewDocument(type)}
                        disabled={isViewing}
                      >
                        {isViewing ? "Opening…" : "View"}
                      </button>
                    )}
                    <label className="detail-btn-secondary detail-requirement-upload-label">
                      {isUploading ? "Uploading…" : uploaded ? "Replace" : "Upload"}
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.pdf"
                        style={{ display: "none" }}
                        disabled={isUploading}
                        onChange={(e) => handleDocumentUpload(type, e.target.files?.[0])}
                      />
                    </label>
                  </div>
                </div>
              );
            }
          )}
        </div>
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

      {/* Report Card Modal */}
      {showReportCard && student && (() => {
        const { levelLabel, subjects } = getSubjectsForGrade(student.gradeLevel);

        function renderSubjectRow(s, indent = false, isGroupChild = false) {
          const g = reportGrades[s.code] || DEFAULT_GRADES();
          const avg = computeAverage(g);
          const rowClass =
            "report-card-row" +
            (indent ? " report-card-row-indented" : "") +
            (isGroupChild ? " report-card-row-child" : "");
          return (
            <tr key={s.code} className={rowClass}>
              <td className="report-card-subject">
                {s.code && !isGroupChild && <span className="report-card-code">{s.code}</span>}
                <span>{s.name}</span>
              </td>
              {["Q1", "Q2", "Q3", "Q4"].map((q) => (
                <td key={q} className="report-card-grade">
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="—"
                    value={g[q]}
                    onChange={(e) => updateGrade(s.code, q, e.target.value)}
                  />
                </td>
              ))}
              <td className="report-card-avg">{avg}</td>
            </tr>
          );
        }

        const overallCodes = [];
        subjects.forEach((s) => {
          if (s.isGroup) s.children.forEach((c) => overallCodes.push(c.code));
          else overallCodes.push(s.code);
        });
        const allAverages = overallCodes
          .map((c) => reportGrades[c] && computeAverage(reportGrades[c]))
          .filter((v) => typeof v === "string" && v !== "—")
          .map(Number);
        const overall = allAverages.length
          ? (allAverages.reduce((a, b) => a + b, 0) / allAverages.length).toFixed(2)
          : "—";

        return (
          <div
            className="detail-modal-overlay detail-report-card-overlay"
            onClick={(e) => e.target === e.currentTarget && setShowReportCard(false)}
          >
            <div className="detail-modal detail-report-card-modal">
              <div className="detail-report-card-header">
                <div>
                  <h3 className="detail-report-card-title">📋 Report Card</h3>
                  <p className="detail-report-card-sub">
                    <strong>{fullName}</strong>
                    <span className="detail-report-card-sep">·</span>
                    <span>{student.studentId}</span>
                    <span className="detail-report-card-sep">·</span>
                    <span className="detail-report-card-level">{levelLabel || "—"} — Section {student.section}</span>
                  </p>
                </div>
                <button
                  type="button"
                  className="detail-report-card-close"
                  onClick={() => setShowReportCard(false)}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>

              {reportFeedback && (
                <div
                  className={
                    "detail-feedback " +
                    (reportFeedback.type === "success"
                      ? "detail-feedback-success"
                      : "detail-feedback-error")
                  }
                  style={{ marginBottom: "1rem" }}
                >
                  {reportFeedback.message}
                </div>
              )}

              {subjects.length === 0 ? (
                <p className="detail-empty-note">
                  Set a grade level in the student record to view the correct subject list.
                </p>
              ) : (
                <div className="detail-report-card-table-wrap">
                  <table className="detail-report-card-table">
                    <thead>
                      <tr>
                        <th className="report-card-subject report-card-th-subject">
                          Subjects
                        </th>
                        <th className="report-card-th-quarter">Q1</th>
                        <th className="report-card-th-quarter">Q2</th>
                        <th className="report-card-th-quarter">Q3</th>
                        <th className="report-card-th-quarter">Q4</th>
                        <th className="report-card-th-avg">Average</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subjects.map((s) =>
                        s.isGroup ? (
                          <>
                            <tr key={s.code} className="report-card-row report-card-row-group">
                              <td
                                colSpan={6}
                                className="report-card-subject report-card-subject-group"
                              >
                                <span className="report-card-code">{s.code}</span>
                                <span>{s.name}</span>
                              </td>
                            </tr>
                            {s.children.map((c) => renderSubjectRow(c, true, true))}
                          </>
                        ) : (
                          renderSubjectRow(s)
                        )
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="report-card-row report-card-row-overall">
                        <td className="report-card-subject report-card-overall-label">
                          Overall Average
                        </td>
                        <td colSpan={4}></td>
                        <td className="report-card-avg report-card-overall-value">
                          {overall}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              <div className="detail-modal-actions detail-report-card-actions">
                <button
                  className="detail-modal-btn-cancel"
                  onClick={() => setShowReportCard(false)}
                >
                  Close
                </button>
                <button
                  className="detail-modal-btn-confirm"
                  onClick={handleSaveReport}
                  disabled={reportSaving || subjects.length === 0}
                >
                  {reportSaving ? "Saving…" : "Save Report Card"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>


  );
}