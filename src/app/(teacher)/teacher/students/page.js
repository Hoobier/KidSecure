"use client";
// src/app/(teacher)/teacher/students/page.js
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import "./teacher-students.css";

export default function TeacherStudentsPage() {
  const [classes, setClasses] = useState([]);
  const [selectedKey, setSelectedKey] = useState("");
  const [students, setStudents] = useState([]);
  const [access, setAccess] = useState("home");
  const [loading, setLoading] = useState(true);
  const [classesLoading, setClassesLoading] = useState(true);
  const [error, setError] = useState("");

  // Load the teacher's classes once.
  useEffect(() => {
    fetch("/api/teacher/classes", { credentials: "include" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Unable to load classes.");
        const list = data.data || [];
        setClasses(list);
        // Default to the first home class, else the first class.
        const firstHome = list.find((c) => c.role === "home");
        const first = firstHome || list[0];
        if (first) {
          setSelectedKey(`${first.gradeLevel}|${first.section}|${first.role}`);
        }
      })
      .catch((reason) => setError(reason.message))
      .finally(() => setClassesLoading(false));
  }, []);

  const selectedClass = classes.find(
    (c) => `${c.gradeLevel}|${c.section}|${c.role}` === selectedKey
  );

  const fetchStudents = useCallback(async () => {
    if (!selectedClass) return;
    setLoading(true);
    setError("");
    const query = `?gradeLevel=${encodeURIComponent(selectedClass.gradeLevel)}&section=${encodeURIComponent(selectedClass.section)}`;
    try {
      const response = await fetch(`/api/teacher/students${query}`, { credentials: "include" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to load students.");
      setStudents(data.data || []);
      setAccess(data.access?.role || "home");
    } catch (reason) {
      setError(reason.message);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [selectedClass]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const hasAnyClass = classes.length > 0;

  return (
    <div className="teacher-students-page">
      <header className="teacher-list-header">
        <div>
          <h1>My Students</h1>
          <p>
            {selectedClass
              ? `${selectedClass.gradeLevel} - ${selectedClass.section} · ${
                  access === "visiting" ? "Visiting subject roster" : "Adviser roster"
                }`
              : "No class selected"}
          </p>
        </div>
        <Link className="teacher-list-back" href="/teacher/dashboard">
          Back to Dashboard
        </Link>
      </header>

      {hasAnyClass && (
        <div className="teacher-class-selector">
          <label htmlFor="class-select">Class</label>
          <select
            id="class-select"
            value={selectedKey}
            onChange={(e) => setSelectedKey(e.target.value)}
          >
            {classes.filter((c) => c.role === "home").length > 0 && (
              <optgroup label="My Homeroom">
                {classes
                  .filter((c) => c.role === "home")
                  .map((c) => (
                    <option
                      key={`home-${c.gradeLevel}-${c.section}`}
                      value={`${c.gradeLevel}|${c.section}|${c.role}`}
                    >
                      {c.gradeLevel} - {c.section}
                    </option>
                  ))}
              </optgroup>
            )}
            {classes.filter((c) => c.role === "visiting").length > 0 && (
              <optgroup label="Visiting">
                {classes
                  .filter((c) => c.role === "visiting")
                  .map((c) => (
                    <option
                      key={`visiting-${c.gradeLevel}-${c.section}`}
                      value={`${c.gradeLevel}|${c.section}|${c.role}`}
                    >
                      {c.gradeLevel} - {c.section} · {(c.subjects || []).join(", ")}
                    </option>
                  ))}
              </optgroup>
            )}
          </select>
        </div>
      )}

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
            {classesLoading || loading ? (
              <tr>
                <td colSpan={access === "home" ? 5 : 4}>Loading students...</td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={access === "home" ? 5 : 4} className="teacher-error">
                  {error}
                </td>
              </tr>
            ) : !hasAnyClass ? (
              <tr>
                <td colSpan={5}>No classes assigned yet.</td>
              </tr>
            ) : students.length === 0 ? (
              <tr>
                <td colSpan={access === "home" ? 5 : 4}>No students in this class.</td>
              </tr>
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
