"use client";
// src/app/(teacher)/teacher/students/page.js
import { useEffect, useState } from "react";
import Link from "next/link";
import "./teacher-students.css";

export default function TeacherStudentsPage() {
  const [students, setStudents] = useState([]);
  const [gradeLevel, setGradeLevel] = useState("");
  const [returnedGradeLevel, setReturnedGradeLevel] = useState("");
  const [access, setAccess] = useState("home");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const query = gradeLevel ? `?gradeLevel=${encodeURIComponent(gradeLevel)}` : "";
    fetch(`/api/teacher/students${query}`, { credentials: "include" }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to load students.");
      setStudents(data.data || []); setReturnedGradeLevel(data.gradeLevel || gradeLevel); setAccess(data.access || "home");
    }).catch((reason) => { setError(reason.message); setStudents([]); }).finally(() => setLoading(false));
  }, [gradeLevel]);

    return (
    <div className="teacher-students-page">
      <header className="teacher-list-header">
        <div>
          <h1>My Students</h1>
          <p>
            {returnedGradeLevel || "Home grade"} ·{" "}
            {access === "visiting" ? "Visiting subject roster" : "Adviser roster"}
          </p>
        </div>
        <Link className="teacher-list-back" href="/teacher/dashboard">
          Back to Dashboard
        </Link>
      </header>
      <div className="teacher-list-card">
        <table className="teacher-table">
          <thead>
            <tr>
              <th>Student ID</th>
              <th>Last Name / Full Name</th>
              <th>Section</th>
              {access === "home" && <th>Parent Account</th>}
              <th>Report Card</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={access === "home" ? 5 : 4}>Loading students...</td></tr>
            ) : error ? (
              <tr><td colSpan={5} className="teacher-error">{error}</td></tr>
            ) : students.length === 0 ? (
              <tr><td colSpan={5}>No students found.</td></tr>
            ) : (
              students.map((student) => (
                <tr key={student.id}>
                  <td>{student.studentId}</td>
                  <td>
                    <Link href={`/teacher/students/${student.id}`}>{student.fullName}</Link>
                  </td>
                  <td>{student.section || "-"}</td>
                  {access === "home" && (
                    <td>
                      <span className="teacher-chip">
                        {student.hasParentLink ? "Linked" : "Not linked"}
                      </span>
                    </td>
                  )}
                  <td>
                    <Link
                      href="/teacher/report-cards"
                      className="teacher-chip teacher-chip-link"
                    >
                      {Object.keys(student.reportCard || {}).length
                        ? "View grades"
                        : "Enter grades"}
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}