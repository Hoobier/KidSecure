// src/lib/subjectsCache.js
//
// Fetches /api/subjects-by-grade once and caches it for the lifetime of
// the tab. Every report-card surface reads from here.

let cachePromise = null;
let cache = null;

async function loadOnce() {
  if (cache) return cache;
  if (!cachePromise) {
    cachePromise = fetch("/api/subjects-by-grade", { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.text().catch(() => "");
          throw new Error(`Failed to load subjects (HTTP ${res.status}): ${body.slice(0, 200)}`);
        }
        const json = await res.json();
        const d = json.data || {};
        cache = {
          subjects: d.subjects || {},
          entryByGrade: d.entry_subjects_by_grade || {},
          displayByGrade: d.display_subjects_by_grade || {},
          computed: d.computed_subjects || {},
          descriptors: d.descriptors || [],
          observedValues: d.observed_values || {},
          observedValueRatings: d.observed_value_ratings || {},
        };
        return cache;
      })
      .catch((err) => { cachePromise = null; throw err; });
  }
  return cachePromise;
}

export async function getSubjectsConfig() {
  return loadOnce();
}

export async function getEntrySubjectsForGrade(gradeLevel) {
  const c = await loadOnce();
  return c.entryByGrade[gradeLevel] || [];
}

export async function getDisplaySubjectsForGrade(gradeLevel) {
  const c = await loadOnce();
  return c.displayByGrade[gradeLevel] || [];
}

export function getSubjectNameFromConfig(code, config) {
  if (!config) return code;
  return config.subjects?.[code] || code;
}

export function isComputedInConfig(code, config) {
  return Boolean(config?.computed?.[code]);
}

export function getComponentsFor(code, config) {
  return config?.computed?.[code]?.components || [];
}

/**
 * Ceiling-rounded average of a computed display code (e.g. MAPEH) for a
 * given term. Returns null if any component is missing a grade.
 */
export function computeDisplayGrade(reportCard, displayCode, term, config) {
  const components = getComponentsFor(displayCode, config);
  if (components.length === 0) return null;
  const grades = [];
  for (const code of components) {
    const g = reportCard?.[code]?.[term]?.grade ?? null;
    if (g === null || g === "" || isNaN(Number(g))) return null;
    grades.push(Number(g));
  }
  return Math.ceil(grades.reduce((a, b) => a + b, 0) / grades.length);
}

/**
 * Final grade for a display row. For regular subjects, this is the average
 * of the three term grades. For computed subjects, this is the average of
 * the three computed term values — both rounded with ceiling.
 */
export function computeDisplayFinal(reportCard, displayCode, config) {
  if (isComputedInConfig(displayCode, config)) {
    const terms = ["T1", "T2", "T3"]
      .map((t) => computeDisplayGrade(reportCard, displayCode, t, config))
      .filter((v) => v !== null);
    if (terms.length === 0) return null;
    return Math.ceil(terms.reduce((a, b) => a + b, 0) / terms.length);
  }
  const grades = ["T1", "T2", "T3"]
    .map((t) => reportCard?.[displayCode]?.[t]?.grade)
    .filter((g) => g !== null && g !== "" && !isNaN(Number(g)))
    .map(Number);
  if (grades.length === 0) return null;
  return Number((grades.reduce((a, b) => a + b, 0) / grades.length).toFixed(2));
}

/**
 * Descriptor row for a final grade. Brackets come from config.descriptors.
 * Uses floor so 89.9 stays in Benchmarking (80-89) rather than jumping
 * to Advancing (90-100).
 */
export function getDescriptorFor(grade, config) {
  if (grade === null || grade === undefined) return null;
  const g = Math.floor(Number(grade));
  if (isNaN(g)) return null;
  const list = config?.descriptors || [];
  for (const d of list) {
    if (g >= d.min && g <= d.max) return d;
  }
  return null;
}

/**
 * Final grade for a display code. Requires ALL THREE terms present.
 * - Computed subjects (MAPEH): ceiling of the average of the three
 *   term-level computed values.
 * - Regular subjects: 2-decimal average of the three term grades.
 * Returns null if any term is missing.
 */
export function computeFinalGrade(reportCard, displayCode, config) {
  const terms = ["T1", "T2", "T3"];

  if (isComputedInConfig(displayCode, config)) {
    const values = [];
    for (const t of terms) {
      const v = computeDisplayGrade(reportCard, displayCode, t, config);
      if (v === null) return null;
      values.push(v);
    }
    return Math.ceil(values.reduce((a, b) => a + b, 0) / values.length);
  }

  const grades = [];
  for (const t of terms) {
    const g = reportCard?.[displayCode]?.[t]?.grade;
    if (g === null || g === undefined || g === "" || isNaN(Number(g))) return null;
    grades.push(Number(g));
  }
  return Number((grades.reduce((a, b) => a + b, 0) / grades.length).toFixed(2));
}

/**
 * Average of all display subjects for a single term. Uses the computed
 * value (ceiling) for MAPEH. Returns null if any subject is missing.
 */
export function computeTermAverage(reportCard, gradeLevel, term, config) {
  const codes = config?.displayByGrade?.[gradeLevel] || [];
  if (codes.length === 0) return null;
  const values = [];
  for (const code of codes) {
    let v;
    if (isComputedInConfig(code, config)) {
      v = computeDisplayGrade(reportCard, code, term, config);
    } else {
      const g = reportCard?.[code]?.[term]?.grade;
      v = (g !== null && g !== undefined && g !== "" && !isNaN(Number(g))) ? Number(g) : null;
    }
    if (v === null) return null;
    values.push(v);
  }
  return Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2));
}

/**
 * Average of the three term averages. Returns null if any term is
 * incomplete.
 */
export function computeGeneralAverage(reportCard, gradeLevel, config) {
  const terms = ["T1", "T2", "T3"];
  const values = [];
  for (const t of terms) {
    const v = computeTermAverage(reportCard, gradeLevel, t, config);
    if (v === null) return null;
    values.push(v);
  }
  return Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(2));
}

/**
 * Returns the observed values config: core values keyed by short code,
 * plus the rating code → label map.
 */
export async function getObservedValuesConfig() {
  const c = await loadOnce();
  return {
    coreValues: c.observedValues,
    ratings: c.observedValueRatings,
  };
}
