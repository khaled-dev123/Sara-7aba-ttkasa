from datetime import datetime
from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas
from reportlab.graphics import renderPDF
from reportlab.graphics.shapes import Drawing
from reportlab.lib.colors import HexColor

from app.config import COMPANY_NAME, COMPANY_TAGLINE, LOGO_PATH, PDF_STORAGE_DIR


def _safe(text: str | None, fallback: str = "") -> str:
    return (text or "").strip() or fallback


def _ensure_logo() -> Path:
    """Return a usable logo file, generating a placeholder if none exists."""
    logo = Path(LOGO_PATH)
    if logo.exists():
        return logo
    try:
        from PIL import Image, ImageDraw
    except ImportError:
        return logo
    logo.parent.mkdir(parents=True, exist_ok=True)
    img = Image.new("RGB", (240, 240), color=(31, 41, 55))
    draw = ImageDraw.Draw(img)
    draw.ellipse([40, 40, 200, 200], fill=(245, 158, 11))
    draw.ellipse([100, 78, 158, 136], fill=(31, 41, 55))
    draw.rectangle([72, 140, 186, 160], fill=(31, 41, 55))
    draw.rectangle([100, 160, 140, 184], fill=(31, 41, 55))
    draw.rectangle([60, 170, 180, 182], fill=(31, 41, 55))
    img.save(logo)
    return logo


def _make_qr(data: str, size_mm: float = 22) -> Drawing:
    import qrcode
    from reportlab.graphics.shapes import Rect

    qr = qrcode.QRCode(border=1, box_size=4)
    qr.add_data(data)
    qr.make(fit=True)
    matrix = qr.get_matrix()
    n = len(matrix)
    scale = size_mm * mm / n
    drawing = Drawing(size_mm * mm, size_mm * mm)
    drawing.add(Rect(0, 0, size_mm * mm, size_mm * mm, fillColor=HexColor("#FFFFFF")))
    for r, row in enumerate(matrix):
        for c, cell in enumerate(row):
            if cell:
                drawing.add(
                    Rect(c * scale, (n - 1 - r) * scale, scale, scale, fillColor=HexColor("#000000"))
                )
    return drawing


def generate_delivery_pdf(
    delivery_id: int,
    order_number: str,
    market_name: str,
    market_address: str,
    market_phone: str,
    market_manager: str,
    delivery_date: datetime,
    prepared_by: str,
    items: list[dict],
    filename: str,
) -> str:
    """Builds a delivery note PDF (logo + QR + signature) and returns its relative path."""
    PDF_STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    path: Path = PDF_STORAGE_DIR / filename

    c = canvas.Canvas(str(path), pagesize=A4)
    width, height = A4
    margin = 20 * mm

    c.setTitle(f"Delivery Note {order_number}")
    c.setAuthor(COMPANY_NAME)

    # Header: logo + company
    logo = _ensure_logo()
    if logo.exists():
        try:
            c.drawImage(str(logo), margin, height - 26 * mm, width=18 * mm, height=18 * mm, preserveAspectRatio=True, anchor="sw")
        except Exception:
            pass
    c.setFont("Helvetica-Bold", 18)
    c.drawString(margin + 22 * mm, height - 18 * mm, "DELIVERY NOTE")
    c.setFont("Helvetica", 10)
    c.drawString(margin + 22 * mm, height - 24 * mm, f"{COMPANY_NAME} - {COMPANY_TAGLINE}")

    # QR code (verifiable delivery reference)
    try:
        qr = _make_qr(f"{COMPANY_NAME}|DL{delivery_id:05d}|{order_number}")
        renderPDF.draw(qr, c, width - margin - 22 * mm, height - 28 * mm)
    except ImportError:
        pass

    c.setFont("Helvetica", 9)
    c.drawRightString(width - margin, height - 32 * mm, f"Date: {delivery_date:%Y-%m-%d %H:%M}")
    c.drawRightString(width - margin, height - 36 * mm, f"Delivery #: DL{delivery_id:05d}")
    c.drawRightString(width - margin, height - 40 * mm, f"Order #: {order_number}")

    # Deliver To
    c.setFont("Helvetica-Bold", 11)
    c.drawString(margin, height - 50 * mm, "Deliver To")
    c.setFont("Helvetica", 10)
    c.drawString(margin, height - 56 * mm, _safe(market_name, "Market"))
    if market_address:
        c.drawString(margin, height - 61 * mm, market_address)
    if market_phone:
        c.drawString(margin, height - 66 * mm, f"Phone: {market_phone}")
    if market_manager:
        c.drawString(margin, height - 71 * mm, f"Manager: {market_manager}")

    table_y = height - 88 * mm
    c.setFont("Helvetica-Bold", 10)
    c.drawString(margin, table_y, "Product")
    c.drawString(margin + 90 * mm, table_y, "SKU")
    c.drawRightString(margin + 130 * mm, table_y, "Qty")
    c.drawRightString(margin + 160 * mm, table_y, "Unit")
    c.line(margin, table_y - 2 * mm, width - margin, table_y - 2 * mm)

    c.setFont("Helvetica", 10)
    row_y = table_y - 7 * mm
    for item in items:
        if row_y < 40 * mm:
            c.showPage()
            row_y = height - 25 * mm
            c.setFont("Helvetica", 10)
        c.drawString(margin, row_y, _safe(item.get("product_name"), "?"))
        c.drawString(margin + 90 * mm, row_y, _safe(item.get("sku")))
        c.drawRightString(margin + 130 * mm, row_y, str(item.get("quantity", 0)))
        c.drawRightString(margin + 160 * mm, row_y, _safe(item.get("unit")))
        row_y -= 6 * mm

    c.line(margin, row_y + 1 * mm, width - margin, row_y + 1 * mm)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(margin, row_y - 6 * mm, f"Total items: {sum(i.get('quantity', 0) for i in items)}")

    # Prepared by + signatures
    c.setFont("Helvetica", 9)
    sig_y = 30 * mm
    if prepared_by:
        c.drawString(margin, sig_y, f"Prepared by: {prepared_by}")
    c.drawString(margin, sig_y - 10 * mm, "Warehouse signature: ______________________")
    c.drawRightString(width - margin, sig_y - 10 * mm, "Market signature: ______________________")
    c.drawString(margin, sig_y - 24 * mm, f"{COMPANY_NAME} - {COMPANY_TAGLINE}")

    c.save()
    return f"deliveries/{filename}"
