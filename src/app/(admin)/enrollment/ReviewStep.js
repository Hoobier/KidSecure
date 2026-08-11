"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const GRADE_LEVELS_LABEL = (grade) => grade || "—";

export default function ReviewStep({ formData, onBack }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [successInfo, setSuccessInfo] = useState(null);

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError("");

    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.message || "Unable to complete enrollment. Please try again.");
        return;
      }

      setSuccessInfo({
        studentId: data.studentId,
        studentName: `${formData.student.firstName} ${formData.student.lastName}`,
      });
    } catch (error) {
      setSubmitError("Unable to reach the server. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
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
        {formData.parent.mode === "new" && (
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
    </div>
  );
}