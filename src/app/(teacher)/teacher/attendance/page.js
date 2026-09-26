"use client";
// src/app/(teacher)/teacher/attendance/page.js
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import "./teacher-attendance.css";

function todayManila() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
}

function shiftDate(dateStr, days) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const ny = dt.getFullYear();
  const nm = String(dt.getMonth() + 1).padStart(2, "0");
  const nd = String(dt.getDate()).padStart(2, "0");
  return `${ny}-${nm}-${nd}`;
}

function formatTime(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleTimeString("en-PH", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Manila",
    });
  } catch {
    return "—";
  }
}

export default function TeacherAttendancePage() {
  const [classes, setClasses] = useState([]);
  const [selectedKey, setSelectedKey] = useState("");
  const [date, setDate] = useState(todayManila());
  const [logs, setLogs] = useState([]);
  const [open, setOpen] = useState({});
  const [loading, setLoading] = useState(true);
  const [classesLoading, setClassesLoading] = useState(true);
  const [error, setError] = useState("");

  const today = todayManila();

  // Load the teacher's classes once.
  useEffect(() => {
    fetch("/api/teacher/classes", { credentials: "include" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Unable to load classes.");
        const list = data.data || [];
        setClasses(list);
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

  const fetchLogs = useCallback(async () => {
    if (!selectedClass) return;
    setLoading(true);
    setError("");
    const params = new URLSearchParams({
      date,
      gradeLevel: selectedClass.gradeLevel,
      section: selectedClass.section,
    });
    try {
      const response = await fetch(`/api/teacher/attendance-logs?${params}`, {
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to load attendance logs.");
      setLogs(data.data || []);
    } catch (reason) {
      setError(reason.message);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [selectedClass, date]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const hasAnyClass = classes.length > 0;
  const isToday = date === today;
  const presentCount = logs.filter((l) => l.status === "present").length;
  const absentCount = logs.filter((l) => l.status === "absent").length;

  return (
    <div className="teacher-attendance-page">
      <header className="teacher-attendance-header">
        <div>
          <h1>Attendance Logs</h1>
          <p>
            {selectedClass
              ? `${selectedClass.gradeLevel} - ${selectedClass.section} · ${
                  selectedClass.role === "home" ? "Adviser class" : "Visiting class"
                }`
              : "Select a class to view"}
          </p>
        </div>
        <Link href="/teacher/dashboard">Back to Dashboard</Link>
      </header>

      {hasAnyClass && (
        <div className="teacher-attendance-selector">
          <label htmlFor="attendance-class">Class</label>
          <select
            id="attendance-class"
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
                      {c.gradeLevel} - {c.section}
                    </option>
                  ))}
              </optgroup>
            )}
          </select>
        </div>
      )}

      {hasAnyClass && (
        <div className="teacher-attendance-datebar">
          <button
            type="button"
            className="teacher-date-btn"
            onClick={() => setDate((d) => shiftDate(d, -1))}
            aria-label="Previous day"
          >
            ← Prev
          </button>
          <input
            type="date"
            className="teacher-date-input"
            value={date}
            max={today}
            onChange={(e) => setDate(e.target.value)}
          />
          <button
            type="button"
            className="teacher-date-btn"
            onClick={() => setDate((d) => shiftDate(d, 1))}
            disabled={isToday}
            aria-label="Next day"
          >
            Next →
          </button>
          <button
            type="button"
            className="teacher-date-btn teacher-date-btn-today"
            onClick={() => setDate(today)}
            disabled={isToday}
          >
            Today
          </button>
        </div>
      )}

      {!classesLoading && !loading && selectedClass && logs.length > 0 && (
        <div className="teacher-attendance-summary">
          <span className="teacher-summary-item">
            <strong>{presentCount}</strong> present
          </span>
          <span className="teacher-summary-divider">·</span>
          <span className="teacher-summary-item">
            <strong>{absentCount}</strong> absent
          </span>
          <span className="teacher-summary-divider">·</span>
          <span className="teacher-summary-item teacher-summary-muted">
            {logs.length} {logs.length === 1 ? "student" : "students"}
          </span>
        </div>
      )}

      <div className="teacher-attendance-card">
        <table className="teacher-attendance-table">
          <thead>
            <tr>
              <th>Last Name</th>
              <th>First Name</th>
              <th>Section</th>
              <th>Time In</th>
              <th>Time Out</th>
              <th>Status</th>
              <th>Tap details</th>
            </tr>
          </thead>
          <tbody>
            {classesLoading || loading ? (
              <tr>
                <td colSpan={7} className="teacher-attendance-empty">Loading…</td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={7} className="teacher-error">{error}</td>
              </tr>
            ) : !hasAnyClass ? (
              <tr>
                <td colSpan={7} className="teacher-attendance-empty">
                  No classes assigned yet.
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={7} className="teacher-attendance-empty">
                  No students in this class, or no attendance records for {date}.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.studentId}>
                  <td>{log.lastName}</td>
                  <td>{log.firstName}</td>
                  <td>{log.section || "-"}</td>
                  <td>{formatTime(log.timeIn)}</td>
                  <td>{formatTime(log.timeOut)}</td>
                  <td>
                    <span className={`teacher-status teacher-status-${log.status}`}>
                      {log.status}
                    </span>
                  </td>
                  <td>
                    {log.hasExtraTaps ? (
                      <>
                        <button
                          type="button"
                          className="teacher-extra-taps-button"
                          onClick={() =>
                            setOpen((current) => ({
                              ...current,
                              [log.studentId]: !current[log.studentId],
                            }))
                          }
                        >
                          ⚠️ Extra taps ({log.extraTaps?.length || 0})
                        </button>
                        {open[log.studentId] && (
                          <div className="teacher-extra-taps">
                            {(log.extraTaps || []).map((tap) => (
                              <span key={tap}>{formatTime(tap)}</span>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <span className="teacher-no-extra-taps">None</span>
                    )}
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