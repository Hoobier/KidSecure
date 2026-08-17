"use client";

import { useState, useEffect, use, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import "./edit-student.css";
import "../../../enrollment/enrollment.css";

const GRADE_OPTIONS = ["Kindergarten", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6"];
const SECTION_OPTIONS = ["A", "B", "C"];
const NAME_REGEX = /^[A-Za-z\s\-'.]{2,50}$/;

function calculateAge(dobString) {
  const dob = new Date(dobString);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

function validateForm(form) {
  const errors = {};

  if (!form.firstName.trim()) {
    errors.firstName = ["First name is required."];
  } else if (!NAME_REGEX.test(form.firstName.trim())) {
    errors.firstName = ["First name may only contain letters, spaces, hyphens, apostrophes, and periods (2–50 characters)."];
  }

  if (form.middleName && form.middleName.trim() && !NAME_REGEX.test(form.middleName.trim())) {
    errors.middleName = ["Middle name may only contain letters, spaces, hyphens, apostrophes, and periods (2–50 characters)."];
  }

  if (!form.lastName.trim()) {
    errors.lastName = ["Last name is required."];
  } else if (!NAME_REGEX.test(form.lastName.trim())) {
    errors.lastName = ["Last name may only contain letters, spaces, hyphens, apostrophes, and periods (2–50 characters)."];
  }

  if (!form.dateOfBirth) {
    errors.dateOfBirth = ["Date of birth is required."];
  } else {
    const dob = new Date(form.dateOfBirth);
    const today = new Date();
    if (dob > today) {
      errors.dateOfBirth = ["Date of birth cannot be in the future."];
    } else {
      const age = calculateAge(form.dateOfBirth);
      if (age < 3 || age > 15) {
        errors.dateOfBirth = ["Student age must be between 3 and 15 years old."];
      }
    }
  }

  if (!form.gradeLevel) errors.gradeLevel = ["Please select a grade level."];
  if (!form.section) errors.section = ["Please select a section."];

  return errors;
}

export default function EditStudentPage({ params }) {

  const { id } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [errors, setErrors] = useState({});
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  const [form, setForm] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    dateOfBirth: "",
    gradeLevel: "",
    section: "",
  });

  const [student, setStudent] = useState(null); // full record incl. rfidTag + parent info

  // RFID section state
  const [rfidValue, setRfidValue] = useState("");
  const [rfidSaving, setRfidSaving] = useState(false);
  const [rfidFeedback, setRfidFeedback] = useState(null);
  const [showRfidConfirm, setShowRfidConfirm] = useState(false);

  // Parent reassignment section state
  const [parentSearchQuery, setParentSearchQuery] = useState("");
  const [parentSearchResults, setParentSearchResults] = useState([]);
  const [parentSearching, setParentSearching] = useState(false);
  const [selectedNewParent, setSelectedNewParent] = useState(null);
  const [parentReassignSaving, setParentReassignSaving] = useState(false);
  const [parentFeedback, setParentFeedback] = useState(null);
  const [showParentConfirm, setShowParentConfirm] = useState(false);
  const parentDebounceRef = useRef(null);

  useEffect(() => {
    async function fetchStudent() {
      setLoading(true);
      try {
        const res = await fetch(`/api/students/${id}`, { credentials: "include" });
        const json = await res.json();
        if (!res.ok) throw new Error();

        setForm({
          firstName: json.data.firstName || "",
          middleName: json.data.middleName || "",
          lastName: json.data.lastName || "",
          dateOfBirth: json.data.dateOfBirth || "",
          gradeLevel: json.data.gradeLevel || "",
          section: json.data.section || "",
        });
        setStudent(json.data);
        setRfidValue(json.data.rfidTag || "");
      } catch {
        setFeedback({ type: "error", message: "⚠️ Unable to load student information." });
      } finally {
        setLoading(false);
      }
    }
    fetchStudent();
  }, [id]);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  // Runs client-side validation only, and opens the confirm modal if the
  // form is valid. The actual save happens in performSave(), triggered by
  // the modal's confirm button — not here.
  function handleSubmit(e) {
    e.preventDefault();
    setFeedback(null);
    setErrors({});

    const clientErrors = validateForm(form);
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      setFeedback({ type: "error", message: "⚠️ Please fix the errors below before saving." });
      return;
    }

    setShowSaveConfirm(true);
  }

  async function performSave() {
    setShowSaveConfirm(false);
    setSaving(true);

    try {
      const res = await fetch(`/api/students/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.errors) setErrors(data.errors);
        setFeedback({ type: "error", message: data.message || "⚠️ Unable to save changes." });
        return;
      }

      router.push(`/students/${id}`);
    } catch {
      setFeedback({ type: "error", message: "⚠️ Unable to reach the server. Please try again." });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="edit-page">
        <div className="edit-skeleton-title" />
        <div className="edit-skeleton-block" />
      </div>
    );
  }

  async function performSaveRfid() {
    setShowRfidConfirm(false);
    setRfidSaving(true);
    setRfidFeedback(null);
    try {
      const res = await fetch(`/api/students/${id}/reassign-rfid`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rfidTag: rfidValue.trim() || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed");

      setRfidFeedback({ type: "success", message: "✅ RFID tag updated." });
      setStudent((prev) => ({ ...prev, rfidTag: data.rfidTag }));
    } catch (err) {
      setRfidFeedback({ type: "error", message: `⚠️ ${err.message}` });
    } finally {
      setRfidSaving(false);
      setTimeout(() => setRfidFeedback(null), 5000);
    }
  }

  function handleParentSearchChange(value) {
    setParentSearchQuery(value);
    if (parentDebounceRef.current) clearTimeout(parentDebounceRef.current);

    if (!value.trim()) {
      setParentSearchResults([]);
      return;
    }

    setParentSearching(true);
    parentDebounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/parents/search?query=${encodeURIComponent(value)}`);
        const result = await res.json();
        setParentSearchResults(res.ok ? result.parents || [] : []);
      } catch {
        setParentSearchResults([]);
      } finally {
        setParentSearching(false);
      }
    }, 400);
  }

  async function performReassignParent() {
    if (!selectedNewParent) return;
    setShowParentConfirm(false);
    setParentReassignSaving(true);
    setParentFeedback(null);
    try {
      const res = await fetch(`/api/students/${id}/reassign-parent`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentId: selectedNewParent.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed");

      setParentFeedback({ type: "success", message: "✅ Parent/guardian reassigned." });
      setStudent((prev) => ({ ...prev, parent: data.parent }));
      setSelectedNewParent(null);
      setParentSearchQuery("");
      setParentSearchResults([]);
    } catch (err) {
      setParentFeedback({ type: "error", message: `⚠️ ${err.message}` });
    } finally {
      setParentReassignSaving(false);
      setTimeout(() => setParentFeedback(null), 5000);
    }
  }

  return (
    <div className="edit-page">
      <div className="edit-page-header">
        <div className="edit-page-header-title">
          <h1>Edit Student Information</h1>
        </div>
        <Link href={`/students/${id}`} className="edit-back-btn">← Back to Student</Link>
      </div>

      {feedback && (
        <div className={"edit-feedback " + (feedback.type === "success" ? "edit-feedback-success" : "edit-feedback-error")}>
          {feedback.message}
        </div>
      )}

      <form className="edit-card" onSubmit={handleSubmit}>
        <h2>Student Information</h2>

        <div className="edit-form-row-3">
          <div className="edit-form-group">
            <label>First Name<span className="required">*</span></label>
            <input
              type="text"
              value={form.firstName}
              onChange={(e) => updateField("firstName", e.target.value)}
              className={errors.firstName ? "input-invalid" : ""}
            />
            {errors.firstName && <div className="edit-field-error">{errors.firstName[0]}</div>}
          </div>
          <div className="edit-form-group">
            <label>Middle Name</label>
            <input
              type="text"
              value={form.middleName}
              onChange={(e) => updateField("middleName", e.target.value)}
              className={errors.middleName ? "input-invalid" : ""}
            />
            {errors.middleName && <div className="edit-field-error">{errors.middleName[0]}</div>}
          </div>
          <div className="edit-form-group">
            <label>Last Name<span className="required">*</span></label>
            <input
              type="text"
              value={form.lastName}
              onChange={(e) => updateField("lastName", e.target.value)}
              className={errors.lastName ? "input-invalid" : ""}
            />
            {errors.lastName && <div className="edit-field-error">{errors.lastName[0]}</div>}
          </div>
        </div>

        <div className="edit-form-row-3">
          <div className="edit-form-group">
            <label>Date of Birth<span className="required">*</span></label>
            <input
              type="date"
              value={form.dateOfBirth}
              onChange={(e) => updateField("dateOfBirth", e.target.value)}
              className={errors.dateOfBirth ? "input-invalid" : ""}
            />
            {errors.dateOfBirth && <div className="edit-field-error">{errors.dateOfBirth[0]}</div>}
          </div>
          <div className="edit-form-group">
            <label>Grade Level<span className="required">*</span></label>
            <select value={form.gradeLevel} onChange={(e) => updateField("gradeLevel", e.target.value)}>
              <option value="">Select Grade Level</option>
              {GRADE_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div className="edit-form-group">
            <label>Section<span className="required">*</span></label>
            <select value={form.section} onChange={(e) => updateField("section", e.target.value)}>
              <option value="">Select Section</option>
              {SECTION_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="edit-actions">
          <Link href={`/students/${id}`} className="edit-btn edit-btn-secondary">Cancel</Link>
          <button type="submit" className="edit-btn edit-btn-primary" disabled={saving}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </form>

      {/* RFID Tag Reassignment */}
      <div className="edit-card" style={{ marginTop: "1.5rem" }}>
        <h2>RFID Tag</h2>
        {rfidFeedback && (
          <div className={"edit-feedback " + (rfidFeedback.type === "success" ? "edit-feedback-success" : "edit-feedback-error")}>
            {rfidFeedback.message}
          </div>
        )}
        <div className="edit-form-row">
          <div className="edit-form-group" style={{ flex: "2 1 0" }}>
            <label>Tag ID</label>
            <input
              type="text"
              value={rfidValue}
              onChange={(e) => setRfidValue(e.target.value)}
              placeholder="No tag assigned"
            />
          </div>
        </div>
        <div className="edit-actions" style={{ borderTop: "none", paddingTop: 0, marginTop: "1rem" }}>
          <button
            type="button"
            className="edit-btn edit-btn-primary"
            onClick={() => setShowRfidConfirm(true)}
            disabled={rfidSaving}
          >
            {rfidSaving ? "Saving…" : "Save RFID Tag"}
          </button>
        </div>
      </div>

      {/* Parent/Guardian Reassignment */}
      <div className="edit-card" style={{ marginTop: "1.5rem" }}>
        <h2>Parent/Guardian</h2>
        {parentFeedback && (
          <div className={"edit-feedback " + (parentFeedback.type === "success" ? "edit-feedback-success" : "edit-feedback-error")}>
            {parentFeedback.message}
          </div>
        )}

        <div className="edit-form-row">
          {student?.parent && (
            <div className="edit-form-group">
              <label>Currently Linked</label>
              <div style={{
                padding: "0.75rem 0.9rem",
                border: "1px solid #d5dae2",
                borderRadius: "8px",
                background: "#f8fafc",
                fontSize: "0.925rem",
                color: "#1b2a4a",
                fontWeight: 500,
              }}>
                {student.parent.fullName}
                <span style={{ color: "#8a94a6", fontWeight: 400, marginLeft: 6 }}>
                  ({student.parent.email})
                </span>
              </div>
            </div>
          )}

          <div className="edit-form-group" style={{ flex: "2 1 0" }}>
            <label>Search for a Different Parent/Guardian</label>
            {selectedNewParent ? (
              <div className="enrollment-selected-parent">
                <span>{selectedNewParent.firstName} {selectedNewParent.lastName}</span>
                <button type="button" onClick={() => setSelectedNewParent(null)}>Change</button>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  placeholder="Start typing a name or email..."
                  value={parentSearchQuery}
                  onChange={(e) => handleParentSearchChange(e.target.value)}
                />
                {parentSearching && <p className="enrollment-help-text">Searching...</p>}
                {!parentSearching && parentSearchQuery && parentSearchResults.length === 0 && (
                  <p className="enrollment-help-text">No matching parent/guardian found.</p>
                )}
                {parentSearchResults.length > 0 && (
                  <div className="enrollment-search-results">
                    {parentSearchResults.map((p) => (
                      <button
                        type="button"
                        key={p.id}
                        className="enrollment-search-result-item"
                        onClick={() => {
                          setSelectedNewParent(p);
                          setParentSearchQuery("");
                          setParentSearchResults([]);
                        }}
                      >
                        <span className="result-name">{p.firstName} {p.lastName}</span>
                        <span className="result-email">{p.email}</span>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <div className="edit-actions" style={{ borderTop: "none", paddingTop: 0, marginTop: "1rem" }}>
          <button
            type="button"
            className="edit-btn edit-btn-primary"
            onClick={() => setShowParentConfirm(true)}
            disabled={!selectedNewParent || parentReassignSaving}
          >
            {parentReassignSaving ? "Saving…" : "Reassign Parent/Guardian"}
          </button>
        </div>
      </div>

      {showSaveConfirm && (
        <div className="edit-modal-overlay">
          <div className="edit-modal">
            <h3>Save these changes?</h3>
            <p>
              This will update {form.firstName} {form.lastName}&apos;s student information.
            </p>
            <div className="edit-modal-actions">
              <button
                className="edit-modal-btn-cancel"
                onClick={() => setShowSaveConfirm(false)}
                disabled={saving}
              >
                Cancel
              </button>
              <button className="edit-modal-btn-confirm" onClick={performSave} disabled={saving}>
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRfidConfirm && (
        <div className="edit-modal-overlay">
          <div className="edit-modal">
            <h3>Update RFID tag?</h3>
            <p>
              {rfidValue.trim()
                ? `This will assign tag "${rfidValue.trim()}" to this student.`
                : "This will remove the currently assigned RFID tag from this student."}
            </p>
            <div className="edit-modal-actions">
              <button
                className="edit-modal-btn-cancel"
                onClick={() => setShowRfidConfirm(false)}
                disabled={rfidSaving}
              >
                Cancel
              </button>
              <button className="edit-modal-btn-confirm" onClick={performSaveRfid} disabled={rfidSaving}>
                {rfidSaving ? "Saving…" : "Save RFID Tag"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showParentConfirm && selectedNewParent && (
        <div className="edit-modal-overlay">
          <div className="edit-modal">
            <h3>Reassign parent/guardian?</h3>
            <p>
              This will link this student to {selectedNewParent.firstName} {selectedNewParent.lastName}
              {student?.parent ? `, replacing ${student.parent.fullName}` : ""}.
            </p>
            <div className="edit-modal-actions">
              <button
                className="edit-modal-btn-cancel"
                onClick={() => setShowParentConfirm(false)}
                disabled={parentReassignSaving}
              >
                Cancel
              </button>
              <button
                className="edit-modal-btn-confirm"
                onClick={performReassignParent}
                disabled={parentReassignSaving}
              >
                {parentReassignSaving ? "Saving…" : "Reassign"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}