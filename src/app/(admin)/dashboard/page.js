"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import "./admin.css";

const principalName = "Mrs. Juana J. Ramos";

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
};

export default function AdminPage() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  const attentionItems = summary.attentionItems.map((item) => {
    const build = ATTENTION_ITEM_LABELS[item.type];
    if (!build) return null;
    const rendered = build(item.count);
    return { type: item.type, ...rendered };
  }).filter(Boolean);

  return (
    <div className="dashboard-fit">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="page-title-note">Your school at a glance.</p>
        </div>
      </div>

      <section className="dashboard-top">
        <div className="dashboard-greeting">
          <p className="greeting-pretitle">Good Morning,</p>
          <h2>{principalName}!</h2>
          <p className="greeting-note">Here is what you need to know right now.</p>
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
            <h2>Today's attendance</h2>
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
                const isMissingRfid = item.type === "missing_rfid";
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
                    {isMissingRfid ? (
                      <Link
                        href="/dashboard/list"
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
        </div>
        <div className="secondary-card">
          <h3>Quick Tip</h3>
          <p>
            Attendance updates automatically once RFID scans are recorded at the school entrance.
          </p>
        </div>
      </section>
    </div>
  );
}