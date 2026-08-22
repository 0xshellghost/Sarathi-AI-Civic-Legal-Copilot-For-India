/**
 * SARATHI - Document Generator Service
 * Generates statutory-compliant .docx (via docx) and .pdf (via pdf-lib) documents
 */

import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Packer } from "docx";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { RTIGeneration } from "../lib/schemas";

function sanitizeForPdf(text: string): string {
  if (!text) return "";
  return text
    .replace(/₹/g, "Rs. ")
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[\u2022\u2023\u25E6\u2043\u2219]/g, "*")
    .replace(/[\u00A0]/g, " ")
    .replace(/[\u2000-\u200F\u2028-\u202F\uFEFF]/g, "")
    .replace(/[^\x20-\x7E\n\r\t]/g, " ");
}

export async function generateRTIDocx(rti: RTIGeneration): Promise<Buffer> {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: "APPLICATION FOR INFORMATION UNDER SECTION 6(1) OF THE RIGHT TO INFORMATION ACT, 2005",
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "To,", bold: true }),
            ],
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "The Central / State Public Information Officer (CPIO / SPIO)\n" }),
              new TextRun({ text: (rti.publicAuthority?.name || "Competent Public Authority") + "\n", bold: true }),
              new TextRun({ text: rti.publicAuthority?.address || "Office of the Competent Public Authority, Government of India / State Government" }),
            ],
            spacing: { after: 250 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "1. Full Name of the Applicant: ", bold: true }),
              new TextRun({ text: rti.applicantDetails?.name || "____________________" }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "2. Address for Communication: ", bold: true }),
              new TextRun({ text: rti.applicantDetails?.address || "____________________" }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "3. Citizenship: ", bold: true }),
              new TextRun({ text: "Citizen of India (Eligible under Section 3 of RTI Act, 2005)" }),
            ],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "4. Subject Matter of Information: ", bold: true }),
              new TextRun({ text: rti.subject || "Statutory RTI Application" }),
            ],
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "5. Specific Particulars of Information Sought (under Section 2(f) and Section 6(1)):", bold: true }),
            ],
            spacing: { after: 150 },
          }),
          ...(rti.informationSought || []).map((point, index) => {
            const cleanText = point.replace(/^\d+\.\s*/, "");
            return new Paragraph({
              children: [
                new TextRun({ text: `   (${String.fromCharCode(97 + index)}) `, bold: true }),
                new TextRun({ text: cleanText }),
              ],
              spacing: { after: 100 },
            });
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "6. Application Fee Details: Enclosed application fee of Rs. 10/- via Indian Postal Order / Demand Draft / Online Receipt / Proof of BPL category (Exempt under Section 7(5)).",
              }),
            ],
            spacing: { before: 200, after: 150 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "7. Format of Information: Please provide certified copies of the requested documents / file notings by Registered / Speed Post or electronically as per Section 7(6) of the RTI Act, 2005.",
              }),
            ],
            spacing: { after: 300 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Declaration:\n", bold: true }),
              new TextRun({
                text: "I hereby state that the information sought above pertains to public authority records and falls squarely within the provisions of the Right to Information Act, 2005. I am not seeking any personal information exempt under Section 8(1)(j).",
              }),
            ],
            spacing: { after: 400 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Place: ____________________\n" }),
              new TextRun({ text: `Date: ${new Date().toLocaleDateString("en-IN")}\n\n` }),
              new TextRun({ text: "Signature / Thumb Impression of Applicant: ____________________", bold: true }),
            ],
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  return buffer;
}

export async function generateRTIPdf(rti: RTIGeneration): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([595.28, 841.89]); // A4 dimensions
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = 800;
  const margin = 50;
  const maxWidth = 495;

  const drawText = (rawText: string, isBold = false, size = 10, indent = 0) => {
    const text = sanitizeForPdf(rawText);
    const font = isBold ? fontBold : fontRegular;
    const words = text.split(" ");
    let line = "";

    for (const w of words) {
      const testLine = line ? `${line} ${w}` : w;
      let width = 0;
      try {
        width = font.widthOfTextAtSize(testLine, size);
      } catch {
        width = testLine.length * (size * 0.5);
      }

      if (width > maxWidth - indent) {
        if (y < 60) {
          page = pdfDoc.addPage([595.28, 841.89]);
          y = 800;
        }
        if (line) {
          try {
            page.drawText(line, { x: margin + indent, y, size, font, color: rgb(0.1, 0.1, 0.1) });
          } catch {
            // fallback
          }
          y -= size + 4;
        }
        line = w;
      } else {
        line = testLine;
      }
    }
    if (line) {
      if (y < 60) {
        page = pdfDoc.addPage([595.28, 841.89]);
        y = 800;
      }
      try {
        page.drawText(line, { x: margin + indent, y, size, font, color: rgb(0.1, 0.1, 0.1) });
      } catch {
        // fallback
      }
      y -= size + 6;
    }
  };

  // Header Title
  page.drawText("APPLICATION UNDER SECTION 6(1) OF RTI ACT, 2005", {
    x: margin + 30,
    y,
    size: 12,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  y -= 25;

  drawText("To,", true, 10);
  drawText("The Public Information Officer (CPIO / SPIO),", false, 10);
  drawText(rti.publicAuthority?.name || "Competent Public Authority", true, 10);
  drawText(rti.publicAuthority?.address || "Office of the Competent Public Authority", false, 10);
  y -= 10;

  drawText(`Applicant: ${rti.applicantDetails?.name || "[Citizen Name]"}`, true, 10);
  drawText(`Address: ${rti.applicantDetails?.address || "[Address]"}`, false, 10);
  drawText("Citizenship: Citizen of India (Eligible under Section 3)", false, 10);
  y -= 10;

  drawText(`Subject: ${rti.subject || "Statutory RTI Application"}`, true, 10);
  y -= 10;

  drawText("Information Sought under Section 6(1):", true, 10);
  (rti.informationSought || []).forEach((point, idx) => {
    drawText(`${idx + 1}. ${point.replace(/^\d+\.\s*/, "")}`, false, 9.5, 10);
  });
  y -= 10;

  drawText("Application Fee: Rs. 10/- enclosed via Postal Order/DD/Challan (Exempt if BPL).", false, 9.5);
  drawText("Delivery Mode: Certified copies by Speed Post or electronically as per Section 7(6).", false, 9.5);
  y -= 15;

  drawText(`Date: ${new Date().toLocaleDateString("en-IN")}   |   Place: __________________`, false, 9.5);
  y -= 25;
  drawText("Signature of the Applicant: ____________________________", true, 10);

  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

