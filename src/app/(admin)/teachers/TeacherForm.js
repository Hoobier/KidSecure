"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export const GRADE_OPTIONS = [
  "Nursery", "Kindergarten", "Preparatory",
  "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6",
];
export const SECTION_OPTIONS = ["A", "B", "C"];
export const SUBJECT_OPTIONS = [
  { code: "CLVE", label: "CLVE — Christian Living / Values Education" },
  { code: "MATH", label: "MATH — Mathematics" },
  { code: "SCI", label: "SCI — Science" },
  { code: "FIL", label: "FIL — Filipino" },
  { code: "MAPEH", label: "MAPEH" },
  { code: "EPP", label: "EPP — Edukasyong Pantahanan at Praktikal" },
];

const SUBJECTS_BY_GRADE = {
  "Nursery": ["CL", "COM", "MATH", "SEN"],
  "Kindergarten": ["CL", "COM", "MATH", "SEN"],
  "Preparatory": ["CL", "COM", "MATH", "SEN"],
  "Grade 1": ["CLVE", "MATH", "FIL", "MAPEH", "EPP"],
  "Grade 2": ["CLVE", "MATH", "FIL", "MAPEH", "EPP"],
  "Grade 3": ["CLVE", "MATH", "FIL", "MAPEH", "EPP"],
  "Grade 4": ["CLVE", "MATH", "SCI", "FIL", "MAPEH", "EPP"],
  "Grade 5": ["CLVE", "MATH", "SCI", "FIL", "MAPEH", "EPP"],
  "Grade 6": ["CLVE", "MATH", "SCI", "FIL", "MAPEH", "EPP"],
};

const NAME_REGEX = /^[A-Za-z\s\-'.]{2,50}$/;

export default function TeacherForm({ mode, initial, teacherId }) {
  const router = useRouter();
  const isCreate = mode === "create";

  const [form, setForm] = useState({
    firstName: initial?.firstName || "",
    middleName: initial?.middleName || "",
    lastName: initial?.lastName || "",
    email: initial?.email || "",
    department: initial?.department || "elementary",
    forteSubjectCode: initial?.forteSubjectCode || "",
    homeAssignments: initial?.homeAssignments || [],
    visitingAssignments: initial?.visitingAssignments || [],
  });

  const [errors, setErrors] = useState({});
  const [feedback, setFeedback] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function addHomeRow() {
    setForm((prev) => ({ ...prev, homeAssignments: [...prev.homeAssignments, { gradeLevel: "", section: "" }] }));
  }
  function updateHomeRow(i, key, value) {
    setForm((prev) => {
      const next = [...prev.homeAssignments];
      next[i] = { ...next[i], [key]: value };
      return { ...prev, homeAssignments: next };
    });
  }
  function removeHomeRow(i) {
    setForm((prev) => ({ ...prev, homeAssignments: prev.homeAssignments.filter((_, idx) => idx !== i) }));
  }

  function addVisitingRow() {
    setForm((prev) => ({ ...prev, visitingAssignments: [...prev.visitingAssignments, { gradeLevel: "", section: "" }] }));
  }
  function updateVisitingRow(i, key, value) {
    setForm((prev) => {
      const next = [...prev.visitingAssignments];
      next[i] = { ...next[i], [key]: value };
      return { ...prev, visitingAssignments: next };
    });
  }
  function removeVisitingRow(i) {
    setForm((prev) => ({ ...prev, visitingAssignments: prev.visitingAssignments.filter((_, idx) => idx !== i) }));
  }

  function validate() {
    const e = {};

    if (!form.firstName.trim()) e.firstName = ["First name is required."];
    else if (!NAME_REGEX.test(form.firstName.trim())) e.firstName = ["Invalid format (2–50 letters)."];

    if (form.middleName && !NAME_REGEX.test(form.middleName.trim())) {
      e.middleName = ["Invalid format (2–50 letters)."];
    }
    if (!form.lastName.trim()) e.lastName = ["Last name is required."];
    else if (!NAME_REGEX.test(form.lastName.trim())) e.lastName = ["Invalid format (2–50 letters)."];

    if (!form.email.trim()) e.email = ["Email is required."];
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = ["Please enter a valid email address."];

    if (!form.department) e.department = ["Department is required."];

    const cleanedHome = form.homeAssignments.filter((r) => r.gradeLevel && r.section);
    const cleanedVisiting = form.visitingAssignments.filter((r) => r.gradeLevel && r.section);

    if (form.department === "preschool") {
      if (form.forteSubjectCode) e.forteSubjectCode = ["Preschool teachers do not have a forte subject."];
      if (cleanedVisiting.length > 0) e.visitingAssignments = ["Preschool teachers do not have visiting classes."];
    }

    if (form.department === "elementary") {
      if (cleanedVisiting.length > 0 && !form.forteSubjectCode) {
        e.forteSubjectCode = ["Please select a forte subject before adding visiting classes."];
      }
      if (form.forteSubjectCode) {
        cleanedVisiting.forEach((row, i) => {
          const offered = SUBJECTS_BY_GRADE[row.gradeLevel] || [];
          if (!offered.includes(form.forteSubjectCode)) {
            e[`visiting_${i}`] = `${form.forteSubjectCode} is not offered at ${row.gradeLevel}.`;
          }
        });
      }
    }

    const dupCheck = (rows, fieldKey) => {
      const seen = new Set();
      rows.forEach((row, i) => {
        if (!row.gradeLevel || !row.section) return;
        const key = `${row.gradeLevel}|${row.section}`;
        if (seen.has(key)) e[`${fieldKey}_${i}`] = "Duplicate class in this list.";
        seen.add(key);
      });
    };
    dupCheck(cleanedHome, "home");
    dupCheck(cleanedVisiting, "visiting");

    return e;
  }

  function handleSubmit(e) {
    e.preventDefault();
    setFeedback(null);
    const clientErrors = validate();
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
    setErrors({});

    const payload = {
      firstName: form.firstName.trim(),
      middleName: form.middleName.trim() || null,
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      department: form.department,
      forteSubjectCode: form.department === "elementary" ? (form.forteSubjectCode || null) : null,
      homeAssignments: form.homeAssignments.filter((r) => r.gradeLevel && r.section),
      visitingAssignments: form.department === "elementary"
        ? form.visitingAssignments.filter((r) => r.gradeLevel && r.section)
        : [],
    };

    try {
      const url = isCreate ? "/api/teachers" : `/api/teachers/${teacherId}`;
      const method = isCreate ? "POST" : "PATCH";
      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (json.errors) setErrors(json.errors);
        setFeedback({ type: "error", message: json.message || "⚠️ Unable to save." });
        return;
      }
      router.push(isCreate ? `/teachers/${json.teacherId}` : `/teachers/${teacherId}`);
    } catch {
      setFeedback({ type: "error", message: "⚠️ Unable to reach the server." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="edit-page">
      <div className="edit-page-header">
        <h1>{isCreate ? "Add Teacher" : "Edit Teacher"}</h1>
        <Link href={isCreate ? "/teachers" : `/teachers/${teacherId}`} className="edit-back-btn">
          ← {isCreate ? "Back to Teachers" : "Back to Teacher"}
        </Link>
      </div>

      {feedback && (
        <div className={`edit-feedback ${feedback.type === "success" ? "edit-feedback-success" : "edit-feedback-error"}`}>
          {feedback.message}
        </div>
      )}

      <form className="edit-card" onSubmit={handleSubmit}>
        <h2>Teacher Information</h2>
        {isCreate && (
          <p className="enrollment-help-text" style={{ marginTop: 0 }}>
            A temporary password will be emailed to this teacher.
          </p>
        )}

        <div className="edit-form-row-3">
          <div className="edit-form-group">
            <label>First Name<span className="required">*</span></label>
            <input type="text" value={form.firstName} onChange={(e) => updateField("firstName", e.target.value)}
              className={errors.firstName ? "input-invalid" : ""} />
            {errors.firstName && <div className="edit-field-error">{errors.firstName[0]}</div>}
          </div>
          <div className="edit-form-group">
            <label>Middle Name</label>
            <input type="text" value={form.middleName} onChange={(e) => updateField("middleName", e.target.value)}
              className={errors.middleName ? "input-invalid" : ""} />
            {errors.middleName && <div className="edit-field-error">{errors.middleName[0]}</div>}
          </div>
          <div className="edit-form-group">
            <label>Last Name<span className="required">*</span></label>
            <input type="text" value={form.lastName} onChange={(e) => updateField("lastName", e.target.value)}
              className={errors.lastName ? "input-invalid" : ""} />
            {errors.lastName && <div className="edit-field-error">{errors.lastName[0]}</div>}
          </div>
        </div>

        <div className="edit-form-row">
          <div className="edit-form-group">
            <label>Email<span className="required">*</span></label>
            <input type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)}
              className={errors.email ? "input-invalid" : ""} />
            {errors.email && <div className="edit-field-error">{errors.email[0]}</div>}
          </div>
          <div className="edit-form-group">
            <label>Department<span className="required">*</span></label>
            <select value={form.department} onChange={(e) => updateField("department", e.target.value)}>
              <option value="elementary">Elementary</option>
              <option value="preschool">Preschool</option>
            </select>
            {errors.department && <div className="edit-field-error">{errors.department[0]}</div>}
          </div>
        </div>

        {form.department === "elementary" && (
          <div className="edit-form-group">
            <label>Forte Subject</label>
            <select
              value={form.forteSubjectCode}
              onChange={(e) => updateField("forteSubjectCode", e.target.value)}
              className={errors.forteSubjectCode ? "input-invalid" : ""}
            >
              <option value="">Select forte subject</option>
              {SUBJECT_OPTIONS.map((s) => <option key={s.code} value={s.code}>{s.label}</option>)}
            </select>
            {errors.forteSubjectCode && <div className="edit-field-error">{errors.forteSubjectCode[0]}</div>}
          </div>
        )}
      </form>

      <div className="edit-card" style={{ marginTop: "1.5rem" }}>
        <h2>Home Classes</h2>
        <p className="enrollment-help-text" style={{ marginTop: 0 }}>
          Classes where this teacher is the homeroom adviser.
        </p>

        {form.homeAssignments.map((row, i) => (
          <div key={i} className="edit-form-row-3" style={{ alignItems: "flex-end" }}>
            <div className="edit-form-group">
              <label>Grade Level</label>
              <select value={row.gradeLevel} onChange={(e) => updateHomeRow(i, "gradeLevel", e.target.value)}>
                <option value="">Select</option>
                {GRADE_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className="edit-form-group">
              <label>Section</label>
              <select value={row.section} onChange={(e) => updateHomeRow(i, "section", e.target.value)}>
                <option value="">Select</option>
                {SECTION_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="edit-form-group">
              <button type="button" className="edit-btn edit-btn-secondary" onClick={() => removeHomeRow(i)}>Remove</button>
            </div>
            {errors[`home_${i}`] && <div className="edit-field-error" style={{ width: "100%" }}>{errors[`home_${i}`]}</div>}
          </div>
        ))}

        <button type="button" className="edit-btn edit-btn-secondary" onClick={addHomeRow}>+ Add Home Class</button>
      </div>

      {form.department === "elementary" && (
        <div className="edit-card" style={{ marginTop: "1.5rem" }}>
          <h2>Visiting Classes</h2>
          <p className="enrollment-help-text" style={{ marginTop: 0 }}>
            Classes where this teacher teaches {form.forteSubjectCode || "their forte subject"} as a visiting specialist.
          </p>

          {form.visitingAssignments.map((row, i) => {
            const offered = SUBJECTS_BY_GRADE[row.gradeLevel] || [];
            const mismatch = form.forteSubjectCode && row.gradeLevel && !offered.includes(form.forteSubjectCode);
            return (
              <div key={i}>
                <div className="edit-form-row-3" style={{ alignItems: "flex-end" }}>
                  <div className="edit-form-group">
                    <label>Grade Level</label>
                    <select value={row.gradeLevel} onChange={(e) => updateVisitingRow(i, "gradeLevel", e.target.value)}>
                      <option value="">Select</option>
                      {GRADE_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div className="edit-form-group">
                    <label>Section</label>
                    <select value={row.section} onChange={(e) => updateVisitingRow(i, "section", e.target.value)}>
                      <option value="">Select</option>
                      {SECTION_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="edit-form-group">
                    <button type="button" className="edit-btn edit-btn-secondary" onClick={() => removeVisitingRow(i)}>Remove</button>
                  </div>
                </div>
                {mismatch && (
                  <div className="edit-field-error" style={{ marginTop: "-0.5rem", marginBottom: "0.75rem" }}>
                    {form.forteSubjectCode} is not offered at {row.gradeLevel}.
                  </div>
                )}
                {errors[`visiting_${i}`] && (
                  <div className="edit-field-error" style={{ marginBottom: "0.75rem" }}>{errors[`visiting_${i}`]}</div>
                )}
              </div>
            );
          })}

          <button type="button" className="edit-btn edit-btn-secondary" onClick={addVisitingRow}>+ Add Visiting Class</button>
        </div>
      )}

      <div className="edit-actions" style={{ marginTop: "1.5rem" }}>
        <Link href={isCreate ? "/teachers" : `/teachers/${teacherId}`} className="edit-btn edit-btn-secondary">Cancel</Link>
        <button type="button" className="edit-btn edit-btn-primary" onClick={handleSubmit} disabled={saving}>
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </div>

      {showSaveConfirm && (
        <div className="edit-modal-overlay">
          <div className="edit-modal">
            <h3>{isCreate ? "Create this teacher?" : "Save these changes?"}</h3>
            <p>
              {isCreate
                ? "A temporary password will be emailed to the teacher."
                : `This will update ${form.firstName} ${form.lastName}'s information and class assignments.`}
            </p>
            <div className="edit-modal-actions">
              <button className="edit-modal-btn-cancel" onClick={() => setShowSaveConfirm(false)} disabled={saving}>Cancel</button>
              <button className="edit-modal-btn-confirm" onClick={performSave} disabled={saving}>
                {saving ? "Saving…" : isCreate ? "Create" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}