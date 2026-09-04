// src/app/(admin)/account/[id]/edit/page.js

"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import "./edit-parent.css";

const NAME_REGEX = /^[A-Za-z\s\-'.]{2,50}$/;
const PHONE_REGEX = /^09\d{9}$/;
const EMAIL_REGEX = /.+@.+\..+/;

function validateForm(form) {
  const errors = {};

  if (!form.firstName.trim()) {
    errors.firstName = ["First name is required."];
  } else if (!NAME_REGEX.test(form.firstName.trim())) {
    errors.firstName = [
      "First name may only contain letters, spaces, hyphens, apostrophes, and periods (2–50 characters).",
    ];
  }

  if (!form.lastName.trim()) {
    errors.lastName = ["Last name is required."];
  } else if (!NAME_REGEX.test(form.lastName.trim())) {
    errors.lastName = [
      "Last name may only contain letters, spaces, hyphens, apostrophes, and periods (2–50 characters).",
    ];
  }

  if (!form.email.trim()) {
    errors.email = ["Email is required."];
  } else if (!EMAIL_REGEX.test(form.email.trim())) {
    errors.email = ["Please enter a valid email address."];
  }

  if (!form.phone.trim()) {
    errors.phone = ["Contact number is required."];
  } else if (!PHONE_REGEX.test(form.phone.trim())) {
    errors.phone = ["Phone number must start with 09 and be exactly 11 digits."];
  }

  if (!form.relationship) {
    errors.relationship = ["Please select the relationship to the student."];
  }

  return errors;
}

function formatRelationship(rel) {
  if (!rel) return "";
  const normalized = String(rel).toLowerCase();
  if (normalized === "mom" || normalized === "mother") return "Mom";
  if (normalized === "dad" || normalized === "father") return "Dad";
  if (normalized === "guardian") return "Guardian";
  const capitalized = rel.charAt(0).toUpperCase() + rel.slice(1).toLowerCase();
  return ["Mom", "Dad", "Guardian"].includes(capitalized) ? capitalized : "";
}

export default function EditParentPage({ params }) {
  const { id } = use(params);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [errors, setErrors] = useState({});
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [parent, setParent] = useState(null);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    relationship: "",
  });

  useEffect(() => {
    async function fetchParent() {
      setLoading(true);
      try {
        const res = await fetch(`/api/parents/${id}`, { credentials: "include" });
        const json = await res.json();
        if (!res.ok) throw new Error();
        setParent(json.data);
        setForm({
          firstName: json.data.firstName || "",
          lastName: json.data.lastName || "",
          email: json.data.email || "",
          phone: json.data.phone || "",
          relationship: formatRelationship(json.data.relationship || ""),
        });
      } catch {
        setFeedback({
          type: "error",
          message: "⚠️ Unable to load parent account information.",
        });
      } finally {
        setLoading(false);
      }
    }
    fetchParent();
  }, [id]);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    setFeedback(null);
    setErrors({});

    const clientErrors = validateForm(form);
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors);
      setFeedback({
        type: "error",
        message: "⚠️ Please fix the errors below before saving.",
      });
      return;
    }

    setShowSaveConfirm(true);
  }

  async function performSave() {
    setShowSaveConfirm(false);
    setSaving(true);

    try {
      const res = await fetch(`/api/parents/${id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          relationship: form.relationship,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.errors) setErrors(data.errors);
        setFeedback({
          type: "error",
          message: data.message || "⚠️ Unable to save changes.",
        });
        return;
      }

      router.push(`/account/${id}`);
    } catch {
      setFeedback({
        type: "error",
        message: "⚠️ Unable to reach the server. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="edit-page">
        <div className="edit-skeleton-title" />
        <div className="edit-skeleton-block" />
      </div>
    );
  }

  if (!parent && !loading && !feedback) {
    return (
      <div className="edit-page">
        <div className="detail-not-found">
          <p>We couldn&apos;t find this parent account.</p>
          <Link href="/account" className="edit-back-btn">← Back to Parents</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="edit-page">
      <div className="edit-page-header">
        <div className="edit-page-header-title">
          <h1>Edit Parent Information</h1>
        </div>
        <Link href={`/account/${id}`} className="edit-back-btn">
          ← Back to Parent
        </Link>
      </div>

      {feedback && (
        <div
          className={
            "edit-feedback " +
            (feedback.type === "success"
              ? "edit-feedback-success"
              : "edit-feedback-error")
          }
        >
          {feedback.message}
        </div>
      )}

      <form className="edit-card" onSubmit={handleSubmit}>
        <h2>Parent / Guardian Information</h2>

        <div className="edit-form-row-3">
          <div className="edit-form-group">
            <label>
              First Name<span className="required">*</span>
            </label>
            <input
              type="text"
              value={form.firstName}
              onChange={(e) => updateField("firstName", e.target.value)}
              className={errors.firstName ? "input-invalid" : ""}
            />
            {errors.firstName && (
              <div className="edit-field-error">{errors.firstName[0]}</div>
            )}
          </div>
          <div className="edit-form-group">
            <label>
              Last Name<span className="required">*</span>
            </label>
            <input
              type="text"
              value={form.lastName}
              onChange={(e) => updateField("lastName", e.target.value)}
              className={errors.lastName ? "input-invalid" : ""}
            />
            {errors.lastName && (
              <div className="edit-field-error">{errors.lastName[0]}</div>
            )}
          </div>
          <div className="edit-form-group">
            <label>
              Relationship<span className="required">*</span>
            </label>
            <select
              value={form.relationship}
              onChange={(e) => updateField("relationship", e.target.value)}
              className={errors.relationship ? "input-invalid" : ""}
            >
              <option value="">Select relationship</option>
              <option value="Mom">Mom</option>
              <option value="Dad">Dad</option>
              <option value="Guardian">Guardian</option>
            </select>
            {errors.relationship && (
              <div className="edit-field-error">{errors.relationship[0]}</div>
            )}
          </div>
        </div>

        <div className="edit-form-row-2">
          <div className="edit-form-group">
            <label>
              Email<span className="required">*</span>
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              className={errors.email ? "input-invalid" : ""}
            />
            {errors.email && (
              <div className="edit-field-error">{errors.email[0]}</div>
            )}
          </div>
          <div className="edit-form-group">
            <label>
              Contact Number<span className="required">*</span>
            </label>
            <input
              type="tel"
              placeholder="e.g. 09XXXXXXXXX"
              value={form.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              className={errors.phone ? "input-invalid" : ""}
            />
            {errors.phone && (
              <div className="edit-field-error">{errors.phone[0]}</div>
            )}
          </div>
        </div>

        <div className="edit-actions">
          <Link
            href={`/account/${id}`}
            className="edit-btn edit-btn-secondary"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="edit-btn edit-btn-primary"
            disabled={saving}
          >
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </form>

      {showSaveConfirm && (
        <div className="edit-modal-overlay">
          <div className="edit-modal">
            <h3>Save these changes?</h3>
            <p>
              This will update {form.firstName} {form.lastName}&apos;s parent
              account information.
            </p>
            <div className="edit-modal-actions">
              <button
                className="edit-modal-btn-cancel"
                onClick={() => setShowSaveConfirm(false)}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                className="edit-modal-btn-confirm"
                onClick={performSave}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
