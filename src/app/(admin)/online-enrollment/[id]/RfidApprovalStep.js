"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import "../../enrollment/enrollment.css";

// src/app/(admin)/online-enrollment/[id]/RfidApprovalStep.js
//
// Same scan/poll mechanism as the walk-in wizard's RfidStep — the backend's
// EnrollmentRfidController doesn't know or care whether the tag is destined
// for a brand-new student or a converted guest application. This component
// additionally collects a Section (which the guest form never asks for) and
// calls convertToStudent() directly, since that's a guest-application-only
// action with its own duplicate-check responses to handle.

const POLL_INTERVAL_MS = 1500;
const LISTEN_TIMEOUT_MS = 20000;
const SECTIONS = ["A", "B", "C"];

export default function RfidApprovalStep({ applicationId, gradeLevel, studentFullName, onCancel, onSuccess }) {
  const [section, setSection] = useState("");
  // 'idle' | 'listening' | 'detected' | 'duplicate' | 'timeout' | 'error'
  const [scanState, setScanState] = useState("idle");
  const [rfidTag, setRfidTag] = useState("");
  const [manualEntry, setManualEntry] = useState(false);
  const [manualError, setManualError] = useState("");
  const [duplicateTagName, setDuplicateTagName] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [pendingConfirmation, setPendingConfirmation] = useState(null); // { type, message, existingStudent | existingParent }

  const pollTimerRef = useRef(null);
  const timeoutTimerRef = useRef(null);

  const clearTimers = useCallback(() => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    if (timeoutTimerRef.current) clearTimeout(timeoutTimerRef.current);
    pollTimerRef.current = null;
    timeoutTimerRef.current = null;
  }, []);

  const stopListening = useCallback(async () => {
    clearTimers();
    try {
      await fetch("/api/enrollment/rfid/stop-listening", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // best-effort cleanup
    }
  }, [clearTimers]);

  useEffect(() => {
    return () => {
      clearTimers();
      stopListening();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function pollOnce() {
    try {
      const res = await fetch("/api/enrollment/rfid/pending-scan", {
        credentials: "include",
      });
      const json = await res.json();

      if (json.status === "new") {
        clearTimers();
        setRfidTag(json.rfidTag);
        setScanState("detected");
      } else if (json.status === "duplicate") {
        clearTimers();
        setDuplicateTagName(json.studentName || "another student");
        setScanState("duplicate");
      } else if (json.status === "expired") {
        clearTimers();
        setScanState("timeout");
      }
    } catch {
      clearTimers();
      setScanState("error");
    }
  }

  async function handleStartScan() {
    setScanState("listening");
    setManualEntry(false);

    try {
      await fetch("/api/enrollment/rfid/start-listening", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ excludeStudentId: null }),
      });
    } catch {
      setScanState("error");
      return;
    }

    pollTimerRef.current = setInterval(pollOnce, POLL_INTERVAL_MS);
    timeoutTimerRef.current = setTimeout(() => {
      clearTimers();
      setScanState((current) => (current === "listening" ? "timeout" : current));
    }, LISTEN_TIMEOUT_MS);
  }

  function handleTryAgain() {
    setScanState("idle");
    handleStartScan();
  }

  function handleRescan() {
    setRfidTag("");
    setScanState("idle");
    handleStartScan();
  }

  function handleManualSubmit() {
    if (!rfidTag.trim() || rfidTag.trim().length < 4) {
      setManualError("That doesn't look like a complete RFID tag. Please check and try again.");
      return;
    }
    setManualError("");
    setScanState("detected");
  }

  async function submitConversion(overrides = {}) {
    setSubmitting(true);
    setSubmitError("");

    try {
      const res = await fetch(`/api/guest/enrollments/${applicationId}/convert-to-student`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rfidTag,
          section,
          confirmDuplicate: overrides.confirmDuplicate || false,
          confirmParentMismatch: overrides.confirmParentMismatch || false,
        }),
      });
      const json = await res.json().catch(() => ({}));

      if (res.status === 409 && json.outcome === "duplicate_student") {
        setPendingConfirmation({
          type: "duplicate_student",
          message: json.message,
          existing: json.existingStudent,
        });
        return;
      }

      if (res.status === 409 && json.outcome === "duplicate_parent_email") {
        setPendingConfirmation({
          type: "duplicate_parent_email",
          message: json.message,
          existing: json.existingParent,
        });
        return;
      }

      if (!res.ok) {
        throw new Error(json.message || "Unable to convert this application to a student.");
      }

      onSuccess(json);
    } catch (err) {
      setSubmitError(err?.message || "Unable to reach the server. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleConfirmClick() {
    stopListening();
    submitConversion();
  }

  function handleProceedAnyway() {
    const overrides =
      pendingConfirmation?.type === "duplicate_student"
        ? { confirmDuplicate: true }
        : { confirmParentMismatch: true };
    setPendingConfirmation(null);
    submitConversion(overrides);
  }

  const canConfirm = scanState === "detected" && !!section && !submitting;

  return (
    <div className="oed-modal oed-modal-rfid" onClick={(e) => e.stopPropagation()}>
      <h3>Approve &amp; Assign RFID Tag</h3>
      <p>
        Converting <strong>{studentFullName || "this application"}</strong> into a registered
        student. Select a section and scan the student&apos;s RFID tag to finish.
      </p>

      <div className="enrollment-form-group">
        <label htmlFor="approvalSection">
          Section<span className="required">*</span>
        </label>
        <select
          id="approvalSection"
          value={section}
          onChange={(e) => setSection(e.target.value)}
        >
          <option value="">Select section</option>
          {SECTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        {gradeLevel && (
          <p className="enrollment-help-text">Applying for: {gradeLevel}</p>
        )}
      </div>

      <div className="enrollment-form-group">
        <label>Student&apos;s RFID Tag</label>

        {scanState === "idle" && (
          <div className="rfid-scan-box">
            <p className="enrollment-help-text">
              Press the button below, then have the student tap their tag on the reader.
            </p>
            <button type="button" className="enrollment-btn enrollment-btn-primary" onClick={handleStartScan}>
              📡 Scan Student&apos;s Tag
            </button>
            <button type="button" className="rfid-manual-link" onClick={() => setManualEntry(true)}>
              Or type the tag ID manually
            </button>
          </div>
        )}

        {scanState === "listening" && (
          <div className="rfid-scan-box rfid-scan-waiting">
            <div className="rfid-spinner" aria-hidden="true" />
            <p>Tap the tag on the reader now…</p>
            <button
              type="button"
              className="enrollment-btn enrollment-btn-secondary"
              onClick={() => { stopListening(); setScanState("idle"); }}
            >
              Cancel
            </button>
          </div>
        )}

        {scanState === "detected" && (
          <div className="rfid-scan-box rfid-scan-success">
            <p>✅ Tag detected: <strong>{rfidTag}</strong></p>
            <button type="button" className="enrollment-btn enrollment-btn-secondary" onClick={handleRescan}>
              Scan a Different Tag
            </button>
          </div>
        )}

        {scanState === "timeout" && (
          <div className="rfid-scan-box rfid-scan-warning">
            <p>⚠️ No tag detected. Make sure the tag is close to the reader.</p>
            <button type="button" className="enrollment-btn enrollment-btn-primary" onClick={handleTryAgain}>
              Try Again
            </button>
          </div>
        )}

        {scanState === "error" && (
          <div className="rfid-scan-box rfid-scan-warning">
            <p>⚠️ Couldn&apos;t reach the reader right now. Please try again.</p>
            <button type="button" className="enrollment-btn enrollment-btn-primary" onClick={handleTryAgain}>
              Try Again
            </button>
          </div>
        )}

        {manualEntry && (
          <div className="rfid-manual-entry">
            <input
              type="text"
              placeholder="Type the tag ID printed on the card"
              value={rfidTag}
              onChange={(e) => {
                setRfidTag(e.target.value);
                if (manualError) setManualError("");
              }}
              className={manualError ? "input-invalid" : ""}
              autoComplete="off"
            />
            {manualError && <p className="enrollment-field-error">{manualError}</p>}
            <button type="button" className="enrollment-btn enrollment-btn-secondary" onClick={handleManualSubmit}>
              Confirm Tag
            </button>
          </div>
        )}
      </div>

      {submitError && <p className="enrollment-field-error">{submitError}</p>}

      <div className="oed-modal-actions">
        <button
          className="oed-modal-btn oed-modal-ghost"
          onClick={() => { stopListening(); onCancel(); }}
          disabled={submitting}
        >
          Cancel
        </button>
        <button
          className="oed-modal-btn oed-modal-primary"
          onClick={handleConfirmClick}
          disabled={!canConfirm}
        >
          {submitting ? "Converting…" : "Confirm & Convert to Student"}
        </button>
      </div>

      {scanState === "duplicate" && (
        <div className="enrollment-modal-overlay">
          <div className="enrollment-modal">
            <h3>This tag is already in use</h3>
            <p>
              This tag is already assigned to <strong>{duplicateTagName}</strong>. Please use a
              different tag.
            </p>
            <div className="enrollment-modal-actions">
              <button type="button" className="enrollment-btn enrollment-btn-secondary" onClick={() => setScanState("idle")}>
                Cancel
              </button>
              <button type="button" className="enrollment-btn enrollment-btn-primary" onClick={handleTryAgain}>
                Try Another Tag
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingConfirmation && (
        <div className="enrollment-modal-overlay">
          <div className="enrollment-modal">
            <h3>
              {pendingConfirmation.type === "duplicate_student"
                ? "Possible duplicate student"
                : "Email already registered"}
            </h3>
            <p>{pendingConfirmation.message}</p>
            {pendingConfirmation.existing && (
              <div className="enrollment-modal-existing">
                {pendingConfirmation.type === "duplicate_student" ? (
                  <>
                    <div><strong>{pendingConfirmation.existing.fullName}</strong></div>
                    <div>{pendingConfirmation.existing.gradeLevel} — Sec. {pendingConfirmation.existing.section}</div>
                    <div>Student ID: {pendingConfirmation.existing.studentId}</div>
                  </>
                ) : (
                  <>
                    <div><strong>{pendingConfirmation.existing.fullName}</strong></div>
                    <div>{pendingConfirmation.existing.email}</div>
                  </>
                )}
              </div>
            )}
            <div className="enrollment-modal-actions">
              <button
                type="button"
                className="enrollment-btn enrollment-btn-secondary"
                onClick={() => setPendingConfirmation(null)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="enrollment-btn enrollment-btn-primary"
                onClick={handleProceedAnyway}
                disabled={submitting}
              >
                {submitting ? "Converting…" : "Proceed Anyway"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}