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
  const [confirmText, setConfirmText] = useState("");

  async function submitEnrollment(confirmDuplicate = false) {
    setSubmitting(true);
    setSubmitError("");

    try {
      const payload = confirmDuplicate ? { ...formData, confirmDuplicate: true } : formData;

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
    submitEnrollment(false);
  }

  function handleEnrollAnyway() {
    setDuplicateWarning(null);
    submitEnrollment(true);
  }

  function handleCancelDuplicate() {
    setDuplicateWarning(null);
    setConfirmText("");
  }

  // ---- Success confirmation screen ----
  if (successInfo) {
    return (
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
          <p className="enrollment-help-text">
            An account with this parent&apos;s email already existed — the student has been linked
            to that existing account instead of creating a new one.
          </p>
        )}
        {formData.parent.mode === "new" && !successInfo.parentLinkedExisting && (
          <p className="enrollment-help-text">
            Login details for the parent mobile app have been sent to {formData.parent.email}.
          </p>
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
    );
  }

  // ---- Review screen ----
  const { student, parent, rfidTag } = formData;

  return (
    <div>
      <h2 className="enrollment-step-title">Review Enrollment</h2>

      <div className="enrollment-review-section">
        <h3>Student Information</h3>
        <div className="enrollment-review-row">
          <span>Full Name</span>
          <span>
            {student.firstName} {student.middleName} {student.lastName}
          </span>
        </div>
        <div className="enrollment-review-row">
          <span>Date of Birth</span>
          <span>{student.dateOfBirth || "—"}</span>
        </div>
        <div className="enrollment-review-row">
          <span>Grade Level</span>
          <span>{GRADE_LEVELS_LABEL(student.gradeLevel)}</span>
        </div>
        <div className="enrollment-review-row">
          <span>Section</span>
          <span>{student.section || "—"}</span>
        </div>
      </div>

      <div className="enrollment-review-section">
        <h3>Parent/Guardian Information</h3>
        {parent.mode === "existing" ? (
          <div className="enrollment-review-row">
            <span>Linked Parent/Guardian</span>
            <span>{parent.existingParentName}</span>
          </div>
        ) : (
          <>
            <div className="enrollment-review-row">
              <span>Full Name</span>
              <span>
                {parent.firstName} {parent.lastName}
              </span>
            </div>
            <div className="enrollment-review-row">
              <span>Email</span>
              <span>{parent.email}</span>
            </div>
            <div className="enrollment-review-row">
              <span>Phone Number</span>
              <span>{parent.phone}</span>
            </div>
          </>
        )}
      </div>

      <div className="enrollment-review-section">
        <h3>RFID Tag</h3>
        <div className="enrollment-review-row">
          <span>Tag ID</span>
          <span>{rfidTag ? rfidTag : "Not assigned yet"}</span>
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
            <div className="enrollment-modal-existing">
              <div className="enrollment-review-row">
                <span>Existing Student</span>
                <span>{duplicateWarning.existingStudent.fullName}</span>
              </div>
              <div className="enrollment-review-row">
                <span>Student ID</span>
                <span>{duplicateWarning.existingStudent.studentId}</span>
              </div>
              <div className="enrollment-review-row">
                <span>Grade &amp; Section</span>
                <span>
                  {duplicateWarning.existingStudent.gradeLevel} - {duplicateWarning.existingStudent.section}
                </span>
              </div>
              <div className="enrollment-review-row">
                <span>Status</span>
                <span>{duplicateWarning.existingStudent.status}</span>
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
    </div>
  );
}