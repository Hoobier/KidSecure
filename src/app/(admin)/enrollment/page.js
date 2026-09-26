"use client";

//src/app/(admin)/enrollment/page.js

import { useState, useEffect } from "react";
import StudentInfoStep from "./StudentInfoStep";
import ParentInfoStep from "./ParentInfoStep";
import RfidStep from "./RfidStep";
import ReviewStep from "./ReviewStep";
import "./enrollment.css";

const STEPS = ["Student Information", "Parent/Guardian Information", "RFID Tag", "Review"];
const STORAGE_KEY = "kidsecure_enrollment_draft";
const LEFT_MARKER_KEY = "kidsecure_enrollment_left";

const BLANK_FORM_DATA = {
  student: {
    firstName: "",
    middleName: "",
    lastName: "",
    dateOfBirth: "",
    gradeLevel: "",
    section: "",
    isTransferee: false,
    hasPreviousSchool: false,
    previousSchool: "",
  },
  parent: {
    mode: "new",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    relationship: "",
    existingParentId: null,
    existingParentName: "",
    existingParentRelationship: "",
  },
  rfidTag: "",
  documents: [],
};

function hasFilledData(formData) {
  const s = formData.student;
  const p = formData.parent;
  return Boolean(
    s.firstName || s.middleName || s.lastName || s.dateOfBirth || s.gradeLevel || s.section ||
    p.firstName || p.lastName || p.email || p.phone || p.relationship ||
    p.existingParentId || p.existingParentName || p.existingParentRelationship ||
    formData.rfidTag
  );
}

export default function EnrollmentPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState(BLANK_FORM_DATA);
  const [draftId, setDraftId] = useState(null);
  const [restored, setRestored] = useState(false);
  const [showRestoreBanner, setShowRestoreBanner] = useState(false);

  // On mount, check for a saved draft and restore it. Also read the
  // "left marker" — a flag written only when the admin navigated away
  // via an internal link while the form had data. The banner shows only
  // when both a draft exists AND the marker is present.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      const leftMarker = sessionStorage.getItem(LEFT_MARKER_KEY);

      // Always clear the marker — it's a one-shot signal.
      if (leftMarker) {
        sessionStorage.removeItem(LEFT_MARKER_KEY);
      }

      if (saved) {
        const parsed = JSON.parse(saved);
        const restoredFormData = parsed.formData || BLANK_FORM_DATA;
        const restoredStep = typeof parsed.currentStep === "number" ? parsed.currentStep : 0;
        setFormData(restoredFormData);
        setCurrentStep(restoredStep);
        setDraftId(parsed.draftId || crypto.randomUUID());

        if (leftMarker && hasFilledData(restoredFormData)) {
          setShowRestoreBanner(true);
        }
      } else {
        setDraftId(crypto.randomUUID());
      }
    } catch {
      setDraftId(crypto.randomUUID());
    } finally {
      setRestored(true);
    }
  }, []);

  // Persist on every change, but only after the initial restore check has run —
  // otherwise we'd immediately overwrite a saved draft with the blank initial state.
  useEffect(() => {
    if (!restored) return;
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ formData, currentStep, draftId }));
    } catch {
      // sessionStorage can fail in rare cases (private browsing quotas, etc.) —
      // non-critical, the wizard just won't persist this session.
    }
  }, [formData, currentStep, draftId, restored]);

  // Detect internal navigation while the form has data. When the admin
  // clicks any internal link (sidebar, breadcrumb, etc.), mark that we've
  // left. On return, the mount effect reads the marker and shows the banner.
  useEffect(() => {
    if (!restored) return;

    function handleClick(e) {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const anchor = e.target.closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || !href.startsWith("/")) return;
      if (anchor.target === "_blank") return;

      if (!hasFilledData(formData)) return;

      try {
        sessionStorage.setItem(LEFT_MARKER_KEY, "1");
      } catch {
        // non-critical
      }
    }

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [restored, formData]);

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
    setDraftId(crypto.randomUUID());
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
            draftId={draftId}
            documents={formData.documents}
            onDocumentsChange={(docs) => setFormData((prev) => ({ ...prev, documents: docs }))}
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