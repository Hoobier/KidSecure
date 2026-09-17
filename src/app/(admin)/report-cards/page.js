"use client";
// src/app/(admin)/report-cards/page.js
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "./report-cards.css";

const TERMS = [
  { key: "T1", label: "Term 1" },
  { key: "T2", label: "Term 2" },
  { key: "T3", label: "Term 3" },
];

const SUBJECTS_BY_GRADE = {
  "Nursery":      ["CL", "COM", "MATH", "SEN"],
  "Kindergarten": ["CL", "COM", "MATH", "SEN"],
  "Preparatory":  ["CL", "COM", "MATH", "SEN"],
  "Grade 1":      ["CLVE", "MATH", "FIL", "MAPEH", "EPP"],
  "Grade 2":      ["CLVE", "MATH", "FIL", "MAPEH", "EPP"],
  "Grade 3":      ["CLVE", "MATH", "FIL", "MAPEH", "EPP"],
  "Grade 4":      ["CLVE", "MATH", "SCI", "FIL", "MAPEH", "EPP"],
  "Grade 5":      ["CLVE", "MATH", "SCI", "FIL", "MAPEH", "EPP"],
  "Grade 6":      ["CLVE", "MATH", "SCI", "FIL", "MAPEH", "EPP"],
};

const SUBJECT_NAMES = {
  CLVE:  "Christian Living / Values Education",
  MATH:  "Mathematics",
  SCI:   "Science",
  FIL:   "Filipino",
  MAPEH: "MAPEH",
  EPP:   "Edukasyong Pantahanan at Praktikal",
  CL:    "Christian Living / Bible Studies",
  COM:   "Communication Skills",
  SEN:   "Sensory-Perceptual & Socio-Emotional",
};

const STEPS = [
  "Term",
  "Grade & Section",
  "Review",
  "Select Students",
  "Confirm",
];

export default function AdminReportCardsPage() {
  const [tab, setTab] = useState("pending"); // "pending" | "released"

  return (
    <div className="rc-page">
      <header className="rc-page-header">
        <div>
          <h1>Report Cards</h1>
          <p className="rc-page-sub">
            Review adviser submissions, release to parents, and manage released cards.
          </p>
        </div>
      </header>

      <div className="rc-tabs">
        <button
          className={tab === "pending" ? "rc-tab rc-tab-active" : "rc-tab"}
          onClick={() => setTab("pending")}
        >
          Pending Release
        </button>
        <button
          className={tab === "released" ? "rc-tab rc-tab-active" : "rc-tab"}
          onClick={() => setTab("released")}
        >
          Released
        </button>
      </div>

      {tab === "pending" ? <PendingWizard /> : <ReleasedView />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pending Release — the 5-step wizard
// ---------------------------------------------------------------------------

function PendingWizard() {
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
        // CURRENT term and not yet released for it.
        const defaultSelected = new Set(
          (json.data || [])
            .filter(
              (s) =>
                s.reportCardSubmittedTerm === term &&
                s.reportCardReleasedTerm !== term
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
    const subjects = SUBJECTS_BY_GRADE[student.gradeLevel] || [];
    const card = student.reportCard || {};
    return subjects.filter((c) => card[c]?.[term]?.status === "compiled").length;
  };

  const releasableCount = students.filter(
    (s) => s.reportCardSubmittedTerm === term && s.reportCardReleasedTerm !== term
  ).length;

  const allSelected = students.length > 0 && selectedIds.size === students.filter(
    (s) => s.reportCardSubmittedTerm === term && s.reportCardReleasedTerm !== term
  ).length;

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(
        students.filter((s) => s.reportCardSubmittedTerm === term && s.reportCardReleasedTerm !== term).map((s) => s.id)
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

  async function handleRelease() {
    setReleasing(true);
    setError("");
    const ids = Array.from(selectedIds);
    setProgress({ done: 0, total: ids.length });

    let released = 0;
    for (const id of ids) {
      try {
        const res = await fetch(`/api/students/${id}/report-card/release`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ term }),
        });
        if (res.ok) released++;
      } catch {
        // continue
      }
      setProgress((p) => ({ ...p, done: p.done + 1 }));
    }

    setReleasing(false);
    setFeedback({
      type: "success",
      message: `${released} of ${ids.length} report cards released.`,
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
              No report cards have been submitted for {term} yet.
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
            {students.length} students · {releasableCount} ready to release · {term}
          </p>
          {loading ? (
            <div className="rc-empty">Loading students…</div>
          ) : students.length === 0 ? (
            <div className="rc-empty">No students in this section.</div>
          ) : (
            <ReviewTable
              students={students}
              term={term}
              onEdit={(s) => setEditingStudent(s)}
              onDownload={(s) => downloadStudentPDF(s, term)}
            />
          )}
          <div className="rc-actions">
            <button className="rc-btn rc-btn-secondary" onClick={() => setStep(2)}>
              ← Back
            </button>
            <div className="rc-actions-right">
              <button
                className="rc-btn rc-btn-secondary"
                onClick={() => downloadSectionPDF(students, selectedSection, term)}
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
          <h2 className="rc-card-title">Select Students to Release</h2>
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
                const ready = s.reportCardSubmittedTerm === term && s.reportCardReleasedTerm !== term;
                const compiled = totalCompiledSubjects(s);
                const totalSubjects = (SUBJECTS_BY_GRADE[s.gradeLevel] || []).length;
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
                      {s.reportCardReleasedTerm === term ? (
                        <span className="rc-pill rc-pill-released">Already released</span>
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
          <h2 className="rc-card-title">Confirm Release</h2>
          <p className="rc-card-sub">
            You are about to release <strong>{selectedIds.size}</strong> report card
            {selectedIds.size === 1 ? "" : "s"} for{" "}
            <strong>{selectedSection.gradeLevel} - {selectedSection.section}</strong> ({term}).
          </p>
          <div className="rc-warning">
            ⚠️ Once released, these report cards will be visible to parents in the
            mobile app, and teachers will be permanently locked out of editing them.
            You can still unrelease and edit as admin, but advisers and subject
            teachers cannot.
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
              onClick={handleRelease}
              disabled={releasing || selectedIds.size === 0}
            >
              {releasing ? "Releasing…" : `Release ${selectedIds.size} Report Card${selectedIds.size === 1 ? "" : "s"}`}
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
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Review table (used by Step 3)
// ---------------------------------------------------------------------------

function ReviewTable({ students, term, onEdit, onDownload }) {
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
            const subjects = SUBJECTS_BY_GRADE[s.gradeLevel] || [];
            const card = s.reportCard || {};
            const compiled = subjects.filter((c) => card[c]?.[term]?.status === "compiled").length;
            const submitted = subjects.filter((c) => card[c]?.[term]?.status === "submitted").length;
            return (
              <tr key={s.id}>
                <td>
                  {s.fullName}
                  <span className="rc-row-sub"> · {s.studentId}</span>
                </td>
                <td>{compiled} / {subjects.length}</td>
                <td>
                  {s.reportCardReleasedTerm === term ? (
                <span className="rc-pill rc-pill-released">Released for {term}</span>
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

function EditReportCardModal({ student, term, onClose, onSaved }) {
  const subjects = SUBJECTS_BY_GRADE[student.gradeLevel] || [];
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

  function setGrade(code, value) {
    const sanitized = value === "" ? "" : value.replace(/[^\d.]/g, "").slice(0, 6);
    setGrades((g) => ({ ...g, [code]: sanitized }));
  }

  async function save() {
    setSaving(true);
    setError("");
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
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Unable to save.");
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
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
                    <td>{SUBJECT_NAMES[code] || code}</td>
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
// Released tab
// ---------------------------------------------------------------------------

function ReleasedView() {
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

  // Load the released sections once we know the term.
  useEffect(() => {
    if (!term) return;
    setLoading(true);
    setError("");
    fetch(`/api/report-cards/released-sections?term=${term}`, { credentials: "include" })
      .then((r) => r.json())
      .then((json) => setSections(json.data || []))
      .catch(() => setError("Unable to load released sections."))
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
        // Keep only students whose card is released for THIS term.
        setStudents((json.data || []).filter((s) => s.reportCardReleasedTerm === term));
      })
      .catch(() => setError("Unable to load released students."))
      .finally(() => setLoading(false));
  }, [selectedSection, term]);

  function refreshSection() {
    if (!selectedSection || !term) return Promise.resolve();
    const { gradeLevel, section } = selectedSection;
    return fetch(`/api/report-cards/grade/${encodeURIComponent(gradeLevel)}/section/${encodeURIComponent(section)}?term=${term}`, {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((json) => setStudents((json.data || []).filter((s) => s.reportCardReleasedTerm === term)));
  }

  async function unrelease(id) {
    setConfirmUnrelease(null);
    try {
      const res = await fetch(`/api/students/${id}/report-card/unrelease`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      setFeedback({ type: "success", message: "Report card unreleased." });
      refreshSection();
    } catch {
      setFeedback({ type: "error", message: "Unable to unrelease." });
    }
  }

  if (term === null) {
    return <div className="rc-empty">Loading…</div>;
  }

  return (
    <div className="rc-card">
      <h2 className="rc-card-title">Released Report Cards ({term})</h2>
      <p className="rc-card-sub">
        Select a section to view released cards. You can edit and re-release at any time.
      </p>

      {feedback && (
        <div className={`rc-banner rc-banner-${feedback.type}`}>
          {feedback.message}
        </div>
      )}

      {error && <div className="rc-banner rc-banner-error">⚠️ {error}</div>}

      {sections.length === 0 && !loading ? (
        <div className="rc-empty">No sections have released cards for {term}.</div>
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
            <div className="rc-empty">No released cards in this section for {term}.</div>
          ) : (
            <table className="rc-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th style={{ width: "220px" }}>Released</th>
                  <th style={{ width: "260px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id}>
                    <td>
                      {s.fullName} <span className="rc-row-sub">· {s.studentId}</span>
                    </td>
                    <td>
                      {s.reportCardReleasedAt
                        ? new Date(s.reportCardReleasedAt).toLocaleDateString()
                        : "—"}
                    </td>
                    <td>
                      <div className="rc-row-actions">
                        <button className="rc-btn-small" onClick={() => setEditingStudent(s)}>
                          Edit
                        </button>
                        <button
                          className="rc-btn-small rc-btn-small-danger"
                          onClick={() => setConfirmUnrelease(s)}
                        >
                          Unrelease
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
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
        />
      )}

      {confirmUnrelease && (
        <div className="rc-modal-overlay" onClick={() => setConfirmUnrelease(null)}>
          <div className="rc-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Unrelease this report card?</h3>
            <p>
              This will remove the {term} report card from the parent app immediately.
              Teachers remain locked out — only admin can edit and re-release.
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
                onClick={() => unrelease(confirmUnrelease.id)}
              >
                Unrelease
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

function drawReportCardPDF(doc, student, term) {
  const subjects = SUBJECTS_BY_GRADE[student.gradeLevel] || [];
  const card = student.reportCard || {};

  doc.setFontSize(16);
  doc.text("RCAC Report Card", 40, 40);
  doc.setFontSize(11);
  doc.text(`${student.fullName} · ${student.studentId}`, 40, 60);
  doc.text(`${student.gradeLevel} - ${student.section} · ${term}`, 40, 76);

  const rows = subjects.map((code) => {
    const entry = card[code]?.[term] || {};
    return [
      `${code} — ${SUBJECT_NAMES[code] || ""}`,
      entry.grade ?? "—",
      entry.status || "not started",
    ];
  });

  autoTable(doc, {
    startY: 90,
    head: [["Subject", "Grade", "Status"]],
    body: rows,
    styles: { fontSize: 10, cellPadding: 4 },
    headStyles: { fillColor: [27, 42, 74], textColor: 255 },
    alternateRowStyles: { fillColor: [247, 249, 252] },
  });
}

function downloadStudentPDF(student, term) {
  const doc = new jsPDF();
  drawReportCardPDF(doc, student, term);
  doc.save(`ReportCard_${student.studentId}_${term}.pdf`);
}

function downloadSectionPDF(students, section, term) {
  const doc = new jsPDF();
  const releasedAndReady = students.filter(
    (s) => s.reportCardSubmittedToAdmin || s.reportCardReleased
  );

  doc.setFontSize(16);
  doc.text("RCAC Report Cards", 40, 40);
  doc.setFontSize(11);
  doc.text(`${section.gradeLevel} - ${section.section} · ${term}`, 40, 58);

  let startY = 80;
  releasedAndReady.forEach((s, i) => {
    if (i > 0) {
      doc.addPage();
      startY = 40;
    }
    const localDoc = doc;
    localDoc.setFontSize(13);
    localDoc.text(`${s.fullName} · ${s.studentId}`, 40, startY);
    localDoc.setFontSize(10);

    const subjects = SUBJECTS_BY_GRADE[s.gradeLevel] || [];
    const card = s.reportCard || {};
    const rows = subjects.map((code) => {
      const entry = card[code]?.[term] || {};
      return [
        `${code} — ${SUBJECT_NAMES[code] || ""}`,
        entry.grade ?? "—",
        entry.status || "not started",
      ];
    });

    autoTable(localDoc, {
      startY: startY + 10,
      head: [["Subject", "Grade", "Status"]],
      body: rows,
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [27, 42, 74], textColor: 255 },
      alternateRowStyles: { fillColor: [247, 249, 252] },
    });
  });

  doc.save(`ReportCards_${section.gradeLevel}_${section.section}_${term}.pdf`);
}