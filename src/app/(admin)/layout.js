"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminLayout({ children }) {
  const pathname = usePathname() || "/";
  const router = useRouter();

  const linkClass = (path) =>
    pathname === path || (path !== "/dashboard" && pathname.startsWith(path))
      ? "sidebar-link sidebar-link-active"
      : "sidebar-link";

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    window.location.href = "/login";
  }

  useEffect(() => {
    function handlePageShow(event) {
      if (event.persisted) {
        // Page was restored from bfcache (e.g. browser Back button after logout).
        // Re-verify the session is actually still valid before letting the
        // stale cached DOM sit there looking logged-in.
        fetch("/api/auth/check", { credentials: "include" })
          .then((res) => {
            if (!res.ok) {
              router.replace("/login");
            }
          })
          .catch(() => {
            // If the check itself fails to reach the server, fail safe and
            // redirect rather than silently trusting the stale page.
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
            <button className="sidebar-link sidebar-logout" onClick={handleLogout}>
              Log Out
            </button>
          </div>
        </aside>

        <div className="content-area">{children}</div>
      </div>
    </main>
  );
}