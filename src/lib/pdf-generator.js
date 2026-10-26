// src/lib/pdf-generator.js
// Shared report card PDF generator used by both the Admin and Teacher portals.
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  isComputedInConfig,
  computeDisplayGrade,
  computeFinalGrade,
  computeTermAverage,
  computeGeneralAverage,
  getDescriptorFor,
} from "@/lib/subjectsCache";

// Cache logos as data URLs after first load.
let logoCachePromise = null;
async function loadLogos() {
  if (logoCachePromise) return logoCachePromise;
  logoCachePromise = (async () => {
    try {
      const [deped, rcac] = await Promise.all([
        fetch("/pictures/deped.png").then((r) => r.blob()).then(blobToDataURL),
        fetch("/pictures/rcac.png").then((r) => r.blob()).then(blobToDataURL),
      ]);
      return { deped, rcac };
    } catch {
      return { deped: null, rcac: null };
    }
  })();
  return logoCachePromise;
}

function blobToDataURL(blob) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
}

function drawHeader(doc, logos, pageWidth, schoolYearLabel) {
  const marginX = 40;
  const logoSize = 60;
  const centerX = pageWidth / 2;
  let y = 40;

  // Logos in the top corners
  if (logos?.deped) {
    try { doc.addImage(logos.deped, "PNG", marginX, y, logoSize, logoSize); } catch {}
  }
  if (logos?.rcac) {
    try { doc.addImage(logos.rcac, "PNG", pageWidth - marginX - logoSize, y, logoSize, logoSize); } catch {}
  }

  // Header text sits below the logo band
  y += logoSize + 24;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Republic of the Philippines", centerX, y, { align: "center" });
  y += 11;
  doc.text("DEPARTMENT OF EDUCATION", centerX, y, { align: "center" });
  y += 11;
  doc.text("National Capital Region", centerX, y, { align: "center" });
  y += 11;
  doc.text("Schools Division of Caloocan", centerX, y, { align: "center" });
  y += 11;
  doc.text("District III", centerX, y, { align: "center" });

  y += 20;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("RAINBOW 5 CHRISTIAN ACADEMY OF CALOOCAN, INC.", centerX, y, { align: "center" });
  y += 13;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Blk. 31 Lot 43-44 Acacia St., Rainbow Village 5, Bagumbayan, Caloocan City", centerX, y, { align: "center" });

  y += 22;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("ELEMENTARY", centerX, y, { align: "center" });
  y += 16;
  doc.text("PROGRESS REPORT CARD", centerX, y, { align: "center" });

  y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`School Year: ${schoolYearLabel || "____________"}`, centerX, y, { align: "center" });

  return y + 20;
}

function drawStudentInfo(doc, student, y) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const leftX = 40;
  const rightX = 320;

  // Calculate age from dateOfBirth
  let age = "____";
  if (student.dateOfBirth) {
    const birthDate = new Date(student.dateOfBirth);
    const today = new Date();
    let calculatedAge = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      calculatedAge--;
    }
    age = calculatedAge.toString();
  }

  doc.text(`Name: ${student.fullName || ""}`, leftX, y);
  doc.text("LRN: ____________________", rightX, y);
  y += 14;
  doc.text(`Level: ${student.gradeLevel || ""}`, leftX, y);
  doc.text(`Age: ${age}`, rightX, y);
  y += 14;
  doc.text(`Gender: ${student.gender || "__________________"}`, leftX, y);

  return y + 10;
}

function buildReportCardRows(student, term, subjectsConfig) {
  const card = student.reportCard || {};
  const subjects = subjectsConfig?.displayByGrade?.[student.gradeLevel] || [];

  const rows = subjects.map((code) => {
    const isComputed = isComputedInConfig(code, subjectsConfig);
    const label = subjectsConfig?.subjects?.[code] || code;

    const t1 = isComputed
      ? (computeDisplayGrade(card, code, "T1", subjectsConfig) ?? "—")
      : (card[code]?.T1?.grade ?? "—");
    const t2 = isComputed
      ? (computeDisplayGrade(card, code, "T2", subjectsConfig) ?? "—")
      : (card[code]?.T2?.grade ?? "—");
    const t3 = isComputed
      ? (computeDisplayGrade(card, code, "T3", subjectsConfig) ?? "—")
      : (card[code]?.T3?.grade ?? "—");

    const final = computeFinalGrade(card, code, subjectsConfig);
    const descriptor = getDescriptorFor(final, subjectsConfig);
    const remark = descriptor ? descriptor.remark : "—";

    return [label, t1, t2, t3, final ?? "—", remark];
  });

  // Average per Term
  const avgT1 = computeTermAverage(card, student.gradeLevel, "T1", subjectsConfig);
  const avgT2 = computeTermAverage(card, student.gradeLevel, "T2", subjectsConfig);
  const avgT3 = computeTermAverage(card, student.gradeLevel, "T3", subjectsConfig);
  rows.push([
    { content: "Average per Term", styles: { fontStyle: "bold" } },
    avgT1 ?? "—",
    avgT2 ?? "—",
    avgT3 ?? "—",
    "",
    "",
  ]);

  // General Average row (merged across cols 0-4, value in last cell)
  const general = computeGeneralAverage(card, student.gradeLevel, subjectsConfig);
  rows.push([
    { content: "GENERAL AVERAGE", colSpan: 5, styles: { halign: "right", fontStyle: "bold" } },
    { content: general ?? "—", styles: { fontStyle: "bold" } },
  ]);

  // Penmanship (placeholder row for manual writing)
  rows.push(["PENMANSHIP", "", "", "", "", ""]);

  return rows;
}

function drawDescriptorTable(doc, subjectsConfig, startY, pageWidth) {
  const descriptors = subjectsConfig?.descriptors || [];
  const body = descriptors.map((d) => [
    `${d.label} (${d.letter})`,
    `${d.max} - ${d.min}`,
    d.remark,
  ]);

  autoTable(doc, {
    startY,
    margin: { left: 40, right: 40 },
    head: [["Descriptors", "Grading Scale", "Remarks"]],
    body,
    styles: { fontSize: 9, cellPadding: 4 },
    headStyles: { fillColor: [27, 42, 74], textColor: 255, fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 160 },
      1: { cellWidth: 120, halign: "center" },
      2: { cellWidth: 120, halign: "center" },
    },
  });
}

function drawAttendanceBlock(doc, student, subjectsConfig, startY) {
  const margin = 40;
  const months = subjectsConfig?.schoolMonths || [];
  const attendance = student.attendance || {};

  if (months.length === 0) return startY;

  const shortName = (m) => m.slice(0, 3);
  const anyPartial = months.some((m) => attendance[m]?.partial);

  const head = [[
    "ATTENDANCE",
    ...months.map((m) => {
      const short = shortName(m);
      return attendance[m]?.partial ? `${short}*` : short;
    }),
  ]];

  const body = [
    [
      "Days of School",
      ...months.map((m) => {
        const a = attendance[m];
        if (!a || a.schoolDays === null || a.schoolDays === undefined) return "";
        if (a.partial) return `${a.schoolDaysUpTo}/${a.schoolDays}`;
        return a.schoolDays;
      }),
    ],
    [
      "Days Present",
      ...months.map((m) => {
        const a = attendance[m];
        return a?.present === null || a?.present === undefined ? "" : a.present;
      }),
    ],
    [
      "Days Tardy",
      ...months.map((m) => {
        const a = attendance[m];
        return a?.tardy === null || a?.tardy === undefined ? "" : a.tardy;
      }),
    ],
    [
      "Days Absent",
      ...months.map((m) => {
        const a = attendance[m];
        return a?.absent === null || a?.absent === undefined ? "" : a.absent;
      }),
    ],
  ];

  autoTable(doc, {
    startY,
    margin: { left: margin, right: margin },
    head,
    body,
    styles: { fontSize: 8, cellPadding: 3, lineColor: [180, 190, 205], lineWidth: 0.4, halign: "center" },
    headStyles: { fillColor: [27, 42, 74], textColor: 255, fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 90, halign: "left", fontStyle: "bold" },
    },
  });

  const finalY = doc.lastAutoTable?.finalY ?? startY;

  if (anyPartial) {
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    doc.text(
      "* Partial month — the term ended mid-month. Absent is not yet computable for partial months.",
      margin,
      finalY + 12
    );
    return finalY + 22;
  }

  return finalY;
}

function drawTransferEligibilityBlock(doc, startY) {
  const margin = 40;
  const pageWidth = doc.internal.pageSize.getWidth();
  const centerX = pageWidth / 2;
  const sigWidth = 150;
  let y = startY;

  // ===== SIGNATURE BLOCK =====
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("SIGNATURES", centerX, y, { align: "center" });
  y += 22;

  const rightColX = pageWidth - margin - sigWidth;

  // Prepared by (Class Adviser)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.line(margin, y, margin + sigWidth, y);
  doc.text("Prepared by:", margin, y + 12);
  doc.text("Class Adviser", margin, y + 24);
  
  // Approved by (Principal)
  doc.line(rightColX, y, rightColX + sigWidth, y);
  doc.text("Approved by:", rightColX, y + 12);
  doc.text("JUANA T. RAMOS", rightColX, y + 24, { fontStyle: "bold" });
  doc.setFont("helvetica", "normal");
  doc.text("School Principal", rightColX, y + 36);

  y += 50;

  // ===== TRANSFER ELIGIBILITY =====
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("TRANSFER ELIGIBILITY", centerX, y, { align: "center" });
  y += 22;

  // "Eligible for transfer and Admission to ____"
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const label1 = "Eligible for transfer and Admission to";
  doc.text(label1, margin, y);
  const label1Width = doc.getTextWidth(label1);
  doc.line(margin + label1Width + 6, y + 2, pageWidth - margin, y + 2);
  y += 36;

  // Signature + date lines (line above label)
  const sigY1 = y;
  doc.line(margin, sigY1, margin + sigWidth, sigY1);
  doc.line(rightColX, sigY1, rightColX + sigWidth, sigY1);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Principal's Signature", margin, sigY1 + 12);
  doc.text("Date Signed", rightColX, sigY1 + 12);
  y += 40;

  // ===== CANCELLATION OF TRANSFER ELIGIBILITY =====
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("CANCELLATION OF TRANSFER ELIGIBILITY", centerX, y, { align: "center" });
  y += 22;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const label2 = "Admitted to";
  doc.text(label2, margin, y);
  const label2Width = doc.getTextWidth(label2);
  doc.line(margin + label2Width + 6, y + 2, pageWidth - margin, y + 2);
  y += 36;

  const sigY2 = y;
  doc.line(margin, sigY2, margin + sigWidth, sigY2);
  doc.line(rightColX, sigY2, rightColX + sigWidth, sigY2);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Principal's Signature", margin, sigY2 + 12);
  doc.text("Date Signed", rightColX, sigY2 + 12);
  y += 20;

  return y;
}

function drawBackPageFooter(doc, student) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;
  const footerY = pageHeight - 25;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(`${student.fullName || ""} · ${student.studentId || ""}`, margin, footerY);
  doc.text("Page 2", pageWidth - margin, footerY, { align: "right" });
  doc.setTextColor(0, 0, 0); // reset for any later draws
}

function drawObservedValuesPage(doc, student, subjectsConfig, observedValuesConfig, schoolYearLabel) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 40;

  if (!observedValuesConfig) {
    // No observed values data — still render attendance if available.
    let yy = margin + 20;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("ATTENDANCE", pageWidth / 2, yy, { align: "center" });
    yy += 20;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Name: ${student.fullName || ""}`, margin, yy);
    doc.text(`Grade & Section: ${student.gradeLevel || ""} - ${student.section || ""}`, pageWidth - margin, yy, { align: "right" });
    yy += 16;
    doc.text(`School Year: ${schoolYearLabel || "____________"}`, margin, yy);
    yy += 20;
    const afterAttendance = drawAttendanceBlock(doc, student, subjectsConfig, yy);
    drawTransferEligibilityBlock(doc, afterAttendance + 30);
    drawBackPageFooter(doc, student);
    return;
  }

  // Title block (compact — no logos on the back side)
  let y = margin + 20;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("REPORT ON LEARNER'S OBSERVED VALUES", pageWidth / 2, y, { align: "center" });

  y += 20;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Name: ${student.fullName || ""}`, margin, y);
  doc.text(`Grade & Section: ${student.gradeLevel || ""} - ${student.section || ""}`, pageWidth - margin, y, { align: "right" });
  y += 16;
  doc.text(`School Year: ${schoolYearLabel || "____________"}`, margin, y);

  y += 20;

  const coreValues = observedValuesConfig?.coreValues || {};
  const values = student.observedValues || {};

  // Build a table with rowSpans for the multi-statement core values.
  // Each core value's "row count" = number of its behavior statements.
  const body = [];
  Object.entries(coreValues).forEach(([code, def]) => {
    const statements = def.statements || [""];
    const ratingT1 = values.T1?.[code] || "";
    const ratingT2 = values.T2?.[code] || "";
    const ratingT3 = values.T3?.[code] || "";

    statements.forEach((stmt, idx) => {
      const row = [];
      if (idx === 0) {
        row.push({ content: `${code} — ${def.label}`, rowSpan: statements.length, styles: { valign: "middle", fontStyle: "bold" } });
      }
      row.push({ content: stmt, styles: { valign: "top" } });
      if (idx === 0) {
        row.push({ content: ratingT1 || "", rowSpan: statements.length, styles: { valign: "middle", halign: "center" } });
        row.push({ content: ratingT2 || "", rowSpan: statements.length, styles: { valign: "middle", halign: "center" } });
        row.push({ content: ratingT3 || "", rowSpan: statements.length, styles: { valign: "middle", halign: "center" } });
      }
      body.push(row);
    });
  });

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [
      [
        { content: "CORE VALUES", rowSpan: 2, styles: { valign: "middle", halign: "center" } },
        { content: "BEHAVIOR STATEMENT", rowSpan: 2, styles: { valign: "middle", halign: "center" } },
        { content: "TERM", colSpan: 3, styles: { halign: "center" } },
      ],
      [
        { content: "1", styles: { halign: "center" } },
        { content: "2", styles: { halign: "center" } },
        { content: "3", styles: { halign: "center" } },
      ],
    ],
    body,
    styles: { fontSize: 9, cellPadding: 4, lineColor: [180, 190, 205], lineWidth: 0.4 },
    headStyles: { fillColor: [27, 42, 74], textColor: 255, fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 120 },
      1: { cellWidth: 240 },
      2: { cellWidth: 50 },
      3: { cellWidth: 50 },
      4: { cellWidth: 50 },
    },
  });

  // Rating legend below the table.
  const afterTable = doc.lastAutoTable?.finalY ?? y;
  let legendY = afterTable + 20;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("MARKING", margin, legendY);
  doc.setFont("helvetica", "normal");
  legendY += 14;
  const ratings = observedValuesConfig?.ratings || {};
  const legendEntries = Object.entries(ratings);
  legendEntries.forEach(([code, label], idx) => {
    const col = idx % 2;
    const row = Math.floor(idx / 2);
    doc.text(`${code} — ${label}`, margin + col * 200, legendY + row * 13);
  });

  // Attendance table below the legend
  const legendEndY = legendY + Math.ceil(legendEntries.length / 2) * 13 + 20;
  const afterAttendance = drawAttendanceBlock(doc, student, subjectsConfig, legendEndY);
  drawTransferEligibilityBlock(doc, afterAttendance + 30);
  drawBackPageFooter(doc, student);
}

export async function drawReportCardPDF(doc, student, term, subjectsConfig, schoolYearLabel, observedValuesConfig) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const logos = await loadLogos();

  let y = drawHeader(doc, logos, pageWidth, schoolYearLabel);
  y = drawStudentInfo(doc, student, y);
  y += 6;

  const rows = buildReportCardRows(student, term, subjectsConfig);

  autoTable(doc, {
    startY: y,
    margin: { left: 40, right: 40 },
    head: [[
      "SUBJECTS",
      "TERM 1",
      "TERM 2",
      "TERM 3",
      "FINAL GRADE",
      "REMARKS",
    ]],
    body: rows,
    styles: { fontSize: 9, cellPadding: 5 },
    headStyles: { fillColor: [27, 42, 74], textColor: 255, halign: "center" },
    columnStyles: {
      0: { cellWidth: 180, halign: "left" },
      1: { cellWidth: 55, halign: "center" },
      2: { cellWidth: 55, halign: "center" },
      3: { cellWidth: 55, halign: "center" },
      4: { cellWidth: 85, halign: "center" },
      5: { cellWidth: 85, halign: "center" },
    },
  });

  const afterTable = doc.lastAutoTable?.finalY ?? y;
  drawDescriptorTable(doc, subjectsConfig, afterTable + 20, pageWidth);

  // Back page — Observed Values + Attendance
  const hasAttendance = Object.keys(student.attendanceByMonth || {}).length > 0;
  if (observedValuesConfig || hasAttendance) {
    doc.addPage();
    drawObservedValuesPage(doc, student, subjectsConfig, observedValuesConfig, schoolYearLabel);
  }
}
