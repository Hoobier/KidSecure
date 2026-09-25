"use client";
// src/app/(admin)/teachers/TeacherForm.js
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSubjectsConfig } from "@/lib/subjectsCache";

export const GRADE_OPTIONS = [
  "Nursery", "Kindergarten", "Preparatory",
  "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6",
];
export const SECTION_OPTIONS = ["A", "B", "C"];

const NAME_REGEX = /^[A-Za-z\s\-'.]{2,50}$/;

export default function TeacherForm({ mode, initial, teacherId }) {
  const router = useRouter();
  const isCreate = mode === "create";

  const [config, setConfig] = useState(null);
  const [form, setForm] = useState({
    firstName: initial?.firstName || "",
    middleName: initial?.middleName || "",
    lastName: initial?.lastName || "",
    email: initial?.email || "",
    department: initial?.department || "elementary",
    homeAssignments: (initial?.homeAssignments || []).map((a) => ({
      gradeLevel: a.gradeLevel || "",
      section: a.section || "",
      subjects: a.subjects || [],
    })),
    visitingAssignments: (initial?.visitingAssignments || []).map((a) => ({
      gradeLevel: a.gradeLevel || "",
      section: a.section || "",
      subjects: a.subjects || [],
    })),
  });

  const [errors, setErrors] = useState({});
  const [feedback, setFeedback] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  useEffect(() => {
    getSubjectsConfig().then(setConfig).catch(() => {});
  }, []);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function addRow(kind) {
    setForm((prev) => ({
      ...prev,
      [kind]: [...prev[kind], { gradeLevel: "", section: "", subjects: [] }],
    }));
  }

  function updateRow(kind, i, key, value) {
    setForm((prev) => {
      const next = [...prev[kind]];
      next[i] = { ...next[i], [key]: value };
      // Clear subjects if grade changes — they may no longer be valid.
      if (key === "gradeLevel" && next[i].subjects?.length) {
        next[i].subjects = [];
      }
      return { ...prev, [kind]: next };
    });
  }

  function toggleRowSubject(kind, i, code) {
    setForm((prev) => {
      const next = [...prev[kind]];
      const current = next[i].subjects || [];
      next[i] = {
        ...next[i],
        subjects: current.includes(code)
          ? current.filter((c) => c !== code)
          : [...current, code],
      };
      return { ...prev, [kind]: next };
    });
  }

  function removeRow(kind, i) {
    setForm((prev) => ({ ...prev, [kind]: prev[kind].filter((_, idx) => idx !== i) }));
  }

  function offeredSubjectsFor(gradeLevel) {
    if (!config || !gradeLevel) return [];
    return config.entryByGrade?.[gradeLevel] || [];
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

    // Each row must have at least one subject.
    cleanedHome.forEach((row, i) => {
      if (!row.subjects?.length) e[`home_${i}`] = "Pick at least one subject for this class.";
    });
    cleanedVisiting.forEach((row, i) => {
      if (!row.subjects?.length) e[`visiting_${i}`] = "Pick at least one subject for this class.";
    });

    // Subjects must be offered at that grade.
    [["home", cleanedHome], ["visiting", cleanedVisiting]].forEach(([kind, rows]) => {
      rows.forEach((row, i) => {
        const offered = offeredSubjectsFor(row.gradeLevel);
        const bad = (row.subjects || []).find((c) => !offered.includes(c));
        if (bad) e[`${kind}_${i}`] = `${bad} is not offered at ${row.gradeLevel}.`;
      });
    });

    // No duplicate grade+section within each list.
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
      homeAssignments: form.homeAssignments
        .filter((r) => r.gradeLevel && r.section && r.subjects?.length)
        .map((r) => ({ gradeLevel: r.gradeLevel, section: r.section, subjects: r.subjects })),
      visitingAssignments: form.visitingAssignments
        .filter((r) => r.gradeLevel && r.section && r.subjects?.length)
        .map((r) => ({ gradeLevel: r.gradeLevel, section: r.section, subjects: r.subjects })),
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

  function renderAssignmentRow(kind, row, i) {
    const offered = offeredSubjectsFor(row.gradeLevel);
    const errorKey = `${kind}_${i}`;
    return (
      <div key={i} className="edit-assignment-row">
        <div className="edit-form-row-3" style={{ alignItems: "flex-end" }}>
          <div className="edit-form-group">
            <label>Grade Level</label>
            <select value={row.gradeLevel} onChange={(e) => updateRow(kind, i, "gradeLevel", e.target.value)}>
              <option value="">Select</option>
              {GRADE_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div className="edit-form-group">
            <label>Section</label>
            <select value={row.section} onChange={(e) => updateRow(kind, i, "section", e.target.value)}>
              <option value="">Select</option>
              {SECTION_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="edit-form-group">
            <button type="button" className="edit-btn edit-btn-secondary" onClick={() => removeRow(kind, i)}>Remove</button>
          </div>
        </div>

        <div className="edit-assignment-subjects">
          <div className="edit-assignment-subjects-label">Subjects for this class</div>
          {!row.gradeLevel ? (
            <p className="edit-assignment-subjects-hint">Pick a grade level first.</p>
          ) : offered.length === 0 ? (
            <p className="edit-assignment-subjects-hint">No subjects configured for {row.gradeLevel}.</p>
          ) : (
            <div className="edit-assignment-subject-grid">
              {offered.map((code) => {
                const checked = (row.subjects || []).includes(code);
                const name = config?.subjects?.[code] || code;
                return (
                  <label key={code} className={`edit-assignment-subject ${checked ? "is-checked" : ""}`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleRowSubject(kind, i, code)}
                    />
                    <span className="edit-assignment-subject-code">{code}</span>
                    <span className="edit-assignment-subject-name">{name}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {errors[errorKey] && <div className="edit-field-error" style={{ marginTop: "0.5rem" }}>{errors[errorKey]}</div>}
      </div>
    );
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
      </form>

      <div className="edit-card" style={{ marginTop: "1.5rem" }}>
        <h2>Home Classes</h2>
        <p className="enrollment-help-text" style={{ marginTop: 0 }}>
          Classes where this teacher is the homeroom adviser.
        </p>
        {form.homeAssignments.map((row, i) => renderAssignmentRow("homeAssignments", row, i))}
        <button type="button" className="edit-btn edit-btn-secondary" onClick={() => addRow("homeAssignments")}>+ Add Home Class</button>
      </div>

      <div className="edit-card" style={{ marginTop: "1.5rem" }}>
        <h2>Visiting Classes</h2>
        <p className="enrollment-help-text" style={{ marginTop: 0 }}>
          Classes where this teacher teaches as a visiting specialist.
        </p>
        {form.visitingAssignments.map((row, i) => renderAssignmentRow("visitingAssignments", row, i))}
        <button type="button" className="edit-btn edit-btn-secondary" onClick={() => addRow("visitingAssignments")}>+ Add Visiting Class</button>
      </div>

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
