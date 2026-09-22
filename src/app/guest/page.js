"use client";
// src/app/guest/page.js
import { useState, useRef, useEffect } from "react";
import "./guest.css";

const REQUIREMENTS = [
  { type: "birth_certificate", label: "Birth Certificate", icon: "📄" },
  { type: "id_picture_1x1", label: "1x1 ID Picture", icon: "🖼️" },
];

const TRANSFEREE_REQUIREMENTS = [
  { type: "form_138", label: "Form 138", icon: "📄" },
  { type: "good_moral", label: "Good Moral", icon: "📄" },
];

const GRADE_OPTIONS = [
  "Nursery",
  "Kindergarten",
  "Preparatory",
  "Grade 1",
  "Grade 2",
  "Grade 3",
  "Grade 4",
  "Grade 5",
  "Grade 6",
];

const TRANSFEREE_GRADES = ["Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6"];

const RELATIONSHIP_OPTIONS = ["Mom", "Dad", "Guardian"];

const SCHOOL_SEAL_SVG = (
  <svg viewBox="0 0 120 120" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <clipPath id="seal-clip">
        <circle cx="60" cy="60" r="54" />
      </clipPath>
    </defs>
    <circle cx="60" cy="60" r="54" fill="#1e824c" stroke="#135a34" strokeWidth="2" />
    <circle cx="60" cy="60" r="50" fill="none" stroke="#c9a227" strokeWidth="2" strokeDasharray="4 2.5" />
    <g clipPath="url(#seal-clip)">
      <rect x="6" y="6" width="108" height="48" fill="#ffd43b" />
      <path d="M6 54 H114 L78 54 Q60 72 42 54 Z" fill="#2a5caa" />
      <path d="M6 54 H42 Q60 84 78 54 H114 V114 H6 Z" fill="#2a5caa" />
    </g>
    <path d="M60 28 q6 4 6 14 q0 6 -3 10 q-3 -4 -3 -10 q0 -10 0 -14 z" fill="#e03131" />
    <path d="M52 50 l8 28 l8 -28 z" fill="#ffffff" stroke="#c9a227" strokeWidth="1" />
    <circle cx="60" cy="62" r="5" fill="#704a12" />
    <path d="M44 72 q16 14 32 0 q-8 20 -16 20 q-8 0 -16 -20 z" fill="#1e824c" />
  </svg>
);

function getInitialFormState() {
  return {
    student: { firstName: "", lastName: "", birthDate: "", gender: "", address: "" },
    parent: { firstName: "", lastName: "", relationship: "", phone: "", email: "" },
    academic: { gradeLevel: "", previousSchool: "" },
    signature: "",
  };
}

/** Shared upload block used for every document requirement (main + transferee). */
function RequirementItem({ req, file, previewUrl, onUpload, onRemove, error }) {
  const hasFile = !!file;
  const inputId = `req-${req.type}`;
  return (
    <div className={"guest-requirement " + (hasFile ? "guest-requirement-uploaded" : "")}>
      <div className="guest-requirement-info">
        <span className="guest-requirement-icon">{req.icon}</span>
        <div>
          <h3 className="guest-requirement-name">{req.label}</h3>
          {hasFile ? (
            <p className="guest-requirement-status guest-status-ok">
              ✓ {file.name} ({(file.size / 1024).toFixed(1)} KB)
            </p>
          ) : (
            <p className="guest-requirement-status guest-status-pending">
              ⚠ Not uploaded
            </p>
          )}
          {hasFile && previewUrl && (
            <img src={previewUrl} alt={req.label} className="guest-requirement-preview" />
          )}
          {error && <p className="guest-field-error">{error}</p>}
        </div>
      </div>
      <div className="guest-requirement-actions">
        {hasFile ? (
          <button
            type="button"
            className="guest-btn guest-btn-secondary"
            onClick={() => onRemove(req.type)}
          >
            Remove
          </button>
        ) : (
          <>
            <label htmlFor={inputId} className="guest-btn guest-btn-primary guest-btn-upload">
              Upload
            </label>
            <input
              id={inputId}
              type="file"
              className="guest-file-input"
              accept={req.type === "id_picture_1x1" ? "image/*" : "application/pdf,image/*"}
              onChange={(e) => onUpload(req.type, e.target.files?.[0] || null)}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default function GuestEnrollmentPage() {
  const [form, setForm] = useState(getInitialFormState);
  const isTransferee = TRANSFEREE_GRADES.includes(form.academic.gradeLevel);
  const [hasPreviousSchool, setHasPreviousSchool] = useState(false);
  const showPreviousSchool = isTransferee || hasPreviousSchool;
  const [errors, setErrors] = useState({});
  const [files, setFiles] = useState({});
  const [preview, setPreview] = useState({});
  const [followUpDocuments, setFollowUpDocuments] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [submittedApplication, setSubmittedApplication] = useState(null); // { referenceNumber }
  const [lookupRef, setLookupRef] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [lookupResult, setLookupResult] = useState(null);
  const [showLookupPopup, setShowLookupPopup] = useState(false);
  const [copied, setCopied] = useState(false);

  const canvasRef = useRef(null);
  const signaturePadRef = useRef({ drawing: false, lastX: 0, lastY: 0 });

  const [dobOpen, setDobOpen] = useState(false);
  const [dobPicker, setDobPicker] = useState(() => {
    const today = new Date();
    const defaultYear = today.getFullYear() - 8;
    return { y: defaultYear, m: today.getMonth() };
  });
  const dobWrapRef = useRef(null);

  const MIN_AGE = 3;
  const MAX_AGE = 15;

  function getAgeRangeBoundaries() {
    const today = new Date();
    const maxBirth = new Date(
      today.getFullYear() - MIN_AGE,
      today.getMonth(),
      today.getDate()
    );
    const minBirth = new Date(
      today.getFullYear() - MAX_AGE - 1,
      today.getMonth(),
      today.getDate() + 1
    );
    return {
      minYear: minBirth.getFullYear(),
      maxYear: maxBirth.getFullYear(),
      minDate: new Date(minBirth.getFullYear(), minBirth.getMonth(), minBirth.getDate()),
      maxDate: new Date(maxBirth.getFullYear(), maxBirth.getMonth(), maxBirth.getDate()),
    };
  }

  function computeAge(iso) {
    if (!iso) return null;
    const [y, m, d] = iso.split("-").map((n) => parseInt(n, 10));
    if (!y || !m || !d) return null;
    const birth = new Date(y, m - 1, d);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }

  useEffect(() => {
    function onDocClick(e) {
      if (!dobWrapRef.current) return;
      if (!dobWrapRef.current.contains(e.target)) setDobOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function formatDisplayYMD(iso) {
    if (!iso) return "";
    const [y, m, d] = iso.split("-");
    if (!y || !m || !d) return "";
    return `${m}/${d}/${y}`;
  }

  function openDobPicker() {
    if (form.student.birthDate) {
      const [y, m] = form.student.birthDate.split("-").map((n) => parseInt(n, 10));
      if (y) setDobPicker({ y, m: m ? m - 1 : new Date().getMonth() });
    }
    setDobOpen(true);
  }

  function selectDobDay(day) {
    const iso = `${dobPicker.y}-${pad2(dobPicker.m + 1)}-${pad2(day)}`;
    updateForm("student", "birthDate", iso);
    setDobOpen(false);
  }

  function stepDobMonth(dir) {
    setDobPicker((prev) => {
      const { minYear, maxYear } = getAgeRangeBoundaries();
      let y = prev.y;
      let m = prev.m + dir;
      if (m < 0) { m = 11; y -= 1; }
      if (m > 11) { m = 0; y += 1; }
      if (y < minYear) { y = minYear; m = 0; }
      if (y > maxYear) { y = maxYear; m = 11; }
      return { y, m };
    });
  }

  function dobDayGrid() {
    const { y, m } = dobPicker;
    const { minDate, maxDate } = getAgeRangeBoundaries();
    const firstDOW = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const prevMonthDays = new Date(y, m, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDOW; i++) {
      cells.push({ d: prevMonthDays - firstDOW + 1 + i, inMonth: false, disabled: true });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dayDate = new Date(y, m, d);
      const disabled = dayDate < minDate || dayDate > maxDate;
      cells.push({ d, inMonth: true, disabled });
    }
    let tail = 1;
    while (cells.length % 7 !== 0) {
      cells.push({ d: tail, inMonth: false, disabled: true });
      tail++;
    }
    return cells;
  }

  function updateForm(section, field, value) {
    setForm((prev) => ({ ...prev, [section]: { ...prev[section], [field]: value } }));
    if (errors?.[section]?.[field]) {
      setErrors((prev) => ({
        ...prev,
        [section]: { ...prev[section], [field]: undefined },
      }));
    }
  }

  function handleGradeChange(newGrade) {
    const wasTransfer = TRANSFEREE_GRADES.includes(form.academic.gradeLevel);
    const isNowTransfer = TRANSFEREE_GRADES.includes(newGrade);

    updateForm("academic", "gradeLevel", newGrade);

    if (isNowTransfer) {
      setHasPreviousSchool(true);
    } else if (wasTransfer) {
      setHasPreviousSchool(false);
      updateForm("academic", "previousSchool", "");
    }
  }

  function formatPhoneInput(raw) {
    const digits = String(raw || "").replace(/\D/g, "").slice(0, 11);
    if (digits.length === 0) return "";
    if (digits === "0") return "0";
    if (digits.startsWith("09")) return digits;
    if (digits.startsWith("9")) return "0" + digits;
    if (digits.startsWith("0") && !digits.startsWith("09")) {
      return "09" + digits.slice(1).replace(/^9+/, "").slice(0, 9);
    }
    return "09" + digits.replace(/^9+/, "").slice(0, 9);
  }

  function updatePhone(section, field, raw) {
    updateForm(section, field, formatPhoneInput(raw));
  }

  function isValidPHPhone(v) {
    return /^09\d{9}$/.test(String(v || ""));
  }

  function onSignatureMouseDown(e) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    signaturePadRef.current.drawing = true;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    signaturePadRef.current.lastX = (e.clientX - rect.left) * scaleX;
    signaturePadRef.current.lastY = (e.clientY - rect.top) * scaleY;
  }

  function onSignatureMouseMove(e) {
    if (!signaturePadRef.current.drawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1b2a4a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(signaturePadRef.current.lastX, signaturePadRef.current.lastY);
    ctx.lineTo(x, y);
    ctx.stroke();
    signaturePadRef.current.lastX = x;
    signaturePadRef.current.lastY = y;
    setForm((prev) => ({ ...prev, signature: canvas.toDataURL("image/png") }));
  }

  function onSignatureMouseUp() {
    signaturePadRef.current.drawing = false;
    if (errors?.signature) {
      setErrors((prev) => ({ ...prev, signature: undefined }));
    }
  }

  /** Wipes only the visible canvas pixels — does not touch form.signature by itself. */
  function clearSignatureCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function clearSignature() {
    clearSignatureCanvas();
    setForm((prev) => ({ ...prev, signature: "" }));
  }

  function handleFileUpload(type, file) {
    if (!file) return;
    setFiles((prev) => ({ ...prev, [type]: file }));
    const url = URL.createObjectURL(file);
    setPreview((prev) => ({ ...prev, [type]: url }));
    if (errors?.documents?.[type]) {
      setErrors((prev) => ({
        ...prev,
        documents: { ...prev.documents, [type]: undefined },
      }));
    }
  }

  function removeFile(type) {
    setFiles((prev) => {
      const copy = { ...prev };
      delete copy[type];
      return copy;
    });
    setPreview((prev) => {
      const copy = { ...prev };
      if (copy[type]) URL.revokeObjectURL(copy[type]);
      delete copy[type];
      return copy;
    });
  }

  /** Full reset: form fields, files, previews, signature, errors — used by both the
   *  "Reset Form" button and after a successful submission ("Submit Another Application"). */
  function handleResetForm() {
    setForm(getInitialFormState());
    setErrors({});
    Object.values(preview).forEach((url) => URL.revokeObjectURL(url));
    setFiles({});
    setPreview({});
    setFollowUpDocuments(false);
    clearSignatureCanvas();
    setFeedback(null);
    setDobOpen(false);
  }

  function validate() {
    const errs = {};
    const required = [
      ["student", "firstName", "First Name is required"],
      ["student", "lastName", "Last Name is required"],
      ["student", "birthDate", "Birth Date is required"],
      ["student", "gender", "Gender is required"],
      ["student", "address", "Student Address is required"],
      ["parent", "firstName", "Parent/Guardian First Name is required"],
      ["parent", "lastName", "Parent/Guardian Last Name is required"],
      ["parent", "relationship", "Relationship is required"],
      ["parent", "phone", "Parent Contact Number is required"],
      ["parent", "email", "Parent Email is required"],
      ["academic", "gradeLevel", "Grade/Program is required"],
    ];
    required.forEach(([section, field, message]) => {
      if (!form[section][field]) {
        errs[section] = errs[section] || {};
        errs[section][field] = message;
      }
    });
    if (form.parent.phone && !isValidPHPhone(form.parent.phone)) {
      errs.parent = errs.parent || {};
      errs.parent.phone = "Enter a valid PH mobile number (09XXXXXXXXX — 11 digits)";
    }
    if (form.student.birthDate) {
      const age = computeAge(form.student.birthDate);
      if (age !== null && (age < MIN_AGE || age > MAX_AGE)) {
        errs.student = errs.student || {};
        errs.student.birthDate = `Student must be between ${MIN_AGE} and ${MAX_AGE} years old on enrollment date`;
      }
    }
    if (showPreviousSchool && !form.academic.previousSchool.trim()) {
      errs.academic = errs.academic || {};
      errs.academic.previousSchool = "Please enter the student's previous school.";
    }

    // Documents: required unless the parent opted to follow up documents on enrollment day.
    if (!followUpDocuments) {
      const requiredDocs = [
        ...REQUIREMENTS,
        ...(showPreviousSchool ? TRANSFEREE_REQUIREMENTS : []),
      ];
      requiredDocs.forEach((req) => {
        if (!files[req.type]) {
          errs.documents = errs.documents || {};
          errs.documents[req.type] = `Please upload ${req.label}`;
        }
      });
    }

    if (!form.signature) errs.signature = "Please sign the declaration";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) {
      setFeedback({ type: "error", message: "Please fill in all required fields." });
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    try {
      const fd = new FormData();
      const payload = {
        student: form.student,
        parent: form.parent,
        academic: form.academic,
        isTransferee,
        documentsFollowUp: !!followUpDocuments,
        signature: form.signature || null,
      };
      fd.append("data", JSON.stringify(payload));
      if (files.birth_certificate) fd.append("birth_certificate", files.birth_certificate);
      if (files.id_picture_1x1) fd.append("id_picture_1x1", files.id_picture_1x1);
      if (showPreviousSchool && files.form_138) fd.append("form_138", files.form_138);
      if (showPreviousSchool && files.good_moral) fd.append("good_moral", files.good_moral);

      const res = await fetch("/api/guest/enrollments", {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Submission failed. Please try again.");

      setSubmittedApplication({ referenceNumber: data.referenceNumber });
    } catch (err) {
      setFeedback({
        type: "error",
        message: (err && err.message) || "Submission failed. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  function handleCopyReference() {
    if (!submittedApplication?.referenceNumber) return;
    navigator.clipboard
      .writeText(submittedApplication.referenceNumber)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {});
  }

  function startNewApplication() {
    setSubmittedApplication(null);
    handleResetForm();
  }

  async function handleLookupSubmit(e) {
    e.preventDefault();
    const ref = lookupRef.trim();
    if (!ref) return;

    setLookupLoading(true);
    setLookupError("");
    setLookupResult(null);

    try {
      const res = await fetch(`/api/guest/enrollments/lookup?ref=${encodeURIComponent(ref)}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLookupError(data.message || "We couldn't find an application with that reference number.");
        setShowLookupPopup(true);
        return;
      }
      setLookupResult(data.data);
      setShowLookupPopup(true);
    } catch {
      setLookupError("Unable to reach the server. Please try again.");
      setShowLookupPopup(true);
    } finally {
      setLookupLoading(false);
    }
  }

  function closeLookupPopup() {
    setShowLookupPopup(false);
    setLookupResult(null);
    setLookupError("");
  }

  const inputInvalid = (section, field) =>
    errors?.[section]?.[field] ? "guest-input guest-input-invalid" : "guest-input";

  return (
    <div className="guest-page">
      <header className="guest-header">
        <div className="guest-header-inner">
          <div className="guest-brand">
            <span className="guest-brand-mark" aria-hidden="true">{SCHOOL_SEAL_SVG}</span>
            <div>
              <h1>KidSecure</h1>
              <p>Rainbow 5 Christian Academy of Caloocan Inc.</p>
            </div>
          </div>
          <p className="guest-header-note">
            Fields marked with <span className="guest-required">*</span> are required
          </p>
        </div>

        <div className="guest-header-lookup-row">
          <form onSubmit={handleLookupSubmit} className="guest-lookup-form">
            <input
              type="text"
              className="guest-lookup-input"
              placeholder="Check your application status (e.g. RCAC-7F3K9Q)"
              value={lookupRef}
              onChange={(e) => setLookupRef(e.target.value.toUpperCase())}
            />
            <button
              type="submit"
              className="guest-lookup-btn"
              disabled={lookupLoading || !lookupRef.trim()}
            >
              {lookupLoading ? "Checking…" : "Check Status"}
            </button>
          </form>
        </div>
      </header>

      <main className="guest-main">
        {submittedApplication ? (
          <div className="guest-form-card guest-success-card">
            <div className="guest-success">
              <div className="guest-success-icon">✓</div>
              <h2>Application Submitted!</h2>
              <p>
                Please save your reference number below. You can look it up anytime using the
                search bar at the top of this page to check your application status.
              </p>
              <div className="guest-refnum-box">
                <span className="guest-refnum-label">Your Reference Number</span>
                <strong className="guest-refnum-value">{submittedApplication.referenceNumber}</strong>
                <button
                  type="button"
                  className="guest-btn guest-btn-ghost guest-refnum-copy"
                  onClick={handleCopyReference}
                >
                  {copied ? "Copied!" : "Copy Reference Number"}
                </button>
              </div>
              <p className="guest-success-note">
                You will be able to check your status anytime with the reference number above. If
                your application is approved, your parent app login details will be sent to the
                email address you provided.
              </p>
              <button type="button" className="guest-btn guest-btn-primary" onClick={startNewApplication}>
                Submit Another Application
              </button>
            </div>
          </div>
        ) : (
          <form className="guest-form-card" onSubmit={handleSubmit} noValidate>
            {feedback && (
              <div
                className={
                  "guest-feedback " +
                  (feedback.type === "success" ? "guest-feedback-success" : "guest-feedback-error")
                }
              >
                {feedback.message}
              </div>
            )}

            {/* Student Information */}
            <section className="guest-section">
              <h2 className="guest-section-title">Student Information</h2>

              <div className="guest-row guest-row-2">
                <div className="guest-field">
                  <label htmlFor="studentFirstName">
                    Student Name: <span className="guest-required">*</span>
                  </label>
                  <div className="guest-row guest-row-2 guest-nested">
                    <div className="guest-field guest-field-nested">
                      <input
                        id="studentFirstName"
                        className={inputInvalid("student", "firstName")}
                        placeholder="First Name"
                        value={form.student.firstName}
                        onChange={(e) => updateForm("student", "firstName", e.target.value)}
                      />
                      {errors?.student?.firstName && (
                        <p className="guest-field-error">{errors.student.firstName}</p>
                      )}
                    </div>
                    <div className="guest-field guest-field-nested">
                      <input
                        id="studentLastName"
                        className={inputInvalid("student", "lastName")}
                        placeholder="Last Name"
                        value={form.student.lastName}
                        onChange={(e) => updateForm("student", "lastName", e.target.value)}
                      />
                      {errors?.student?.lastName && (
                        <p className="guest-field-error">{errors.student.lastName}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="guest-row guest-row-2">
                <div className="guest-field">
                  <label htmlFor="studentBirthDate">
                    Birth Date: <span className="guest-required">*</span>
                  </label>
                  <div className="guest-dob-wrap" ref={dobWrapRef}>
                    <button
                      id="studentBirthDate"
                      type="button"
                      className={
                        (inputInvalid("student", "birthDate") + " guest-dob-trigger") +
                        (form.student.birthDate ? " has-value" : "")
                      }
                      onClick={() => { openDobPicker(); }}
                    >
                      {form.student.birthDate ? formatDisplayYMD(form.student.birthDate) : "mm/dd/yyyy"}
                      <span className="guest-dob-cal-icon" aria-hidden="true">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect x="3" y="5" width="18" height="16" rx="2" stroke="#1b2a4a" strokeWidth="2"/>
                          <path d="M16 3v4M8 3v4M3 10h18" stroke="#1b2a4a" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      </span>
                    </button>
                    {dobOpen && (
                      <div className="guest-dob-popover" role="dialog">
                        <div className="guest-dob-header">
                          <button
                            type="button"
                            className="guest-dob-nav"
                            onClick={() => stepDobMonth(-1)}
                            aria-label="Previous month"
                          >
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M15 6l-6 6 6 6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                          <div className="guest-dob-title">
                            {MONTHS[dobPicker.m]} {dobPicker.y}
                          </div>
                          <button
                            type="button"
                            className="guest-dob-nav guest-dob-nav-next"
                            onClick={() => stepDobMonth(1)}
                            aria-label="Next month"
                          >
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M9 6l6 6-6 6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </button>
                        </div>
                        <div className="guest-dob-select-row">
                          <select
                            className="guest-dob-select"
                            value={dobPicker.m}
                            onChange={(e) => setDobPicker((p) => ({ ...p, m: Number(e.target.value) }))}
                          >
                            {MONTHS.map((name, i) => (
                              <option key={name} value={i}>{name}</option>
                            ))}
                          </select>
                          <select
                            className="guest-dob-select"
                            value={dobPicker.y}
                            onChange={(e) => setDobPicker((p) => ({ ...p, y: Number(e.target.value) }))}
                          >
                            {(() => {
                              const { minYear, maxYear } = getAgeRangeBoundaries();
                              const out = [];
                              for (let y = maxYear; y >= minYear; y--) out.push(y);
                              return out.map((y) => (
                                <option key={y} value={y}>{y}</option>
                              ));
                            })()}
                          </select>
                        </div>
                        <div className="guest-dob-weekday-row">
                          {["S", "M", "T", "W", "T", "F", "S"].map((w, i) => (
                            <div key={i} className="guest-dob-weekday">{w}</div>
                          ))}
                        </div>
                        <div className="guest-dob-day-grid">
                          {dobDayGrid().map((cell, idx) => {
                            const isSelected = (
                              cell.inMonth &&
                              form.student.birthDate === `${dobPicker.y}-${pad2(dobPicker.m + 1)}-${pad2(cell.d)}`
                            );
                            const isToday = (() => {
                              const t = new Date();
                              return cell.inMonth &&
                                dobPicker.y === t.getFullYear() &&
                                dobPicker.m === t.getMonth() &&
                                cell.d === t.getDate();
                            })();
                            return (
                              <button
                                type="button"
                                key={idx}
                                className={
                                  "guest-dob-day" +
                                  (!cell.inMonth ? " out" : "") +
                                  (isSelected ? " selected" : "") +
                                  (isToday ? " today" : "")
                                }
                                onClick={() => { if (cell.inMonth && !cell.disabled) selectDobDay(cell.d); }}
                                disabled={!cell.inMonth || cell.disabled}
                              >
                                {cell.d}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                  {errors?.student?.birthDate && (
                    <p className="guest-field-error">{errors.student.birthDate}</p>
                  )}
                </div>
                <div className="guest-field">
                  <label>
                    Gender: <span className="guest-required">*</span>
                  </label>
                  <div className="guest-radio-row">
                    {["Male", "Female"].map((g) => (
                      <label key={g} className="guest-radio">
                        <input
                          type="radio"
                          name="gender"
                          value={g}
                          checked={form.student.gender === g}
                          onChange={(e) => updateForm("student", "gender", e.target.value)}
                        />
                        <span>{g}</span>
                      </label>
                    ))}
                  </div>
                  {errors?.student?.gender && (
                    <p className="guest-field-error">{errors.student.gender}</p>
                  )}
                </div>
              </div>

              <div className="guest-row">
                <div className="guest-field">
                  <label htmlFor="studentAddress">
                    Student Address: <span className="guest-required">*</span>
                  </label>
                  <input
                    id="studentAddress"
                    className={inputInvalid("student", "address")}
                    placeholder="Full Address"
                    value={form.student.address}
                    onChange={(e) => updateForm("student", "address", e.target.value)}
                  />
                  {errors?.student?.address && (
                    <p className="guest-field-error">{errors.student.address}</p>
                  )}
                </div>
              </div>
            </section>

            {/* Parent / Guardian */}
            <section className="guest-section">
              <h2 className="guest-section-title">Parent / Guardian Information</h2>

              <div className="guest-row">
                <div className="guest-field">
                  <label htmlFor="parentFirstName">
                    Parent / Guardian First Name: <span className="guest-required">*</span>
                  </label>
                  <input
                    id="parentFirstName"
                    className={inputInvalid("parent", "firstName")}
                    placeholder="First Name"
                    value={form.parent.firstName}
                    onChange={(e) => updateForm("parent", "firstName", e.target.value)}
                  />
                  {errors?.parent?.firstName && (
                    <p className="guest-field-error">{errors.parent.firstName}</p>
                  )}
                </div>
                <div className="guest-field">
                  <label htmlFor="parentLastName">
                    Parent / Guardian Last Name: <span className="guest-required">*</span>
                  </label>
                  <input
                    id="parentLastName"
                    className={inputInvalid("parent", "lastName")}
                    placeholder="Last Name"
                    value={form.parent.lastName}
                    onChange={(e) => updateForm("parent", "lastName", e.target.value)}
                  />
                  {errors?.parent?.lastName && (
                    <p className="guest-field-error">{errors.parent.lastName}</p>
                  )}
                </div>
              </div>

              <div className="guest-row guest-row-3">
                <div className="guest-field">
                  <label htmlFor="parentRelationship">
                    Relationship To Student: <span className="guest-required">*</span>
                  </label>
                  <select
                    id="parentRelationship"
                    className={inputInvalid("parent", "relationship")}
                    value={form.parent.relationship}
                    onChange={(e) => updateForm("parent", "relationship", e.target.value)}
                  >
                    <option value="">— Select Relationship —</option>
                    {RELATIONSHIP_OPTIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  {errors?.parent?.relationship && (
                    <p className="guest-field-error">{errors.parent.relationship}</p>
                  )}
                </div>
                <div className="guest-field">
                  <label htmlFor="parentPhone">
                    Contact Number: <span className="guest-required">*</span>
                    <span className="guest-field-hint">(PH: 09XXXXXXXXX)</span>
                  </label>
                  <input
                    id="parentPhone"
                    type="tel"
                    className={inputInvalid("parent", "phone")}
                    placeholder="09XXXXXXXXX"
                    inputMode="numeric"
                    maxLength={11}
                    value={form.parent.phone}
                    onChange={(e) => updatePhone("parent", "phone", e.target.value)}
                  />
                  {errors?.parent?.phone && (
                    <p className="guest-field-error">{errors.parent.phone}</p>
                  )}
                </div>
                <div className="guest-field">
                  <label htmlFor="parentEmail">
                    Email Address: <span className="guest-required">*</span>
                  </label>
                  <input
                    id="parentEmail"
                    type="email"
                    className={inputInvalid("parent", "email")}
                    placeholder="name@example.com"
                    value={form.parent.email}
                    onChange={(e) => updateForm("parent", "email", e.target.value)}
                  />
                  {errors?.parent?.email && (
                    <p className="guest-field-error">{errors.parent.email}</p>
                  )}
                </div>
              </div>
            </section>

            {/* Academic */}
            <section className="guest-section">
              <h2 className="guest-section-title">Academic Information</h2>

              <div className="guest-row guest-row-2">
                <div className="guest-field">
                  <label htmlFor="gradeLevel">
                    Grade / Program Applying For: <span className="guest-required">*</span>
                  </label>
                  <select
                    id="gradeLevel"
                    className={inputInvalid("academic", "gradeLevel")}
                    value={form.academic.gradeLevel}
                    onChange={(e) => handleGradeChange(e.target.value)}
                  >
                    <option value="">— Select Grade —</option>
                    {GRADE_OPTIONS.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                  {errors?.academic?.gradeLevel && (
                    <p className="guest-field-error">{errors.academic.gradeLevel}</p>
                  )}
                </div>
                <div className="guest-field">
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      cursor: isTransferee ? "default" : "pointer",
                      userSelect: "none",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={showPreviousSchool}
                      disabled={isTransferee}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setHasPreviousSchool(checked);
                        if (!checked) {
                          updateForm("academic", "previousSchool", "");
                        }
                      }}
                      style={{ width: "18px", height: "18px", accentColor: "#1b2a4a", margin: 0, colorScheme: "light", flexShrink: 0 }}
                    />
                    This student is transferring from another school
                  </label>
                </div>
              </div>

              {showPreviousSchool && (
                <div className="guest-row">
                  <div className="guest-field">
                    <label htmlFor="previousSchool">
                      Previous School<span className="guest-required"> *</span>:
                    </label>
                    <input
                      id="previousSchool"
                      className={inputInvalid("academic", "previousSchool")}
                      placeholder="Full Name"
                      value={form.academic.previousSchool}
                      onChange={(e) => updateForm("academic", "previousSchool", e.target.value)}
                    />
                    {errors?.academic?.previousSchool && (
                      <p className="guest-field-error">{errors.academic.previousSchool}</p>
                    )}
                  </div>
                </div>
              )}
            </section>

            {/* Document Uploads */}
            <section className="guest-section">
              <h2 className="guest-section-title">
                Required Documents{!followUpDocuments && <span className="guest-required"> *</span>}
              </h2>
              <div className="guest-requirements">
                {REQUIREMENTS.map((req) => (
                  <RequirementItem
                    key={req.type}
                    req={req}
                    file={files[req.type]}
                    previewUrl={preview[req.type]}
                    onUpload={handleFileUpload}
                    onRemove={removeFile}
                    error={errors?.documents?.[req.type]}
                  />
                ))}
              </div>

              {showPreviousSchool && (
                <p
                  style={{
                    margin: "1.25rem 0 0",
                    fontSize: "0.85rem",
                    color: "#6c7b95",
                  }}
                >
                  Please also submit the transfer documents below.
                </p>
              )}

              {showPreviousSchool && (
                <div
                  className="guest-requirements"
                  style={{
                    marginTop: "1rem",
                    borderTop: "1px dashed #d5dae2",
                    paddingTop: "1rem",
                  }}
                >
                  {TRANSFEREE_REQUIREMENTS.map((req) => (
                    <RequirementItem
                      key={req.type}
                      req={req}
                      file={files[req.type]}
                      previewUrl={preview[req.type]}
                      onUpload={handleFileUpload}
                      onRemove={removeFile}
                      error={errors?.documents?.[req.type]}
                    />
                  ))}
                </div>
              )}

              <div
                style={{
                  marginTop: "1.25rem",
                  paddingTop: "1rem",
                  borderTop: "1px dashed #d5dae2",
                }}
              >
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.6rem",
                    cursor: "pointer",
                    userSelect: "none",
                    fontSize: "0.95rem",
                    fontWeight: 600,
                    color: "#1b2a4a",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={followUpDocuments}
                    onChange={(e) => setFollowUpDocuments(e.target.checked)}
                    style={{
                      width: "18px",
                      height: "18px",
                      accentColor: "#1b2a4a",
                      margin: 0,
                      colorScheme: "light",
                      flexShrink: 0,
                    }}
                  />
                  Check this box if you want to follow up the documents upon enrollment
                </label>
                <p
                  style={{
                    margin: "0.35rem 0 0 2rem",
                    fontSize: "0.85rem",
                    color: "#6c7b95",
                  }}
                >
                  You can submit your application now and bring the physical documents on your enrollment day.
                </p>
              </div>
            </section>

            {/* Consent */}
            <section className="guest-section guest-section-consent">
              <h2 className="guest-section-title">Consent and Signature</h2>

              <p className="guest-consent-text">
                I confirm that all information provided above is true to the best of my knowledge.
                <span className="guest-required"> *</span>
              </p>

              <div className="guest-row guest-row-2">
                <div className="guest-field">
                  <div className="guest-signature-wrap">
                    <canvas
                      ref={canvasRef}
                      width={500}
                      height={160}
                      className={
                        errors?.signature
                          ? "guest-signature-pad guest-signature-invalid"
                          : "guest-signature-pad"
                      }
                      onMouseDown={onSignatureMouseDown}
                      onMouseMove={onSignatureMouseMove}
                      onMouseUp={onSignatureMouseUp}
                      onMouseLeave={onSignatureMouseUp}
                      onTouchStart={(e) => {
                        const t = e.touches[0];
                        onSignatureMouseDown({ clientX: t.clientX, clientY: t.clientY });
                      }}
                      onTouchMove={(e) => {
                        const t = e.touches[0];
                        onSignatureMouseMove({ clientX: t.clientX, clientY: t.clientY });
                      }}
                      onTouchEnd={onSignatureMouseUp}
                    />
                    <button
                      type="button"
                      className="guest-signature-clear"
                      onClick={clearSignature}
                    >
                      Clear
                    </button>
                  </div>
                  {errors?.signature && (
                    <p className="guest-field-error">{errors.signature}</p>
                  )}
                  <p className="guest-signature-label">Applicant Signature</p>
                </div>
                <div className="guest-field guest-brand-footer">
                  <div className="guest-brand-seal">
                    <span className="guest-seal-k">RCAC</span>
                    <span className="guest-seal-name">Rainbow 5 Christian Academy of Caloocan Inc.</span>
                    <span className="guest-seal-since">est. 2011</span>
                  </div>
                </div>
              </div>
            </section>

            <footer className="guest-form-footer">
              <button
                type="reset"
                className="guest-btn guest-btn-ghost"
                onClick={handleResetForm}
                disabled={submitting}
              >
                Reset Form
              </button>
              <button
                type="submit"
                className="guest-btn guest-btn-submit"
                disabled={submitting}
              >
                {submitting ? "Submitting…" : "Submit Enrollment →"}
              </button>
            </footer>
          </form>
        )}
      </main>

      <footer className="guest-footer">
        <p>© 2026 KidSecure. · Secure enrollment portal for parents and guardians</p>
      </footer>

      {showLookupPopup && (
        <div className="guest-lookup-overlay" onClick={closeLookupPopup}>
          <div className="guest-lookup-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="guest-lookup-close"
              onClick={closeLookupPopup}
              aria-label="Close"
            >
              ×
            </button>

            {lookupError ? (
              <div className="guest-lookup-result guest-lookup-result-error">
                <div className="guest-lookup-result-icon">❓</div>
                <h3>Not Found</h3>
                <p>{lookupError}</p>
              </div>
            ) : lookupResult ? (
              <LookupResultView result={lookupResult} />
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

function LookupResultView({ result }) {
  const { referenceNumber, status, studentFirstName, rejectionReason } = result;

  if (status === "pending") {
    return (
      <div className="guest-lookup-result guest-lookup-result-pending">
        <div className="guest-lookup-result-icon">⏳</div>
        <h3 style={{ fontWeight: 800 }}>Application Pending</h3>
        <p className="guest-lookup-refnum" style={{ fontSize: "1.35rem", letterSpacing: "2px" }}>{referenceNumber}</p>

        <p style={{ lineHeight: 1.7, margin: "0.5rem 0 0.75rem", textAlign: "center" }}>
          <strong>Enrollment Submitted Successfully!</strong>
          <br />
          <strong>This</strong> enrollment application has been submitted and is currently pending approval.
        </p>

        <p style={{ lineHeight: 1.7, margin: "0 0 1rem", textAlign: "center" }}>
          To complete the enrollment process and be accepted for enrollment,
          please proceed with the <strong>on-site payment of ₱6,000</strong>.
        </p>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: "2.5rem",
            flexWrap: "wrap",
            marginTop: "0.5rem",
            paddingTop: "1rem",
            borderTop: "1px dashed #d5dae2",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div style={{ fontWeight: 700, color: "#1b2a4a", marginBottom: "0.3rem" }}>Status:</div>
            <div style={{ color: "#854d0e" }}>Pending Payment / Pending Enrollment</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontWeight: 700, color: "#1b2a4a", marginBottom: "0.3rem" }}>Upon Enrollment:</div>
            <div style={{ color: "#1e824c", fontWeight: 600 }}>₱6,000</div>
          </div>
        </div>

        <p style={{ textAlign: "center", fontSize: "0.925rem", color: "#475569", marginTop: "1rem", marginBottom: 0 }}>
          Please visit the school/admissions office to make the payment and finalize your enrollment.
        </p>
      </div>
    );
  }

  if (status === "rejected") {
    return (
      <div className="guest-lookup-result guest-lookup-result-rejected">
        <div className="guest-lookup-result-icon">✕</div>
        <h3>Application Not Approved</h3>
        <p className="guest-lookup-refnum">{referenceNumber}</p>
        {rejectionReason && (
          <p className="guest-lookup-reason">
            <strong>Reason: </strong>{rejectionReason}
          </p>
        )}
      </div>
    );
  }

  if (status === "converted") {
    return (
      <div className="guest-lookup-result guest-lookup-result-converted">
        <div className="guest-lookup-result-icon">🎉</div>
        <h3>Approved!</h3>
        <p className="guest-lookup-refnum">{referenceNumber}</p>
        <p>
          Congratulations! Your parent app login details have been sent to the email address
          you provided.
        </p>
      </div>
    );
  }

  return (
    <div className="guest-lookup-result">
      <p className="guest-lookup-refnum">{referenceNumber}</p>
      <p>Status: {status}</p>
    </div>
  );
}