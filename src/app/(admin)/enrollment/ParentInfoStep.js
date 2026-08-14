"use client";

import { useState, useEffect, useRef } from "react";

const NAME_REGEX = /^[A-Za-z\s\-'.]{2,50}$/;

function calculateAge(dobString) {
  const dob = new Date(dobString);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

export default function ParentInfoStep({ data, onChange, onNext, onBack }) {
  const [errors, setErrors] = useState({});
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);

  function setMode(mode) {
    onChange({
      mode,
      // Reset fields when switching modes so leftover data doesn't sneak through
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      existingParentId: null,
      existingParentName: "",
    });
    setErrors({});
    setSearchQuery("");
    setSearchResults([]);
  }

  function handleFieldChange(field, value) {
    onChange({ [field]: value });
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  }

  // Debounced search-as-you-type for existing parents
  useEffect(() => {
    if (data.mode !== "existing" || !searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/parents/search?query=${encodeURIComponent(searchQuery)}`);
        const result = await res.json();
        setSearchResults(res.ok ? result.parents || [] : []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 400); // wait 400ms after typing stops before searching

    return () => clearTimeout(debounceRef.current);
  }, [searchQuery, data.mode]);

  function selectParent(parent) {
    onChange({
      existingParentId: parent.id,
      existingParentName: `${parent.firstName} ${parent.lastName}`,
    });
    setSearchQuery("");
    setSearchResults([]);
  }

  function clearSelectedParent() {
    onChange({ existingParentId: null, existingParentName: "" });
  }

  function validate() {
    const newErrors = {};

    if (data.mode === "existing") {
      if (!data.existingParentId) {
        newErrors.existingParent = "Please search for and select a parent/guardian.";
      }
    } else {
        if (!data.firstName.trim()) {
          newErrors.firstName = "First name is required.";
        } else if (!NAME_REGEX.test(data.firstName.trim())) {
          newErrors.firstName = "First name may only contain letters, spaces, hyphens, apostrophes, and periods (2–50 characters).";
        }

        if (!data.lastName.trim()) {
          newErrors.lastName = "Last name is required.";
        } else if (!NAME_REGEX.test(data.lastName.trim())) {
          newErrors.lastName = "Last name may only contain letters, spaces, hyphens, apostrophes, and periods (2–50 characters).";
        }

        if (!data.email.trim()) {
          newErrors.email = "Email is required.";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
          newErrors.email = "Please enter a valid email address.";
        }
        const phoneDigits = data.phone.replace(/\D/g, "");
        if (!phoneDigits) {
          newErrors.phone = "Phone number is required.";
        } else if (!/^09\d{9}$/.test(phoneDigits)) {
          newErrors.phone = "Please enter a valid 11-digit Philippine mobile number (e.g. 09171234567).";
        }
      }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleNext() {
    if (validate()) {
      onNext();
    }
  }

  return (
    <div>
      <h2 className="enrollment-step-title">Parent/Guardian Information</h2>

      <div className="enrollment-form-group">
        <label>Is this student's parent/guardian already in the system?</label>
        <div className="enrollment-mode-toggle">
          <button
            type="button"
            className={data.mode === "new" ? "enrollment-mode-btn active" : "enrollment-mode-btn"}
            onClick={() => setMode("new")}
          >
            No — New Parent/Guardian
          </button>
          <button
            type="button"
            className={data.mode === "existing" ? "enrollment-mode-btn active" : "enrollment-mode-btn"}
            onClick={() => setMode("existing")}
          >
            Yes — Link Existing Parent/Guardian
          </button>
        </div>
      </div>

      {data.mode === "existing" ? (
        <div className="enrollment-form-group">
          <label htmlFor="parentSearch">Search by Name or Email</label>

          {data.existingParentId ? (
            <div className="enrollment-selected-parent">
              <span>{data.existingParentName}</span>
              <button type="button" onClick={clearSelectedParent}>
                Change
              </button>
            </div>
          ) : (
            <>
              <input
                id="parentSearch"
                type="text"
                placeholder="Start typing a name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={errors.existingParent ? "input-invalid" : ""}
              />
              {searching && <p className="enrollment-help-text">Searching...</p>}
              {!searching && searchQuery && searchResults.length === 0 && (
                <p className="enrollment-help-text">No matching parent/guardian found.</p>
              )}
              {searchResults.length > 0 && (
                <div className="enrollment-search-results">
                  {searchResults.map((parent) => (
                    <button
                      type="button"
                      key={parent.id}
                      className="enrollment-search-result-item"
                      onClick={() => selectParent(parent)}
                    >
                      <span className="result-name">
                        {parent.firstName} {parent.lastName}
                      </span>
                      <span className="result-email">{parent.email}</span>
                    </button>
                  ))}
                </div>
              )}
              {errors.existingParent && (
                <p className="enrollment-field-error">{errors.existingParent}</p>
              )}
            </>
          )}
        </div>
      ) : (
        <>
          <div className="enrollment-form-row">
            <div className="enrollment-form-group">
              <label htmlFor="parentFirstName">
                First Name<span className="required">*</span>
              </label>
              <input
                id="parentFirstName"
                type="text"
                placeholder="Maria"
                value={data.firstName}
                onChange={(e) => handleFieldChange("firstName", e.target.value)}
                className={errors.firstName ? "input-invalid" : ""}
              />
              {errors.firstName && <p className="enrollment-field-error">{errors.firstName}</p>}
            </div>

            <div className="enrollment-form-group">
              <label htmlFor="parentLastName">
                Last Name<span className="required">*</span>
              </label>
              <input
                id="parentLastName"
                type="text"
                placeholder="Dela Cruz"
                value={data.lastName}
                onChange={(e) => handleFieldChange("lastName", e.target.value)}
                className={errors.lastName ? "input-invalid" : ""}
              />
              {errors.lastName && <p className="enrollment-field-error">{errors.lastName}</p>}
            </div>
          </div>

          <div className="enrollment-form-group">
            <label htmlFor="parentEmail">
              Email<span className="required">*</span>
            </label>
            <input
              id="parentEmail"
              type="email"
              placeholder="maria.delacruz@email.com"
              value={data.email}
              onChange={(e) => handleFieldChange("email", e.target.value)}
              className={errors.email ? "input-invalid" : ""}
            />
            <p className="enrollment-help-text">
              Mobile app login details will be sent to this email once enrollment is complete.
            </p>
            {errors.email && <p className="enrollment-field-error">{errors.email}</p>}
          </div>

          <div className="enrollment-form-group">
            <label htmlFor="parentPhone">
              Phone Number<span className="required">*</span>
            </label>
            <input
                id="parentPhone"
                type="tel"
                inputMode="numeric"
                placeholder="09XXXXXXXXX"
                maxLength={11}
                value={data.phone}
                onChange={(e) => handleFieldChange("phone", e.target.value.replace(/\D/g, "").slice(0, 11))}
                className={errors.phone ? "input-invalid" : ""}
            />
            {errors.phone && <p className="enrollment-field-error">{errors.phone}</p>}
          </div>
        </>
      )}

      <div className="enrollment-step-actions">
        <button type="button" className="enrollment-btn enrollment-btn-secondary" onClick={onBack}>
          Back
        </button>
        <button type="button" className="enrollment-btn enrollment-btn-primary" onClick={handleNext}>
          Next: RFID Tag
        </button>
      </div>
    </div>
  );
}