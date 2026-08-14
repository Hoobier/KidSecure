"use client";

import { useState, useEffect } from "react";
import StudentInfoStep from "./StudentInfoStep";
import ParentInfoStep from "./ParentInfoStep";
import RfidStep from "./RfidStep";
import ReviewStep from "./ReviewStep";
import "./enrollment.css";

const STEPS = ["Student Information", "Parent/Guardian Information", "RFID Tag", "Review"];
const STORAGE_KEY = "kidsecure_enrollment_draft";

const BLANK_FORM_DATA = {
  student: {
    firstName: "",
    middleName: "",
    lastName: "",
    dateOfBirth: "",
    gradeLevel: "",
    section: "",
  },
  parent: {
    mode: "new",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    existingParentId: null,
    existingParentName: "",
  },
  rfidTag: "",
};

export default function EnrollmentPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState(BLANK_FORM_DATA);
  const [restored, setRestored] = useState(false);
  const [showRestoreBanner, setShowRestoreBanner] = useState(false);

  // On mount, check for a saved draft and restore it.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.formData) setFormData(parsed.formData);
        if (typeof parsed.currentStep === "number") setCurrentStep(parsed.currentStep);
        setShowRestoreBanner(true);
      }
    } catch {
      // Corrupted or missing draft — just start fresh, no need to surface an error for this.
    } finally {
      setRestored(true);
    }
  }, []);

  // Persist on every change, but only after the initial restore check has run —
  // otherwise we'd immediately overwrite a saved draft with the blank initial state.
  useEffect(() => {
    if (!restored) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ formData, currentStep }));
    } catch {
      // sessionStorage can fail in rare cases (private browsing quotas, etc.) —
      // non-critical, the wizard just won't persist this session.
    }
  }, [formData, currentStep, restored]);

  function clearDraft() {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // no-op
    }
  }

  function updateFormData(section, fields) {
    setFormData((prev) => ({
      ...prev,
      [section]: { ...prev[section], ...fields },
    }));
  }

  function goNext() {
    setCurrentStep((step) => Math.min(step + 1, STEPS.length - 1));
  }

  function goBack() {
    setCurrentStep((step) => Math.max(step - 1, 0));
  }

  function handleStartOver() {
    clearDraft();
    setFormData(BLANK_FORM_DATA);
    setCurrentStep(0);
    setShowRestoreBanner(false);
  }

  return (
    <div className="enrollment-page">
      <h1>Enroll New Student</h1>

      {showRestoreBanner && (
        <div className="enrollment-restore-banner">
          <span>We restored your in-progress enrollment. </span>
          <button type="button" onClick={handleStartOver} className="enrollment-restore-clear">
            Start Over Instead
          </button>
        </div>
      )}

      {/* Step progress indicator */}
      <div className="enrollment-progress">
        {STEPS.map((label, index) => (
          <div
            key={label}
            className={
              "enrollment-progress-item" +
              (index === currentStep ? " active" : "") +
              (index < currentStep ? " completed" : "")
            }
          >
            <span className="enrollment-progress-number">{index + 1}</span>
            <span className="enrollment-progress-label">{label}</span>
          </div>
        ))}
      </div>

      <div className="enrollment-step-content">
        {currentStep === 0 && (
          <StudentInfoStep
            data={formData.student}
            onChange={(fields) => updateFormData("student", fields)}
            onNext={goNext}
          />
        )}
        {currentStep === 1 && (
          <ParentInfoStep
            data={formData.parent}
            onChange={(fields) => updateFormData("parent", fields)}
            onNext={goNext}
            onBack={goBack}
          />
        )}
        {currentStep === 2 && (
          <RfidStep
            value={formData.rfidTag}
            onChange={(value) => setFormData((prev) => ({ ...prev, rfidTag: value }))}
            onNext={goNext}
            onBack={goBack}
          />
        )}
        {currentStep === 3 && (
          <ReviewStep
            formData={formData}
            onBack={goBack}
            onSubmitSuccess={clearDraft}
          />
        )}
      </div>
    </div>
  );
}