"""Builds public/downloads/lakes-area-aviation-<year>-rates.pdf in the format of the school's original
lakesareaaviation.com rate sheets (logo header panel, lake-aerial backdrop, "- YEAR ... -" titles,
bulleted line items, "As low as" total, *** notes, Facebook/email box).

Values come ONLY from src/lib/site-data.ts (dumped to JSON), so the PDF and /rates never disagree:
  bun -e '...dump site-data...' > data.json   (see AGENTS.md / the rates task notes)
  python3 scripts/build-rate-sheet.py data.json fonts_dir logo.png photo.jpg out.pdf
"""
import json, re, sys
from PIL import Image
from reportlab.lib.pagesizes import letter
from reportlab.lib.colors import Color, HexColor, white
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT

data_path, fonts, logo_path, photo_path, out = sys.argv[1:6]
D = json.load(open(data_path))
for name, file in [("Serif", "AndadaPro-Regular"), ("Serif-Bold", "AndadaPro-Bold"), ("Sans", "Montserrat-Regular"), ("Sans-Semi", "Montserrat-SemiBold"), ("Sans-Bold", "Montserrat-Bold")]:
    pdfmetrics.registerFont(TTFont(name, f"{fonts}/{file}.ttf"))

INK = HexColor("#1b2230")
MUTED = HexColor("#3f4757")
BLUE = HexColor("#1f4fd1")
W, H = letter
M = 26  # outer margin, like the original panels
YEAR = D["RATES_YEAR"]
PHONE = D["SCHOOL_PHONE"]

# Portrait crop of the lake aerial (shoreline), faded like the originals.
photo = Image.open(photo_path).convert("RGB")
pw, ph = photo.size
cw = int(ph * W / H)
x0 = min(pw - cw, int(pw * 0.36))
bg = ImageReader(photo.crop((x0, 0, x0 + cw, ph)).resize((int(W * 2), int(H * 2))))
logo = ImageReader(logo_path)
lw, lh = Image.open(logo_path).size

def money(text):
    """$7,000 -> $7,000.00 and $175/hr -> $175.00/hr, the originals' price style."""
    return re.sub(r"\$(\d{1,3}(?:,\d{3})+|\d+)(?![\d.])", lambda m: f"${m.group(1)}.00", text)

def para(c, text, x, y, w, size=11.5, font="Sans", color=INK, align=TA_LEFT, leading=None):
    st = ParagraphStyle("p", fontName=font, fontSize=size, leading=leading or size * 1.32, textColor=color, alignment=align)
    p = Paragraph(text, st)
    _, h = p.wrap(w, 1000)
    p.drawOn(c, x, y - h)
    return y - h

def panel(c, x, y, w, h, alpha=0.86):
    c.setFillColor(Color(1, 1, 1, alpha=alpha))
    c.rect(x, y, w, h, stroke=0, fill=1)

def frame(c):
    c.drawImage(bg, 0, 0, W, H)
    # Header panel: logo, school line, phone.
    hy = H - M - 112
    panel(c, M, hy, W - 2 * M, 112)
    logo_w = 170
    c.drawImage(logo, (W - logo_w) / 2, hy + 42, logo_w, logo_w * lh / lw, mask="auto")
    c.setFillColor(INK)
    c.setFont("Serif-Bold", 14.5)
    c.drawCentredString(W / 2, hy + 25, f"Phone: {PHONE}")
    c.setFont("Serif", 11)
    c.drawCentredString(W / 2, hy + 10, "Little Falls, MN  ·  Fort Lupton, CO  ·  Cottonwood, AZ")
    # Body panel.
    by = M
    bh = hy - 16 - M
    panel(c, M, by, W - 2 * M, bh)
    return hy - 16  # top of body panel

def title(c, top, text):
    size = 22
    while pdfmetrics.stringWidth(f"- {text} -", "Sans-Bold", size) > W - 2 * M - 40:
        size -= 0.5
    c.setFillColor(INK)
    c.setFont("Sans-Bold", size)
    c.drawCentredString(W / 2, top - 38, f"- {text} -")
    return top - 58

def contact_box(c):
    bw, bh = 252, 62
    x, y = W - M - bw - 10, M + 10
    c.setFillColor(white)
    c.rect(x, y, bw, bh, stroke=0, fill=1)
    # Simple Facebook mark, drawn (no external artwork).
    c.setFillColor(HexColor("#1877f2"))
    c.roundRect(x + 12, y + 14, 34, 34, 8, stroke=0, fill=1)
    c.setFillColor(white)
    c.setFont("Sans-Bold", 24)
    c.drawCentredString(x + 30, y + 20, "f")
    c.setFillColor(INK)
    c.setFont("Sans-Bold", 10.5)
    c.drawString(x + 56, y + 42, "Find Us On Facebook!")
    c.setFont("Sans", 9.5)
    c.drawString(x + 56, y + 29, "Lakes Area Aviation  @lakesareaaviation")
    c.setFont("Serif-Bold", 9.5)
    c.drawString(x + 56, y + 14, "Email: lakesareaaviation@gmail.com")

def rule_row(c, y, left, sub, prices, x1=M + 34, x2=W - M - 34, cols=(0,)):
    """One table row: label (and optional sub label) left, prices right-aligned in columns."""
    c.setFillColor(INK)
    c.setFont("Sans-Semi", 11.5)
    c.drawString(x1, y, left)
    if sub:
        c.setFont("Sans", 9.5); c.setFillColor(MUTED)
        c.drawString(x1, y - 13, sub)
    c.setFillColor(INK)
    c.setFont("Sans-Bold", 12)
    for px, txt in zip(cols, prices):
        c.drawRightString(px, y, txt)
    yy = y - (19 if sub else 7)
    c.setStrokeColor(Color(0.1, 0.13, 0.19, alpha=0.18)); c.setLineWidth(0.6)
    c.line(x1, yy, x2, yy)
    return yy - 13

def section(c, y, text, heads=None, cols=()):
    c.setFillColor(BLUE)
    c.setFont("Sans-Bold", 10)
    c.drawString(M + 34, y, text.upper())
    if heads:
        c.setFillColor(MUTED); c.setFont("Sans-Bold", 8.5)
        for px, h in zip(cols, heads):
            c.drawRightString(px, y, h.upper())
    c.setStrokeColor(INK); c.setLineWidth(1.1)
    c.line(M + 34, y - 6, W - M - 34, y - 6)
    return y - 20

def notes(c, y, lines, size=10.5):
    for t in lines:
        y = para(c, f"*** {t}", M + 40, y, W - 2 * M - 80, size=size, color=INK, align=TA_CENTER) - 5
    return y

c = canvas.Canvas(out, pagesize=letter)
c.setTitle(f"Lakes Area Aviation {YEAR} Rates")
c.setAuthor("Lakes Area Aviation, LLC")
c.setSubject("Instruction, aircraft rental and course estimate rates")

# Page 1: every published rate.
top = frame(c)
y = title(c, top, f"{YEAR} Rates")
R = W - M - 34
cols = (R - 96, R)
y = section(c, y, "Plane rental rates (per hour, wet)", ["Regular", "Prepay"], cols)
for r in D["rentalRates"]:
    y = rule_row(c, y, r["aircraft"], r["names"], [money(r["regular"]) , money(r["prepay"])], cols=cols)
y -= 4
y = section(c, y, "Instruction (per hour)", ["Rate"], (R,))
for r in D["instructionRates"]:
    y = rule_row(c, y, r["label"], None, [money(r["rate"]) + "/hr"], cols=(R,))
y -= 4
y = section(c, y, "Flights, housing & travel", ["Rate"], (R,))
for r in D["otherRates"]:
    y = rule_row(c, y, r["label"], None, [money(r["rate"])], cols=(R,))
y -= 2
n = D["RATE_NOTES"]
# Notes sit beside the contact box, left-aligned, so the whole sheet fits one page.
ny = M + 82
for t in [n["wet"], n["prepay"]]:
    ny = para(c, f"*** {t}", M + 34, ny, W - 2 * M - 34 - 280, size=8.6, color=INK) - 3
assert y > M + 84, f"rate table overflows into the notes ({y})"
contact_box(c)
c.showPage()

# One page per course option, like the original per-rating sheets.
LABEL = {"Accelerated Private Pilot": "Private Pilot", "Accelerated Instrument Rating": "Instrument Rating",
         "Commercial Single-Engine Land": "Commercial Single-Engine", "Commercial Multi-Engine Land": "Commercial Multi-Engine",
         "Certified Flight Instructor": "Certified Flight Instructor", "Certified Flight Instructor–Instrument": "Certified Flight Instructor–Instrument",
         "Multi-Engine Flight Instructor": "Multi-Engine Instructor"}
RATING = {"Private Pilot": "a Private Pilot rating", "Instrument Rating": "an Instrument Rating", "Commercial Single-Engine": "a Commercial Single-Engine rating",
          "Commercial Multi-Engine": "a Commercial Multi-Engine rating", "Certified Flight Instructor": "a CFI rating",
          "Certified Flight Instructor–Instrument": "a CFII rating", "Multi-Engine Instructor": "an MEI rating"}
house = [r for r in D["otherRates"] if r["label"].startswith("Student")]
for p in D["programs"]:
    for o in p["options"]:
        label = LABEL.get(o["name"], o["name"])
        top = frame(c)
        y = title(c, top, f"{YEAR} {label} Estimated Rates") - 8
        for item in o["lineItems"]:
            line = re.sub(r": (\$[\d,.]+)$", r" = \1", money(item))
            y = para(c, f"•&nbsp;&nbsp;{line}", M + 64, y, W - 2 * M - 128, size=14, leading=19) - 13
        y -= 6
        cost = money(o["estimatedCost"]).replace("As low as ", "")
        y = para(c, f"As low as <font name='Sans-Bold'>{cost}</font> for {RATING[label]}!", M + 30, y, W - 2 * M - 60, size=17, align=TA_CENTER, font="Sans-Semi") - 6
        t = o["timeline"]
        t = t[0].lower() + t[1:] if t.startswith("As little") else t
        y = para(c, f"Course can be completed in {t}", M + 30, y, W - 2 * M - 60, size=14, align=TA_CENTER, font="Sans-Bold") - 24
        y = para(c, "BEFORE YOU BEGIN", M + 30, y, W - 2 * M - 60, size=10, align=TA_CENTER, font="Sans-Bold", color=BLUE) - 4
        for req in o["requirements"]:
            y = para(c, req, M + 60, y, W - 2 * M - 120, size=11.5, align=TA_CENTER, color=INK) - 4
        y -= 18
        lines = [f"Student housing is available for {money(house[0]['rate'])}.",
                 f"Student crew cars are available for {money(house[1]['rate'])} for students staying in our housing.",
                 n["examiner"],
                 "Rental rates are calculated as pay ahead (prepay) rates, which means maintaining an account balance of $500.00 or more."]
        y = notes(c, y, lines, size=11)
        assert y > M + 80, f"{label} sheet overflows into the contact box ({y})"
        contact_box(c)
        c.showPage()
c.save()
print("wrote", out)
