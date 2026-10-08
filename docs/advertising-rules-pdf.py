"""Builds the PDF of «Правила размещения рекламы» from docs/ADVERTISING_RULES.md.

    python3 -m venv /tmp/pdfenv && /tmp/pdfenv/bin/pip install reportlab
    /tmp/pdfenv/bin/python docs/advertising-rules-pdf.py

A new edition goes to a new file name (see VERSION), so browsers and the CDN don't keep the old one;
then update ADVERTISING_RULES_PDF in src/legal/documents.ts.
"""

import re
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import KeepTogether, ListFlowable, ListItem, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'docs' / 'ADVERTISING_RULES.md'
VERSION = '1.2'
OUTPUT = ROOT / 'public' / 'legal' / f'apexmedia-advertising-rules-{VERSION}.pdf'
FONTS = ROOT / 'src' / 'assets' / 'fonts'

# Light theme of src/design-system/tokens.css.
TEXT = colors.HexColor('#0b1030')
MUTED = colors.HexColor('#4a5072')
BRAND = colors.HexColor('#0423e7')
BORDER = colors.HexColor('#e2e5f0')
SOFT = colors.HexColor('#e6eafe')

for name, file in {
    'Onest': 'Onest-400Regular.ttf',
    'Geologica-SemiBold': 'Geologica-600SemiBold.ttf',
    'Geologica-Bold': 'Geologica-700Bold.ttf',
}.items():
    pdfmetrics.registerFont(TTFont(name, str(FONTS / file)))
pdfmetrics.registerFontFamily('Onest', normal='Onest', bold='Onest', italic='Onest', boldItalic='Onest')

BODY = ParagraphStyle('body', fontName='Onest', fontSize=10, leading=15, textColor=TEXT, alignment=TA_JUSTIFY, spaceAfter=6)
STYLES = {
    'brand': ParagraphStyle('brand', fontName='Geologica-Bold', fontSize=13, leading=16, textColor=BRAND, spaceAfter=18),
    'title': ParagraphStyle('title', fontName='Geologica-Bold', fontSize=24, leading=29, textColor=TEXT, spaceAfter=6),
    'edition': ParagraphStyle('edition', parent=BODY, textColor=MUTED, alignment=TA_LEFT, spaceAfter=14),
    'h2': ParagraphStyle('h2', fontName='Geologica-SemiBold', fontSize=14, leading=18, textColor=TEXT, spaceBefore=12, spaceAfter=7),
    'body': BODY,
    'item': ParagraphStyle('item', parent=BODY, spaceAfter=2),
    'cell': ParagraphStyle('cell', parent=BODY, fontSize=9.5, leading=13.5, alignment=TA_LEFT, spaceAfter=0),
    'head': ParagraphStyle('head', parent=BODY, fontSize=9.5, leading=13.5, alignment=TA_LEFT, spaceAfter=0),
}


def inline(text: str) -> str:
    """Keep inline text regular; only heading styles use bold. Preserve links."""
    text = text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    text = re.sub(r'\*\*(.+?)\*\*', r'\1', text)
    return re.sub(r'\[([^\]]+)\]\(([^)]+)\)', rf'<a href="\2" color="{BRAND.hexval()}"><u>\1</u></a>', text)


def clause(text: str) -> str:
    """«1.1.» at the start of a paragraph in the brand colour."""
    return re.sub(r'^(\d+\.\d+\.)', rf'<font name="Onest" color="{BRAND.hexval()}">\1</font>', text)


def table(rows: list[list[str]]) -> Table:
    data = [[Paragraph(inline(cell), STYLES['head' if index == 0 else 'cell']) for cell in row] for index, row in enumerate(rows)]
    result = Table(data, colWidths=[52 * mm, None], repeatRows=1)
    result.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), SOFT),
        ('BOX', (0, 0), (-1, -1), 0.6, BORDER),
        ('INNERGRID', (0, 0), (-1, -1), 0.6, BORDER),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 7),
        ('RIGHTPADDING', (0, 0), (-1, -1), 7),
    ]))
    return result


def story(markdown: str) -> tuple[str, str, list]:
    title, edition, flow = '', '', []
    bullets: list[str] = []
    rows: list[list[str]] = []

    def flush() -> None:
        if bullets:
            items = [ListItem(Paragraph(inline(item), STYLES['item']), leftIndent=14, value='•') for item in bullets]
            flow.append(ListFlowable(items, bulletType='bullet', bulletColor=BRAND, leftIndent=14, spaceAfter=6))
            bullets.clear()
        if rows:
            flow.extend([table(rows), Spacer(1, 10)])
            rows.clear()

    for raw in markdown.splitlines():
        line = raw.strip()
        if line.startswith('- '):
            bullets.append(line[2:])
            continue
        if line.startswith('|'):
            cells = [cell.strip() for cell in line.strip('|').split('|')]
            if not all(set(cell) <= {'-', ' ', ':'} for cell in cells):
                rows.append(cells)
            continue
        flush()
        if not line or line == '---':
            continue
        if line.startswith('# '):
            title = line[2:]
        elif not edition and line.startswith('**'):
            edition = line.strip('*')
        elif line.startswith('## '):
            flow.append(Paragraph(inline(line[3:]), STYLES['h2']))
        else:
            flow.append(Paragraph(clause(inline(line)), STYLES['body']))
    flush()
    # A heading never ends a page; a table after one may split instead, under its repeated header row.
    grouped = []
    for item in flow:
        if grouped and isinstance(grouped[-1], Paragraph) and grouped[-1].style.name == 'h2' and isinstance(item, Paragraph):
            grouped[-1] = KeepTogether([grouped[-1], item])
        else:
            grouped.append(item)
    return title, edition, grouped


def numbered_canvas(footer: str):
    class NumberedCanvas(canvas.Canvas):
        """Footer «… · Стр. N из M»: pages are drawn once the total is known."""

        def __init__(self, *args, **kwargs):
            super().__init__(*args, **kwargs)
            self._pages = []

        def showPage(self):
            self._pages.append(dict(self.__dict__))
            self._startPage()

        def save(self):
            total = len(self._pages)
            for page in self._pages:
                self.__dict__.update(page)
                width, _ = A4
                self.setStrokeColor(BORDER)
                self.setLineWidth(0.6)
                self.line(20 * mm, 14 * mm, width - 20 * mm, 14 * mm)
                self.setFont('Onest', 8)
                self.setFillColor(MUTED)
                self.drawString(20 * mm, 9.5 * mm, footer)
                self.drawRightString(width - 20 * mm, 9.5 * mm, f'Стр. {self._pageNumber} из {total}')
                super().showPage()
            super().save()

    return NumberedCanvas


def main() -> None:
    title, edition, flow = story(SOURCE.read_text(encoding='utf-8'))
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(
        str(OUTPUT), pagesize=A4, leftMargin=20 * mm, rightMargin=20 * mm, topMargin=18 * mm, bottomMargin=22 * mm,
        title=title, author='ТОО «Apex Technology»', subject=edition, creator='Apexmedia', lang='ru-RU',
    )
    head = [Paragraph('apexmedia', STYLES['brand']), Paragraph(inline(title), STYLES['title']), Paragraph(inline(edition), STYLES['edition'])]
    doc.build(head + flow, canvasmaker=numbered_canvas(f'{title} · Редакция {VERSION}'))
    print(OUTPUT.relative_to(ROOT), f'{OUTPUT.stat().st_size // 1024} KB')


if __name__ == '__main__':
    main()
