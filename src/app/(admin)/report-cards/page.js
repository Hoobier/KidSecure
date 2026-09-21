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

import { getSubjectsConfig, getEntrySubjectsForGrade, getDisplaySubjectsForGrade, getSubjectNameFromConfig, isComputedInConfig, computeDisplayGrade, computeDisplayFinal, computeFinalGrade, computeTermAverage, computeGeneralAverage, getDescriptorFor } from "@/lib/subjectsCache";

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

  useEffect(() => {
    getSubjectsConfig().then(setSubjectsConfig).catch(() => {});
  }, []);

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

      {tab === "pending" ? (
        <PendingWizard subjectsConfig={subjectsConfig} />
      ) : (
        <ReleasedView subjectsConfig={subjectsConfig} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pending Release — the 5-step wizard
// ---------------------------------------------------------------------------

function PendingWizard({ subjectsConfig }) {
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
    const subjects = subjectsConfig?.entryByGrade?.[student.gradeLevel] || [];
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
            {students.length} students · {releasableCount} ready to release · {term}
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
              onDownload={(s) => downloadStudentPDF(s, term, subjectsConfig, termSetting?.schoolYearLabel)}
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
                onClick={() => downloadSectionPDF(students, selectedSection, term, subjectsConfig, termSetting?.schoolYearLabel)}
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
          subjectsConfig={subjectsConfig}
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

function EditReportCardModal({ student, term, onClose, onSaved, subjectsConfig }) {
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

function ReleasedView({ subjectsConfig }) {
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
        // Include anyone whose card has been through release for THIS term
        // — either currently released, or pulled back and awaiting re-release.
        setStudents(
          (json.data || []).filter(
            (s) =>
              s.reportCardReleasedTerm === term ||
              (s.reportCardLockedTerms ?? []).includes(term) && !s.reportCardReleasedTerm
          )
        );
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
      .then((json) =>
        setStudents(
          (json.data || []).filter(
            (s) =>
              s.reportCardReleasedTerm === term ||
              (s.reportCardLockedTerms ?? []).includes(term) && !s.reportCardReleasedTerm
          )
        )
      );
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

  async function reRelease(id) {
    try {
      const res = await fetch(`/api/students/${id}/report-card/release`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ term }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.message || "Unable to re-release.");
      setFeedback({ type: "success", message: "Report card re-released." });
      refreshSection();
    } catch (e) {
      setFeedback({ type: "error", message: e.message });
    }
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
        <div className="rc-empty">
          <div className="rc-empty-title">
            No report cards have been released for {term} yet.
          </div>
          <div className="rc-empty-hint">
            Once you release a student's report card from the Pending Release tab,
            their section will appear here. You can edit or re-release at any time.
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
                No released cards in this section for {term}.
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
                  <th style={{ width: "160px" }}>Released</th>
                  <th style={{ width: "300px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => {
                  const isLive = s.reportCardReleasedTerm === term;
                  return (
                    <tr key={s.id}>
                      <td>
                        {s.fullName} <span className="rc-row-sub">· {s.studentId}</span>
                      </td>
                      <td>
                        {isLive ? (
                          <span className="rc-pill rc-pill-released">Released</span>
                        ) : (
                          <span className="rc-pill rc-pill-pending">Unreleased</span>
                        )}
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
                          {isLive ? (
                            <button
                              className="rc-btn-small rc-btn-small-danger"
                              onClick={() => setConfirmUnrelease(s)}
                            >
                              Unrelease
                            </button>
                          ) : (
                            <button
                              className="rc-btn-small"
                              onClick={() => reRelease(s.id)}
                            >
                              Re-release
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

// Cache logos as data URLs after first load.
let logoCachePromise = null;
async function loadLogos() {
  if (logoCachePromise) return logoCachePromise;
  logoCachePromise = (async () => {
    try {
      const [deped, rcac] = await Promise.all([
        fetch("/pictures/deped.png").then((r) => r.blob()).then(blobToDataURL),
        fetch("/pictures/rcac.png").then((r) => r.blob()).then(blobToDataURL),
      ]);
      return { deped, rcac };
    } catch {
      return { deped: null, rcac: null };
    }
  })();
  return logoCachePromise;
}

function blobToDataURL(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
}

function drawHeader(doc, logos, pageWidth, schoolYearLabel) {
  const marginX = 40;
  let y = 40;

  // Logos (each ~50x50 pt)
  if (logos?.deped) {
    try { doc.addImage(logos.deped, "PNG", marginX, y, 50, 50); } catch {}
  }
  if (logos?.rcac) {
    try { doc.addImage(logos.rcac, "PNG", pageWidth - marginX - 50, y, 50, 50); } catch {}
  }

  // Header text block, centered
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const centerX = pageWidth / 2;
  doc.text("Republic of the Philippines", centerX, y + 10, { align: "center" });
  doc.text("DEPARTMENT OF EDUCATION", centerX, y + 22, { align: "center" });
  doc.text("National Capital Region", centerX, y + 34, { align: "center" });
  doc.text("Schools Division of Caloocan", centerX, y + 46, { align: "center" });
  doc.text("District III", centerX, y + 58, { align: "center" });

  y += 72;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("RAINBOW 5 CHRISTIAN ACADEMY OF CALOOCAN, INC.", centerX, y, { align: "center" });
  y += 13;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Blk. 31 Lot 43-44 Acacia St., Rainbow Village 5, Bagumbayan, Caloocan City", centerX, y, { align: "center" });

  y += 20;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("ELEMENTARY", centerX, y, { align: "center" });
  y += 16;
  doc.text("PROGRESS REPORT CARD", centerX, y, { align: "center" });

  y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`School Year: ${schoolYearLabel || "____________"}`, centerX, y, { align: "center" });

  return y + 18;
}

function drawStudentInfo(doc, student, y) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const leftX = 40;
  const rightX = 320;

  doc.text(`Name: ${student.fullName || ""}`, leftX, y);
  doc.text("LRN: ____________________", rightX, y);
  y += 14;
  doc.text(`Level: ${student.gradeLevel || ""}`, leftX, y);
  doc.text("Age: ____________________", rightX, y);
  y += 14;
  doc.text("Gender: __________________", leftX, y);

  return y + 10;
}

function buildReportCardRows(student, term, subjectsConfig) {
  const card = student.reportCard || {};
  const subjects = subjectsConfig?.displayByGrade?.[student.gradeLevel] || [];

  const rows = subjects.map((code) => {
    const isComputed = isComputedInConfig(code, subjectsConfig);
    const label = subjectsConfig?.subjects?.[code] || code;

    const t1 = isComputed
      ? (computeDisplayGrade(card, code, "T1", subjectsConfig) ?? "—")
      : (card[code]?.T1?.grade ?? "—");
    const t2 = isComputed
      ? (computeDisplayGrade(card, code, "T2", subjectsConfig) ?? "—")
      : (card[code]?.T2?.grade ?? "—");
    const t3 = isComputed
      ? (computeDisplayGrade(card, code, "T3", subjectsConfig) ?? "—")
      : (card[code]?.T3?.grade ?? "—");

    const final = computeFinalGrade(card, code, subjectsConfig);
    const descriptor = getDescriptorFor(final, subjectsConfig);
    const remark = descriptor ? descriptor.remark : "—";

    return [label, t1, t2, t3, final ?? "—", remark];
  });

  // Average per Term
  const avgT1 = computeTermAverage(card, student.gradeLevel, "T1", subjectsConfig);
  const avgT2 = computeTermAverage(card, student.gradeLevel, "T2", subjectsConfig);
  const avgT3 = computeTermAverage(card, student.gradeLevel, "T3", subjectsConfig);
  rows.push([
    { content: "Average per Term", styles: { fontStyle: "bold" } },
    avgT1 ?? "—",
    avgT2 ?? "—",
    avgT3 ?? "—",
    "",
    "",
  ]);

  // General Average row (merged across cols 0-4, value in last cell)
  const general = computeGeneralAverage(card, student.gradeLevel, subjectsConfig);
  rows.push([
    { content: "GENERAL AVERAGE", colSpan: 5, styles: { halign: "right", fontStyle: "bold" } },
    { content: general ?? "—", styles: { fontStyle: "bold" } },
  ]);

  // Penmanship (placeholder row for manual writing)
  rows.push(["PENMANSHIP", "", "", "", "", ""]);

  return rows;
}

function drawDescriptorTable(doc, subjectsConfig, startY, pageWidth) {
  const descriptors = subjectsConfig?.descriptors || [];
  const body = descriptors.map((d) => [
    `${d.label} (${d.letter})`,
    `${d.max} - ${d.min}`,
    d.remark,
  ]);

  autoTable(doc, {
    startY,
    margin: { left: 40, right: 40 },
    head: [["Descriptors", "Grading Scale", "Remarks"]],
    body,
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [27, 42, 74], textColor: 255, fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 160 },
      1: { cellWidth: 120, halign: "center" },
      2: { cellWidth: 120, halign: "center" },
    },
  });
}

async function drawReportCardPDF(doc, student, term, subjectsConfig, schoolYearLabel) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const logos = await loadLogos();

  let y = drawHeader(doc, logos, pageWidth, schoolYearLabel);
  y = drawStudentInfo(doc, student, y);
  y += 6;

  const rows = buildReportCardRows(student, term, subjectsConfig);

  autoTable(doc, {
    startY: y,
    margin: { left: 40, right: 40 },
    head: [[
      "SUBJECTS",
      "TERM 1",
      "TERM 2",
      "TERM 3",
      "FINAL GRADE",
      "REMARKS",
    ]],
    body: rows,
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: [27, 42, 74], textColor: 255, halign: "center" },
    columnStyles: {
      0: { cellWidth: 200, halign: "left" },
      1: { cellWidth: 60, halign: "center" },
      2: { cellWidth: 60, halign: "center" },
      3: { cellWidth: 60, halign: "center" },
      4: { cellWidth: 90, halign: "center" },
      5: { cellWidth: 100, halign: "center" },
    },
  });

  const afterTable = doc.lastAutoTable?.finalY ?? y;
  drawDescriptorTable(doc, subjectsConfig, afterTable + 20, pageWidth);
}

async function downloadStudentPDF(student, term, subjectsConfig, schoolYearLabel) {
  const doc = new jsPDF({ format: "a4" });
  await drawReportCardPDF(doc, student, term, subjectsConfig, schoolYearLabel);
  doc.save(`ReportCard_${student.studentId}_${term}.pdf`);
}

async function downloadSectionPDF(students, section, term, subjectsConfig, schoolYearLabel) {
  const doc = new jsPDF({ format: "a4" });
  const releasedAndReady = students.filter(
    (s) => s.reportCardSubmittedTerm || s.reportCardReleasedTerm
  );

  for (let i = 0; i < releasedAndReady.length; i++) {
    if (i > 0) doc.addPage();
    await drawReportCardPDF(doc, releasedAndReady[i], term, subjectsConfig, schoolYearLabel);
  }

  doc.save(`ReportCards_${section.gradeLevel}_${section.section}_${term}.pdf`);
}
