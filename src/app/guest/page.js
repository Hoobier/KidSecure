"use client";

import { useState, useRef, useEffect } from "react";
import "./guest.css";

const REQUIREMENTS = [
  { type: "birth_certificate", label: "Birth Certificate", icon: "📄" },
  { type: "id_picture_1x1", label: "1x1 ID Picture", icon: "🖼️" },
];

const GRADE_OPTIONS = [
  "Kindergarten",
  "Grade 1",
  "Grade 2",
  "Grade 3",
  "Grade 4",
  "Grade 5",
  "Grade 6",
];

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

export default function GuestEnrollmentPage() {
  const [form, setForm] = useState({
    student: {
      firstName: "",
      lastName: "",
      birthDate: "",
      gender: "",
      address: "",
      phone: "",
      email: "",
    },
    parent: {
      fullName: "",
      relationship: "",
      phone: "",
      email: "",
    },
    academic: {
      gradeLevel: "",
      previousSchool: "",
    },
    signature: "",
  });
  const [errors, setErrors] = useState({});
  const [files, setFiles] = useState({});
  const [preview, setPreview] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const canvasRef = useRef(null);
  const signaturePadRef = useRef({ drawing: false, ctx: null, lastX: 0, lastY: 0 });

  const [dobOpen, setDobOpen] = useState(false);
  const [dobPicker, setDobPicker] = useState(() => {
    const today = new Date();
    return { y: today.getFullYear(), m: today.getMonth() };
  });
  const dobWrapRef = useRef(null);

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
      let y = prev.y;
      let m = prev.m + dir;
      if (m < 0) { m = 11; y -= 1; }
      if (m > 11) { m = 0; y += 1; }
      return { y, m };
    });
  }

  function dobDayGrid() {
    const { y, m } = dobPicker;
    const firstDOW = new Date(y, m, 1).getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const prevMonthDays = new Date(y, m, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstDOW; i++) {
      cells.push({ d: prevMonthDays - firstDOW + 1 + i, inMonth: false });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      cells.push({ d, inMonth: true });
    }
    let tail = 1;
    while (cells.length % 7 !== 0) {
      cells.push({ d: tail, inMonth: false });
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
    if (!signaturePadRef.current.ctx) signaturePadRef.current.ctx = ctx;
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
    const ctx = signaturePadRef.current.ctx;
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

  function clearSignature() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setForm((prev) => ({ ...prev, signature: "" }));
  }

  function handleFileUpload(type, file) {
    if (!file) return;
    setFiles((prev) => ({ ...prev, [type]: file }));
    const url = URL.createObjectURL(file);
    setPreview((prev) => ({ ...prev, [type]: url }));
  }

  function removeFile(type) {
    setFiles((prev) => {
      const copy = { ...prev };
      delete copy[type];
      return copy;
    });
    setPreview((prev) => {
      const copy = { ...prev };
      delete copy[type];
      return copy;
    });
  }

  function validate() {
    const errs = {};
    const required = [
      ["student", "firstName", "First Name is required"],
      ["student", "lastName", "Last Name is required"],
      ["student", "birthDate", "Birth Date is required"],
      ["student", "gender", "Gender is required"],
      ["student", "address", "Student Address is required"],
      ["student", "phone", "Student Contact Number is required"],
      ["student", "email", "Email Address is required"],
      ["parent", "fullName", "Parent/Guardian Name is required"],
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
    if (form.student.phone && !isValidPHPhone(form.student.phone)) {
      errs.student = errs.student || {};
      errs.student.phone = "Enter a valid PH mobile number (09XXXXXXXXX — 11 digits)";
    }
    if (form.parent.phone && !isValidPHPhone(form.parent.phone)) {
      errs.parent = errs.parent || {};
      errs.parent.phone = "Enter a valid PH mobile number (09XXXXXXXXX — 11 digits)";
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
        signature: form.signature || null,
      };
      fd.append("data", JSON.stringify(payload));
      if (files.birth_certificate) fd.append("birth_certificate", files.birth_certificate);
      if (files.id_picture_1x1) fd.append("id_picture_1x1", files.id_picture_1x1);

      const res = await fetch("/api/guest/enrollments", {
        method: "POST",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Submission failed. Please try again.");

      setFeedback({
        type: "success",
        message: "✅ Enrollment form submitted! We will contact you via email shortly.",
      });
      handleReset();
    } catch (err) {
      setFeedback({
        type: "error",
        message: (err && err.message) || "Submission failed. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
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
      </header>

      <main className="guest-main">
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
                            const curY = new Date().getFullYear();
                            const out = [];
                            for (let y = curY; y >= curY - 25; y--) out.push(y);
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
                              onClick={() => { if (cell.inMonth) selectDobDay(cell.d); }}
                              disabled={!cell.inMonth}
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

            <div className="guest-row guest-row-2">
              <div className="guest-field">
                <label htmlFor="studentPhone">
                  Contact Number: <span className="guest-required">*</span>
                  <span className="guest-field-hint">(PH: 09XXXXXXXXX)</span>
                </label>
                <input
                  id="studentPhone"
                  type="tel"
                  className={inputInvalid("student", "phone")}
                  placeholder="09XXXXXXXXX"
                  inputMode="numeric"
                  maxLength={11}
                  value={form.student.phone}
                  onChange={(e) => updatePhone("student", "phone", e.target.value)}
                />
                {errors?.student?.phone && (
                  <p className="guest-field-error">{errors.student.phone}</p>
                )}
              </div>
              <div className="guest-field">
                <label htmlFor="studentEmail">
                  Email Address: <span className="guest-required">*</span>
                </label>
                <input
                  id="studentEmail"
                  type="email"
                  className={inputInvalid("student", "email")}
                  placeholder="name@example.com"
                  value={form.student.email}
                  onChange={(e) => updateForm("student", "email", e.target.value)}
                />
                {errors?.student?.email && (
                  <p className="guest-field-error">{errors.student.email}</p>
                )}
              </div>
            </div>
          </section>

          {/* Parent / Guardian */}
          <section className="guest-section">
            <h2 className="guest-section-title">Parent / Guardian Information</h2>

            <div className="guest-row">
              <div className="guest-field">
                <label htmlFor="parentName">
                  Parent / Guardian Name: <span className="guest-required">*</span>
                </label>
                <input
                  id="parentName"
                  className={inputInvalid("parent", "fullName")}
                  placeholder="Full Name"
                  value={form.parent.fullName}
                  onChange={(e) => updateForm("parent", "fullName", e.target.value)}
                />
                {errors?.parent?.fullName && (
                  <p className="guest-field-error">{errors.parent.fullName}</p>
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
                  <option value="">Ex- Father/Mother</option>
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
                  onChange={(e) => updateForm("academic", "gradeLevel", e.target.value)}
                >
                  <option value="">Ex- 8th Grade</option>
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
                <label htmlFor="previousSchool">Previous School (if applicable):</label>
                <input
                  id="previousSchool"
                  className="guest-input"
                  placeholder="Full Name"
                  value={form.academic.previousSchool}
                  onChange={(e) => updateForm("academic", "previousSchool", e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* Document Uploads */}
          <section className="guest-section">
            <h2 className="guest-section-title">Required Documents</h2>
            <div className="guest-requirements">
              {REQUIREMENTS.map((req) => {
                const file = files[req.type];
                const hasFile = !!file;
                const inputId = `req-${req.type}`;
                return (
                  <div
                    key={req.type}
                    className={
                      "guest-requirement " +
                      (hasFile ? "guest-requirement-uploaded" : "")
                    }
                  >
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
                        {hasFile && preview[req.type] && (
                          <img
                            src={preview[req.type]}
                            alt={req.label}
                            className="guest-requirement-preview"
                          />
                        )}
                      </div>
                    </div>
                    <div className="guest-requirement-actions">
                      {hasFile ? (
                        <button
                          type="button"
                          className="guest-btn guest-btn-secondary"
                          onClick={() => removeFile(req.type)}
                        >
                          Remove
                        </button>
                      ) : (
                        <>
                          <label
                            htmlFor={inputId}
                            className="guest-btn guest-btn-primary guest-btn-upload"
                          >
                            Upload
                          </label>
                          <input
                            id={inputId}
                            type="file"
                            className="guest-file-input"
                            accept={
                              req.type === "id_picture_1x1"
                                ? "image/*"
                                : "application/pdf,image/*"
                            }
                            onChange={(e) =>
                              handleFileUpload(req.type, e.target.files?.[0] || null)
                            }
                          />
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
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
              onClick={() => {
                setFeedback(null);
                setErrors({});
                Object.keys(files).forEach((k) => removeFile(k));
                clearSignature();
              }}
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
      </main>

      <footer className="guest-footer">
        <p>© 2026 KidSecure. · Secure enrollment portal for parents and guardians</p>
      </footer>
    </div>
  );
}
