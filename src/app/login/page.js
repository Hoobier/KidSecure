// src/app/login/page.js
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import "./login.css";
import PasswordInput from "@/components/PasswordInput";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setEmailError("");
    setPasswordError("");
    setFormMessage("");

    if (!email) return setEmailError("Please enter your email.");
    if (!password) return setPasswordError("Please enter your password.");

    setLoading(true);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormMessage(data.message || "Invalid credentials.");
        return;
      }

      if (rememberMe) {
        localStorage.setItem("rememberedAdminEmail", email);
      } else {
        localStorage.removeItem("rememberedAdminEmail");
      }

      window.location.href = "/dashboard";
    } catch (error) {
      setFormMessage("Unable to sign in right now.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <div className="logo-title">
            <Image
              src="/pictures/rcac.png"
              alt="KidSecure logo"
              width={56}
              height={56}
              className="rcac-logo"
              priority
            />
            <div className="brand-text">
              <span className="brand-name">KidSecure</span>
              <span className="brand-sub">RCAC Admin</span>
            </div>
          </div>
          <div className="title-text">
            <h1>Welcome back</h1>
            <p>Sign in to manage your school dashboard.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={emailError ? "input-invalid" : ""}
            />
            <p className="input-error">{emailError}</p>
          </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <PasswordInput
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={passwordError ? "input-invalid" : ""}
              />
              <p className="input-error">{passwordError}</p>
            </div>

          <div className="form-options">
            <label className="remember-me">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              Remember me
            </label>
          </div>

          <p className="form-message">{formMessage}</p>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? "Signing In..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}