"use client";
// src/app/(teacher)/teacher/students/[id]/page.js
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { getSubjectsConfig } from "@/lib/subjectsCache";
import "./teacher-student-detail.css";

const TERMS = ["T1", "T2", "T3"];

function formatTime(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleTimeString("en-PH", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Manila",
    });
  } catch {
    return "—";
  }
}

export default function TeacherStudentDetailPage({ params }) {
  const { id } = use(params);
  const [student, setStudent] = useState(null);
  const [subjectsConfig, setSubjectsConfig] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/teacher/students/${id}`, { credentials: "include" }).then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.message || "Unable to load student.");
        return data.data;
      }),
      getSubjectsConfig().catch(() => null),
    ])
      .then(([studentData, cfg]) => {
        setStudent(studentData);
        setSubjectsConfig(cfg);
      })
      .catch((reason) => setFeedback(reason.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="teacher-detail-message">Loading student…</div>;
  }
  if (!student) {
    return <div className="teacher-detail-message">⚠️ {feedback || "Student not found."}</div>;
  }

  const isHome = student.role === "home";
  const mySubjects = student.subjects || [];
  const card = student.reportCard || {};
  const lockedTerms = student.reportCardLockedTerms || [];
  const requiredCodes = subjectsConfig?.entryByGrade?.[student.gradeLevel] || [];

  // Status of the teacher's OWN assigned subjects for a term.
  function mySubjectsStatus(term) {
    const statuses = mySubjects
      .map((code) => card?.[code]?.[term]?.status)
      .filter(Boolean);
    if (statuses.length === 0) return "not_started";
    if (statuses.every((s) => s === "compiled")) return "compiled";
    if (statuses.some((s) => s === "submitted")) return "submitted";
    if (statuses.some((s) => s === "compiled")) return "in_progress";
    return "not_started";
  }

  // Status of the WHOLE card for a term (only computed for home role).
  function cardStatus(term) {
    if (lockedTerms.includes(term)) {
      return { label: "Locked", cls: "locked" };
    }
    if (student.reportCardSubmittedTerm === term) {
      return { label: "Submitted to admin", cls: "submitted" };
    }
    if (student.reportCardReleasedTerm === term) {
      return { label: "Released", cls: "released" };
    }
    if (requiredCodes.length === 0) {
      return { label: "—", cls: "neutral" };
    }
    const compiled = requiredCodes.filter(
      (c) => card?.[c]?.[term]?.status === "compiled"
    ).length;
    if (compiled === 0) return { label: "Not started", cls: "neutral" };
    if (compiled === requiredCodes.length) {
      return { label: "Ready to submit", cls: "ready" };
    }
    return { label: `${compiled} / ${requiredCodes.length} compiled`, cls: "pending" };
  }

  const MY_STATUS_LABELS = {
    compiled: "Compiled",
    submitted: "Submitted",
    in_progress: "In progress",
    not_started: "Not started",
  };

  return (
    <div className="teacher-detail-page">
      <header className="teacher-detail-header">
        <div>
          <Link href="/teacher/students">← Back to Students</Link>
          <h1>
            {student.firstName} {student.lastName}
          </h1>
          <p>
            {student.studentId} · {student.gradeLevel} · Section {student.section || "-"}
          </p>
        </div>
        <span className="teacher-access-chip">
          {isHome ? "Home roster" : "Visiting roster"}
        </span>
      </header>

      {feedback && <div className="teacher-feedback">⚠️ {feedback}</div>}

      {/* Today's Attendance */}
      {student.attendanceToday && (
        <section className="teacher-attendance-today-card">
          <div className="teacher-attendance-today-header">
            <h2>Today&apos;s Attendance</h2>
            <span className="teacher-attendance-today-date">
              {student.attendanceToday.date}
            </span>
          </div>
          <div className="teacher-attendance-today-body">
            <span
              className={`teacher-attendance-status teacher-attendance-status-${student.attendanceToday.status}`}
            >
              {student.attendanceToday.status === "present" ? "✓ Present" : "✗ Absent"}
            </span>
            {student.attendanceToday.hasTaps && (
              <div className="teacher-attendance-times">
                <span>
                  <b>Time in:</b> {formatTime(student.attendanceToday.timeIn)}
                </span>
                {student.attendanceToday.timeOut && (
                  <span>
                    <b>Time out:</b> {formatTime(student.attendanceToday.timeOut)}
                  </span>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Report Card Status */}
      <section className="teacher-detail-section">
        <h2>Report Card Status</h2>
        <table className="teacher-term-table">
          <thead>
            <tr>
              <th>Term</th>
              <th>My Subjects</th>
              {isHome && <th>Card Status</th>}
            </tr>
          </thead>
          <tbody>
            {TERMS.map((term) => {
              const myStatus = mySubjectsStatus(term);
              const cs = isHome ? cardStatus(term) : null;
              return (
                <tr key={term}>
                  <td>{term}</td>
                  <td>
                    <span className={`teacher-pill teacher-pill-${myStatus}`}>
                      {MY_STATUS_LABELS[myStatus]}
                    </span>
                  </td>
                  {isHome && (
                    <td>
                      <span className={`teacher-pill teacher-pill-${cs.cls}`}>
                        {cs.label}
                      </span>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {/* Parent / Guardian (home only) */}
      {isHome && (
        <section className="teacher-parent-card">
          <h2>Parent or Guardian</h2>
          {student.parent ? (
            <div className="teacher-parent-grid">
              <span>
                <b>Name</b>
                {student.parent.fullName}
              </span>
              <span>
                <b>Relationship</b>
                {student.parent.relationship || "—"}
              </span>
              <span>
                <b>Email</b>
                {student.parent.email ? (
                  <a href={`mailto:${student.parent.email}`}>{student.parent.email}</a>
                ) : (
                  "—"
                )}
              </span>
              <span>
                <b>Phone</b>
                {student.parent.phone ? (
                  <a href={`tel:${student.parent.phone}`}>{student.parent.phone}</a>
                ) : (
                  "—"
                )}
              </span>
            </div>
          ) : (
            <p>No parent information linked.</p>
          )}
        </section>
      )}

      {/* Quick links */}
      <section className="teacher-quick-links">
        <Link href="/teacher/report-cards" className="teacher-quick-link">
          Open Report Cards →
        </Link>
        {isHome && (
          <Link href="/teacher/attendance" className="teacher-quick-link">
            Attendance History →
          </Link>
        )}
        <Link href="/teacher/students" className="teacher-quick-link">
          Full Roster →
        </Link>
      </section>
    </div>
  );
}