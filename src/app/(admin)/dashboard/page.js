"use client";
// src/app/%28admin%29/dashboard/page.js
import { useEffect, useState } from "react";
import Link from "next/link";
import "./admin.css";

const ATTENTION_ITEM_LABELS = {
  missing_rfid: (count) => ({
    icon: "🔔",
    title: `${count} student${count === 1 ? "" : "s"} ${count === 1 ? "is" : "are"} missing RFID cards`,
    detail: "Assign or replace tags before the next school day.",
  }),
  missing_parent: (count) => ({
    icon: "👪",
    title: `${count} student${count === 1 ? "" : "s"} ${count === 1 ? "has" : "have"} no linked parent account yet`,
    detail: "Add a parent account so the family can receive attendance notifications.",
  }),
  pending_online_enrollment: (count) => ({
    icon: "📋",
    title: `${count} online application${count === 1 ? "" : "s"} waiting for review`,
    detail: "Review new enrollment submissions from families.",
  }),
  rejected_online_enrollment: (count) => ({
    icon: "⚠️",
    title: `${count} rejected online application${count === 1 ? "" : "s"}`,
    detail: "Review the rejected applications before clearing them from the dashboard.",
  }),
  frozen_parent_accounts: (count) => ({
    icon: "🔒",
    title: `${count} frozen parent account${count === 1 ? "" : "s"}`,
    detail: "These accounts cannot receive login credentials while frozen.",
  }),
};

function formatCalendarDate(date) {
  return {
    day: date.toLocaleDateString("en-US", { day: "numeric" }),
    weekday: date.toLocaleDateString("en-US", { weekday: "long" }),
    month: date.toLocaleDateString("en-US", { month: "long" }),
    year: date.toLocaleDateString("en-US", { year: "numeric" }),
  };
}

function formatRejectedDate(value) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

export default function AdminPage() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingRejected, setDeletingRejected] = useState(false);
  const [attentionMessage, setAttentionMessage] = useState(null);
  const [showLoyaltyModal, setShowLoyaltyModal] = useState(false);
  const [loyaltyStudents, setLoyaltyStudents] = useState([]);
  const [loadingLoyalty, setLoadingLoyalty] = useState(false);
  const [loyaltyError, setLoyaltyError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadSummary() {
      setLoading(true);
      setError("");

      try {
        const res = await fetch("/api/dashboard/summary");
        const data = await res.json();

        if (!res.ok) {
          if (!cancelled) setError(data.message || "Unable to load dashboard information.");
          return;
        }

        if (!cancelled) setSummary(data);
      } catch (err) {
        if (!cancelled) setError("Unable to reach the server. Please check your connection.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadSummary();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-loading">
        <p>⚠️ {error}</p>
      </div>
    );
  }

  const overviewData = [
    { label: "Total students", value: summary.totalStudents },
    { label: "Parent accounts", value: summary.totalParentAccounts },
    {
      label: "Present today",
      value: summary.todayAttendance.hasData ? summary.todayAttendance.present : "—",
    },
  ];

  const pendingGuestEnrollments = Number(summary.pendingGuestEnrollments ?? 0);
  const rejectedApplications = Array.isArray(summary.rejectedApplications)
    ? summary.rejectedApplications
    : [];
  const rejectedCount = Number(summary.rejectedGuestEnrollments ?? rejectedApplications.length);
  const calendarDate = formatCalendarDate(new Date());

  const transferredOutCount = Number(summary.transferredOutCount ?? 0);
  const loyaltyAwardEligibleCount = Number(summary.loyaltyAwardEligibleCount ?? 0);

  const attentionItems = summary.attentionItems.map((item) => {
    const build = ATTENTION_ITEM_LABELS[item.type];
    if (!build) return null;
    const rendered = build(item.count);
    return { type: item.type, ...rendered };
  }).filter(Boolean);

  
  async function handleDeleteRejected() {
    if (deletingRejected || rejectedCount === 0) return;
    if (!window.confirm(`Delete all ${rejectedCount} rejected applications? This cannot be undone.`)) return;

    setDeletingRejected(true);
    setAttentionMessage(null);
    try {
      const res = await fetch("/api/guest/enrollments", { method: "DELETE", credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Unable to delete rejected applications.");
      setSummary((current) => ({
        ...current,
        rejectedGuestEnrollments: 0,
        rejectedApplications: [],
        attentionItems: (current.attentionItems || []).filter(
          (item) => item.type !== "rejected_online_enrollment"
        ),
      }));
      setAttentionMessage(data.message || "Rejected applications deleted.");
    } catch (err) {
      setAttentionMessage(err.message || "Unable to delete rejected applications.");
    } finally {
      setDeletingRejected(false);
    }
  }

  async function handleOpenLoyaltyModal() {
    setShowLoyaltyModal(true);
    setLoadingLoyalty(true);
    setLoyaltyError("");
    try {
      const res = await fetch("/api/dashboard/loyalty-eligible-students", { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Unable to load loyalty award eligible students.");
      setLoyaltyStudents(data.data || []);
    } catch (err) {
      setLoyaltyError(err.message || "Unable to reach the server.");
    } finally {
      setLoadingLoyalty(false);
    }
  }

  return (
    <div className="dashboard-fit">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="page-title-note">Your school at a glance.</p>
        </div>
        <div className="dashboard-actions">
          <Link href="/online-enrollment" className="btn btn-primary btn-cta-online">
            <span className="btn-cta-online-icon">🌐</span>
            Online Enrollment
            <span className="btn-cta-online-count">{pendingGuestEnrollments || 0} pending</span>
          </Link>
        </div>
      </div>

      <section className="dashboard-top">
        <div className="dashboard-calendar">
          <div className="calendar-month">{calendarDate.month}</div>
          <div className="calendar-day">{calendarDate.day}</div>
          <div className="calendar-weekday">{calendarDate.weekday}</div>
          <div className="calendar-year">{calendarDate.year}</div>
        </div>
        <div className="overview-cards">
          {overviewData.map((item) => (
            <div key={item.label} className="overview-card">
              <span className="overview-label">{item.label}</span>
              <p className="overview-value">{item.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="attendance-section">
        <div className="section-header">
          <div>
            <h2>Today&apos;s attendance</h2>
            <p className="section-subtitle">Attendance breakdown for the current school day.</p>
          </div>
        </div>

        {summary.todayAttendance.hasData ? (
          <div className="attendance-breakdown">
            <div className="status-card status-present">
              <span className="status-icon">✅</span>
              <div>
                <p className="status-count">{summary.todayAttendance.present}</p>
                <p className="status-label">Present</p>
              </div>
            </div>
            <div className="status-card status-absent">
              <span className="status-icon">⚠️</span>
              <div>
                <p className="status-count">{summary.todayAttendance.absent}</p>
                <p className="status-label">Absent</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="attendance-empty">
            <p>No attendance activity recorded yet today.</p>
            <p className="attendance-empty-sub">This will update automatically once RFID scans come in.</p>
          </div>
        )}
      </section>

      <section className="attention-section">
        <div className="attention-panel">
          <div className="panel-header">
            <h2>Things that need your attention</h2>
            <p className="panel-subtitle">Priority items to review before the next class starts.</p>
          </div>
          {attentionItems.length > 0 ? (
            <ul className="attention-list">
              {attentionItems.map((item) => {
                const linkedTypes = [
                  "missing_rfid",
                  "pending_online_enrollment",
                  "rejected_online_enrollment",
                  "frozen_parent_accounts",
                ];
                const listInner = (
                  <>
                    <span className="attention-icon">{item.icon}</span>
                    <div>
                      <p className="attention-title">{item.title}</p>
                      <p className="attention-detail">{item.detail}</p>
                    </div>
                  </>
                );
                return (
                  <li key={item.title} className="attention-item">
                    {linkedTypes.includes(item.type) ? (
                      <Link
                        href={item.type === "missing_rfid" ? "/dashboard/list" : item.type === "frozen_parent_accounts" ? "/account" : "/online-enrollment"}
                        className="attention-item-link"
                      >
                        {listInner}
                      </Link>
                    ) : (
                      listInner
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="attention-empty">Nothing needs your attention right now. 🎉</p>
          )}
          {attentionMessage && <p className="attention-feedback">{attentionMessage}</p>}
          {rejectedApplications.length > 0 && (
            <div className="rejected-applications-widget">
              <div className="rejected-applications-header">
                <div>
                  <h3>Rejected applications</h3>
                  <p>Recent applications marked for rejection.</p>
                </div>
                <button
                  type="button"
                  className="rejected-delete-btn"
                  onClick={handleDeleteRejected}
                  disabled={deletingRejected}
                >
                  {deletingRejected ? "Deleting…" : "Delete All"}
                </button>
              </div>
              <ul className="rejected-applications-list">
                {rejectedApplications.map((application) => (
                  <li key={application.id} className="rejected-application-item">
                    <Link href={`/online-enrollment/${application.id}`}>
                      <strong>{application.studentName || "Unnamed student"}</strong>
                      <span>{application.parentName || "Parent unavailable"}</span>
                      <small>
                        {formatRejectedDate(application.rejectedAt || application.submittedAt)}
                        {application.rejectionReason ? ` · ${application.rejectionReason}` : ""}
                      </small>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="secondary-card secondary-card-stack">
          <h3>Year-End Records</h3>
          <div className="quick-stats-row">
            <button type="button" className="quick-stat-item" onClick={handleOpenLoyaltyModal}>
              <span className="quick-stat-icon">🏅</span>
              <div className="quick-stat-body">
                <p className="quick-stat-value">{loyaltyAwardEligibleCount}</p>
                <p className="quick-stat-label">Loyalty Award Eligible</p>
              </div>
            </button>
            <Link href="/students/transferred" className="quick-stat-item">
              <span className="quick-stat-icon">📤</span>
              <div className="quick-stat-body">
                <p className="quick-stat-value">{transferredOutCount}</p>
                <p className="quick-stat-label">Transferred Out</p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {showLoyaltyModal && (
        <div className="modal-overlay" onClick={() => setShowLoyaltyModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🏅 Loyalty Award Eligible Students</h3>
              <button type="button" className="modal-close-btn" onClick={() => setShowLoyaltyModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {loadingLoyalty && <p className="modal-loading">Loading students…</p>}
              {!loadingLoyalty && loyaltyError && <p className="modal-error">⚠️ {loyaltyError}</p>}
              {!loadingLoyalty && !loyaltyError && loyaltyStudents.length === 0 && (
                <p className="modal-empty">No loyalty award eligible students found.</p>
              )}
              {!loadingLoyalty && !loyaltyError && loyaltyStudents.length > 0 && (
                <ul className="modal-student-list">
                  {loyaltyStudents.map((student) => (
                    <li key={student.studentId} className="modal-student-item">
                      <div>
                        <strong>{student.name}</strong>
                        <span>
                          {student.gradeLevel}
                          {student.section ? ` · Section ${student.section}` : ""}
                        </span>
                      </div>
                      <span className="modal-student-year">{student.schoolYearLabel}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>

    
  );
}