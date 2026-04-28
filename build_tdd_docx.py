"""One-shot: convert TDD-UXReach-Agent.md into TDD-UXReach-Agent.docx so it opens cleanly in Google Docs."""
import re
from pathlib import Path
from docx import Document
from docx.shared import Pt, RGBColor, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH

SRC = Path(__file__).parent / "TDD-UXReach-Agent.md"
DST = Path(__file__).parent / "TDD-UXReach-Agent.docx"

doc = Document()

# ── Document defaults ──
style = doc.styles["Normal"]
style.font.name = "Arial"
style.font.size = Pt(11)

for section in doc.sections:
    section.left_margin = Inches(1)
    section.right_margin = Inches(1)
    section.top_margin = Inches(0.8)
    section.bottom_margin = Inches(0.8)


def add_heading(text: str, level: int):
    """Add a styled heading. Level 1 = title-ish, 2 = section, 3 = sub-section."""
    p = doc.add_paragraph()
    run = p.add_run(text)
    run.bold = True
    if level == 1:
        run.font.size = Pt(20)
        p.alignment = WD_ALIGN_PARAGRAPH.LEFT
        run.font.color.rgb = RGBColor(0x1A, 0x73, 0xE8)
    elif level == 2:
        run.font.size = Pt(15)
        run.font.color.rgb = RGBColor(0x20, 0x21, 0x24)
    elif level == 3:
        run.font.size = Pt(13)
        run.font.color.rgb = RGBColor(0x5F, 0x63, 0x68)
    p.paragraph_format.space_before = Pt(12 if level <= 2 else 8)
    p.paragraph_format.space_after = Pt(4)


def add_paragraph(text: str):
    """Add a plain paragraph with simple **bold** / `code` inline parsing."""
    if not text.strip():
        return
    p = doc.add_paragraph()
    parts = re.split(r"(\*\*[^*]+\*\*|`[^`]+`)", text)
    for part in parts:
        if not part:
            continue
        if part.startswith("**") and part.endswith("**"):
            run = p.add_run(part[2:-2])
            run.bold = True
        elif part.startswith("`") and part.endswith("`"):
            run = p.add_run(part[1:-1])
            run.font.name = "Consolas"
            run.font.size = Pt(10)
            run.font.color.rgb = RGBColor(0xC7, 0x25, 0x4E)
        else:
            p.add_run(part)


def add_bullet(text: str):
    p = doc.add_paragraph(style="List Bullet")
    parts = re.split(r"(\*\*[^*]+\*\*|`[^`]+`)", text)
    for part in parts:
        if not part:
            continue
        if part.startswith("**") and part.endswith("**"):
            run = p.add_run(part[2:-2])
            run.bold = True
        elif part.startswith("`") and part.endswith("`"):
            run = p.add_run(part[1:-1])
            run.font.name = "Consolas"
            run.font.size = Pt(10)
            run.font.color.rgb = RGBColor(0xC7, 0x25, 0x4E)
        else:
            p.add_run(part)


def add_numbered(text: str):
    p = doc.add_paragraph(style="List Number")
    parts = re.split(r"(\*\*[^*]+\*\*|`[^`]+`)", text)
    for part in parts:
        if not part:
            continue
        if part.startswith("**") and part.endswith("**"):
            run = p.add_run(part[2:-2])
            run.bold = True
        elif part.startswith("`") and part.endswith("`"):
            run = p.add_run(part[1:-1])
            run.font.name = "Consolas"
            run.font.size = Pt(10)
            run.font.color.rgb = RGBColor(0xC7, 0x25, 0x4E)
        else:
            p.add_run(part)


def add_code_block(lines: list[str]):
    p = doc.add_paragraph()
    run = p.add_run("\n".join(lines))
    run.font.name = "Consolas"
    run.font.size = Pt(9)
    p.paragraph_format.left_indent = Inches(0.25)
    p.paragraph_format.space_before = Pt(6)
    p.paragraph_format.space_after = Pt(6)


def add_table(rows: list[list[str]]):
    if not rows:
        return
    header = rows[0]
    body = rows[1:]
    table = doc.add_table(rows=1 + len(body), cols=len(header))
    table.style = "Light Grid Accent 1"
    for i, h in enumerate(header):
        cell = table.rows[0].cells[i]
        cell.text = ""
        run = cell.paragraphs[0].add_run(h.strip())
        run.bold = True
    for r, row in enumerate(body, start=1):
        for c, val in enumerate(row):
            cell = table.rows[r].cells[c]
            cell.text = ""
            cell.paragraphs[0].add_run(val.strip())
    doc.add_paragraph()  # spacer


# ── Parser: walk markdown line-by-line ──
md_lines = SRC.read_text(encoding="utf-8").splitlines()

i = 0
in_code = False
code_buf: list[str] = []
table_buf: list[list[str]] = []
in_table = False

# Heading detection: the source uses bare lines like "Project Overview"
# acting as section headings. We map specific known headings to level 2,
# numbered solution steps to level 3, and the very first line to level 1.

KNOWN_H2 = {
    "Project Overview",
    "Problem Statements",
    "Success Criteria",
    "Tech Stack",
    "Architecture Diagram",
    "Solution Steps:",
    "Input Data segregation:",
    "Note: Important links",
    "Data Storage:",
    "Frontend Guardrails (defense-in-depth)",
    "Feedback for Continuous Improvement",
    "Glossary",
}

while i < len(md_lines):
    line = md_lines[i]
    stripped = line.strip()

    # Code fences ```
    if stripped.startswith("```"):
        if in_code:
            add_code_block(code_buf)
            code_buf = []
            in_code = False
        else:
            in_code = True
        i += 1
        continue

    if in_code:
        code_buf.append(line)
        i += 1
        continue

    # Tables — markdown style with leading |
    if stripped.startswith("|") and stripped.endswith("|"):
        # skip separator row "|---|---|"
        if re.match(r"\|\s*[-:]+", stripped):
            i += 1
            continue
        cells = [c.strip() for c in stripped.strip("|").split("|")]
        table_buf.append(cells)
        in_table = True
        i += 1
        continue
    elif in_table:
        add_table(table_buf)
        table_buf = []
        in_table = False
        # fall through to handle current line

    if not stripped:
        i += 1
        continue

    # First non-empty heading line is the top title link
    # ("go/uxreach-agent")
    if stripped == "go/uxreach-agent":
        add_heading(stripped, 1)
        i += 1
        continue

    # Title (Technical Design Doc | UXReach …)
    if stripped.startswith("Technical Design Doc"):
        add_heading(stripped, 1)
        i += 1
        continue

    # Date / Author / Version metadata block
    if stripped.startswith(("Date of Document creation:", "Last update on:", "Author:", "Version:")):
        add_paragraph(stripped)
        i += 1
        continue

    # Known H2 sections (verbatim match)
    if stripped in KNOWN_H2:
        add_heading(stripped.rstrip(":"), 2)
        i += 1
        continue

    # Bold inline-only lines like "**Sign-in & session bootstrap**"
    if re.fullmatch(r"\*\*[^*]+\*\*", stripped):
        add_heading(stripped[2:-2], 3)
        i += 1
        continue

    # Numbered solution-step "1. text", "2. text" — render as numbered list
    m_num = re.match(r"^(\d+)\.\s+(.*)", stripped)
    if m_num:
        add_numbered(m_num.group(2))
        i += 1
        continue

    # Bullet "- text"
    if stripped.startswith("- "):
        add_bullet(stripped[2:])
        i += 1
        continue

    # Plain paragraph
    add_paragraph(stripped)
    i += 1

# Flush trailing table if any
if in_table and table_buf:
    add_table(table_buf)

doc.save(DST)
print(f"Wrote {DST}")
