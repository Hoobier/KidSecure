"use client";

import { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

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

const NAME_REGEX = /^[A-Za-z\s\-'.]{2,50}$/;

// ---- Date helpers: convert between "YYYY-MM-DD" string and real Date objects ----

function stringToDate(dobString) {
  if (!dobString) return null;
  const [year, month, day] = dobString.split("-").map(Number);
  return new Date(year, month - 1, day); // JS months are 0-indexed
}

function dateToString(date) {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

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

// ---- Allowed birth date range: student must be between 3 and 15 years old ----

function getMinDate() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 16);
  d.setDate(d.getDate() + 1); // one day after turning 16, so 15 is still valid
  return d;
}

function getMaxDate() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 3);
  return d;
}

export default function StudentInfoStep({ data, onChange, onNext }) {
  const [errors, setErrors] = useState({});

  function handleFieldChange(field, value) {
    onChange({ [field]: value });
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  }

  function handleDobChange(date) {
    onChange({ dateOfBirth: dateToString(date) });
    if (errors.dateOfBirth) {
      setErrors((prev) => ({ ...prev, dateOfBirth: "" }));
    }
  }

  function validate() {
    const newErrors = {};

    if (!data.firstName.trim()) {
      newErrors.firstName = "First name is required.";
    } else if (!NAME_REGEX.test(data.firstName.trim())) {
      newErrors.firstName = "First name may only contain letters, spaces, hyphens, apostrophes, and periods (2–50 characters).";
    }

    if (data.middleName && data.middleName.trim() && !NAME_REGEX.test(data.middleName.trim())) {
      newErrors.middleName = "Middle name may only contain letters, spaces, hyphens, apostrophes, and periods (2–50 characters).";
    }

    if (!data.lastName.trim()) {
      newErrors.lastName = "Last name is required.";
    } else if (!NAME_REGEX.test(data.lastName.trim())) {
      newErrors.lastName = "Last name may only contain letters, spaces, hyphens, apostrophes, and periods (2–50 characters).";
    }

    if (!data.dateOfBirth) {
      newErrors.dateOfBirth = "Date of birth is required.";
    }
    // No need to re-check the age range here — the calendar itself
    // only allows selecting dates within the valid 3–15 age window.

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

      <div className="enrollment-form-row-3">
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
            className={errors.middleName ? "input-invalid" : ""}
          />
          {errors.middleName && <p className="enrollment-field-error">{errors.middleName}</p>}
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
      </div>

      <div className="enrollment-form-row-3">
        <div className="enrollment-form-group">
          <label htmlFor="dateOfBirth">
            Date of Birth<span className="required">*</span>
          </label>
          <DatePicker
            id="dateOfBirth"
            selected={stringToDate(data.dateOfBirth)}
            onChange={handleDobChange}
            minDate={getMinDate()}
            maxDate={getMaxDate()}
            placeholderText="mm/dd/yyyy"
            dateFormat="MM/dd/yyyy"
            showMonthDropdown
            showYearDropdown
            dropdownMode="select"
            className={errors.dateOfBirth ? "input-invalid" : ""}
            wrapperClassName="enrollment-datepicker-wrapper"
          />
          {errors.dateOfBirth && <p className="enrollment-field-error">{errors.dateOfBirth}</p>}
        </div>

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