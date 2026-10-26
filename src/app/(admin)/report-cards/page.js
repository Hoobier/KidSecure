"use client";
// src/app/(admin)/report-cards/page.js
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import jsPDF from "jspdf";
import "./report-cards.css";

const TERMS = [
  { key: "T1", label: "Term 1" },
  { key: "T2", label: "Term 2" },
  { key: "T3", label: "Term 3" },
];

import { getSubjectsConfig, getEntrySubjectsForGrade, getDisplaySubjectsForGrade, getSubjectNameFromConfig, isComputedInConfig, computeDisplayGrade, computeDisplayFinal, computeFinalGrade, computeTermAverage, computeGeneralAverage, getDescriptorFor, getObservedValuesConfig } from "@/lib/subjectsCache";
import { drawReportCardPDF } from "@/lib/pdf-generator";

const STEPS = [
  "Term",
  "Grade & Section",
  "Review",
  "Select Students",
  "Confirm",
];

export default function AdminReportCardsPage() {
  const [tab, setTab] = useState("pending"); // "pending" | "released"
  const [subjectsConfig, setSubjectsConfig] = useState(null);
  const [observedValuesConfig, setObservedValuesConfig] = useState(null);

  useEffect(() => {
    getSubjectsConfig().then(setSubjectsConfig).catch(() => {});
    getObservedValuesConfig().then(setObservedValuesConfig).catch(() => {});
  }, []);

  return (
    <div className="rc-page">
      <header className="rc-page-header">
        <div>
          <h1>Report Cards</h1>
          <p className="rc-page-sub">
            Review adviser submissions, approve for printing, and manage approved cards.
          </p>
        </div>
      </header>

      <div className="rc-tabs">
        <button
          className={tab === "pending" ? "rc-tab rc-tab-active" : "rc-tab"}
          onClick={() => setTab("pending")}
        >
          Pending Approval
        </button>
        <button
          className={tab === "released" ? "rc-tab rc-tab-active" : "rc-tab"}
          onClick={() => setTab("released")}
        >
          Approved for Printing
        </button>
      </div>

      {tab === "pending" ? (
        <PendingWizard subjectsConfig={subjectsConfig} observedValuesConfig={observedValuesConfig} />
      ) : (
        <ReleasedView subjectsConfig={subjectsConfig} observedValuesConfig={observedValuesConfig} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pending Approval — the 5-step wizard
// ---------------------------------------------------------------------------

function PendingWizard({ subjectsConfig, observedValuesConfig }) {
  const [step, setStep] = useState(1);
  const [term, setTerm] = useState("T1");
  const [termSetting, setTermSetting] = useState(null);
  const [pending, setPending] = useState([]);
  const [selectedSection, setSelectedSection] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [releasing, setReleasing] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [editingStudent, setEditingStudent] = useState(null);
  const [feedback, setFeedback] = useState(null);

  // Load term setting once
  useEffect(() => {
    fetch("/api/term-settings", { credentials: "include" })
      .then((r) => r.json())
      .then((json) => {
        setTermSetting(json.data || json);
        const active = json.data?.activeTermNumber ?? json.activeTermNumber;
        if (active) setTerm(`T${active}`);
      })
      .catch(() => {});
  }, []);

  // Load pending sections whenever we get to step 2
  useEffect(() => {
    if (step !== 2) return;
    setLoading(true);
    setError("");
    fetch(`/api/report-cards/pending?term=${term}`, { credentials: "include" })
      .then((r) => r.json())
      .then((json) => setPending(json.data || []))
      .catch(() => setError("Unable to load pending report cards."))
      .finally(() => setLoading(false));
  }, [step, term]);

  // Load students when a section is chosen (steps 3-5)
  useEffect(() => {
    if (!selectedSection || step < 3) return;
    setLoading(true);
    setError("");
    const { gradeLevel, section } = selectedSection;
    fetch(`/api/report-cards/grade/${encodeURIComponent(gradeLevel)}/section/${encodeURIComponent(section)}?term=${term}`, {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((json) => {
        setStudents(json.data || []);
        // Auto-select only students whose card is submitted for the
        // CURRENT term and not yet approved for it.
        const defaultSelected = new Set(
          (json.data || [])
            .filter(
              (s) =>
                s.reportCardSubmittedTerm === term &&
                s.reportCardApprovedTerm !== term
            )
            .map((s) => s.id)
        );
        setSelectedIds(defaultSelected);
      })
      .catch(() => setError("Unable to load section students."))
      .finally(() => setLoading(false));
  }, [selectedSection]); // ← removed `step`, added term-awareness inside

  function refreshSection() {
    if (!selectedSection) return;
    const { gradeLevel, section } = selectedSection;
    return fetch(`/api/report-cards/grade/${encodeURIComponent(gradeLevel)}/section/${encodeURIComponent(section)}?term=${term}`, {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((json) => setStudents(json.data || []));
  }

  function resetToStep1() {
    setStep(1);
    setSelectedSection(null);
    setStudents([]);
    setSelectedIds(new Set());
    setProgress({ done: 0, total: 0 });
    setFeedback(null);
  }

  const totalCompiledSubjects = (student) => {
    const subjects = subjectsConfig?.entryByGrade?.[student.gradeLevel] || [];
    const card = student.reportCard || {};
    return subjects.filter((c) => card[c]?.[term]?.status === "compiled").length;
  };

  const releasableCount = students.filter(
    (s) => s.reportCardSubmittedTerm === term && s.reportCardApprovedTerm !== term
  ).length;

  const allSelected = students.length > 0 && selectedIds.size === students.filter(
    (s) => s.reportCardSubmittedTerm === term && s.reportCardApprovedTerm !== term
  ).length;

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(
        students.filter((s) => s.reportCardSubmittedTerm === term && s.reportCardApprovedTerm !== term).map((s) => s.id)
      ));
    }
  }

  function toggleSelect(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleApprove() {
    setReleasing(true);
    setError("");
    const ids = Array.from(selectedIds);
    setProgress({ done: 0, total: ids.length });

    let approved = 0;
    for (const id of ids) {
      try {
        const res = await fetch(`/api/students/${id}/report-card/approve`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ term }),
        });
        if (res.ok) approved++;
      } catch {
        // continue
      }
      setProgress((p) => ({ ...p, done: p.done + 1 }));
    }

    setReleasing(false);
    setFeedback({
      type: "success",
      message: `${approved} of ${ids.length} report cards approved for printing.`,
    });

    setTimeout(() => {
      resetToStep1();
    }, 1500);
  }

  return (
    <div className="rc-wizard">
      <div className="rc-steps">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const cls = n === step ? "rc-step rc-step-active" : n < step ? "rc-step rc-step-done" : "rc-step";
          return (
            <div key={label} className={cls}>
              <span className="rc-step-num">{n}</span>
              <span>{label}</span>
            </div>
          );
        })}
      </div>

      {error && <div className="rc-banner rc-banner-error">⚠️ {error}</div>}
      {feedback && (
        <div className={`rc-banner rc-banner-${feedback.type}`}>
          {feedback.message}
        </div>
      )}

      {step === 1 && (
        <div className="rc-card">
          <h2 className="rc-card-title">Choose Term</h2>
          <p className="rc-card-sub">
            School Year {termSetting?.schoolYearLabel || "…"}
          </p>
          <div className="rc-term-row">
            {TERMS.map((t) => (
              <button
                key={t.key}
                className={term === t.key ? "rc-term-btn rc-term-btn-active" : "rc-term-btn"}
                onClick={() => setTerm(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <div className="rc-actions">
            <span />
            <button className="rc-btn rc-btn-primary" onClick={() => setStep(2)}>
              Continue →
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="rc-card">
          <h2 className="rc-card-title">Grade & Section</h2>
          <p className="rc-card-sub">
            Sections with report cards submitted for {term}. Click a section to review.
          </p>
          {loading ? (
            <div className="rc-empty">Loading sections…</div>
          ) : pending.length === 0 ? (
            <div className="rc-empty">
              <div className="rc-empty-title">
                No report cards have been submitted for {term} yet.
              </div>
              <div className="rc-empty-hint">
                When an adviser finishes compiling a student's grades and clicks
                "Submit to Admin," the student's section will appear here for review.
              </div>
            </div>
          ) : (
            <div className="rc-section-grid">
              {pending.map((sec) => (
                <button
                  key={`${sec.gradeLevel}-${sec.section}`}
                  className="rc-section-card"
                  onClick={() => {
                    setSelectedSection(sec);
                    setStep(3);
                  }}
                >
                  <div className="rc-section-name">
                    {sec.gradeLevel} - {sec.section}
                  </div>
                  <div className="rc-section-meta">
                    {sec.count} submitted
                  </div>
                </button>
              ))}
            </div>
          )}
          <div className="rc-actions">
            <button className="rc-btn rc-btn-secondary" onClick={() => setStep(1)}>
              ← Back
            </button>
            <span />
          </div>
        </div>
      )}

      {step === 3 && selectedSection && (
        <div className="rc-card">
          <h2 className="rc-card-title">
            Review: {selectedSection.gradeLevel} - {selectedSection.section}
          </h2>
          <p className="rc-card-sub">
            {students.length} students · {releasableCount} ready to approve · {term}
          </p>
          {loading ? (
            <div className="rc-empty">Loading students…</div>
          ) : students.length === 0 ? (
            <div className="rc-empty">
              <div className="rc-empty-title">No students in this section.</div>
              <div className="rc-empty-hint">
                The section has no active or inactive students. It may have been
                emptied by a recent transfer or a rollover.
              </div>
            </div>
          ) : (
            <ReviewTable
              students={students}
              term={term}
              onEdit={(s) => setEditingStudent(s)}
              onDownload={(s) => downloadStudentPDF(s, term, subjectsConfig, termSetting?.schoolYearLabel, observedValuesConfig)}
              subjectsConfig={subjectsConfig}
            />
          )}
          <div className="rc-actions">
            <button className="rc-btn rc-btn-secondary" onClick={() => setStep(2)}>
              ← Back
            </button>
            <div className="rc-actions-right">
              <button
                className="rc-btn rc-btn-secondary"
                onClick={() => downloadSectionPDF(students, selectedSection, term, subjectsConfig, termSetting?.schoolYearLabel, observedValuesConfig)}
                disabled={students.length === 0}
              >
                📄 Download section PDF
              </button>
              <button className="rc-btn rc-btn-primary" onClick={() => setStep(4)}>
                Continue →
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 4 && selectedSection && (
        <div className="rc-card">
          <h2 className="rc-card-title">Select Students to Approve</h2>
          <p className="rc-card-sub">
            Uncheck anyone who should be held back.
          </p>
          <table className="rc-table">
            <thead>
              <tr>
                <th style={{ width: "40px" }}>
                  <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
                </th>
                <th>Student</th>
                <th style={{ width: "220px" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => {
                const ready = s.reportCardSubmittedTerm === term && s.reportCardApprovedTerm !== term;
                const compiled = totalCompiledSubjects(s);
                const totalSubjects = (subjectsConfig?.entryByGrade?.[s.gradeLevel] || []).length;
                return (
                  <tr key={s.id} className={!ready ? "rc-row-muted" : ""}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(s.id)}
                        onChange={() => toggleSelect(s.id)}
                        disabled={!ready}
                      />
                    </td>
                    <td>
                      {s.fullName}
                      <span className="rc-row-sub"> · {s.studentId}</span>
                    </td>
                    <td>
                      {s.reportCardApprovedTerm === term ? (
                        <span className="rc-pill rc-pill-released">Already approved</span>
                      ) : ready ? (
                        <span className="rc-pill rc-pill-ready">
                          {compiled} of {totalSubjects} subjects compiled
                        </span>
                      ) : (
                        <span className="rc-pill rc-pill-pending">
                          Not submitted yet
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="rc-actions">
            <button className="rc-btn rc-btn-secondary" onClick={() => setStep(3)}>
              ← Back
            </button>
            <div className="rc-actions-right">
              <button
                className="rc-btn rc-btn-primary"
                onClick={() => setStep(5)}
                disabled={selectedIds.size === 0}
              >
                Continue ({selectedIds.size}) →
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 5 && selectedSection && (
        <div className="rc-card">
          <h2 className="rc-card-title">Confirm Approval</h2>
          <p className="rc-card-sub">
            You are about to approve <strong>{selectedIds.size}</strong> report card
            {selectedIds.size === 1 ? "" : "s"} for{" "}
            <strong>{selectedSection.gradeLevel} - {selectedSection.section}</strong> ({term}).
          </p>
          <div className="rc-warning">
            ⚠️ Once approved, grades are locked. The adviser will be able to download the PDF for printing and mark it as distributed to the parent.
          </div>
          {releasing && (
            <div className="rc-progress">
              <div className="rc-progress-bar">
                <div
                  className="rc-progress-fill"
                  style={{ width: progress.total > 0 ? `${(progress.done / progress.total) * 100}%` : "0%" }}
                />
              </div>
              <div className="rc-progress-label">
                {progress.done} of {progress.total}
              </div>
            </div>
          )}
          <div className="rc-actions">
            <button
              className="rc-btn rc-btn-secondary"
              onClick={() => setStep(4)}
              disabled={releasing}
            >
              ← Back
            </button>
            <button
              className="rc-btn rc-btn-primary"
              onClick={handleApprove}
              disabled={releasing || selectedIds.size === 0}
            >
              {releasing ? "Approving…" : `Approve ${selectedIds.size} Report Card${selectedIds.size === 1 ? "" : "s"}`}
            </button>
          </div>
        </div>
      )}

      {editingStudent && (
        <EditReportCardModal
          student={editingStudent}
          term={term}
          onClose={() => setEditingStudent(null)}
          onSaved={() => {
            setEditingStudent(null);
            refreshSection();
          }}
          subjectsConfig={subjectsConfig}
          observedValuesConfig={observedValuesConfig}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Review table (used by Step 3)
// ---------------------------------------------------------------------------

function ReviewTable({ students, term, onEdit, onDownload, subjectsConfig }) {
  return (
    <div className="rc-table-wrap">
      <table className="rc-table">
        <thead>
          <tr>
            <th>Student</th>
            <th style={{ width: "100px" }}>Compiled</th>
            <th style={{ width: "140px" }}>Status</th>
            <th style={{ width: "180px" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => {
            const subjects = subjectsConfig?.entryByGrade?.[s.gradeLevel] || [];
            const card = s.reportCard || {};
            const compiled = subjects.filter((c) => card[c]?.[term]?.status === "compiled").length;
            const submitted = subjects.filter((c) => card[c]?.[term]?.status === "submitted").length;
            return (
              <tr key={s.id}>
                <td>
                  {s.fullName}
                  <span className="rc-row-sub"> · {s.studentId}</span>
                  {s.reportCardSubmittedAt && (
                    <span className="rc-row-sub rc-row-sub-block">
                      Submitted {new Date(s.reportCardSubmittedAt).toLocaleString()}
                    </span>
                  )}
                </td>
                <td>{compiled} / {subjects.length}</td>
                <td>
                  {s.reportCardApprovedTerm === term ? (
                <span className="rc-pill rc-pill-released">Approved for {term}</span>
                 ) : submitted > 0 ? (
                    <span className="rc-pill rc-pill-pending">{submitted} awaiting compile</span>
                  ) : compiled === subjects.length && subjects.length > 0 ? (
                    <span className="rc-pill rc-pill-ready">Ready</span>
                  ) : (
                    <span className="rc-pill rc-pill-pending">Incomplete</span>
                  )}
                </td>
                <td>
                  <div className="rc-row-actions">
                    <button className="rc-btn-small" onClick={() => onEdit(s)}>Edit</button>
                    <button className="rc-btn-small" onClick={() => onDownload(s)}>PDF</button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Edit modal — admin can edit any subject
// ---------------------------------------------------------------------------

function EditReportCardModal({ student, term, onClose, onSaved, subjectsConfig, observedValuesConfig }) {
  const subjects = subjectsConfig?.entryByGrade?.[student.gradeLevel] || [];
  const [grades, setGrades] = useState(() => {
    const initial = {};
    subjects.forEach((code) => {
      initial[code] = student.reportCard?.[code]?.[term]?.grade ?? "";
    });
    return initial;
  });
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [values, setValues] = useState(() => {
    const initial = {};
    const existing = student.observedValues?.[term] || {};
    Object.keys(observedValuesConfig?.coreValues || {}).forEach((code) => {
      initial[code] = existing[code] || "";
    });
    return initial;
  });

  const [attendanceEdits, setAttendanceEdits] = useState(() => {
    const initial = {};
    const saved = student.attendanceByMonth || {};
    const enriched = student.attendance || {};
    const months = subjectsConfig?.schoolMonths || [];
    months.forEach((month) => {
      const entry = saved[month] || {};
      const e = enriched[month] || {};
      // Only prefill inputs with the teacher's override values (if any).
      // Otherwise show the derived values so the admin sees what the card will display.
      const hasOverride = e.source === "overridden";
      initial[month] = {
        present: hasOverride && entry.present !== null && entry.present !== undefined
          ? String(entry.present)
          : "",
        tardy: hasOverride && entry.tardy !== null && entry.tardy !== undefined
          ? String(entry.tardy)
          : "",
      };
    });
    return initial;
  });

  function setGrade(code, value) {
    const sanitized = value === "" ? "" : value.replace(/[^\d.]/g, "").slice(0, 6);
    setGrades((g) => ({ ...g, [code]: sanitized }));
  }

  function setValue(code, rating) {
    setValues((v) => ({ ...v, [code]: rating }));
  }

  function setAttendance(month, field, value) {
    const v = value.replace(/\D/g, "").slice(0, 2);
    setAttendanceEdits((prev) => ({
      ...prev,
      [month]: { ...(prev[month] || {}), [field]: v },
    }));
  }

  async function save() {
    setSaving(true);
    setError("");

    // 1. Save grades (existing behavior)
    const payload = { grades: {} };
    subjects.forEach((code) => {
      payload.grades[code] = { [term]: { grade: grades[code] === "" ? null : grades[code] } };
    });
    if (note.trim()) payload.note = note.trim();

    try {
      const res = await fetch(`/api/students/${student.id}/report-card`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || "Unable to save grades.");
    } catch (e) {
      setError(e.message);
      setSaving(false);
      return;
    }

    // 2. Save attendance
    const attendanceMonths = {};
    Object.entries(attendanceEdits).forEach(([month, entry]) => {
      const present = entry.present === "" ? null : Number(entry.present);
      const tardy = entry.tardy === "" ? null : Number(entry.tardy);
      if (present === null && tardy === null) return;
      attendanceMonths[month] = {
        present: present === null ? 0 : present,
        tardy: tardy === null ? 0 : tardy,
      };
    });

    if (Object.keys(attendanceEdits).length > 0) {
      try {
        const res = await fetch(`/api/students/${student.id}/attendance`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ months: attendanceMonths }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.message || "Unable to save attendance.");
      } catch (e) {
        setError(e.message);
        setSaving(false);
        return;
      }
    }

    // 3. Save observed values
    // Only send codes that have a rating or were previously set.
    const valuesToSend = {};
    Object.entries(values).forEach(([code, rating]) => {
      if (rating) valuesToSend[code] = rating;
    });

    if (Object.keys(valuesToSend).length > 0) {
      try {
        const res = await fetch(`/api/students/${student.id}/observed-values`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ term, values: valuesToSend }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.message || "Unable to save observed values.");
      } catch (e) {
        setError(e.message);
        setSaving(false);
        return;
      }
    }

    onSaved();
    setSaving(false);
  }

  return (
    <div className="rc-modal-overlay" onClick={onClose}>
      <div className="rc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="rc-modal-header">
          <div>
            <h3>Edit Report Card</h3>
            <p>{student.fullName} · {student.studentId} · {term}</p>
          </div>
          <button className="rc-modal-close" onClick={onClose}>×</button>
        </div>

        {error && <div className="rc-banner rc-banner-error">⚠️ {error}</div>}

        <div className="rc-modal-body">
          <table className="rc-table">
            <thead>
              <tr>
                <th>Subject</th>
                <th style={{ width: "140px" }}>Grade</th>
                <th style={{ width: "140px" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {subjects.map((code) => {
                const entry = student.reportCard?.[code]?.[term] || {};
                return (
                  <tr key={code}>
                    <td>{subjectsConfig?.subjects?.[code] || code}</td>
                    <td>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={grades[code]}
                        onChange={(e) => setGrade(code, e.target.value)}
                        className="rc-modal-input"
                      />
                    </td>
                    <td>
                      <span className={`rc-pill rc-pill-${entry.status || "neutral"}`}>
                        {entry.status || "not started"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {subjectsConfig?.schoolMonths?.length > 0 && (
            <div className="rc-attendance-section">
              <h4 className="rc-attendance-section-title">Attendance</h4>
              {Object.values(student.attendance || {}).some((m) => m.source === "manual") && (
                <div className="rc-attendance-banner">
                  ⚠️ No RFID tag assigned — attendance is entered manually.
                </div>
              )}
              <table className="rc-table">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th style={{ width: "110px", textAlign: "center" }}>School Days</th>
                    <th style={{ width: "110px", textAlign: "center" }}>Days Present</th>
                    <th style={{ width: "110px", textAlign: "center" }}>Days Tardy</th>
                    <th style={{ width: "110px", textAlign: "center" }}>Days Absent</th>
                  </tr>
                </thead>
                <tbody>
                  {(subjectsConfig.schoolMonths || []).map((month) => {
                    const e = (student.attendance || {})[month] || {};
                    const edit = attendanceEdits[month] || { present: "", tardy: "" };
                    const isFuture = e.source === "future";
                    const isUnconfigured = e.source === "unconfigured";
                    const isEditable = !isFuture && !isUnconfigured;
                    const isPartial = Boolean(e.partial);

                    // Displayed values: prefer the input edit if the user is typing,
                    // else the derived value from the backend.
                    const presentDisplay =
                      edit.present !== "" ? edit.present : (e.present ?? "");
                    const tardyDisplay =
                      edit.tardy !== "" ? edit.tardy : (e.tardy ?? "");

                    return (
                      <tr key={month} className={isFuture ? "rc-attendance-future" : ""}>
                        <td>
                          <span>{month}</span>
                          {isUnconfigured && (
                            <span className="rc-attendance-badge rc-attendance-badge-unset">
                              UNSET
                            </span>
                          )}
                          {isPartial && (
                            <span className="rc-attendance-badge rc-attendance-badge-partial" title="Partial month">
                              *
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: "center", color: "#55617a" }}>
                          {isPartial
                            ? `${e.schoolDaysUpTo} / ${e.schoolDays}`
                            : e.schoolDays ?? "—"}
                        </td>
                        <td>
                          {isEditable ? (
                            <input
                              type="text"
                              inputMode="numeric"
                              className="rc-modal-input"
                              value={edit.present}
                              onChange={(ev) => setAttendance(month, "present", ev.target.value)}
                              placeholder={presentDisplay === "" ? "0" : String(presentDisplay)}
                            />
                          ) : (
                            <span className="rc-readonly-value">
                              {presentDisplay === "" ? "—" : presentDisplay}
                            </span>
                          )}
                        </td>
                        <td>
                          {isEditable ? (
                            <input
                              type="text"
                              inputMode="numeric"
                              className="rc-modal-input"
                              value={edit.tardy}
                              onChange={(ev) => setAttendance(month, "tardy", ev.target.value)}
                              placeholder={tardyDisplay === "" ? "0" : String(tardyDisplay)}
                            />
                          ) : (
                            <span className="rc-readonly-value">
                              {tardyDisplay === "" ? "—" : tardyDisplay}
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: "center", color: "#55617a" }}>
                          {e.absent === null || e.absent === undefined ? "—" : e.absent}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {Object.values(student.attendance || {}).some((m) => m.partial) && (
                <p className="rc-attendance-hint">
                  * Partial month — counts include only school days up to the end of the current view. Absent is not yet computable.
                </p>
              )}
            </div>
          )}

          {observedValuesConfig && (
            <div className="rc-observed-section">
              <h4 className="rc-observed-section-title">
                Report on Learner&apos;s Observed Values ({term})
              </h4>
              <table className="rc-table">
                <thead>
                  <tr>
                    <th>Core Values</th>
                    <th style={{ width: "220px" }}>Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(observedValuesConfig.coreValues || {}).map(([code, def]) => (
                    <tr key={code}>
                      <td>
                        <span className="rc-observed-code">{code}</span>
                        <span>{def.label}</span>
                      </td>
                      <td>
                        <select
                          value={values[code] || ""}
                          onChange={(e) => setValue(code, e.target.value)}
                          className="rc-modal-input"
                        >
                          <option value="">—</option>
                          {Object.entries(observedValuesConfig.ratings || {}).map(([ratingCode, label]) => (
                            <option key={ratingCode} value={ratingCode}>
                              {ratingCode} — {label}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <label className="rc-modal-note-label">
            Reason for this change
            <span className="rc-modal-note-hint">
              {" "}(required when editing an already compiled entry)
            </span>
            <textarea
              className="rc-modal-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Explain why this grade is being changed."
            />
          </label>
        </div>

        <div className="rc-modal-actions">
          <button className="rc-btn rc-btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button className="rc-btn rc-btn-primary" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Approved for printing tab
// ---------------------------------------------------------------------------

function ReleasedView({ subjectsConfig, observedValuesConfig }) {
  const [term, setTerm] = useState(null);
  const [sections, setSections] = useState([]);
  const [selectedSection, setSelectedSection] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [editingStudent, setEditingStudent] = useState(null);
  const [confirmUnrelease, setConfirmUnrelease] = useState(null);

  // Determine the current active term once, same as the wizard does.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/term-settings", { credentials: "include" });
        if (!res.ok) {
          if (!cancelled) setTerm("T1");
          return;
        }
        const json = await res.json();
        const data = json.data || json;
        const n = data.activeTermNumber ?? 1;
        if (!cancelled) setTerm(`T${n}`);
      } catch {
        if (!cancelled) setTerm("T1");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Load the approved sections once we know the term.
  useEffect(() => {
    if (!term) return;
    setLoading(true);
    setError("");
    fetch(`/api/report-cards/released-sections?term=${term}`, { credentials: "include" })
      .then((r) => r.json())
      .then((json) => setSections(json.data || []))
      .catch(() => setError("Unable to load approved sections."))
      .finally(() => setLoading(false));
  }, [term]);

  // Load students when a section is picked.
  useEffect(() => {
    if (!selectedSection || !term) return;
    setLoading(true);
    const { gradeLevel, section } = selectedSection;
    fetch(`/api/report-cards/grade/${encodeURIComponent(gradeLevel)}/section/${encodeURIComponent(section)}?term=${term}`, {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((json) => {
        // Include anyone whose card has been approved for THIS term.
        setStudents(
          (json.data || []).filter(
            (s) => s.reportCardApprovedTerm === term
          )
        );
      })
      .catch(() => setError("Unable to load approved students."))
      .finally(() => setLoading(false));
  }, [selectedSection, term]);

  function refreshSection() {
    if (!selectedSection || !term) return Promise.resolve();
    const { gradeLevel, section } = selectedSection;
    return fetch(`/api/report-cards/grade/${encodeURIComponent(gradeLevel)}/section/${encodeURIComponent(section)}?term=${term}`, {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((json) =>
        setStudents(
          (json.data || []).filter(
            (s) => s.reportCardApprovedTerm === term
          )
        )
      );
  }

  async function unapprove(id) {
    setConfirmUnrelease(null);
    try {
      const res = await fetch(`/api/students/${id}/report-card/unapprove`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      setFeedback({ type: "success", message: "Report card approval revoked." });
      refreshSection();
    } catch {
      setFeedback({ type: "error", message: "Unable to revoke approval." });
    }
  }

  if (term === null) {
    return <div className="rc-empty">Loading…</div>;
  }

  async function reApprove(id) {
    try {
      const res = await fetch(`/api/students/${id}/report-card/approve`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ term }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || "Unable to re-approve.");
      setFeedback({ type: "success", message: "Report card re-approved." });
      refreshSection();
    } catch (e) {
      setFeedback({ type: "error", message: e.message });
    }
  }  

  return (
    <div className="rc-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h2 className="rc-card-title" style={{ margin: 0 }}>Approved Report Cards</h2>
          <p className="rc-card-sub">Select a section to view approved cards.</p>
        </div>
        <div className="rc-term-switch" style={{ display: 'flex', gap: '0.5rem' }}>
          {['T1', 'T2', 'T3'].map((t) => (
            <button
              key={t}
              className={term === t ? "rc-tab rc-tab-active" : "rc-tab"}
              onClick={() => setTerm(t)}
            >
              Term {t.replace('T', '')}
            </button>
          ))}
        </div>
      </div>

      {feedback && (
        <div className={`rc-banner rc-banner-${feedback.type}`}>
          {feedback.message}
        </div>
      )}

      {error && <div className="rc-banner rc-banner-error">⚠️ {error}</div>}

      {sections.length === 0 && !loading ? (
        <div className="rc-empty">
          <div className="rc-empty-title">
            No report cards have been approved for {term} yet.
          </div>
          <div className="rc-empty-hint">
            Once you approve a student's report card from the Pending Approval tab,
            their section will appear here. You can edit or revoke approval at any time.
          </div>
        </div>
      ) : (
        <div className="rc-section-grid">
          {sections.map((sec) => (
            <button
              key={`${sec.gradeLevel}-${sec.section}`}
              className={
                selectedSection?.gradeLevel === sec.gradeLevel &&
                selectedSection?.section === sec.section
                  ? "rc-section-card rc-section-card-active"
                  : "rc-section-card"
              }
              onClick={() => setSelectedSection(sec)}
            >
              <div className="rc-section-name">
                {sec.gradeLevel} - {sec.section}
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedSection && (
        <>
          {loading ? (
            <div className="rc-empty">Loading…</div>
          ) : students.length === 0 ? (
            <div className="rc-empty">
              <div className="rc-empty-title">
                No approved cards in this section for {term}.
              </div>
              <div className="rc-empty-hint">
                Everyone in this section is still pending or in draft.
              </div>
            </div>
          ) : (
            <table className="rc-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th style={{ width: "180px" }}>Status</th>
                  <th style={{ width: "160px" }}>Approved</th>
                  <th style={{ width: "300px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => {
                  const isLive = s.reportCardApprovedTerm === term;
                  return (
                    <tr key={s.id}>
                      <td>
                        {s.fullName} <span className="rc-row-sub">· {s.studentId}</span>
                      </td>
                      <td>
                        {isLive ? (
                          <span className="rc-pill rc-pill-released">Approved</span>
                        ) : (
                          <span className="rc-pill rc-pill-pending">Not approved</span>
                        )}
                      </td>
                      <td>
                        {s.reportCardApprovedAt
                          ? new Date(s.reportCardApprovedAt).toLocaleDateString()
                          : "—"}
                      </td>
                      <td>
                        <div className="rc-row-actions">
                          <button className="rc-btn-small" onClick={() => setEditingStudent(s)}>
                            Edit
                          </button>
                          {s.reportCardApprovedTerm === term ? (
                            <button
                              className="rc-btn-small rc-btn-small-danger"
                              onClick={() => setConfirmUnrelease(s)}
                            >
                              Unapprove
                            </button>
                          ) : (
                            <button
                              className="rc-btn-small"
                              onClick={() => reApprove(s.id)}
                            >
                              Re-approve
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </>
      )}

      {editingStudent && (
        <EditReportCardModal
          student={editingStudent}
          term={term}
          onClose={() => setEditingStudent(null)}
          onSaved={() => {
            setEditingStudent(null);
            refreshSection();
          }}
          subjectsConfig={subjectsConfig}
          observedValuesConfig={observedValuesConfig}
        />
      )}

      {confirmUnrelease && (
        <div className="rc-modal-overlay" onClick={() => setConfirmUnrelease(null)}>
          <div className="rc-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Revoke approval for this report card?</h3>
            <p>
              This will unlock the grades and return the card to the adviser. 
              If the adviser has already distributed it, it will be removed from the parent app.
            </p>
            <div className="rc-modal-actions">
              <button
                className="rc-btn rc-btn-secondary"
                onClick={() => setConfirmUnrelease(null)}
              >
                Cancel
              </button>
              <button
                className="rc-btn rc-btn-danger"
                onClick={() => unapprove(confirmUnrelease.id)}
              >
                Unapprove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PDF helpers
// ---------------------------------------------------------------------------

async function downloadStudentPDF(student, term, subjectsConfig, schoolYearLabel, observedValuesConfig) {
  const doc = new jsPDF({ format: "a4", unit: "pt" });
  await drawReportCardPDF(doc, student, term, subjectsConfig, schoolYearLabel, observedValuesConfig);
  doc.save(`ReportCard_${student.studentId}_${term}.pdf`);
}

async function downloadSectionPDF(students, section, term, subjectsConfig, schoolYearLabel, observedValuesConfig) {
  const doc = new jsPDF({ format: "a4", unit: "pt" });
  const releasedAndReady = students.filter(
    (s) => s.reportCardSubmittedTerm || s.reportCardApprovedTerm || s.reportCardReleasedTerm
  );

  for (let i = 0; i < releasedAndReady.length; i++) {
    if (i > 0) doc.addPage();
    await drawReportCardPDF(doc, releasedAndReady[i], term, subjectsConfig, schoolYearLabel, observedValuesConfig);
  }

  doc.save(`ReportCards_${section.gradeLevel}_${section.section}_${term}.pdf`);
}
