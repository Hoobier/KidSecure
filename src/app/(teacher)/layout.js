"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import "../globals.css";

export default function TeacherLayout({ children }) {
  const pathname = usePathname() || "/teacher/dashboard";
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const linkClass = (path) => pathname === path || pathname.startsWith(`${path}/`)
    ? "sidebar-link sidebar-link-active" : "sidebar-link";

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/teacher/logout", { method: "POST" });
    window.location.href = "/teacher/login";
  }

  return (
    <main className="main-content-wrapper">
      <div className="app-shell">
        <aside className="sidebar">
          <div>
            <div className="sidebar-brand">
              <img src="/pictures/rcac.png" alt="RCAC Logo" className="sidebar-logo" />
              <div><span className="brand-title">KidSecure</span><span className="brand-subtitle">RCAC Teacher Portal</span></div>
            </div>
            <nav className="sidebar-nav">
              <Link className={linkClass("/teacher/dashboard")} href="/teacher/dashboard">Dashboard</Link>
              <Link className={linkClass("/teacher/students")} href="/teacher/students">Students</Link>
              <Link className={linkClass("/teacher/attendance")} href="/teacher/attendance">Attendance Logs</Link>
              <Link className={linkClass("/teacher/report-cards")} href="/teacher/report-cards">Report Cards</Link>
            </nav>
          </div>
          <div className="sidebar-footer">
            <hr className="sidebar-divider" />
            <button className="sidebar-link sidebar-logout" onClick={() => setShowLogoutConfirm(true)}>Log Out</button>
          </div>
        </aside>
        <div className="content-area">{children}</div>
      </div>
      {showLogoutConfirm && <div className="logout-modal-overlay"><div className="logout-modal">
        <h3>Log out?</h3><p>You&apos;ll need to sign in again to access the teacher portal.</p>
        <div className="logout-modal-actions"><button className="logout-modal-btn-cancel" onClick={() => setShowLogoutConfirm(false)} disabled={loggingOut}>Cancel</button><button className="logout-modal-btn-confirm" onClick={handleLogout} disabled={loggingOut}>{loggingOut ? "Logging out..." : "Log Out"}</button></div>
      </div></div>}
    </main>
  );
}