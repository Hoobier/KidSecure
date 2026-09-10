"use client";
// src/app/(admin)/school-year/rollover/page.js
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import "./school-year-rollover.css";

export default function SchoolYearRolloverPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1); // 1 = review students, 2 = confirm

  const [schoolYearLabel, setSchoolYearLabel] = useState("");
  const [nextSchoolYearLabel, setNextSchoolYearLabel] = useState("");
  const [groups, setGroups] = useState([]);
  const [overrides, setOverrides] = useState({}); // { [studentId]: action }
  const [transferNotes, setTransferNotes] = useState({});
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/school-year/rollover-preview", { credentials: "include" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Unable to load the rollover preview.");
        if (!cancelled) {
          setSchoolYearLabel(data?.data?.schoolYearLabel || "");
          setNextSchoolYearLabel(data?.data?.nextSchoolYearLabel || "");
          setGroups(data?.data?.groups || []);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || "Unable to reach the server.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  // Flattened list of every student across all groups, each carrying its
  // group's default action and next grade — this is what search filters
  // and what the summary counts are derived from.
  const allStudents = useMemo(() => {
    const list = [];
    for (const group of groups) {
      for (const student of group.students) {
        list.push({ ...student, nextGradeLevel: group.nextGradeLevel });
      }
    }
    return list;
  }, [groups]);

  function actionFor(studentId, defaultAction) {
    return overrides[studentId] || defaultAction;
  }

  function handleActionChange(studentId, newAction) {
    setOverrides((prev) => ({ ...prev, [studentId]: newAction }));
  }

  const summary = useMemo(() => {
    let promoting = 0, retaining = 0, graduating = 0, transferring = 0;
    for (const student of allStudents) {
      const action = actionFor(student.id, student.suggestedAction);
      if (action === "promote") promoting++;
      else if (action === "retain") retaining++;
      else if (action === "graduate") graduating++;
      else if (action === "transfer_out") transferring++;
    }
    return { promoting, retaining, graduating, transferring };
  }, [allStudents, overrides]);

  const filteredGroups = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return groups;

    return groups
      .map((group) => ({
        ...group,
        students: group.students.filter((s) =>
          s.name.toLowerCase().includes(query) || s.studentId.toLowerCase().includes(query)
        ),
      }))
      .filter((group) => group.students.length > 0);
  }, [groups, search]);

  async function handleConfirm() {
    setSubmitting(true);
    setError("");

    const decisions = allStudents.map((student) => ({
      studentId: student.id,
      action: actionFor(student.id, student.suggestedAction),
      note: transferNotes[student.id]?.trim() || null,
    }));

    try {
      const res = await fetch("/api/school-year/rollover-commit", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newSchoolYearLabel: nextSchoolYearLabel, decisions }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Unable to complete the school year rollover.");
      }

      window.location.href = "/dashboard";
    } catch (err) {
      setError(err.message || "Unable to reach the server.");
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="syr-page">
        <div className="oe-empty oe-loading">Loading students…</div>
      </div>
    );
  }

  return (
    <div className="syr-page">
      <div className="page-header">
        <div>
          <h1>Start New School Year</h1>
          <p className="page-title-note">
            Review each student before moving to School Year {nextSchoolYearLabel}.
          </p>
        </div>
        <Link href="/dashboard" className="oe-back-btn">
          ← Back to Dashboard
        </Link>
      </div>

      {error && <div className="oe-banner oe-banner-error">⚠️ {error}</div>}

      <div className="syr-steps">
        <div className={`syr-step ${step === 1 ? "syr-step-active" : "syr-step-done"}`}>
          <span className="syr-step-num">1</span>
          <span>Review Students</span>
        </div>
        <div className="syr-step-line" />
        <div className={`syr-step ${step === 2 ? "syr-step-active" : ""}`}>
          <span className="syr-step-num">2</span>
          <span>New School Year</span>
        </div>
        <div className="syr-step-line" />
        <div className={`syr-step ${step === 2 ? "syr-step-active" : ""}`}>
          <span className="syr-step-num">3</span>
          <span>Confirm</span>
        </div>
      </div>

      {step === 1 && (
        <>
          <div className="syr-summary">
            <div className="syr-summary-card syr-summary-promote">
              <div className="syr-summary-label">Promoting</div>
              <div className="syr-summary-value">{summary.promoting} students</div>
            </div>
            <div className="syr-summary-card syr-summary-retain">
              <div className="syr-summary-label">Retaining</div>
              <div className="syr-summary-value">{summary.retaining} students</div>
            </div>
            <div className="syr-summary-card syr-summary-graduate">
              <div className="syr-summary-label">Graduating</div>
              <div className="syr-summary-value">{summary.graduating} students</div>
            </div>
            <div className="syr-summary-card syr-summary-transfer">
              <div className="syr-summary-label">Transferring</div>
              <div className="syr-summary-value">{summary.transferring} students</div>
            </div>
          </div>

          <div className="syr-search-wrap">
            <input
              type="text"
              placeholder="🔍 Search student by name or ID"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="syr-search-input"
            />
          </div>

          <div className="oe-card syr-table-card">
            {filteredGroups.length === 0 ? (
              <div className="oe-empty">No students match your search.</div>
            ) : (
              filteredGroups.map((group) => (
                <div key={group.gradeLevel} className="syr-group">
                  <div className="syr-group-header">
                    {group.gradeLevel} · {group.students.length} student
                    {group.students.length === 1 ? "" : "s"} ·{" "}
                    {group.defaultAction === "graduate"
                      ? "will graduate"
                      : `will promote to ${group.nextGradeLevel}`}
                  </div>

                  {group.students.map((student) => {
                    const currentAction = actionFor(student.id, student.suggestedAction);
                    const isOverridden = Boolean(overrides[student.id]);

                    return (
                      <div
                        key={student.id}
                        className={`syr-row ${isOverridden ? "syr-row-overridden" : ""}`}
                      >
                        <span className="syr-row-name">
                          {student.name}
                          {group.defaultAction === "graduate" && student.loyaltyEligible && (
                            <span className="syr-loyalty-badge" title="Eligible for Loyalty Award">
                              🏅 Loyalty Award
                            </span>
                          )}
                        </span>
                        <span className="syr-row-grade">{student.gradeLevel}</span>
                        <select
                          className="syr-row-select"
                          value={currentAction}
                          onChange={(e) => handleActionChange(student.id, e.target.value)}
                        >
                          {group.defaultAction === "graduate" ? (
                            <>
                              <option value="graduate">Graduate</option>
                              <option value="retain">Retain in {group.gradeLevel}</option>
                              <option value="transfer_out">Transfer to another school</option>
                            </>
                          ) : (
                            <>
                              <option value="promote">Promote to {group.nextGradeLevel}</option>
                              <option value="retain">Retain in {group.gradeLevel}</option>
                              <option value="transfer_out">Transfer to another school</option>
                            </>
                          )}
                        </select>
                        {currentAction === "transfer_out" && (
                          <textarea
                            className="syr-transfer-note"
                            rows={2}
                            placeholder="Optional: destination school or reason (e.g. moving to another city)"
                            value={transferNotes[student.id] || ""}
                            onChange={(e) =>
                              setTransferNotes((prev) => ({
                                ...prev,
                                [student.id]: e.target.value,
                              }))
                            }
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          <div className="syr-actions">
            <Link href="/dashboard" className="btn btn-secondary">
              Cancel
            </Link>
            <button className="btn btn-primary" onClick={() => setStep(2)}>
              Continue →
            </button>
          </div>
        </>
      )}

      {step === 2 && (
        <div className="oe-card syr-confirm-card">
          <p className="syr-confirm-text">
            <strong>{summary.promoting}</strong> students will be promoted,{" "}
            <strong>{summary.graduating}</strong> will graduate, and{" "}
            <strong>{summary.retaining}</strong> will be retained. School Year{" "}
            <strong>{nextSchoolYearLabel}</strong> will begin. This cannot be undone.
          </p>

          <div className="syr-actions">
            <button className="btn btn-secondary" onClick={() => setStep(1)} disabled={submitting}>
              ← Back to Review
            </button>
            <button className="btn btn-primary" onClick={handleConfirm} disabled={submitting}>
              {submitting ? "Starting new school year…" : "Start New School Year"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}