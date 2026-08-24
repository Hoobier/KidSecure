"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const GRADE_LEVELS_LABEL = (grade) => grade || "—";

export default function ReviewStep({ formData, onBack, onSubmitSuccess }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [successInfo, setSuccessInfo] = useState(null);
  const [duplicateWarning, setDuplicateWarning] = useState(null); // { message, existingStudent }
  const [parentMismatchWarning, setParentMismatchWarning] = useState(null); // { message, existingParent }
  const [confirmText, setConfirmText] = useState("");

  async function submitEnrollment(overrides = {}) {
    setSubmitting(true);
    setSubmitError("");

    try {
      const payload = { ...formData, ...overrides };

      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.status === 409 && data.duplicate) {
        setDuplicateWarning({
          message: data.message,
          existingStudent: data.existingStudent,
          sameParent: data.sameParent,
        });
        setConfirmText("");
        return;
      }

      if (res.status === 409 && data.duplicateParent) {
        setParentMismatchWarning({
          message: data.message,
          existingParent: data.existingParent,
        });
        return;
      }

      if (!res.ok) {
        setSubmitError(data.message || "Unable to complete enrollment. Please try again.");
        return;
      }

      setSuccessInfo({
        studentId: data.studentId,
        studentName: `${formData.student.firstName} ${formData.student.lastName}`,
        parentLinkedExisting: data.parentLinkedExisting || false,
      });
      if (onSubmitSuccess) onSubmitSuccess();
    } catch (error) {
      setSubmitError("Unable to reach the server. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit() {
    submitEnrollment();
  }

  function handleEnrollAnyway() {
    setDuplicateWarning(null);
    submitEnrollment({ confirmDuplicate: true });
  }

  function handleCancelDuplicate() {
    setDuplicateWarning(null);
    setConfirmText("");
  }

  function handleConfirmSameParent() {
    setParentMismatchWarning(null);
    submitEnrollment({ confirmParentMismatch: true });
  }

  function handleCancelParentMismatch() {
    setParentMismatchWarning(null);
  }

  // ---- Success confirmation screen ----
  if (successInfo) {
    return (
      <div className="enrollment-success-card">
        <div className="enrollment-success">
          <div className="enrollment-success-icon">✓</div>
          <h2>Enrollment Complete</h2>
          <p>
            <strong>{successInfo.studentName}</strong> has been successfully enrolled.
          </p>
          <div className="enrollment-success-id">
            <span>Student ID</span>
            <strong>{successInfo.studentId}</strong>
          </div>
          {formData.parent.mode === "new" && successInfo.parentLinkedExisting && (
            <div className="enrollment-notice enrollment-notice-info">
              <p>
                An account with this parent&apos;s email already existed — the student has been linked
                to that existing account instead of creating a new one.
              </p>
            </div>
          )}
          {formData.parent.mode === "new" && !successInfo.parentLinkedExisting && (
            <div className="enrollment-notice enrollment-notice-success">
              <p>
                Login details for the parent mobile app have been sent to <strong>{formData.parent.email}</strong>.
              </p>
            </div>
          )}
          <div className="enrollment-step-actions">
            <button
              type="button"
              className="enrollment-btn enrollment-btn-secondary"
              onClick={() => router.push("/students")}
            >
              View All Students
            </button>
            <button
              type="button"
              className="enrollment-btn enrollment-btn-primary"
              onClick={() => window.location.reload()}
            >
              Enroll Another Student
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---- Review screen ----
  const { student, parent, rfidTag } = formData;

  const hasAnyStudentInfo =
    (student.firstName || "").trim() !== "" ||
    (student.middleName || "").trim() !== "" ||
    (student.lastName || "").trim() !== "" ||
    (student.dateOfBirth || "").trim() !== "" ||
    (student.gradeLevel || "").trim() !== "" ||
    (student.section || "").trim() !== "";

  return (
    <div>
      <h2 className="enrollment-step-title">Review Enrollment</h2>

      {hasAnyStudentInfo && (
        <div className="enrollment-review-card">
          <div className="enrollment-review-card-header">
            <div className="enrollment-review-icon enrollment-review-icon-student">
              👤
            </div>
            <h3>Student Information</h3>
          </div>
          <div className="enrollment-review-grid">
            <div className="enrollment-review-row">
              <span>Full Name</span>
              <span className="enrollment-review-value">
                {student.firstName} {student.middleName} {student.lastName}
              </span>
            </div>
            <div className="enrollment-review-row">
              <span>Date of Birth</span>
              <span className="enrollment-review-value">{student.dateOfBirth || "—"}</span>
            </div>
            <div className="enrollment-review-row">
              <span>Grade Level</span>
              <span>
                {student.gradeLevel ? (
                  <span className="enrollment-badge enrollment-badge-info">
                    {GRADE_LEVELS_LABEL(student.gradeLevel)}
                  </span>
                ) : (
                  <span className="enrollment-review-empty">—</span>
                )}
              </span>
            </div>
            <div className="enrollment-review-row">
              <span>Section</span>
              <span>
                {student.section ? (
                  <span className="enrollment-badge enrollment-badge-info">
                    Section {student.section}
                  </span>
                ) : (
                  <span className="enrollment-review-empty">—</span>
                )}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="enrollment-review-card">
        <div className="enrollment-review-card-header">
          <div className="enrollment-review-icon enrollment-review-icon-parent">
            👨‍👩‍👧
          </div>
          <h3>
            Parent/Guardian Information
            {parent.mode === "existing" ? (
              <span className="enrollment-badge enrollment-badge-neutral" style={{ marginLeft: "0.75rem" }}>
                Existing Account
              </span>
            ) : (
              <span className="enrollment-badge enrollment-badge-success" style={{ marginLeft: "0.75rem" }}>
                New Account
              </span>
            )}
          </h3>
        </div>
        {parent.mode === "existing" ? (
          <div className="enrollment-review-grid">
            <div className="enrollment-review-row">
              <span>Linked Parent/Guardian</span>
              <span className="enrollment-review-value">{parent.existingParentName}</span>
            </div>
          </div>
        ) : (
          <div className="enrollment-review-grid">
            <div className="enrollment-review-row">
              <span>Full Name</span>
              <span className="enrollment-review-value">
                {parent.firstName} {parent.lastName}
              </span>
            </div>
            <div className="enrollment-review-row">
              <span>Email</span>
              <span className="enrollment-review-value">{parent.email}</span>
            </div>
            <div className="enrollment-review-row">
              <span>Phone Number</span>
              <span className="enrollment-review-value">{parent.phone}</span>
            </div>
          </div>
        )}
      </div>

      <div className="enrollment-review-card">
        <div className="enrollment-review-card-header">
          <div className="enrollment-review-icon enrollment-review-icon-rfid">
            📡
          </div>
          <h3>
            RFID Tag
            {rfidTag ? (
              <span className="enrollment-badge enrollment-badge-success" style={{ marginLeft: "0.75rem" }}>
                Assigned
              </span>
            ) : (
              <span className="enrollment-badge enrollment-badge-warning" style={{ marginLeft: "0.75rem" }}>
                Not Assigned
              </span>
            )}
          </h3>
        </div>
        <div className="enrollment-review-grid">
          <div className="enrollment-review-row">
            <span>Tag ID</span>
            <span>
              {rfidTag ? (
                <span className="enrollment-review-code">{rfidTag}</span>
              ) : (
                <span className="enrollment-review-empty">
                  Will be assigned later from Students page
                </span>
              )}
            </span>
          </div>
        </div>
      </div>

      {submitError && <p className="enrollment-field-error">{submitError}</p>}

      <div className="enrollment-step-actions">
        <button
          type="button"
          className="enrollment-btn enrollment-btn-secondary"
          onClick={onBack}
          disabled={submitting}
        >
          Back
        </button>
        <button
          type="button"
          className="enrollment-btn enrollment-btn-success"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? "Saving..." : "Complete Enrollment"}
        </button>
      </div>

      {duplicateWarning && (
        <div className="enrollment-modal-overlay">
          <div className="enrollment-modal">
            <h3>{duplicateWarning.sameParent ? "⚠️ Likely Duplicate Student" : "Possible Duplicate Student"}</h3>
            <p>{duplicateWarning.message}</p>
            <div className="enrollment-modal-box">
              <div className="enrollment-modal-box-title">
                <span className="enrollment-modal-box-icon">📋</span>
                Existing Student Record
              </div>
              <div className="enrollment-review-row">
                <span>Full Name</span>
                <span className="enrollment-review-value">{duplicateWarning.existingStudent.fullName}</span>
              </div>
              <div className="enrollment-review-row">
                <span>Student ID</span>
                <span className="enrollment-review-code">{duplicateWarning.existingStudent.studentId}</span>
              </div>
              <div className="enrollment-review-row">
                <span>Grade &amp; Section</span>
                <span>
                  <span className="enrollment-badge enrollment-badge-info">
                    {duplicateWarning.existingStudent.gradeLevel} - {duplicateWarning.existingStudent.section}
                  </span>
                </span>
              </div>
              <div className="enrollment-review-row">
                <span>Status</span>
                <span>
                  <span className={
                    "enrollment-badge " +
                    (duplicateWarning.existingStudent.status === "Active"
                      ? "enrollment-badge-success"
                      : duplicateWarning.existingStudent.status === "Inactive"
                      ? "enrollment-badge-neutral"
                      : "enrollment-badge-warning")
                  }>
                    {duplicateWarning.existingStudent.status}
                  </span>
                </span>
              </div>
            </div>

            {duplicateWarning.sameParent ? (
              <>
                <p className="enrollment-help-text">
                  To proceed anyway, type <strong>ENROLL</strong> below to confirm this is intentional.
                </p>
                <input
                  type="text"
                  className="enrollment-confirm-input"
                  placeholder="Type ENROLL to confirm"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                />
              </>
            ) : (
              <p className="enrollment-help-text">
                If this is a different student who happens to share the same name and birthdate,
                you can continue enrolling. Otherwise, go back and double-check the details.
              </p>
            )}

            <div className="enrollment-modal-actions">
              <button
                type="button"
                className="enrollment-btn enrollment-btn-secondary"
                onClick={handleCancelDuplicate}
                disabled={submitting}
              >
                Cancel &amp; Review
              </button>
              <button
                type="button"
                className="enrollment-btn enrollment-btn-success"
                onClick={handleEnrollAnyway}
                disabled={submitting || (duplicateWarning.sameParent && confirmText.trim().toUpperCase() !== "ENROLL")}
              >
                {submitting ? "Saving..." : "Enroll Anyway"}
              </button>
            </div>
          </div>
        </div>
      )}

      {parentMismatchWarning && (
        <div className="enrollment-modal-overlay">
          <div className="enrollment-modal">
            <h3>⚠️ Email Already Registered</h3>
            <p>{parentMismatchWarning.message}</p>
            <div className="enrollment-modal-box">
              <div className="enrollment-modal-box-title">
                <span className="enrollment-modal-box-icon">👤</span>
                Registered Parent/Guardian
              </div>
              <div className="enrollment-review-row">
                <span>Full Name</span>
                <span className="enrollment-review-value">{parentMismatchWarning.existingParent.fullName}</span>
              </div>
              <div className="enrollment-review-row">
                <span>Email</span>
                <span className="enrollment-review-value">{parentMismatchWarning.existingParent.email}</span>
              </div>
              <div className="enrollment-review-row">
                <span>Phone Number</span>
                <span className="enrollment-review-value">{parentMismatchWarning.existingParent.phone}</span>
              </div>
            </div>

            <p className="enrollment-help-text">
              If this is the same person and the name was just entered differently, you can link
              this student to the existing account. Otherwise, go back and check the email address
              you entered — it may belong to a different family.
            </p>

            <div className="enrollment-modal-actions">
              <button
                type="button"
                className="enrollment-btn enrollment-btn-secondary"
                onClick={handleCancelParentMismatch}
                disabled={submitting}
              >
                Cancel &amp; Review
              </button>
              <button
                type="button"
                className="enrollment-btn enrollment-btn-success"
                onClick={handleConfirmSameParent}
                disabled={submitting}
              >
                {submitting ? "Saving..." : "Yes, Same Person — Link Account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}