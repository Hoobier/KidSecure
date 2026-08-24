"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// src/app/(admin)/enrollment/RfidStep.js
//
// The reader is wired to the ESP32 turnstile, not the browser, so we can't
// listen for keystrokes here. Instead: tell the backend to start listening,
// then poll it until a tag shows up (or times out).

const POLL_INTERVAL_MS = 1500;
const LISTEN_TIMEOUT_MS = 20000;

export default function RfidStep({ value, onChange, onNext, onBack, editingStudentId = null }) {
  // 'idle' | 'listening' | 'detected' | 'duplicate' | 'timeout' | 'error'
  const [scanState, setScanState] = useState(value ? "detected" : "idle");
  const [manualEntry, setManualEntry] = useState(false);
  const [manualError, setManualError] = useState("");
  const [duplicateName, setDuplicateName] = useState("");

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

  // Stop listening if the admin backs out mid-scan.
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
        onChange(json.rfidTag);
        setScanState("detected");
      } else if (json.status === "duplicate") {
        clearTimers();
        setDuplicateName(json.studentName || "another student");
        setScanState("duplicate");
      } else if (json.status === "expired") {
        clearTimers();
        setScanState("timeout");
      }
      // "waiting" → keep polling
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
        body: JSON.stringify({ excludeStudentId: editingStudentId }),
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
    onChange("");
    setScanState("idle");
    handleStartScan();
  }

  function handleSkip() {
    stopListening();
    onChange("");
    onNext();
  }

  function handleManualSubmit() {
    if (!value.trim() || value.trim().length < 4) {
      setManualError("That doesn't look like a complete RFID tag. Please check and try again.");
      return;
    }
    setManualError("");
    setScanState("detected");
  }

  return (
    <div>
      <h2 className="enrollment-step-title">RFID Tag</h2>

      <div className="enrollment-form-group">
        <label>Student&apos;s RFID Tag</label>

        {scanState === "idle" && (
          <div className="rfid-scan-box">
            <p className="enrollment-help-text">
              Ready to assign a tag to this student. Press the button below, then have the
              student tap their tag on the reader at the front desk.
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
              onClick={() => {
                stopListening();
                setScanState("idle");
              }}
            >
              Cancel
            </button>
          </div>
        )}

        {scanState === "detected" && (
          <div className="rfid-scan-box rfid-scan-success">
            <p>✅ Tag detected: <strong>{value}</strong></p>
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
              value={value}
              onChange={(e) => {
                onChange(e.target.value);
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

        <p className="enrollment-help-text">
          A Student ID will be generated automatically once enrollment is complete. If the
          student&apos;s RFID tag isn&apos;t available yet, you can skip this step and assign it
          later from the Students page.
        </p>
      </div>

      <div className="enrollment-step-actions">
        <button type="button" className="enrollment-btn enrollment-btn-secondary" onClick={onBack}>
          Back
        </button>
        <div style={{ display: "flex", gap: "0.75rem", marginLeft: "auto" }}>
          <button type="button" className="enrollment-btn enrollment-btn-secondary" onClick={handleSkip}>
            Skip — Assign Later
          </button>
          <button
            type="button"
            className="enrollment-btn enrollment-btn-primary"
            onClick={onNext}
            disabled={scanState !== "detected"}
          >
            Next: Review
          </button>
        </div>
      </div>

      {scanState === "duplicate" && (
        <div className="enrollment-modal-overlay">
          <div className="enrollment-modal">
            <h3>This tag is already in use</h3>
            <p>
              This tag is already assigned to <strong>{duplicateName}</strong>. Please use a
              different tag for this student.
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
    </div>
  );
}