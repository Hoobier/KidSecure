"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AdminLayout({ children }) {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const linkClass = (path) =>
    pathname === path || (path !== "/dashboard" && pathname.startsWith(path))
      ? "sidebar-link sidebar-link-active"
      : "sidebar-link";

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  }

  useEffect(() => {
    function handlePageShow(event) {
      if (event.persisted) {
        fetch("/api/auth/check", { credentials: "include" })
          .then((res) => {
            if (!res.ok) {
              router.replace("/login");
            }
          })
          .catch(() => {
            router.replace("/login");
          });
      }
    }

    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, [router]);

  return (
    <main className="main-content-wrapper">
      <div className="app-shell">
        <aside className="sidebar">
          <div className="sidebar-brand">
            <img src="/pictures/rcac.png" alt="RCAC Logo" className="sidebar-logo" />
            <div>
              <span className="brand-title">KidSecure</span>
              <span className="brand-subtitle">RCAC Admin</span>
            </div>
          </div>

          <nav className="sidebar-nav">
            <Link className={linkClass("/dashboard")} href="/dashboard">
              Dashboard
            </Link>
            <Link className={linkClass("/enrollment")} href="/enrollment">
              Enroll New
            </Link>
            <Link className={linkClass("/students")} href="/students">
              Students
            </Link>
            <Link className={linkClass("/rfid")} href="/rfid">
              Attendance Logs
            </Link>
            <Link className={linkClass("/account")} href="/account">
              Parent Directory
            </Link>
          </nav>

          <div className="sidebar-footer">
            <hr className="sidebar-divider" />
            <button className="sidebar-link sidebar-logout" onClick={() => setShowLogoutConfirm(true)}>
              Log Out
            </button>
          </div>
        </aside>

        <div className="content-area">{children}</div>
      </div>

      {showLogoutConfirm && (
        <div className="logout-modal-overlay">
          <div className="logout-modal">
            <h3>Log out?</h3>
            <p>You&apos;ll need to sign in again to access the dashboard.</p>
            <div className="logout-modal-actions">
              <button
                className="logout-modal-btn-cancel"
                onClick={() => setShowLogoutConfirm(false)}
                disabled={loggingOut}
              >
                Cancel
              </button>
              <button
                className="logout-modal-btn-confirm"
                onClick={handleLogout}
                disabled={loggingOut}
              >
                {loggingOut ? "Logging out…" : "Log Out"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}