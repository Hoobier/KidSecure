"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import "./student-detail.css";
import "../../enrollment/enrollment.css";
import { getSubjectDisplayItems, getSubjectsConfig } from "@/lib/subjectsCache";

// src/app/(admin)/students/[id]/page.js

const BASE_DOCUMENTS = [
  { type: "birth_certificate", label: "Birth Certificate" },
  { type: "id_photo", label: "1x1 ID Picture" },
];

const TRANSFEREE_DOCUMENTS = [
  { type: "form_138", label: "Form 138 (Report Card)" },
  { type: "good_moral", label: "Good Moral Certificate" },
];

const TERMS = [
  { key: "T1", label: "T1" },
  { key: "T2", label: "T2" },
  { key: "T3", label: "T3" },
];

function formatRelationship(rel) {
  if (!rel) return "";
  const normalized = String(rel).toLowerCase();
  if (normalized === "mom" || normalized === "mother") return "Mom";
  if (normalized === "dad" || normalized === "father") return "Dad";
  if (normalized === "guardian") return "Guardian";
  return rel.charAt(0).toUpperCase() + rel.slice(1).toLowerCase();
}

function computeAverage(subjectGrades) {
  const vals = [];
  TERMS.forEach((t) => {
    const term = (subjectGrades && subjectGrades[t.key]) || {};
    const n = Number(term.grade);
    if (term.grade !== "" && term.grade !== undefined && !isNaN(n) && n > 0) vals.push(n);
  });
  if (vals.length === 0) return "—";
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  return avg.toFixed(2);
}

export default function StudentDetailPage({ params }) {
  const { id } = use(params);
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resending, setResending] = useState(false);
  const [showResendConfirm, setShowResendConfirm] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [uploadingType, setUploadingType] = useState(null);
  const [docError, setDocError] = useState({});
  const [viewingType, setViewingType] = useState(null);

  const [showReportCard, setShowReportCard] = useState(false);
  const [reportCardData, setReportCardData] = useState(null);
  const [reportCardLoading, setReportCardLoading] = useState(false);
  const [subjectsConfig, setSubjectsConfig] = useState(null);
  const [displayItems, setDisplayItems] = useState([]);

  const [showReEnroll, setShowReEnroll] = useState(false);
  const [reEnrolling, setReEnrolling] = useState(false);
  const [reEnrollForm, setReEnrollForm] = useState({ gradeLevel: "", section: "", previousSchool: "" });
  const [reEnrollErrors, setReEnrollErrors] = useState({});

  useEffect(() => {
    async function fetchStudent() {
      setLoading(true);
      try {
        const res = await fetch(`/api/students/${id}`, { credentials: "include" });
        if (!res.ok) throw new Error("not found");
        const json = await res.json();
        setStudent(json.data);
      } catch {
        setStudent(null);
      } finally {
        setLoading(false);
      }
    }
    fetchStudent();
  }, [id]);

  // Load report card + subjects config when the modal opens.
  useEffect(() => {
    if (!showReportCard || !student) return;
    setReportCardLoading(true);
    setFeedback(null);

    (async () => {
      try {
        const [rcRes, cfg] = await Promise.all([
          fetch(`/api/students/${id}/report-card`, { credentials: "include" }),
          getSubjectsConfig(),
        ]);
        const rcJson = await rcRes.json();
        setReportCardData(rcJson.data || {});
        setSubjectsConfig(cfg);

        const items = await getSubjectDisplayItems(student.gradeLevel);
        setDisplayItems(items);
      } catch (err) {
        setFeedback({ type: "error", message: `⚠️ ${err.message}` });
      } finally {
        setReportCardLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showReportCard, student?.id]);

  function calculateAge(dobString) {
    const dob = new Date(dobString);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    return age;
  }

  async function handleResendCredentials() {
    setResending(true);
    setShowResendConfirm(false);
    try {
      const res = await fetch(`/api/students/${id}/resend-credentials`, {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed");
      setFeedback({ type: "success", message: "✅ Parent login information has been resent." });
    } catch (err) {
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

  function closeReEnroll() {
    if (reEnrolling) return;
    setShowReEnroll(false);
    setReEnrollErrors({});
  }

  async function handleReEnroll() {
    const errors = {};
    if (!reEnrollForm.gradeLevel) errors.gradeLevel = "Please select a grade level.";
    if (!reEnrollForm.previousSchool.trim()) errors.previousSchool = "Please enter the student's previous school.";
    setReEnrollErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setReEnrolling(true);
    try {
      const res = await fetch(`/api/students/${id}/re-enroll`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gradeLevel: reEnrollForm.gradeLevel,
          section: reEnrollForm.section.trim() || null,
          previousSchool: reEnrollForm.previousSchool.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Unable to re-enroll student.");
      setStudent((prev) => ({
        ...prev,
        status: "active",
        isTransferee: true,
        previousSchool: reEnrollForm.previousSchool.trim(),
        gradeLevel: reEnrollForm.gradeLevel,
        section: reEnrollForm.section.trim(),
      }));
      setFeedback({ type: "success", message: "✅ Student re-enrolled successfully." });
      setShowReEnroll(false);
      setReEnrollErrors({});
    } catch (err) {
      setReEnrollErrors({ form: err.message || "Unable to re-enroll student." });
    } finally {
      setReEnrolling(false);
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
          <div className="detail-field"><dt>Student ID</dt><dd>{student.studentId || "—"}</dd></div>
          <div className="detail-field"><dt>Date of Birth</dt><dd>{student.dateOfBirth || "—"}</dd></div>
          <div className="detail-field"><dt>Grade &amp; Section</dt><dd>{student.gradeLevel} - {student.section}</dd></div>
          <div className="detail-field"><dt>Age</dt><dd>{student.dateOfBirth ? calculateAge(student.dateOfBirth) + " yrs" : "—"}</dd></div>
          <div className="detail-field"><dt>Full Name</dt><dd>{fullName}</dd></div>
          <div className="detail-field"><dt>Address</dt><dd>{student.address || "—"}</dd></div>
          <div className="detail-field">
            <dt>Student Type</dt>
            <dd>
              <span className={`detail-student-type ${student.isTransferee ? "detail-student-type-transferee" : "detail-student-type-regular"}`}>
                {student.isTransferee ? "Transferee" : "Regular Student"}
              </span>
            </dd>
          </div>
          {student.isTransferee && (
            <div className="detail-field"><dt>Previous School</dt><dd>{student.previousSchool || "—"}</dd></div>
          )}
          <div className="detail-field"><dt>Enrolled On</dt><dd>{new Date(student.enrolledAt).toLocaleDateString()}</dd></div>
        </dl>
      </section>

      <section className="detail-section">
        <h2>Parent / Guardian Information</h2>
        {student.parent ? (
          <>
            <dl className="detail-fields" style={{ marginBottom: "1.25rem" }}>
              <div className="detail-field"><dt>Full Name</dt><dd>{student.parent.fullName}{formatRelationship(student.parent.relationship || "") && <span style={{ color: "#8a94a6", fontWeight: 500 }}> ({formatRelationship(student.parent.relationship)})</span>}</dd></div>
              <div className="detail-field"><dt>Relationship</dt><dd>{formatRelationship(student.parent.relationship || "") || "—"}</dd></div>
              <div className="detail-field"><dt>Contact Number</dt><dd>{student.parent.phone || "—"}</dd></div>
              <div className="detail-field"><dt>Email</dt><dd>{student.parent.email || "—"}</dd></div>
            </dl>
            <div className="detail-login-block">
              <p className="detail-login-label">Login Information</p>
              <p className="detail-login-email">{student.parent.email}</p>
              <button className="detail-btn-secondary" onClick={() => setShowResendConfirm(true)} disabled={resending}>
                {resending ? "Resending…" : "Resend Parent Credentials"}
              </button>
            </div>
          </>
        ) : (
          <p className="detail-empty-note">No parent or guardian is linked to this student yet.</p>
        )}
      </section>

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

      <section className="detail-section">
        <h2>Requirements</h2>
        <div className="detail-requirements-list">
          {(student.isTransferee ? [...BASE_DOCUMENTS, ...TRANSFEREE_DOCUMENTS] : BASE_DOCUMENTS).map(({ type, label }) => {
            const uploaded = getDocumentFor(type);
            const isUploading = uploadingType === type;
            const isViewing = viewingType === type;
            return (
              <div key={type} className="detail-requirement-row">
                <div>
                  <div className="detail-requirement-label">{label}</div>
                  {uploaded ? (
                    <div className="detail-requirement-status detail-requirement-status-yes">✅ {uploaded.original_filename}</div>
                  ) : (
                    <div className="detail-requirement-status detail-requirement-status-no">⚠ Not uploaded</div>
                  )}
                  {docError[type] && <p className="detail-requirement-error">{docError[type]}</p>}
                </div>
                <div className="detail-requirement-actions">
                  {uploaded && (
                    <button type="button" className="detail-btn-secondary" onClick={() => handleViewDocument(type)} disabled={isViewing}>
                      {isViewing ? "Opening…" : "View"}
                    </button>
                  )}
                  <label className="detail-btn-secondary detail-requirement-upload-label">
                    {isUploading ? "Uploading…" : uploaded ? "Replace" : "Upload"}
                    <input type="file" accept=".jpg,.jpeg,.png,.pdf" style={{ display: "none" }} disabled={isUploading} onChange={(e) => handleDocumentUpload(type, e.target.files?.[0])} />
                  </label>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {student.status === "active" ? (
        <section className="detail-danger-zone">
          <h2>Deactivate Student</h2>
          <p>This will mark the student as inactive. Their records will be kept, and this can be reversed later.</p>
          <button className="detail-btn-danger-outline" onClick={() => setShowDeactivateConfirm(true)}>Deactivate Student</button>
        </section>
      ) : student.status === "transferred_out" ? (
        <section className="detail-danger-zone">
          <h2>Re-enroll Student</h2>
          <p>This student previously transferred to another school. Re-enrolling will reactivate their record, RFID tag, and parent account.</p>
          <button type="button" className="detail-btn-primary" onClick={() => {
            setReEnrollForm({ gradeLevel: student.gradeLevel || "", section: student.section || "", previousSchool: student.previousSchool || "" });
            setReEnrollErrors({});
            setShowReEnroll(true);
          }}>Re-enroll Student</button>
        </section>
      ) : (
        <section className="detail-danger-zone">
          <h2>Reactivate Student</h2>
          <p>This will mark the student as active again and restore their status in the system.</p>
          <button className="detail-btn-secondary" onClick={() => setShowReactivateConfirm(true)}>Reactivate Student</button>
        </section>
      )}

      {showDeactivateConfirm && (
        <div className="detail-modal-overlay">
          <div className="detail-modal">
            <h3>Deactivate this student?</h3>
            <p>This will mark {fullName} as inactive. Their records will be kept, and this can be reversed later.</p>
            <div className="detail-modal-actions">
              <button className="detail-modal-btn-cancel" onClick={() => setShowDeactivateConfirm(false)}>Cancel</button>
              <button className="detail-modal-btn-confirm" style={{ background: "#c0392b" }} onClick={handleDeactivate}>Deactivate</button>
            </div>
          </div>
        </div>
      )}

      {showResendConfirm && (
        <div className="detail-modal-overlay">
          <div className="detail-modal">
            <h3>Resend Login Information?</h3>
            <p>This will send a new email with login details to {student.parent.email}.</p>
            <div className="detail-modal-actions">
              <button className="detail-modal-btn-cancel" onClick={() => setShowResendConfirm(false)}>Cancel</button>
              <button className="detail-modal-btn-confirm" onClick={handleResendCredentials}>Resend</button>
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
              <button className="detail-modal-btn-cancel" onClick={() => setShowReactivateConfirm(false)}>Cancel</button>
              <button className="detail-modal-btn-confirm" onClick={handleReactivate}>Reactivate</button>
            </div>
          </div>
        </div>
      )}

      {showReEnroll && (
        <div className="detail-modal-overlay" onClick={closeReEnroll}>
          <div className="detail-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Re-enroll this student?</h3>
            <p>Enter the student&apos;s current enrollment information.</p>
            {reEnrollErrors.form && <p className="enrollment-field-error">⚠️ {reEnrollErrors.form}</p>}
            <div className="enrollment-form-group">
              <label htmlFor="reEnrollGradeLevel">Grade Level<span className="required">*</span></label>
              <select id="reEnrollGradeLevel" value={reEnrollForm.gradeLevel} onChange={(e) => { setReEnrollForm((prev) => ({ ...prev, gradeLevel: e.target.value })); setReEnrollErrors((prev) => ({ ...prev, gradeLevel: "", form: "" })); }} className={reEnrollErrors.gradeLevel ? "input-invalid" : ""}>
                <option value="">Select grade level</option>
                {["Nursery", "Kindergarten", "Preparatory", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6"].map((grade) => <option key={grade} value={grade}>{grade}</option>)}
              </select>
              {reEnrollErrors.gradeLevel && <p className="enrollment-field-error">{reEnrollErrors.gradeLevel}</p>}
            </div>
            <div className="enrollment-form-group">
              <label htmlFor="reEnrollSection">Section</label>
              <input id="reEnrollSection" type="text" value={reEnrollForm.section} onChange={(e) => setReEnrollForm((prev) => ({ ...prev, section: e.target.value }))} />
            </div>
            <div className="enrollment-form-group">
              <label htmlFor="reEnrollPreviousSchool">Previous School Name<span className="required">*</span></label>
              <input id="reEnrollPreviousSchool" type="text" placeholder="e.g. Bagumbong Elementary School" value={reEnrollForm.previousSchool} onChange={(e) => { setReEnrollForm((prev) => ({ ...prev, previousSchool: e.target.value })); setReEnrollErrors((prev) => ({ ...prev, previousSchool: "", form: "" })); }} className={reEnrollErrors.previousSchool ? "input-invalid" : ""} />
              {reEnrollErrors.previousSchool && <p className="enrollment-field-error">{reEnrollErrors.previousSchool}</p>}
            </div>
            <div className="detail-modal-actions">
              <button className="detail-modal-btn-cancel" onClick={closeReEnroll} disabled={reEnrolling}>Cancel</button>
              <button className="detail-modal-btn-confirm" onClick={handleReEnroll} disabled={reEnrolling}>{reEnrolling ? "Re-enrolling…" : "Confirm Re-enroll"}</button>
            </div>
          </div>
        </div>
      )}

      {showReportCard && student && (
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
                  <span className="detail-report-card-level">{student.gradeLevel} — Section {student.section}</span>
                </p>
                {reportCardData && (() => {
                  const releasedTerm = reportCardData.reportCardReleasedTerm;
                  const lockedTerm = reportCardData.reportCardLockedTerm;
                  const releasedAt = reportCardData.reportCardReleasedAt;

                  let statusClass, statusText;

                  if (releasedTerm && releasedAt) {
                    statusClass = "is-released";
                    statusText = `Released for ${releasedTerm} on ${new Date(releasedAt).toLocaleDateString()}`;
                  } else if (lockedTerm) {
                    statusClass = "is-not-released";
                    statusText = `${lockedTerm} was released and then pulled back — locked to teachers until re-released`;
                  } else {
                    statusClass = "is-not-released";
                    statusText = "Not released";
                  }

                  return (
                    <div className={`detail-report-card-release-status ${statusClass}`}>
                      <span className="detail-report-card-release-dot" aria-hidden="true" />
                      {statusText}
                    </div>
                  );
                })()}
              </div>
            </div>

            {reportCardLoading ? (
              <p className="detail-empty-note" style={{ padding: "2rem" }}>Loading saved grades…</p>
            ) : displayItems.length === 0 ? (
              <p className="detail-empty-note" style={{ padding: "2rem" }}>
                Set a grade level in the student record to view the correct subject list.
              </p>
            ) : (
              <div className="detail-report-card-table-wrap">
                <table className="detail-report-card-table">
                  <thead>
                    <tr>
                      <th className="report-card-subject report-card-th-subject">Subjects</th>
                      {TERMS.map((t) => (
                        <th key={t.key} className="report-card-th-term">{t.label}</th>
                      ))}
                      <th className="report-card-th-avg">Average</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayItems.map((item) => {
                      if (item.type === "subject") {
                        const grades = reportCardData?.grades?.[item.code] || {};
                        return (
                          <tr key={item.code} className="report-card-row">
                            <td className="report-card-subject">
                              <span className="report-card-code">{item.code}</span>
                              <span>{item.name}</span>
                            </td>
                            {TERMS.map((t) => (
                              <td key={t.key} className="report-card-grade">
                                <span className="report-card-readonly">
                                  {grades?.[t.key]?.grade ?? "—"}
                                </span>
                              </td>
                            ))}
                            <td className="report-card-avg">{computeAverage(grades)}</td>
                          </tr>
                        );
                      }
                      // group
                      return (
                        <React.Fragment key={item.label}>
                          <tr className="report-card-row report-card-row-group">
                            <td colSpan={5} className="report-card-subject report-card-subject-group">
                              <span className="report-card-code">{item.label}</span>
                              <span>{item.label}</span>
                            </td>
                          </tr>
                          {item.items.map((child) => {
                            const grades = reportCardData?.grades?.[child.code] || {};
                            return (
                              <tr key={child.code} className="report-card-row report-card-row-indented report-card-row-child">
                                <td className="report-card-subject">
                                  <span className="report-card-code">{child.code}</span>
                                  <span>{child.name}</span>
                                </td>
                                {TERMS.map((t) => (
                                  <td key={t.key} className="report-card-grade">
                                    <span className="report-card-readonly">
                                      {grades?.[t.key]?.grade ?? "—"}
                                    </span>
                                  </td>
                                ))}
                                <td className="report-card-avg">{computeAverage(grades)}</td>
                              </tr>
                            );
                          })}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="detail-modal-actions detail-report-card-actions">
              <button className="detail-modal-btn-cancel" onClick={() => setShowReportCard(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}