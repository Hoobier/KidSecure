"use client";
// src/app/(teacher)/teacher/dashboard/page.js
import { useEffect, useState } from "react";
import Link from "next/link";
import "./teacher-dashboard.css";

export default function TeacherDashboardPage() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/teacher/dashboard/summary", { credentials: "include" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Unable to load dashboard.");
        setSummary(data);
      })
      .catch((reason) => setError(reason.message));
  }, []);

  if (error) {
    return <div className="teacher-dashboard-loading">⚠️ {error}</div>;
  }
  if (!summary) {
    return <div className="teacher-dashboard-loading">Loading your dashboard…</div>;
  }

  const {
    teacher,
    term,
    stats,
    homeSections,
    visitingClasses,
    attendanceToday,
    attendanceConcerns,
    compileItems,
    gradeItems,
  } = summary;

  const hasHome = Array.isArray(homeSections) && homeSections.length > 0;
  const hasVisiting = Array.isArray(visitingClasses) && visitingClasses.length > 0;
  const hasAnyAssignment = hasHome || hasVisiting;

  return (
    <div className="teacher-dashboard">
      <header className="teacher-page-header">
        <div>
          <h1>Welcome, {teacher.firstName}</h1>
          <p>
            {teacher.department === "preschool" ? "Preschool Teacher" : "Elementary Teacher"}
            {" · "}
            {term}
          </p>
        </div>
        <Link className="teacher-primary-button" href="/teacher/report-cards">
          Open Report Cards
        </Link>
      </header>

      {/* Overview stats */}
      <section className="teacher-overview-cards">
        <div className="teacher-overview-card">
          <span>Home Classes</span>
          <strong>{stats.homeClassCount}</strong>
          <small>
            {stats.totalHomeStudents} {stats.totalHomeStudents === 1 ? "student" : "students"}
          </small>
        </div>
        <div className="teacher-overview-card">
          <span>Visiting Classes</span>
          <strong>{stats.visitingClassCount}</strong>
          <small>grade × section × subject</small>
        </div>
        <div className="teacher-overview-card">
          <span>Grades to Enter</span>
          <strong>{stats.gradesToEnter}</strong>
          <small>students missing grades</small>
        </div>
        <div className="teacher-overview-card">
          <span>Awaiting Compile</span>
          <strong>{stats.studentsAwaitingCompile}</strong>
          <small>students to review</small>
        </div>
      </section>

      {/* Today's attendance */}
      {attendanceToday && (
        <section className="teacher-attendance-card">
          <div>
            <h2>Today&apos;s Attendance</h2>
            <p>Across your home sections.</p>
          </div>
          <div className="teacher-attendance-total">
            <strong>{attendanceToday.present}</strong>
            <span>present</span>
            <b>{attendanceToday.absent}</b>
            <span>absent</span>
            {attendanceToday.notYetTapped > 0 && (
              <>
                <b className="teacher-attendance-pending">{attendanceToday.notYetTapped}</b>
                <span>not yet tapped</span>
              </>
            )}
          </div>
          <Link href="/teacher/attendance">Open attendance logs</Link>
        </section>
      )}

      {/* My homeroom sections */}
      {hasHome && (
        <section className="teacher-panel">
          <h2>My Homeroom Sections</h2>
          <div className="teacher-table-wrap">
            <table className="teacher-sections-table">
              <thead>
                <tr>
                  <th>Section</th>
                  <th className="teacher-table-num">Students</th>
                  <th className="teacher-table-num">Compiled</th>
                  <th className="teacher-table-num">Ready</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {homeSections.map((s) => {
                  const hasStatus =
                    s.submittedCount > 0 ||
                    s.awaitingCompileCount > 0 ||
                    s.readyToSubmitCount > 0 ||
                    s.releasedCount > 0;
                  return (
                    <tr key={`${s.gradeLevel}-${s.section}`}>
                      <td>
                        {s.gradeLevel} - {s.section}
                      </td>
                      <td className="teacher-table-num">{s.studentCount}</td>
                      <td className="teacher-table-num">{s.compiledCount}</td>
                      <td className="teacher-table-num">{s.readyToSubmitCount}</td>
                      <td>
                        <div className="teacher-pill-row">
                          {s.awaitingCompileCount > 0 && (
                            <span className="teacher-pill teacher-pill-warn">
                              {s.awaitingCompileCount} awaiting compile
                            </span>
                          )}
                          {s.readyToSubmitCount > 0 && (
                            <span className="teacher-pill teacher-pill-ready">
                              {s.readyToSubmitCount} ready
                            </span>
                          )}
                          {s.submittedCount > 0 && (
                            <span className="teacher-pill teacher-pill-info">
                              {s.submittedCount} submitted
                            </span>
                          )}
                          {s.releasedCount > 0 && (
                            <span className="teacher-pill teacher-pill-released">
                              {s.releasedCount} released
                            </span>
                          )}
                          {!hasStatus && (
                            <span className="teacher-empty-inline">Nothing pending</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="teacher-panel-actions">
            <Link href="/teacher/report-cards">Open Report Cards →</Link>
          </div>
        </section>
      )}

      {/* Students awaiting compile */}
      {compileItems && compileItems.length > 0 && (
        <section className="teacher-panel">
          <h2>Students Awaiting Your Compile</h2>
          <p className="teacher-panel-sub">
            These students have at least one subject submitted by a visiting teacher.
          </p>
          <ul className="teacher-attention-list">
            {compileItems.map((item, i) => (
              <li key={`${item.studentId}-${item.subjectCode}-${i}`} className="teacher-attention-item">
                <div>
                  <strong>{item.fullName}</strong>
                  <p>
                    {item.subjectCode} · {item.gradeLevel} {item.section} · {item.term}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <div className="teacher-panel-actions">
            <Link href="/teacher/report-cards">Review and compile →</Link>
          </div>
        </section>
      )}

      {/* My visiting classes */}
      {hasVisiting && (
        <section className="teacher-panel">
          <h2>My Visiting Classes</h2>
          <div className="teacher-table-wrap">
            <table className="teacher-sections-table">
              <thead>
                <tr>
                  <th>Class</th>
                  <th>Subject</th>
                  <th>Progress</th>
                </tr>
              </thead>
              <tbody>
                {visitingClasses.map((v, i) => (
                  <tr key={`${v.gradeLevel}-${v.section}-${v.subjectCode}-${i}`}>
                    <td>
                      {v.gradeLevel} - {v.section}
                    </td>
                    <td>{v.subjectCode}</td>
                    <td>
                      {v.studentCount === 0 ? (
                        <span className="teacher-empty-inline">No students enrolled</span>
                      ) : (
                        <span>
                          {v.gradedCount} of {v.studentCount} graded
                          {v.missingCount > 0 && (
                            <span className="teacher-pill teacher-pill-warn teacher-pill-inline">
                              {v.missingCount} missing
                            </span>
                          )}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="teacher-panel-actions">
            <Link href="/teacher/report-cards">Enter grades →</Link>
          </div>
        </section>
      )}

      {/* Students missing grades */}
      {gradeItems && gradeItems.length > 0 && (
        <section className="teacher-panel">
          <h2>Students Missing Grades</h2>
          <p className="teacher-panel-sub">
            You still have grades to enter for these classes in {term}.
          </p>
          <ul className="teacher-attention-list">
            {gradeItems.map((item, i) => (
              <li key={`${item.gradeLevel}-${item.section}-${item.subjectCode}-${i}`} className="teacher-attention-item teacher-attention-report">
                <span className="teacher-attention-icon">📋</span>
                <div>
                  <strong>
                    {item.gradeLevel} {item.section} · {item.subjectCode}
                  </strong>
                  <p>
                    {item.missingCount} {item.missingCount === 1 ? "student still needs" : "students still need"} a grade.
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <div className="teacher-panel-actions">
            <Link href="/teacher/report-cards">Grade them now →</Link>
          </div>
        </section>
      )}

      {/* Attendance concerns */}
      {attendanceConcerns && attendanceConcerns.length > 0 && (
        <section className="teacher-panel">
          <h2>Attendance Concerns</h2>
          <p className="teacher-panel-sub">
            Students with no RFID taps for 2 or more consecutive days.
          </p>
          <ul className="teacher-attention-list">
            {attendanceConcerns.map((item, i) => (
              <li key={`${item.studentId}-${i}`} className="teacher-attention-item teacher-attention-attendance">
                <span className="teacher-attention-icon">⚠️</span>
                <div>
                  <strong>{item.fullName}</strong>
                  <p>
                    Missing {item.daysMissing} {item.daysMissing === 1 ? "day" : "days"} · {item.gradeLevel} - {item.section}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Empty state */}
      {!hasAnyAssignment && (
        <section className="teacher-panel">
          <p className="teacher-empty">
            No class assignments yet. Contact the admin office.
          </p>
        </section>
      )}
    </div>
  );
}
