"use client";

import { useState } from "react";

const GRADE_LEVELS = [
  "Kindergarten",
  "Grade 1",
  "Grade 2",
  "Grade 3",
  "Grade 4",
  "Grade 5",
  "Grade 6",
];

const SECTIONS = ["A", "B", "C"];

export default function StudentInfoStep({ data, onChange, onNext }) {
  const [errors, setErrors] = useState({});

  function handleFieldChange(field, value) {
    onChange({ [field]: value });
    // Clear that field's error the moment the admin starts fixing it
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  }

  function validate() {
    const newErrors = {};

    if (!data.firstName.trim()) newErrors.firstName = "First name is required.";
    if (!data.lastName.trim()) newErrors.lastName = "Last name is required.";
    if (!data.dateOfBirth) newErrors.dateOfBirth = "Date of birth is required.";
    if (!data.gradeLevel) newErrors.gradeLevel = "Please select a grade level.";
    if (!data.section) newErrors.section = "Please select a section.";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleNext() {
    if (validate()) {
      onNext();
    }
  }

  return (
    <div>
      <h2 className="enrollment-step-title">Student Information</h2>

      <div className="enrollment-form-row">
        <div className="enrollment-form-group">
          <label htmlFor="firstName">
            First Name<span className="required">*</span>
          </label>
          <input
            id="firstName"
            type="text"
            placeholder="Juan"
            value={data.firstName}
            onChange={(e) => handleFieldChange("firstName", e.target.value)}
            className={errors.firstName ? "input-invalid" : ""}
          />
          {errors.firstName && <p className="enrollment-field-error">{errors.firstName}</p>}
        </div>

        <div className="enrollment-form-group">
          <label htmlFor="middleName">Middle Name</label>
          <input
            id="middleName"
            type="text"
            placeholder="Optional"
            value={data.middleName}
            onChange={(e) => handleFieldChange("middleName", e.target.value)}
          />
        </div>
      </div>

      <div className="enrollment-form-group">
        <label htmlFor="lastName">
          Last Name<span className="required">*</span>
        </label>
        <input
          id="lastName"
          type="text"
          placeholder="Dela Cruz"
          value={data.lastName}
          onChange={(e) => handleFieldChange("lastName", e.target.value)}
          className={errors.lastName ? "input-invalid" : ""}
        />
        {errors.lastName && <p className="enrollment-field-error">{errors.lastName}</p>}
      </div>

      <div className="enrollment-form-group">
        <label htmlFor="dateOfBirth">
          Date of Birth<span className="required">*</span>
        </label>
        <input
          id="dateOfBirth"
          type="date"
          value={data.dateOfBirth}
          onChange={(e) => handleFieldChange("dateOfBirth", e.target.value)}
          className={errors.dateOfBirth ? "input-invalid" : ""}
        />
        {errors.dateOfBirth && <p className="enrollment-field-error">{errors.dateOfBirth}</p>}
      </div>

      <div className="enrollment-form-row">
        <div className="enrollment-form-group">
          <label htmlFor="gradeLevel">
            Grade Level<span className="required">*</span>
          </label>
          <select
            id="gradeLevel"
            value={data.gradeLevel}
            onChange={(e) => handleFieldChange("gradeLevel", e.target.value)}
            className={errors.gradeLevel ? "input-invalid" : ""}
          >
            <option value="">Select grade level</option>
            {GRADE_LEVELS.map((grade) => (
              <option key={grade} value={grade}>
                {grade}
              </option>
            ))}
          </select>
          {errors.gradeLevel && <p className="enrollment-field-error">{errors.gradeLevel}</p>}
        </div>

        <div className="enrollment-form-group">
          <label htmlFor="section">
            Section<span className="required">*</span>
          </label>
          <select
            id="section"
            value={data.section}
            onChange={(e) => handleFieldChange("section", e.target.value)}
            className={errors.section ? "input-invalid" : ""}
          >
            <option value="">Select section</option>
            {SECTIONS.map((section) => (
              <option key={section} value={section}>
                {section}
              </option>
            ))}
          </select>
          {errors.section && <p className="enrollment-field-error">{errors.section}</p>}
        </div>
      </div>

      <div className="enrollment-step-actions">
        <button type="button" className="enrollment-btn enrollment-btn-primary" onClick={handleNext}>
          Next: Parent/Guardian Information
        </button>
      </div>
    </div>
  );
}