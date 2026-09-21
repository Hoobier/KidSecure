"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import "./teacher-dashboard.css";

function AttentionItem({ item }) {
  const attendance = item.type === "absent_pattern";
  return <li className={`teacher-attention-item ${attendance ? "teacher-attention-attendance" : "teacher-attention-report"}`}>
    <span className="teacher-attention-icon">{attendance ? "⚠️" : "📋"}</span>
    <div><strong>{attendance ? item.studentName : `${item.count} ${item.subjectCode} ${item.term} item${item.count === 1 ? "" : "s"} need${item.count === 1 ? "s" : ""} attention`}</strong><p>{attendance ? item.message : item.type === "needs_submission" ? `Submit grades for ${item.gradeLevel}.` : "Compile submitted grades for your class."}</p></div>
  </li>;
}

export default function TeacherDashboardPage() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/teacher/dashboard/summary", { credentials: "include" }).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Unable to load dashboard.");
      setSummary(data);
    }).catch((reason) => setError(reason.message));
  }, []);

  if (error) return <div className="teacher-dashboard-loading">⚠️ {error}</div>;
  if (!summary) return <div className="teacher-dashboard-loading">Loading your dashboard...</div>;

  const elementary = summary.teacher?.department === "elementary";
  const groups = elementary ? summary.attentionItems : { flat: summary.attentionItems || [] };
  return <div className="teacher-dashboard">
    <header className="teacher-page-header"><div><h1>Welcome, {summary.teacher.firstName}</h1><p>{summary.teacher.homeGradeLevel} teacher · {summary.activeTerm}</p></div><Link className="teacher-primary-button" href="/teacher/students">View Students</Link></header>
    <section className="teacher-overview-cards">
      <div className="teacher-overview-card"><span>Present today</span><strong>{summary.attendanceSummary.present}</strong><small>of {summary.attendanceSummary.total} students</small></div>
      <div className="teacher-overview-card teacher-overview-absent"><span>Absent today</span><strong>{summary.attendanceSummary.absent}</strong><small>of {summary.attendanceSummary.total} students</small></div>
      <div className="teacher-overview-card"><span>Pending report cards</span><strong>{summary.pendingBadgeCount}</strong><small>items need action</small></div>
      <div className="teacher-overview-card"><span>Home grade</span><strong className="teacher-grade-value">{summary.teacher.homeGradeLevel}</strong><small>all sections</small></div>
    </section>
    <section className="teacher-attendance-card"><div><h2>Today&apos;s attendance</h2><p>Grade-wide attendance for your home class.</p></div><div className="teacher-attendance-total"><strong>{summary.attendanceSummary.present}</strong><span>present</span><b>{summary.attendanceSummary.absent}</b><span>absent</span></div><Link href="/teacher/attendance">Open attendance logs</Link></section>
    {elementary && <section className="teacher-attention-grid"><div className="teacher-panel"><h2>Adviser duties</h2><ul className="teacher-attention-list">{(groups.asAdviser || []).length ? groups.asAdviser.map((item, index) => <AttentionItem key={`${item.type}-${index}`} item={item} />) : <li className="teacher-empty">No adviser actions right now.</li>}</ul></div><div className="teacher-panel"><h2>Subject-teacher duties</h2><ul className="teacher-attention-list">{(groups.asSubjectTeacher || []).length ? groups.asSubjectTeacher.map((item, index) => <AttentionItem key={`${item.type}-${index}`} item={item} />) : <li className="teacher-empty">No subject-teacher actions right now.</li>}</ul></div></section>}
    {!elementary && <section className="teacher-panel"><h2>Things that need your attention</h2><ul className="teacher-attention-list">{groups.flat.length ? groups.flat.map((item, index) => <AttentionItem key={`${item.type}-${index}`} item={item} />) : <li className="teacher-empty">Nothing needs your attention right now.</li>}</ul></section>}
    {Object.prototype.hasOwnProperty.call(summary, "teachingLoad") && <section className="teacher-load-panel"><h2>My Teaching Load</h2><p><strong>{(summary.teachingLoad.assignedSubjects || []).join(", ") || "Not assigned"}</strong> · Assigned subjects</p><p>Visiting grades: {(summary.teachingLoad.visitingGrades || []).join(", ") || "None"}</p></section>}
  </div>;
}