"use client";
// src/app/(teacher)/teacher/report-cards/page.js
import { useState, useEffect, useCallback } from "react";
import "./report-cards.css";

const TERMS = [
  { key: "T1", label: "Term 1" },
  { key: "T2", label: "Term 2" },
  { key: "T3", label: "Term 3" },
];

import { getSubjectDisplayItems, getSubjectsForGrade, getSubjectsConfig } from "@/lib/subjectsCache";

// ----------------------------------------------------------------------------
// Per-term lock / release helpers.
// Locking is per-term: a student locked for T1 can still be edited for T2.
// ----------------------------------------------------------------------------
function isTermLocked(student, term) {
  return (student?.reportCardLockedTerm ?? null) === term;
}

function isTermSubmittedToAdmin(student, term) {
  return (student?.reportCardSubmittedTerm ?? null) === term;
}

function isTermReleased(student, term) {
  return (student?.reportCardReleasedTerm ?? null) === term;
}

// ----------------------------------------------------------------------------
// Reads the current active term from the backend once, then hands the value
// to a callback. Falls back to T1 if the request fails.
// ----------------------------------------------------------------------------
async function fetchActiveTerm() {
  try {
    const res = await fetch("/api/term-settings", { credentials: "include" });
    if (!res.ok) return "T1";
    const json = await res.json();
    const data = json.data || json;
    const n = data.activeTermNumber ?? data.active_term_number ?? 1;
    return `T${n}`;
  } catch {
    return "T1";
  }
}

export default function TeacherReportCardsPage() {
  const [classes, setClasses] = useState([]);
  const [selectedClassKey, setSelectedClassKey] = useState("");
  const [students, setStudents] = useState([]);
  const [access, setAccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [term, setTerm] = useState(null); // null until we know the active term
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [subjectsConfig, setSubjectsConfig] = useState(null);

  // Load the teacher's classes once.
    useEffect(() => {
        (async () => {
        try {
            const res = await fetch("/api/teacher/classes", { credentials: "include" });
            const json = await res.json();
            if (!res.ok) {
            setFeedback({
                type: "error",
                message: json.message || `Unable to load classes (HTTP ${res.status}).`,
            });
            return;
            }
            if (json.data?.length) {
            setClasses(json.data);
            const first = json.data[0];
            setSelectedClassKey(`${first.gradeLevel}|${first.section}|${first.role}`);
            } else {
            setFeedback({
                type: "error",
                message: "You have no assigned classes. Ask the admin to assign you.",
            });
            }
        } catch (err) {
            setFeedback({ type: "error", message: "Unable to reach the server." });
        }
        })();
    }, []);

    // Determine the default term once on mount.
    useEffect(() => {
      let cancelled = false;
      (async () => {
        const t = await fetchActiveTerm();
        if (!cancelled) setTerm(t);
      })();
      return () => { cancelled = true; };
    }, []);

    useEffect(() => {
      getSubjectsConfig().then(setSubjectsConfig).catch(() => {});
    }, []);

  const selectedClass = classes.find(
    (c) => `${c.gradeLevel}|${c.section}|${c.role}` === selectedClassKey
  );

  // Load students whenever the selected class changes.
  const fetchStudents = useCallback(async () => {
    if (!selectedClass) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        gradeLevel: selectedClass.gradeLevel,
        section:    selectedClass.section,
      });
      const res = await fetch(`/api/teacher/students?${params}`, { credentials: "include" });
      const json = await res.json();
      if (res.ok) {
        setStudents(json.data || []);
        setAccess(json.access);
      }
    } catch {
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [selectedClass]);

  useEffect(() => {
    fetchStudents();
    setSelectedStudentId(null);
    setFeedback(null);
  }, [fetchStudents]);

  const mode = access === "home" ? "home" : "visiting";
  const homeClasses = classes.filter((c) => c.role === "home");
  const visitingClasses = classes.filter((c) => c.role === "visiting");


if (term === null) {
    return (
      <div className="trc-page">
        <p className="trc-empty">Loading…</p>
      </div>
    );
  }

  return (
    <div className="trc-page">
      <div className="trc-header">
        <h1>Report Cards</h1>
        <div className="trc-term-switch">
          {TERMS.map((t) => (
            <button
              key={t.key}
              className={term === t.key ? "trc-term-btn trc-term-btn-active" : "trc-term-btn"}
              onClick={() => setTerm(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="trc-class-selector">
        <label htmlFor="trc-class">Class</label>
        <select
          id="trc-class"
          value={selectedClassKey}
          onChange={(e) => setSelectedClassKey(e.target.value)}
        >
          {homeClasses.length > 0 && (
            <optgroup label="My Homeroom">
              {homeClasses.map((c) => (
                <option
                  key={`h-${c.gradeLevel}-${c.section}`}
                  value={`${c.gradeLevel}|${c.section}|${c.role}`}
                >
                  {c.gradeLevel} - {c.section} (My Homeroom)
                </option>
              ))}
            </optgroup>
          )}
          {visitingClasses.length > 0 && (
            <optgroup label="Visiting">
              {visitingClasses.map((c) => (
                <option
                  key={`v-${c.gradeLevel}-${c.section}`}
                  value={`${c.gradeLevel}|${c.section}|${c.role}`}
                >
                  {c.gradeLevel} - {c.section} · {c.forteSubjectCode}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </div>

      {feedback && (
        <div className={`trc-feedback trc-feedback-${feedback.type}`}>{feedback.message}</div>
      )}

      {loading && <p className="trc-empty">Loading students…</p>}
      {!loading && students.length === 0 && (
        <p className="trc-empty">No students in this class.</p>
      )}

      {!loading && students.length > 0 && (
        <div className="trc-layout">
          <div className="trc-student-list">
              {students.map((s) => (
                <button
                  key={s.id}
                  className={`trc-student-row ${
                    selectedStudentId === s.id ? "trc-student-row-active" : ""
                  }`}
                  onClick={() => setSelectedStudentId(s.id)}
                >
                  <span className="trc-student-name">{s.fullName}</span>
                  <StudentRowBadge
                    student={s}
                    term={term}
                    isHomeMode={mode === "home"}
                    subjectsConfig={subjectsConfig}
                  />
                </button>
              ))}
            </div>

          <div className="trc-panel">
            {mode === "visiting" ? (
              <VisitingGradeEntry
                students={students}
                term={term}
                selectedClass={selectedClass}
                onRefresh={fetchStudents}
                setFeedback={setFeedback}
              />
            ) : (
              <HomeReportCardViewer
                studentId={selectedStudentId}
                students={students}
                term={term}
                onRefresh={fetchStudents}
                setFeedback={setFeedback}
                subjectsConfig={subjectsConfig}                
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Visiting: one-column table. Every student in the class, one grade input each.
// ----------------------------------------------------------------------------
function VisitingGradeEntry({ students, term, selectedClass, onRefresh, setFeedback }) {
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const initial = {};
    students.forEach((s) => {
      initial[s.id] = s.reportCard?.[term]?.grade ?? "";
    });
    setValues(initial);
  }, [students, term]);

  function handleChange(id, value) {
    const sanitized = value === "" ? "" : value.replace(/[^\d.]/g, "").slice(0, 6);
    setValues((v) => ({ ...v, [id]: sanitized }));
  }

  async function saveAll() {
    setSaving(true);
    setFeedback(null);
    try {
      for (const s of students) {
        if (isTermLocked(s, term)) continue;
        const grade = values[s.id];
        if (grade === "" || grade === undefined) continue;
        await fetch(`/api/teacher/students/${s.id}/report-card`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            grades: { [selectedClass.forteSubjectCode]: { [term]: { grade } } },
          }),
        });
      }
      setFeedback({ type: "success", message: "Grades saved." });
      onRefresh();
    } catch {
      setFeedback({ type: "error", message: "Unable to save grades." });
    } finally {
      setSaving(false);
    }
  }

  async function submitAll() {
    if (!window.confirm(`Submit all ${selectedClass.forteSubjectCode} ${term} grades to the adviser?`)) return;
    setSaving(true);
    setFeedback(null);
    try {
      let submitted = 0;
      for (const s of students) {
        if (isTermLocked(s, term)) continue;
        // Ensure the grade is saved before submitting.
        const grade = values[s.id];
        if (grade !== "" && grade !== undefined) {
          await fetch(`/api/teacher/students/${s.id}/report-card`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              grades: { [selectedClass.forteSubjectCode]: { [term]: { grade } } },
            }),
          });
        }
        const res = await fetch(`/api/teacher/students/${s.id}/report-card/submit`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ term }),
        });
        if (res.ok) submitted++;
      }
      setFeedback({
        type: "success",
        message: `Submitted ${submitted} of ${students.length} students to the adviser.`,
      });
      onRefresh();
    } catch {
      setFeedback({ type: "error", message: "Unable to submit." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="trc-table-wrap">
      <h2 className="trc-panel-title">
        {selectedClass?.forteSubjectCode} — {term}
      </h2>
      <table className="trc-table">
        <thead>
          <tr>
            <th>Student</th>
            <th style={{ width: "120px" }}>Grade</th>
            <th style={{ width: "120px" }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => {
            const entry = s.reportCard?.[term] || {};
            return (
              <tr key={s.id}>
                <td>{s.fullName}</td>
                <td>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={values[s.id] ?? ""}
                    onChange={(e) => handleChange(s.id, e.target.value)}
                    disabled={isTermLocked(s, term)}
                    placeholder="—"
                  />
                </td>
                <td>
                <StatusPill status={entry.status} locked={isTermLocked(s, term)} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="trc-actions">
        <button
          type="button"
          className="trc-btn trc-btn-secondary"
          onClick={saveAll}
          disabled={saving}
        >
          {saving ? "Saving…" : "Save All"}
        </button>
        <button
          type="button"
          className="trc-btn trc-btn-primary"
          onClick={submitAll}
          disabled={saving}
        >
          {saving ? "Submitting…" : "Submit to Adviser"}
        </button>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// Home: full card viewer for one student.
// The adviser's own forte subject is editable per-row (autosave on blur/Enter).
// Every other subject is read-only UNLESS it has a 'submitted' status from a
// visiting teacher — in which case the adviser gets a "Compile" button.
// ----------------------------------------------------------------------------
function HomeReportCardViewer({ studentId, students, term, onRefresh, setFeedback, subjectsConfig }) {
  const student = students.find((s) => s.id === studentId);
  const [busy, setBusy] = useState(false);
  const [rowStates, setRowStates] = useState({}); // { [code]: 'idle' | 'saving' | 'ok' | 'error' }
  const [edits, setEdits] = useState({});         // { [code]: string }

  useEffect(() => {
    setEdits({});
    setRowStates({});
  }, [studentId, term]);

  if (!student) {
    return <p className="trc-empty">Select a student to view their report card.</p>;
  }

  const subjects = subjectsConfig?.subjectsByGrade?.[student.gradeLevel] || [];
  const card = student.reportCard || {};
  const forteCode = student.forteSubjectCode || null;
  const locked = isTermLocked(student, term);

  function rowValue(code) {
    if (code in edits) return edits[code];
    const entry = card[code]?.[term] || {};
    return entry.grade ?? "";
  }

  function handleChange(code, value) {
    const sanitized = value === "" ? "" : value.replace(/[^\d.]/g, "").slice(0, 6);
    setEdits((e) => ({ ...e, [code]: sanitized }));
  }

  async function saveRow(code) {
    const currentStored = card[code]?.[term]?.grade ?? "";
    const nextValue = code in edits ? edits[code] : currentStored;

    if (String(currentStored) === String(nextValue)) {
      setRowStates((s) => ({ ...s, [code]: "idle" }));
      return;
    }

    setRowStates((s) => ({ ...s, [code]: "saving" }));
    try {
      const res = await fetch(`/api/teacher/students/${student.id}/report-card`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grades: { [code]: { [term]: { grade: nextValue === "" ? null : nextValue } } },
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 422 && /note is required/i.test(json.message || "")) {
          setFeedback({
            type: "error",
            message: `A note is required to change ${code} ${term} because it's already compiled. Contact admin.`,
          });
        } else {
          setFeedback({ type: "error", message: json.message || "Unable to save grade." });
        }
        setRowStates((s) => ({ ...s, [code]: "error" }));
        return;
      }
      setRowStates((s) => ({ ...s, [code]: "ok" }));
      setEdits((e) => {
        const next = { ...e };
        delete next[code];
        return next;
      });
      onRefresh();
      setTimeout(() => {
        setRowStates((s) => (s[code] === "ok" ? { ...s, [code]: "idle" } : s));
      }, 1500);
    } catch {
      setFeedback({ type: "error", message: "Unable to reach the server." });
      setRowStates((s) => ({ ...s, [code]: "error" }));
    }
  }

  async function compileRow(code) {
    setRowStates((s) => ({ ...s, [code]: "saving" }));
    try {
      const res = await fetch(`/api/teacher/students/${student.id}/report-card/compile`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectCode: code, term }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFeedback({ type: "error", message: json.message || `Unable to compile ${code}.` });
        setRowStates((s) => ({ ...s, [code]: "error" }));
        return;
      }
      setFeedback({ type: "success", message: `${code} ${term} compiled.` });
      setRowStates((s) => ({ ...s, [code]: "ok" }));
      onRefresh();
      setTimeout(() => {
        setRowStates((s) => (s[code] === "ok" ? { ...s, [code]: "idle" } : s));
      }, 1500);
    } catch {
      setFeedback({ type: "error", message: "Unable to reach the server." });
      setRowStates((s) => ({ ...s, [code]: "error" }));
    }
  }

  async function submitToAdmin() {
    setBusy(true);
    try {
      const res = await fetch(`/api/teacher/students/${student.id}/report-card/submit-to-admin`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ term }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Unable to submit.");
      setFeedback({ type: "success", message: "Submitted to admin." });
      onRefresh();
    } catch (e) {
      setFeedback({ type: "error", message: e.message });
    } finally {
      setBusy(false);
    }
  }

  async function recall() {
    if (!window.confirm("Recall this submission? Admin will no longer see it in their queue.")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/teacher/students/${student.id}/report-card/recall`, {
        method: "POST",
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Unable to recall.");
      setFeedback({ type: "success", message: "Submission recalled." });
      onRefresh();
    } catch (e) {
      setFeedback({ type: "error", message: e.message });
    } finally {
      setBusy(false);
    }
  }

  const allCompiled = subjects.length > 0 && subjects.every(
    (code) => (card[code]?.[term]?.status) === "compiled"
  );

  return (
    <div className="trc-card-viewer">
      <h2 className="trc-panel-title">
        {student.fullName} — {term}
      </h2>

      <table className="trc-table">
        <thead>
          <tr>
            <th>Subject</th>
            <th style={{ width: "140px" }}>Grade</th>
            <th style={{ width: "180px" }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {subjects.map((code) => {
            const entry = card[code]?.[term] || {};
            const isEditable = !locked && code === forteCode;
            const isCompilable = !locked && entry.status === "submitted";
            const state = rowStates[code] || "idle";

            return (
              <tr key={code}>
                <td>
                  {subjectsConfig?.subjects?.[code] || code}
                  {isEditable && <span className="trc-editable-tag">editable</span>}
                </td>
                <td>
                  {isEditable ? (
                    <div className="trc-grade-input-wrap">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={rowValue(code)}
                        onChange={(e) => handleChange(code, e.target.value)}
                        onBlur={() => saveRow(code)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            e.target.blur();
                          }
                        }}
                        placeholder="—"
                      />
                      {state === "saving" && <span className="trc-row-state">Saving…</span>}
                      {state === "ok"     && <span className="trc-row-state trc-row-state-ok">✓</span>}
                      {state === "error"  && <span className="trc-row-state trc-row-state-err">⚠️</span>}
                    </div>
                  ) : (
                    <span className="trc-readonly-value">{entry.grade ?? "—"}</span>
                  )}
                </td>
                <td>
                  <div className="trc-status-cell">
                    <StatusPill status={entry.status} locked={locked} />
                    {isCompilable && (
                      <button
                        type="button"
                        className="trc-compile-btn"
                        onClick={() => compileRow(code)}
                        disabled={state === "saving"}
                      >
                        {state === "saving" ? "…" : "Compile"}
                      </button>
                    )}
                    {!isCompilable && state === "ok" && (
                      <span className="trc-row-state trc-row-state-ok">✓</span>
                    )}
                    {!isCompilable && state === "error" && (
                      <span className="trc-row-state trc-row-state-err">⚠️</span>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

        {!allCompiled && !isTermSubmittedToAdmin(student, term) && (
            <p className="trc-hint">
            Every subject must be compiled for {term} before submitting to admin.
            </p>
        )}

        <div className="trc-actions">
            {locked ? (
            <span className="trc-locked-note">
                🔒 This {term} card is managed by the school office.
            </span>
            ) : isTermSubmittedToAdmin(student, term) ? (
            <button
                type="button"
                className="trc-btn trc-btn-secondary"
                onClick={recall}
                disabled={busy}
            >
                {busy ? "Recalling…" : "Recall Submission"}
            </button>
            ) : (
            <button
                type="button"
                className="trc-btn trc-btn-primary"
                onClick={submitToAdmin}
                disabled={busy || !allCompiled}
                title={!allCompiled ? "All subjects must be compiled first." : ""}
            >
                {busy ? "Submitting…" : "Submit to Admin"}
            </button>
        )}
      </div>
    </div>
  );
}

function StatusPill({ status, locked }) {
  if (locked) {
    return <span className="trc-pill trc-pill-locked">Locked</span>;
  }
  const map = {
    draft:       { label: "Draft",       cls: "trc-pill-draft" },
    submitted:   { label: "Submitted",   cls: "trc-pill-submitted" },
    compiled:    { label: "Compiled",    cls: "trc-pill-compiled" },
    pending:     { label: "Pending",     cls: "trc-pill-pending" },
    not_started: { label: "Not started", cls: "trc-pill-neutral" },
  };
  const info = map[status] || map.not_started;
  return <span className={`trc-pill ${info.cls}`}>{info.label}</span>;
}

function StudentRowBadge({ student, term, isHomeMode, subjectsConfig }) {
  // Locked for THIS term → show the lock.
  if (isTermLocked(student, term)) {
    return <span className="trc-row-badge trc-row-badge-locked" title={`${term} is managed by admin`}>🔒</span>;
  }

  // Visiting mode: the row's reportCard is the teacher's single subject.
  if (!isHomeMode) {
    const entry = student.reportCard?.[term] || {};
    if (entry.status === "submitted") {
      return <span className="trc-row-badge trc-row-badge-submitted">Submitted</span>;
    }
    if (entry.status === "compiled") {
      return <span className="trc-row-badge trc-row-badge-ready">Ready</span>;
    }
    return null;
  }

  // Home mode: count compiled vs. total for this term.
  if (isTermSubmittedToAdmin(student, term)) {
    return <span className="trc-row-badge trc-row-badge-submitted">Submitted</span>;
  }

  const subjects = subjectsConfig?.subjectsByGrade?.[student.gradeLevel] || [];
  if (subjects.length === 0) return null;

  const card = student.reportCard || {};
  const missing = subjects.filter((code) => (card[code]?.[term]?.status) !== "compiled");

  if (missing.length === 0) {
    return <span className="trc-row-badge trc-row-badge-ready">Ready</span>;
  }
  return <span className="trc-row-badge trc-row-badge-missing">{missing.length} missing</span>;
}