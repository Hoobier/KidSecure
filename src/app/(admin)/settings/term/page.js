"use client";
// src/app/(admin)/settings/term/page.js
import { useEffect, useState } from "react";
import Link from "next/link";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./term-settings.css";

const SCHOOL_MONTHS = [
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
  "January",
  "February",
  "March",
  "April",
];

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
  return new Date(year, month - 1, day);
}

function dateToString(date) {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function termLabel(termNumber) {
  return `Term ${termNumber}`;
}

function getTermStatus(term, activeTermNumber) {
  if (!term.startDate || !term.endDate) return "not-set";
  if (term.termNumber === activeTermNumber) return "active";
  const end = stringToDate(term.endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (end && end < today) return "completed";
  return "upcoming";
}

const STATUS_LABELS = {
  active: "Active",
  completed: "Completed",
  upcoming: "Upcoming",
  "not-set": "Not Set",
};

const MONTH_TO_INDEX = {
  June: 5, July: 6, August: 7, September: 8, October: 9, November: 10,
  December: 11, January: 0, February: 1, March: 2, April: 3,
};

function dateToStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function MonthCalendarCard({ monthName, dates, onToggle, schoolYearLabel }) {
  // Parse the school year label like "2026-2027" to extract both years.
  let startYear = new Date().getFullYear();
  let endYear = startYear + 1;
  if (schoolYearLabel && /^(\d{4})-(\d{4})$/.test(schoolYearLabel)) {
    const m = schoolYearLabel.match(/^(\d{4})-(\d{4})$/);
    startYear = parseInt(m[1], 10);
    endYear = parseInt(m[2], 10);
  }

  const monthIndex = MONTH_TO_INDEX[monthName];
  const isSecondHalfOfYear = ["January", "February", "March", "April"].includes(monthName);
  const year = isSecondHalfOfYear ? endYear : startYear;
  const activeStart = new Date(year, monthIndex, 1);

  const selectedSet = new Set(dates);

  return (
    <div className="ts-month-card">
      <div className="ts-month-card-header">
        <span className="ts-month-card-name">{monthName}</span>
        <span className="ts-month-card-count">
          {dates.length} {dates.length === 1 ? "school day" : "school days"}
        </span>
      </div>
      <div className="ts-month-calendar-wrap">
        <Calendar
          activeStartDate={activeStart}
          onActiveStartDateChange={() => {}}
          showNavigation={false}
          showNeighboringMonth={true}
          onClickDay={(date) => {
            if (date.getMonth() !== monthIndex) return;
            onToggle(dateToStr(date));
          }}
          tileClassName={({ date, view }) => {
            if (view !== "month") return null;
            return selectedSet.has(dateToStr(date)) ? "ts-day-selected" : null;
          }}
        />
      </div>
    </div>
  );
}

export default function TermSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [schoolYearLabel, setSchoolYearLabel] = useState("");
  const [terms, setTerms] = useState([
    { termNumber: 1, startDate: "", endDate: "" },
    { termNumber: 2, startDate: "", endDate: "" },
    { termNumber: 3, startDate: "", endDate: "" },
  ]);
  const [activeTermNumber, setActiveTermNumber] = useState(null);
  const [rolloverStatus, setRolloverStatus] = useState("not_started");
  const [rolloverCompletedAt, setRolloverCompletedAt] = useState(null);
  const [needsRollover, setNeedsRollover] = useState(false);

  const [schoolDayCalendar, setSchoolDayCalendar] = useState({});
  const [tardyCutoff, setTardyCutoff] = useState("08:00");

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
          const d = data?.data || {};
          setSchoolYearLabel(d.schoolYearLabel || "");
          setTerms(
            (d.terms || []).map((t) => ({
              termNumber: t.termNumber,
              startDate: t.startDate || "",
              endDate: t.endDate || "",
            }))
          );
          setActiveTermNumber(d.activeTermNumber ?? null);
          setRolloverStatus(d.rolloverStatus || "not_started");
          setRolloverCompletedAt(d.rolloverCompletedAt || null);
          setNeedsRollover(Boolean(d.needsRollover));
          setSchoolDayCalendar(d.schoolDayCalendar || {});
          setTardyCutoff(d.tardyCutoff || "08:00");
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

  function handleTermDateChange(termNumber, field, date) {
    setTerms((prev) =>
      prev.map((t) =>
        t.termNumber === termNumber ? { ...t, [field]: dateToString(date) } : t
      )
    );
    setSuccess("");
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    for (const term of terms) {
      if (term.startDate && term.endDate && term.endDate < term.startDate) {
        setError(`${termLabel(term.termNumber)}'s end date can't be before its start date.`);
        setSaving(false);
        return;
      }
    }

    try {
      const res = await fetch("/api/term-settings", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolYearLabel,
          terms: terms.map((t) => ({
            termNumber: t.termNumber,
            startDate: t.startDate || null,
            endDate: t.endDate || null,
          })),
          schoolDayCalendar,
          tardyCutoff,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Unable to update the school term settings.");
      }

      const d = data?.data || {};
      setActiveTermNumber(d.activeTermNumber ?? null);
      setNeedsRollover(Boolean(d.needsRollover));
      setSuccess("School term settings updated.");
    } catch (err) {
      setError(err.message || "Unable to reach the server.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="term-settings-page">
      <div className="page-header">
        <div>
          <h1>School Term</h1>
          <p className="page-title-note">
            Track each term&apos;s dates. The school year ends when Term 3 ends.
          </p>
        </div>
        <Link href="/dashboard" className="oe-back-btn">
          ← Back to Dashboard
        </Link>
      </div>

      {loading ? (
        <div className="oe-card ts-card">
          <div className="oe-empty oe-loading">Loading term settings…</div>
        </div>
      ) : (
        <form onSubmit={handleSave} className="ts-form-wide">
          {error && <div className="oe-banner oe-banner-error">⚠️ {error}</div>}
          {success && <div className="oe-banner ts-banner-success">✅ {success}</div>}

          <div className="oe-card ts-year-card">
            <div className="ts-year-field">
              <label className="ts-label" htmlFor="schoolYearLabel">
                Current School Year
              </label>
              <input
                id="schoolYearLabel"
                type="text"
                className="ts-year-input"
                value={schoolYearLabel}
                onChange={(e) => { setSchoolYearLabel(e.target.value); setSuccess(""); }}
                placeholder="2026-2027"
              />
            </div>
            <button type="submit" className="btn btn-primary ts-save-btn" disabled={saving}>
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>

          <div className="ts-term-grid">
            {terms.map((term) => {
              const status = getTermStatus(term, activeTermNumber);
              return (
                <div key={term.termNumber} className={`oe-card ts-term-card ts-term-${status}`}>
                  <div className="ts-term-header">
                    <span className="ts-term-name">{termLabel(term.termNumber)}</span>
                    <span className={`ts-term-badge ts-badge-${status}`}>
                      {STATUS_LABELS[status]}
                    </span>
                  </div>

                  <label className="ts-label">Start Date</label>
                  <DatePicker
                    selected={stringToDate(term.startDate)}
                    onChange={(date) => handleTermDateChange(term.termNumber, "startDate", date)}
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

                  <label className="ts-label">End Date</label>
                  <DatePicker
                    selected={stringToDate(term.endDate)}
                    onChange={(date) => handleTermDateChange(term.termNumber, "endDate", date)}
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
                </div>
              );
            })}
          </div>

          <div className="oe-card ts-attendance-card">
            <div className="ts-attendance-header">
              <div className="ts-attendance-title">Attendance Configuration</div>
              <div className="ts-attendance-note">
                Click each school day on the calendar below. The number of school days
                is counted automatically. Leave a month blank if its calendar
                hasn&apos;t been finalized yet.
              </div>
            </div>

            <div className="ts-calendar-grid">
              {SCHOOL_MONTHS.map((month) => (
                <MonthCalendarCard
                  key={month}
                  monthName={month}
                  dates={schoolDayCalendar[month] || []}
                  schoolYearLabel={schoolYearLabel}
                  onToggle={(dateStr) => {
                    setSchoolDayCalendar((prev) => {
                      const current = prev[month] || [];
                      const next = current.includes(dateStr)
                        ? current.filter((d) => d !== dateStr)
                        : [...current, dateStr].sort();
                      return { ...prev, [month]: next };
                    });
                    setSuccess("");
                  }}
                />
              ))}
            </div>

            <div className="ts-tardy-row">
              <label className="ts-tardy-label" htmlFor="tardyCutoff">Tardy cutoff</label>
              <input
                id="tardyCutoff"
                type="time"
                className="ts-tardy-input"
                value={tardyCutoff}
                onChange={(e) => {
                  setTardyCutoff(e.target.value);
                  setSuccess("");
                }}
              />
              <span className="ts-tardy-hint">
                A student&apos;s first tap after this time is counted as tardy for the day.
              </span>
            </div>
          </div>

          <div className="oe-card ts-rollover-card">
            <div>
              <div className="ts-rollover-title">End of School Year</div>
              <div className="ts-rollover-status">
                {rolloverCompletedAt
                  ? `Last school year rollover completed on ${rolloverCompletedAt}.`
                  : "No school year rollover has been run yet."}
              </div>
            </div>
            <Link href="/school-year/rollover" className="btn btn-primary ts-rollover-btn">
              Start New School Year
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}