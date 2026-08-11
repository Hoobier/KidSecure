"use client";

import "./admin.css";

const principalName = "Mrs. Juana J. Ramos";
const overviewData = [
  { label: "Total students", value: "475" },
  { label: "Total teachers", value: "9" },
  { label: "Present Today", value: "468" },
];

const attendanceSummary = {
  present: 456,
  late: 12,
  absent: 7,
};

const attentionItems = [
  {
    icon: "🔔",
    title: "4 students are missing RFID cards",
    detail: "Assign or replace tags before the next school day.",
  },
  {
    icon: "👪",
    title: "3 students have no linked parent account yet",
    detail: "Add a parent account so the family can receive attendance notifications.",
  },
  {
    icon: "⏰",
    title: "3 late arrivals flagged today",
    detail: "Check the attendance log and notify the homeroom teacher.",
  },
];

export default function AdminPage() {
  return (
    <>
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
        <div className="attendance-breakdown">
          <div className="status-card status-present">
            <span className="status-icon">✅</span>
            <div>
              <p className="status-count">{attendanceSummary.present}</p>
              <p className="status-label">Present</p>
            </div>
          </div>
          <div className="status-card status-late">
            <span className="status-icon">⏰</span>
            <div>
              <p className="status-count">{attendanceSummary.late}</p>
              <p className="status-label">Late</p>
            </div>
          </div>
          <div className="status-card status-absent">
            <span className="status-icon">⚠️</span>
            <div>
              <p className="status-count">{attendanceSummary.absent}</p>
              <p className="status-label">Absent</p>
            </div>
          </div>
        </div>
      </section>

      <section className="attention-section">
        <div className="attention-panel">
          <div className="panel-header">
            <h2>Things that need your attention</h2>
            <p className="panel-subtitle">Priority items to review before the next class starts.</p>
          </div>
          <ul className="attention-list">
            {attentionItems.map((item) => (
              <li key={item.title} className="attention-item">
                <span className="attention-icon">{item.icon}</span>
                <div>
                  <p className="attention-title">{item.title}</p>
                  <p className="attention-detail">{item.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div className="secondary-card">
          <h3>Quick Tip</h3>
          <p>
            Once enrollment and attendance data are connected, this page will refresh automatically and show the latest daily counts.
          </p>
        </div>
      </section>
    </>
  );
}
