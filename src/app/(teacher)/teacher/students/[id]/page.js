"use client";
// src/app/(teacher)/teacher/students/[id]/page.js
import { use, useEffect, useState } from "react";
import Link from "next/link";
import "./teacher-student-detail.css";

export default function TeacherStudentDetailPage({ params }) {
  const { id } = use(params);
  const [student, setStudent] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/teacher/students/${id}`, { credentials: "include" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Unable to load student.");
        setStudent(data.data);
      })
      .catch((reason) => setFeedback(reason.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="teacher-detail-message">Loading student...</div>;
  if (!student) return <div className="teacher-detail-message">⚠️ {feedback || "Student not found."}</div>;

  const homeAccess = Object.prototype.hasOwnProperty.call(student || {}, "parent");

  return (
    <div className="teacher-detail-page">
      <header className="teacher-detail-header">
        <div>
          <Link href="/teacher/students">← Back to Students</Link>
          <h1>{student.firstName} {student.lastName}</h1>
          <p>
            {student.studentId} · {student.gradeLevel} · Section {student.section || "-"}
          </p>
        </div>
        <span className="teacher-access-chip">
          {homeAccess ? "Home roster" : "Visiting roster"}
        </span>
      </header>

      {feedback && <div className="teacher-feedback">{feedback}</div>}

      {homeAccess && (
        <section className="teacher-parent-card">
          <h2>Parent or guardian</h2>
          {student.parent ? (
            <div className="teacher-parent-grid">
              <span><b>Name</b>{student.parent.fullName}</span>
              <span><b>Relationship</b>{student.parent.relationship}</span>
              <span><b>Email</b>{student.parent.email}</span>
              <span><b>Phone</b>{student.parent.phone}</span>
            </div>
          ) : (
            <p>No parent information linked.</p>
          )}
        </section>
      )}

      <section className="teacher-report-card-link-card">
        <div>
          <h2>Report Card</h2>
          <p className="teacher-report-card-status">
            {student.reportCardLockedTerm
              ? `🔒 ${student.reportCardLockedTerm} managed by the school office`
              : student.reportCardSubmittedTerm
                ? `Submitted to admin (${student.reportCardSubmittedTerm})`
                : student.reportCardReleasedTerm
                  ? `Released to parent (${student.reportCardReleasedTerm})`
                  : "Not yet submitted"}
          </p>
          <p className="teacher-report-card-hint">
            Grades are entered on the Report Cards page.
          </p>
        </div>
        <Link href="/teacher/report-cards" className="teacher-report-card-link-btn">
          Go to Report Cards →
        </Link>
      </section>
    </div>
  );
}