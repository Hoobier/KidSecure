// src/lib/subjectsCache.js
//
// Fetches /api/subjects-by-grade once and caches it for the lifetime of
// the browser tab. Every report-card surface reads from here instead of
// hardcoding per-grade subject lists.

let cachePromise = null;
let cache = null;

async function loadOnce() {
  if (cache) return cache;
  if (!cachePromise) {
    cachePromise = fetch("/api/subjects-by-grade", { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.text().catch(() => "");
          throw new Error(
            `Failed to load subjects (HTTP ${res.status}): ${body.slice(0, 200)}`
          );
        }
        const json = await res.json();
        const data = json.data || {};
        cache = {
          subjects: data.subjects || {},
          subjectsByGrade: data.subjects_by_grade || {},
          subjectGroups: data.subject_groups || {},
        };
        return cache;
      })
      .catch((err) => {
        // Reset so a later caller can retry.
        cachePromise = null;
        throw err;
      });
  }
  return cachePromise;
}

export async function getSubjectsConfig() {
  return loadOnce();
}

/**
 * Returns an ordered array of subject codes for a grade level, e.g.
 * ["CLVE", "MATH", "FIL", "MA", "PE", "H", "EPP"].
 */
export async function getSubjectsForGrade(gradeLevel) {
  const { subjectsByGrade } = await loadOnce();
  return subjectsByGrade[gradeLevel] || [];
}

/**
 * Returns an ordered array of "display items" for a grade. Each item is
 * either a plain subject ({ type: "subject", code, name }) or a group
 * ({ type: "group", label, codes: [...], items: [...] }).
 *
 * Callers render group items by printing the group's label once, then
 * rendering its `items` inline.
 */
export async function getSubjectDisplayItems(gradeLevel) {
  const cfg = await loadOnce();
  const codes = cfg.subjectsByGrade[gradeLevel] || [];
  const nameOf = (c) => cfg.subjects[c] || c;

  // Map code → group key, if it belongs to one.
  const groupOfCode = {};
  for (const [key, group] of Object.entries(cfg.subjectGroups)) {
    for (const code of group.codes) {
      groupOfCode[code] = key;
    }
  }

  const items = [];
  const consumed = new Set();

  for (const code of codes) {
    if (consumed.has(code)) continue;

    const groupKey = groupOfCode[code];
    if (!groupKey) {
      items.push({ type: "subject", code, name: nameOf(code) });
      continue;
    }

    const group = cfg.subjectGroups[groupKey];
    const memberItems = group.codes
      .filter((c) => codes.includes(c))
      .map((c) => {
        consumed.add(c);
        return { code: c, name: nameOf(c) };
      });

    items.push({
      type: "group",
      label: group.label,
      codes: group.codes,
      items: memberItems,
    });
  }

  return items;
}

export function getSubjectName(code, cfg) {
  if (!cfg) return code;
  return cfg.subjects[code] || code;
}