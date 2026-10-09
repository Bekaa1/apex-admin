import PDFDocument from 'pdfkit';
import { fileURLToPath } from 'node:url';
import type { ReportSnapshot } from './model.ts';
import type { Analysis } from './analysis.ts';
import { locale, number, reportText } from './text.ts';

/** Server-only PDF: embedded project fonts, selectable text, no HTML or remote assets. */
export function renderReport(snapshot: ReportSnapshot, analysis: Analysis): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 42, bufferPages: true, autoFirstPage: false,
      info: { Title: reportText[snapshot.filters.language].title, Author: 'Apexmedia', CreationDate: new Date(snapshot.generatedAt) } });
    const parts: Buffer[] = [];
    doc.on('data', part => parts.push(part));
    doc.on('error', reject);
    doc.on('end', () => resolve(Buffer.concat(parts)));
    try {
      doc.registerFont('regular', fileURLToPath(new URL('../../src/assets/fonts/Onest-400Regular.ttf', import.meta.url)));
      doc.registerFont('bold', fileURLToPath(new URL('../../src/assets/fonts/Onest-700Bold.ttf', import.meta.url)));
      const language = snapshot.filters.language, t = reportText[language];
      const left = 42, width = 511, bottom = 775;
      let y = 0;
      const page = () => {
        doc.addPage();
        doc.fillColor('#1821E8').font('bold').fontSize(16).text('Apexmedia', left, 32, { width, height: 22, lineBreak: false });
        doc.moveTo(left, 59).lineTo(left + width, 59).lineWidth(1).strokeColor('#E0E3F0').stroke();
        y = 76;
      };
      const room = (height: number) => { if (y + height > bottom) page(); };
      const paragraph = (value: string, size = 10, color = '#434967', bold = false) => {
        doc.font(bold ? 'bold' : 'regular').fontSize(size);
        const height = doc.heightOfString(value, { width, lineGap: 3 });
        room(height + 10);
        doc.font(bold ? 'bold' : 'regular').fontSize(size).fillColor(color).text(value, left, y, { width, lineGap: 3 });
        y += height + 10;
      };
      const heading = (value: string) => { room(64); y += 10; paragraph(value, 15, '#101433', true); };
      page();
      paragraph(t.title, 23, '#101433', true);
      paragraph(`${t.generated}: ${new Intl.DateTimeFormat(locale(language), { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Almaty' }).format(new Date(snapshot.generatedAt))}`);
      paragraph(`${t.period}: ${snapshot.range.from} — ${snapshot.range.to} · ${snapshot.filters.campaignId ? t.single : t[snapshot.filters.scope]}`);
      paragraph(t.zone, 9);
      if (snapshot.compare) paragraph(`${t.comparison}: ${snapshot.compare.from} — ${snapshot.compare.to}`, 9);
      heading(t.overview);
      const spendLabel = snapshot.estimatedSpend ? t.estimated : t.spent;
      const tiles = [[t.plays, number(snapshot.totals.plays, language)], [spendLabel, number(snapshot.totals.spent, language, true)], [t.price, number(snapshot.totals.price, language, true)]];
      room(84);
      tiles.forEach(([label, value], i) => {
        const x = left + i * 174;
        doc.roundedRect(x, y, 163, 73, 8).fill('#F1F3FF');
        doc.fillColor('#505679').font('regular').fontSize(9).text(label, x + 10, y + 10, { width: 143 });
        doc.fillColor('#101433').font('bold').fontSize(value.length > 18 ? 10 : 14).text(value, x + 10, y + 36, { width: 143 });
      });
      y += 87;
      paragraph(snapshot.estimatedSpend ? t.limitation : t.actual, 9);
      paragraph(t.incomplete, 9);
      heading(t.campaigns);
      const widths = [221, 90, 104, 96];
      const row = (cells: string[], header = false) => {
        doc.font(header ? 'bold' : 'regular').fontSize(9);
        const heights = cells.map((cell, i) => doc.heightOfString(cell, { width: widths[i] - 16, lineGap: 2 }));
        const height = Math.max(...heights, 18) + 14;
        if (y + height > bottom) { page(); tableHeader(); }
        const start = y;
        doc.rect(left, start, width, height).fill(header ? '#E9ECFF' : '#FAFAFD');
        let x = left;
        cells.forEach((cell, i) => {
          doc.font(header ? 'bold' : 'regular').fontSize(9).fillColor('#161B3C').text(cell, x + 8, start + 7, { width: widths[i] - 16, lineGap: 2 });
          x += widths[i];
        });
        y = start + height + 2;
      };
      const tableHeader = () => row([t.campaign, t.plays, spendLabel, t.price], true);
      tableHeader();
      for (const c of snapshot.campaigns) row([`${c.ref} · ${c.name}\n${t.status}: ${c.status}`, number(c.plays, language), number(c.spent, language, true), number(c.price, language, true)]);
      heading(t.summary);
      paragraph(analysis.summary, 11);
      heading(t.recommendations);
      paragraph(t.aiNote, 9);
      for (const [i, recommendation] of analysis.recommendations.entries()) {
        room(100);
        paragraph(`${i + 1}. ${recommendation.observation}`, 11, '#101433', true);
        paragraph(`${t.action}: ${recommendation.action}`);
        paragraph(`${t.check}: ${recommendation.check}`);
      }
      const count = doc.bufferedPageRange().count;
      for (let i = 0; i < count; i++) {
        doc.switchToPage(i);
        doc.font('regular').fontSize(8).fillColor('#626987').text(`Apexmedia · ${t.page} ${i + 1} / ${count}`, left, 785, { width, height: 12, lineBreak: false });
      }
      doc.end();
    } catch (error) { doc.destroy(); reject(error); }
  });
}
