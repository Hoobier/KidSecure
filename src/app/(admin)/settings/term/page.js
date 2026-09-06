"use client";
// src/app/(admin)/settings/term/page.js
import { useEffect, useState } from "react";
import Link from "next/link";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "./term-settings.css";

// ---- Date helpers: convert between "YYYY-MM-DD" string and real Date objects ----
// Same pattern as StudentInfoStep's dateOfBirth handling.

function getMinTermDate() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 3);
  return d;
}

function getMaxTermDate() {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 2);
  return d;
}

function stringToDate(dateString) {
  if (!dateString) return null;
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day); // JS months are 0-indexed
}

function dateToString(date) {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function TermSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [currentTermStartDate, setCurrentTermStartDate] = useState("");
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/term-settings", { credentials: "include" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Unable to load term settings.");
        if (!cancelled) {
          const date = data?.data?.currentTermStartDate || "";
          setCurrentTermStartDate(date);
          setInputValue(date);
        }
      } catch (err) {
        if (!cancelled) setError(err.message || "Unable to reach the server.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  function handleDateChange(date) {
    setInputValue(dateToString(date));
    setSuccess("");
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/term-settings", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentTermStartDate: inputValue }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Unable to update the term start date.");
      }

      setCurrentTermStartDate(data?.data?.currentTermStartDate || inputValue);
      setSuccess("Term start date updated.");
    } catch (err) {
      setError(err.message || "Unable to reach the server.");
    } finally {
      setSaving(false);
    }
  }

  const isUnchanged = inputValue === currentTermStartDate;

  return (
    <div className="term-settings-page">
      <div className="page-header">
        <div>
          <h1>School Term</h1>
          <p className="page-title-note">
            Sets when the current school term began. Pending or rejected online enrollment
            applications submitted before this date are automatically cleared out daily.
          </p>
        </div>
        <Link href="/dashboard" className="oe-back-btn">
          ← Back to Dashboard
        </Link>
      </div>

      <div className="oe-card ts-card">
        {loading ? (
          <div className="oe-empty oe-loading">Loading term settings…</div>
        ) : (
          <form onSubmit={handleSave} className="ts-form">
            {error && <div className="oe-banner oe-banner-error">⚠️ {error}</div>}
            {success && <div className="oe-banner ts-banner-success">✅ {success}</div>}

            <label className="ts-label" htmlFor="termStartDate">
              Current Term Start Date
            </label>
            <DatePicker
                id="termStartDate"
                selected={stringToDate(inputValue)}
                onChange={handleDateChange}
                minDate={getMinTermDate()}
                maxDate={getMaxTermDate()}
                placeholderText="mm/dd/yyyy"
                dateFormat="MM/dd/yyyy"
                showMonthDropdown
                showYearDropdown
                dropdownMode="select"
                scrollableYearDropdown
                yearDropdownItemNumber={6}
                wrapperClassName="ts-datepicker-wrapper"
            />
            <button
              type="submit"
              className="btn btn-primary ts-save-btn"
              disabled={saving || isUnchanged || !inputValue}
            >
              {saving ? "Saving…" : "Save Term Start Date"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}