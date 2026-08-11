"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function AdminLayout({ children }) {
  const pathname = usePathname() || "/";
  const router = useRouter();

  const linkClass = (path) =>
    pathname === path || (path !== "/dashboard" && pathname.startsWith(path))
      ? "sidebar-link sidebar-link-active"
      : "sidebar-link";

  async function handleLogout() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
  }

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
              Create Account
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