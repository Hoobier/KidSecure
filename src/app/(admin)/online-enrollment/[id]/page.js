"use client";
// src/app/(admin)/online-enrollment/[id]/page.js
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import RfidApprovalStep from "./RfidApprovalStep";
import "./online-detail.css";

function formatRelationship(rel) {
  if (!rel) return "";
  const n = String(rel).toLowerCase();
  if (n === "mom" || n === "mother") return "Mom";
  if (n === "dad" || n === "father") return "Dad";
  if (n === "guardian") return "Guardian";
  return rel.charAt(0).toUpperCase() + rel.slice(1).toLowerCase();
}

function get(obj, path, fallback = null) {
  if (!obj || typeof obj !== "object") return fallback;
  const parts = Array.isArray(path) ? path : String(path).split(".");
  let cur = obj;
  for (const k of parts) {
    if (cur == null || typeof cur !== "object" || !(k in cur)) return fallback;
    cur = cur[k];
  }
  if (cur === undefined || cur === null || cur === "") return fallback;
  return cur;
}

function normalizeItem(raw) {
  const s = get(raw, "student") || get(raw, "student_info") || {};
  const p = get(raw, "parent") || get(raw, "parent_info") || {};
  const a = get(raw, "academic") || get(raw, "academic_info") || get(raw, "program_info") || {};

  const firstName = get(raw, "student_first_name") || get(s, ["firstName"]) || get(s, ["first_name"]) || "";
  const middleName = get(s, ["middleName"]) || get(s, ["middle_name"]) || "";
  const lastName = get(raw, "student_last_name") || get(s, ["lastName"]) || get(s, ["last_name"]) || "";
  const studentFullName =
    get(raw, "student_full_name") ||
    get(s, ["fullName"]) ||
    get(s, ["full_name"]) ||
    [firstName, middleName, lastName].filter(Boolean).join(" ").trim();
  const referenceNumber = get(raw, ["referenceNumber"]) || get(raw, ["reference_number"]) || "";
  

  const parentFirst = get(p, ["firstName"]) || get(p, ["first_name"]) || "";
  const parentLast = get(p, ["lastName"]) || get(p, ["last_name"]) || "";
  const parentFullName =
    get(raw, "parent_full_name") ||
    get(p, ["fullName"]) ||
    get(p, ["full_name"]) ||
    [parentFirst, parentLast].filter(Boolean).join(" ").trim();
  const parentRel = get(raw, "parent_relationship") || get(p, ["relationship"]) || "";

  const phone = get(raw, "student_phone") || get(s, ["phone"]) || get(s, ["contact_number"]) || "";
  const email = get(raw, "student_email") || get(s, ["email"]) || "";
  const address = get(raw, "student_address") || get(s, ["address"]) || get(s, ["full_address"]) || "";
  const birthDate = get(raw, "student_birth_date") || get(s, ["birthDate"]) || get(s, ["birth_date"]) || "";
  const gender = get(raw, "student_gender") || get(s, ["gender"]) || "";
  const parentEmail = get(raw, "parent_email") || get(p, ["email"]) || "";
  const parentPhone = get(raw, "parent_phone") || get(p, ["phone"]) || "";
  const parentRelationship =
    get(raw, "parent_relationship_to_student") ||
    get(p, ["relationship"]) ||
    get(p, ["relationship_to_student"]) ||
    get(a, ["parentRelationship"]) ||
    "";

  const grade = get(raw, "grade_level") || get(a, ["gradeLevel"]) || get(a, ["grade_level"]) || "";
  const section = get(raw, "section") || get(a, ["section"]) || "";
  const previousSchool =
    get(raw, "previous_school") ||
    get(a, ["previousSchool"]) ||
    get(a, ["previous_school"]) ||
    "";

  const signature =
    get(raw, ["signature"]) ||
    get(raw, ["signature_data_url"]) ||
    get(raw, ["applicant_signature"]) ||
    "";

  const filesRaw = get(raw, ["files"]) || get(raw, ["documents"]) || {};
  const getFile = (aliases) => {
    for (const path of aliases) {
      const v =
        get(raw, path) ||
        get(filesRaw, path);
      if (v) return v;
    }
    return null;
  };
  const files = {
    birth_certificate: getFile([
      "birth_certificate", "birthCertificate",
      "birth_certificate_url", "birth_certificate_path",
    ]),
    id_picture_1x1: getFile([
      "id_picture_1x1", "idPicture1x1",
      "id_picture_1x1_url", "id_picture_1x1_path",
      "id_picture",
    ]),
  };

  const submittedAt = get(raw, ["submitted_at"]) || get(raw, ["created_at"]) || "";
  const status = get(raw, ["status"]) || "pending";
  const rejectionReason = get(raw, ["rejectionReason"]) || get(raw, ["rejection_reason"]) || "";

  return {
    id: String(raw.id),
    studentFullName, firstName, lastName, middleName,
    phone, address, birthDate, gender, email,
    parentFullName, parentRel, parentRelationship, parentEmail, parentPhone,
    grade, section, previousSchool,
    referenceNumber,
    signature,
    files,
    status,
    submittedAt,
    rejectionReason,
    _raw: raw,
  };
}

function fileUrl(f) {
  if (!f) return null;
  if (typeof f === "string") return f;
  if (typeof f === "object") {
    return f.url || f.path || f.preview_url || null;
  }
  return null;
}

function fileName(f) {
  if (!f) return null;
  if (typeof f === "string") return f.split("/").pop() || "Uploaded file";
  if (typeof f === "object") return f.name || f.file_name || f.originalName || "Uploaded file";
  return "Uploaded file";
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(+d)) return String(value).slice(0, 10);
  return d.toLocaleDateString("en-PH", { month: "short", day: "2-digit", year: "numeric" });
}

function formatDateLong(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(+d)) return String(value).slice(0, 16).replace("T", " ");
  return d.toLocaleString("en-PH", {
    month: "short", day: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const STATUS_META = {
  pending: { label: "Pending", cls: "pending" },
  reviewed: { label: "Reviewed", cls: "reviewed" },
  converted: { label: "Converted", cls: "converted" },
  rejected: { label: "Rejected", cls: "rejected" },
  cancelled: { label: "Cancelled", cls: "rejected" },
};

export default function OnlineEnrollmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [confirmRejectOpen, setConfirmRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectReasonError, setRejectReasonError] = useState("");
  const [showRfidApproval, setShowRfidApproval] = useState(false);
  const [busy, setBusy] = useState(""); // "convert" | "reject" | ""
  const [refCopied, setRefCopied] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/guest/enrollments/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error();
      const json = await res.json();
      const raw = json?.data ?? json;
      if (!raw || (!raw.id && id)) throw new Error();
      setData(normalizeItem(raw));
    } catch {
      setError("Unable to load this online enrollment submission.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  function getStatusMeta(status) {
    return STATUS_META[status] || STATUS_META.pending;
  }

  function handleConversionSuccess(json) {
    setFeedback({ type: "success", message: "✅ Converted to student successfully." });
    setShowRfidApproval(false);
    fetchDetail();
    if (json?.student_id) {
      setTimeout(() => router.push(`/students/${json.student_id}`), 1200);
    }
  }

  function openRejectModal() {
    setRejectReason("");
    setRejectReasonError("");
    setConfirmRejectOpen(true);
  }

  function closeRejectModal() {
    if (busy !== "") return;
    setConfirmRejectOpen(false);
    setRejectReason("");
    setRejectReasonError("");
  }

  async function handleReject() {
    if (!data) return;

    const trimmedReason = rejectReason.trim();
    if (!trimmedReason) {
      setRejectReasonError("Please tell the parent why this application is being rejected.");
      return;
    }

    setBusy("reject");
    setFeedback(null);
    setRejectReasonError("");
    try {
      const res = await fetch(`/api/guest/enrollments/${data.id}/reject`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: trimmedReason }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.message || "Could not reject submission.");
      setFeedback({ type: "success", message: "✅ Submission has been rejected." });
      setConfirmRejectOpen(false);
      setRejectReason("");
      fetchDetail();
    } catch (err) {
      setFeedback({
        type: "error",
        message: "⚠️ " + (err?.message || "Unable to reject submission."),
      });
    } finally {
      setBusy("");
    }
  }

  function handleCopyReference() {
    if (!data?.referenceNumber) return;
    navigator.clipboard
      .writeText(it.referenceNumber)
      .then(() => {
        setRefCopied(true);
        setTimeout(() => setRefCopied(false), 2000);
      })
      .catch(() => {});
  }

  if (loading) {
    return <div className="oed-loading">Loading submission details…</div>;
  }
  if (error && !data) {
    return (
      <div className="oed-loading oed-error">
        <p>⚠️ {error}</p>
        <Link className="oed-btn-back" href="/online-enrollment">← Back to Online Enrollment</Link>
      </div>
    );
  }

  const it = data;
  const stat = getStatusMeta(it.status);
  const parentRel = formatRelationship(it.parentRel || it.parentRelationship);

  const ReadRow = ({ label, value, full }) => (
    <div className={`oed-read-row ${full ? "oed-read-full" : ""}`}>
      <div className="oed-read-label">{label}</div>
      <div className="oed-read-value">{value || <span className="oed-empty">—</span>}</div>
    </div>
  );

  return (
    <div className="online-enrollment-detail">
      <div className="oed-header">
        <div>
          <Link href="/online-enrollment" className="oed-back-link">← Back to Online Enrollment</Link>
          <h1 className="oed-title">{it.studentFullName || "Guest Enrollment Submission"}</h1>
          <p className="oed-subtitle">
            Reference No. <strong className="oed-refnum">{it.referenceNumber || "—"}</strong>
            {it.referenceNumber && (
              <button
                type="button"
                className="oed-refnum-copy"
                onClick={handleCopyReference}
              >
                {refCopied ? "Copied!" : "Copy"}
              </button>
            )}
            <br />
            Submitted {formatDateLong(it.submittedAt)} · Status:{" "}
            <span className={`oe-status-pill oe-status-${stat.cls}`}>{stat.label}</span>
          </p>
        </div>
        <div className="oed-actions">
          {(it.status === "pending" || it.status === "reviewed") && (
            <>
              <button
                className="oed-btn oed-btn-reject"
                onClick={openRejectModal}
                disabled={busy !== ""}
              >✕ Reject</button>
              <button
                className="oed-btn oed-btn-convert"
                onClick={() => setShowRfidApproval(true)}
                disabled={busy !== ""}
              >
                Convert to Student →
              </button>
            </>
          )}
          {it.status === "converted" && (
            <span className="oed-done-pill">✅ Converted to a registered student</span>
          )}
          {it.status === "rejected" && (
            <span className="oed-done-pill oed-done-reject">✕ Rejected</span>
          )}
        </div>
      </div>

      {feedback && (
        <div className={`oed-banner oed-banner-${feedback.type === "success" ? "ok" : "err"}`}>
          {feedback.message}
        </div>
      )}

      {it.status === "rejected" && it.rejectionReason && (
        <div className="oed-banner oed-banner-err">
          <strong>Reason given:</strong> {it.rejectionReason}
        </div>
      )}

      {/* Student Information */}
      <section className="oed-section">
        <h2 className="oed-section-title">Student Information</h2>
        <div className="oed-grid oed-grid-3">
          <ReadRow label="First Name" value={it.firstName || (it.studentFullName.split(" ")[0])} />
          <ReadRow label="Middle Name" value={it.middleName} />
          <ReadRow label="Last Name" value={it.lastName || (it.studentFullName.split(" ").slice(1).join(" "))} />
          <ReadRow label="Birth Date" value={it.birthDate ? formatDate(it.birthDate) : ""} />
          <ReadRow label="Gender" value={it.gender} />
          <ReadRow label="Contact Number" value={it.phone} />
          <ReadRow label="Email Address" value={it.email} full />
          <ReadRow label="Student Address" value={it.address} full />
        </div>
      </section>

      {/* Parent / Guardian */}
      <section className="oed-section">
        <h2 className="oed-section-title">Parent / Guardian Information</h2>
        <div className="oed-grid oed-grid-3">
          <ReadRow label="Full Name" value={it.parentFullName} full />
          <ReadRow
            label="Relationship to Student"
            value={parentRel ? (
              <span className={`oe-rel-pill oe-rel-${parentRel.toLowerCase()}`}>
                {parentRel}
              </span>
            ) : ""}
          />
          <ReadRow label="Contact Number" value={it.parentPhone} />
          <ReadRow label="Email Address" value={it.parentEmail} />
        </div>
      </section>

      {/* Academic */}
      <section className="oed-section">
        <h2 className="oed-section-title">Academic Information</h2>
        <div className="oed-grid oed-grid-3">
          <ReadRow
            label="Grade / Program Applying For"
            value={it.grade ? <span className="oe-pill oe-pill-grade">{it.grade}</span> : ""}
          />
          <ReadRow
            label="Section"
            value={it.section ? <span className="oe-pill oe-pill-section">Sec. {it.section}</span> : ""}
          />
          <ReadRow label="Previous School (if any)" value={it.previousSchool} full />
        </div>
      </section>

      {/* Required Documents */}
      <section className="oed-section">
        <h2 className="oed-section-title">Required Documents</h2>
        <div className="oed-doc-grid">
          <DocCard
            label="Birth Certificate"
            data={it.files.birth_certificate}
          />
          <DocCard
            label="1x1 ID Picture"
            data={it.files.id_picture_1x1}
          />
        </div>
      </section>

      {/* Consent + Signature */}
      <section className="oed-section oed-consent">
        <h2 className="oed-section-title">Consent and Signature</h2>
        <div className="oed-consent-text">
          I confirm that all information provided above is true to the best of my knowledge.
        </div>
        <div className="oed-signature-block">
          <div className="oed-signature-wrap">
            <div className="oed-signature-label">Applicant Signature</div>
            {it.signature ? (
              <img
                src={it.signature}
                alt="Applicant signature"
                className="oed-signature-img"
              />
            ) : (
              <div className="oed-signature-empty">No signature captured.</div>
            )}
          </div>
          <div className="oed-seal-wrap">
            <div className="oed-brand-seal">
              <span className="oed-seal-kidsecure">KidSecure</span>
              <span className="oed-seal-school">Rainbow 5 Christian Academy of Caloocan Inc.</span>
              <span className="oed-seal-since">est. 2011</span>
            </div>
          </div>
        </div>
      </section>

      {/* Confirmation modals */}
      {showRfidApproval && (
        <div className="oed-modal-overlay" onClick={() => setShowRfidApproval(false)}>
          <RfidApprovalStep
            applicationId={it.id}
            gradeLevel={it.grade}
            studentFullName={it.studentFullName}
            onCancel={() => setShowRfidApproval(false)}
            onSuccess={handleConversionSuccess}
          />
        </div>
      )}

      {confirmRejectOpen && (
        <div className="oed-modal-overlay" onClick={closeRejectModal}>
          <div className="oed-modal oed-modal-reject" onClick={(e) => e.stopPropagation()}>
            <h3>Reject this submission?</h3>
            <p>
              This submission will be marked as <strong>Rejected</strong>. The parent will be able to
              see the reason you enter below when they check their application status.
            </p>

            <div className="enrollment-form-group">
              <label htmlFor="rejectReason">
                Reason for Rejecting<span className="required">*</span>
              </label>
              <textarea
                id="rejectReason"
                rows={4}
                placeholder="Example: The uploaded birth certificate is unreadable. Please resubmit a clearer copy."
                value={rejectReason}
                onChange={(e) => {
                  setRejectReason(e.target.value);
                  if (rejectReasonError) setRejectReasonError("");
                }}
                className={rejectReasonError ? "input-invalid" : ""}
                disabled={busy !== ""}
              />
              {rejectReasonError && (
                <p className="enrollment-field-error">⚠️ {rejectReasonError}</p>
              )}
            </div>

            <div className="oed-modal-actions">
              <button
                className="oed-modal-btn oed-modal-ghost"
                onClick={closeRejectModal}
                disabled={busy !== ""}
              >Cancel</button>
              <button
                className="oed-modal-btn oed-modal-danger"
                onClick={handleReject}
                disabled={busy !== ""}
              >
                {busy === "reject" ? "Rejecting…" : "Yes — Reject submission"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DocCard({ label, data }) {
  const url = fileUrl(data);
  const name = fileName(data);
  const has = Boolean(url || (data && typeof data !== "string" && (data.name || data.url)));

  return (
    <div className={`oed-doc-card ${has ? "oed-doc-uploaded" : "oed-doc-missing"}`}>
      <div className="oed-doc-card-head">
        <div>
          <div className="oed-doc-name">{label}</div>
          <div className={`oed-doc-status ${has ? "ok" : "miss"}`}>
            {has ? "✅ Uploaded" : "⚠️ Not uploaded"}
          </div>
        </div>
        {has && url && (
          <a
            className="oed-doc-btn"
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            download={!!name || undefined}
          >View / Download</a>
        )}
      </div>
      <div className="oed-doc-preview">
        {has && url && /image\//.test(typeof data === "object" && data.type ? data.type : "") ||
         (has && url && /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url)) ? (
          <img src={url} alt={label} className="oed-doc-img" />
        ) : has ? (
          <div className="oed-doc-file-preview">
            <span className="oed-doc-icon">📄</span>
            <div>
              {name && <div className="oed-doc-filename">{name}</div>}
              {url && <a className="oed-doc-link" href={url} target="_blank" rel="noopener noreferrer">Open file</a>}
            </div>
          </div>
        ) : (
          <div className="oed-doc-empty">No file uploaded for this requirement.</div>
        )}
      </div>
    </div>
  );
}