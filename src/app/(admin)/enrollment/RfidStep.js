"use client";

import { useEffect, useRef, useState } from "react";

export default function RfidStep({ value, onChange, onNext, onBack }) {
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  // Auto-focus the field the moment this step appears — ready for a scanner
  // to "type" into it immediately, no click required from the admin.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleChange(e) {
    onChange(e.target.value);
    if (error) setError("");
  }

  function handleNext() {
    // RFID is optional at enrollment time, so no required-field validation here.
    // We only guard against obviously malformed input if something was typed.
    if (value.trim() && value.trim().length < 4) {
      setError("That doesn't look like a complete RFID tag. Please check and try again.");
      return;
    }
    onNext();
  }

  function handleSkip() {
    onChange("");
    onNext();
  }

  return (
    <div>
      <h2 className="enrollment-step-title">RFID Tag</h2>

      <div className="enrollment-form-group">
        <label htmlFor="rfidTag">RFID Tag ID</label>
        <input
          id="rfidTag"
          ref={inputRef}
          type="text"
          placeholder="Scan the tag, or type the ID manually"
          value={value}
          onChange={handleChange}
          className={error ? "input-invalid" : ""}
          autoComplete="off"
        />
        <p className="enrollment-help-text">
          A Student ID will be generated automatically once enrollment is complete. If the
          student's RFID tag isn't available yet, you can skip this step and assign it later
          from the Students page.
        </p>
        {error && <p className="enrollment-field-error">{error}</p>}
      </div>

      <div className="enrollment-step-actions">
        <button type="button" className="enrollment-btn enrollment-btn-secondary" onClick={onBack}>
          Back
        </button>
        <div style={{ display: "flex", gap: "0.75rem", marginLeft: "auto" }}>
          <button type="button" className="enrollment-btn enrollment-btn-secondary" onClick={handleSkip}>
            Skip — Assign Later
          </button>
          <button type="button" className="enrollment-btn enrollment-btn-primary" onClick={handleNext}>
            Next: Review
          </button>
        </div>
      </div>
    </div>
  );
}