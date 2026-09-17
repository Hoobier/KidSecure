"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import PasswordInput from "@/components/PasswordInput";
import "./teacher-login.css";

export default function TeacherLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      if (message.type === "success") router.replace("/teacher/dashboard");
      else setMessage(null);
    }, 1800);
    return () => clearTimeout(timer);
  }, [message, router]);

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = {};
    if (!email) nextErrors.email = "Please enter your email.";
    if (!password) nextErrors.password = "Please enter your password.";
    setErrors(nextErrors);
    setMessage(null);
    if (Object.keys(nextErrors).length) return;

    setLoading(true);
    try {
      const response = await fetch("/api/teacher/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Invalid credentials.");
      setMessage({ type: "success", text: `Welcome, ${data.teacher?.firstName || "Teacher"}.` });
    } catch (error) {
      setMessage({ type: "error", text: error.message || "Unable to sign in right now." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="teacher-login-page">
      <div className="teacher-login-container">
        <div className="teacher-login-brand">
          <Image src="/pictures/rcac.png" alt="KidSecure logo" width={50} height={50} />
          <div><strong>KidSecure</strong><span>RCAC Teacher Portal</span></div>
        </div>
        <h1>Teacher sign in</h1>
        <p className="teacher-login-intro">Manage your class records and attendance.</p>
        <form onSubmit={handleSubmit}>
          <label htmlFor="teacher-email">Email</label>
          <input id="teacher-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="your@email.com" />
          <span className="teacher-login-error">{errors.email || " "}</span>
          <label htmlFor="teacher-password">Password</label>
          <PasswordInput id="teacher-password" value={password} onChange={(event) => setPassword(event.target.value)} className={errors.password ? "input-invalid" : ""} />
          <span className="teacher-login-error">{errors.password || " "}</span>
          {message && <p className={`teacher-login-message teacher-login-message-${message.type}`}>{message.text}</p>}
          <button type="submit" disabled={loading}>{loading ? "Signing In..." : "Sign In"}</button>
        </form>
      </div>
    </div>
  );
}