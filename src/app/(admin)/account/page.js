"use client";

import { useEffect, useState } from "react";
import "./account.css";

function saveAccount(account) {
  const mobileAccounts = JSON.parse(window.localStorage.getItem("mobileAccounts")) || [];
  mobileAccounts.push(account);
  window.localStorage.setItem("mobileAccounts", JSON.stringify(mobileAccounts));
}

function generatePassword(length) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let password = "";
  const randomValues = new Uint32Array(length);
  window.crypto.getRandomValues(randomValues);
  for (let index = 0; index < length; index += 1) {
    password += chars[randomValues[index] % chars.length];
  }
  return password;
}

export default function AccountPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    setPassword("");
  }, []);

  async function handleGeneratePassword() {
    setPassword(generatePassword(8));
    setPasswordVisible(true);
    setMessage("");
    setStatus("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setMessage("");
    setStatus("");

    if (password.length < 6) {
      setMessage("Please generate a password first.");
      setStatus("error");
      return;
    }

    try {
      const today = new Date();
      const createdAt = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(
        today.getDate()
      ).padStart(2, "0")}`;
      saveAccount({ email: email.trim(), password, createdAt });
      setMessage("Mobile Account Created!");
      setStatus("success");
      setEmail("");
      setPassword("");
      setPasswordVisible(false);
    } catch (error) {
      console.error("Error saving mobile account:", error);
      setMessage(`Unable to create account right now. ${error.message || "Unknown error"}`);
      setStatus("error");
    }
  }

  return (
    <main className="log-section">
      <div className="section-header">
        <h2>Create Mobile App Account</h2>
      </div>

      <form id="adminAccountForm" className="account-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            className="form-input"
            placeholder="Enter email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <p id="emailError" className="form-message"></p>
        </div>

        <div className="form-group">
          <label htmlFor="password">Password</label>
          <div className="password-container">
            <input
              type={passwordVisible ? "text" : "password"}
              id="password"
              className="form-input"
              placeholder="Click Generate Password"
              value={password}
              readOnly
            />
            <button
              type="button"
              className="toggle-password"
              onClick={() => setPasswordVisible(!passwordVisible)}
            >
              {passwordVisible ? "Hide" : "Show"}
            </button>
          </div>
          <button type="button" id="generatePasswordBtn" className="secondary-btn" onClick={handleGeneratePassword}>
            Generate Password
          </button>
          <p className="password-tip">Click Generate Password to create a secure password with at least 6 characters</p>
          <p id="passwordError" className="error-message" style={{ display: status === "error" ? "block" : "none" }}>
            {status === "error" ? message : ""}
          </p>
        </div>

        <p id="accountMessage" className={`form-message ${status}`}>{status === "success" ? message : ""}</p>
        <button type="submit" className="create-account-btn">Create Account</button>
      </form>
    </main>
  );
}
