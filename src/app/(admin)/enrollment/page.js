"use client";

import { useState } from "react";
import StudentInfoStep from "./StudentInfoStep";
import ParentInfoStep from "./ParentInfoStep";
import RfidStep from "./RfidStep";
import ReviewStep from "./ReviewStep";
import "./enrollment.css";

const STEPS = ["Student Information", "Parent/Guardian Information", "RFID Tag", "Review"];

export default function EnrollmentPage() {
  const [currentStep, setCurrentStep] = useState(0);

  const [formData, setFormData] = useState({
    student: {
      firstName: "",
      middleName: "",
      lastName: "",
      dateOfBirth: "",
      gradeLevel: "",
      section: "",
    },
    parent: {
      mode: "new",       // or "existing"
      // used when mode is "new":
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      // used when mode is "existing":
      existingParentId: null,
      existingParentName: "", // just for display on the Review step
    },
    rfidTag: "",
  });

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

  return (
    <div className="enrollment-page">
      <h1>Enroll New Student</h1>

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
          />
        )}
      </div>
    </div>
  );
}