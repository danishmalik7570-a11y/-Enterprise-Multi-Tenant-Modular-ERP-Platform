import io
from decimal import Decimal
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

def generate_invoice_pdf(invoice_data: dict, template_config: dict) -> bytes:
    """
    Generates a professional PDF invoice matching the template configuration.
    Currency amounts are formatted strictly with 'Rs.'.
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()
    
    # Styling options from config
    styling = template_config.get('styling', {})
    accent_hex = styling.get('accent_color', '#1E5FBF')
    show_borders = styling.get('show_borders', True)

    try:
        primary_color = colors.HexColor(accent_hex)
    except Exception:
        primary_color = colors.HexColor('#1E5FBF')
    
    light_blue = colors.HexColor('#EAF2FF')
    navy = colors.HexColor('#1A1A2E')
    muted = colors.HexColor('#64748B')

    title_style = ParagraphStyle(
        'InvTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=primary_color
    )

    company_style = ParagraphStyle(
        'CompanyInfo',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=navy
    )

    meta_style = ParagraphStyle(
        'InvMeta',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=14,
        textColor=navy
    )

    story = []

    # 1. Header Section
    header_cfg = template_config.get('header', {})
    company_name = header_cfg.get('company_name', invoice_data.get('tenant_name', 'Enterprise ERP Tenant'))
    company_address = header_cfg.get('company_address', 'Corporate Headquarters\nCommercial District\nKarachi / Mumbai')
    tax_id = header_cfg.get('tax_id', 'NTN / GSTIN: 9876543-2')

    inv_number = invoice_data.get('invoice_number', 'INV-2026-0001')
    inv_date = invoice_data.get('date', '2026-09-07')
    due_date = invoice_data.get('due_date', '2026-09-21')

    header_table_data = [
        [
            Paragraph(f"<b>{company_name}</b><br/>{company_address.replace(chr(10), '<br/>')}<br/>{tax_id}", company_style),
            Paragraph(f"<font size=18 color='{accent_hex}'><b>TAX INVOICE</b></font><br/><br/>"
                      f"<b>Invoice #:</b> {inv_number}<br/>"
                      f"<b>Date:</b> {inv_date}<br/>"
                      f"<b>Due Date:</b> {due_date}", meta_style)
        ]
    ]
    header_table = Table(header_table_data, colWidths=[3.5 * inch, 3.5 * inch])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('ALIGN', (1,0), (1,0), 'RIGHT'),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 16))

    # 2. Party Block
    party_cfg = template_config.get('party', {})
    customer_name = invoice_data.get('customer_name', 'Valued Customer')
    customer_address = invoice_data.get('customer_address', 'Business Partner Office\nCorporate Center')
    customer_tax_id = invoice_data.get('customer_tax_id', 'TRN-55443322')

    bill_to_text = f"<b>BILL TO:</b><br/><b>{customer_name}</b><br/>{customer_address.replace(chr(10), '<br/>')}"
    if party_cfg.get('show_tax_id', True):
        bill_to_text += f"<br/>Tax ID: {customer_tax_id}"

    ship_to_text = ""
    if party_cfg.get('show_ship_to', True):
        ship_to_text = f"<b>SHIP TO:</b><br/>{customer_name}<br/>{customer_address.replace(chr(10), '<br/>')}"

    party_table_data = [
        [
            Paragraph(bill_to_text, company_style),
            Paragraph(ship_to_text, company_style) if ship_to_text else Paragraph("", company_style)
        ]
    ]
    party_table = Table(party_table_data, colWidths=[3.5 * inch, 3.5 * inch])
    party_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BACKGROUND', (0,0), (-1,-1), light_blue),
        ('PADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(party_table)
    story.append(Spacer(1, 16))

    # 3. Line Items Table
    line_cfg = template_config.get('line_items', {})
    show_sku = line_cfg.get('show_sku', True)
    show_discount = line_cfg.get('show_discount', True)
    show_tax = line_cfg.get('show_tax', True)

    headers = []
    if show_sku: headers.append('SKU')
    headers.append('Description')
    headers.append('Qty')
    headers.append('Unit Price')
    if show_discount: headers.append('Disc %')
    if show_tax: headers.append('Tax %')
    headers.append('Total')

    rows = [headers]
    items = invoice_data.get('items', [
        {'sku': 'PRD-001', 'item_name': 'Industrial Steel Brackets', 'quantity': 5, 'unit_price': 1200.0, 'discount_percent': 0, 'tax_rate': 18, 'line_total': 6000.0},
        {'sku': 'PRD-002', 'item_name': 'Heavy Duty Anchor Bolts', 'quantity': 20, 'unit_price': 150.0, 'discount_percent': 5, 'tax_rate': 18, 'line_total': 2850.0},
    ])

    for itm in items:
        row = []
        if show_sku: row.append(str(itm.get('sku', itm.get('item_sku', ''))))
        row.append(str(itm.get('item_name', 'Item')))
        row.append(str(itm.get('quantity', 1)))
        row.append(f"Rs. {float(itm.get('unit_price', 0)):,.2f}")
        if show_discount: row.append(f"{float(itm.get('discount_percent', 0)):.1f}%")
        if show_tax: row.append(f"{float(itm.get('tax_rate', 0)):.1f}%")
        row.append(f"Rs. {float(itm.get('line_total', 0)):,.2f}")
        rows.append(row)

    col_widths = []
    num_cols = len(headers)
    w_remain = 7.0 * inch
    if show_sku:
        col_widths.append(1.0 * inch)
        w_remain -= 1.0 * inch
    col_widths.append(2.4 * inch)
    w_remain -= 2.4 * inch
    col_widths.append(0.6 * inch)
    w_remain -= 0.6 * inch
    col_widths.append(1.0 * inch)
    w_remain -= 1.0 * inch
    if show_discount:
        col_widths.append(0.6 * inch)
        w_remain -= 0.6 * inch
    if show_tax:
        col_widths.append(0.6 * inch)
        w_remain -= 0.6 * inch
    col_widths.append(w_remain) # Total column

    items_table = Table(rows, colWidths=col_widths)
    t_style = [
        ('BACKGROUND', (0,0), (-1,0), primary_color),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,0), 9),
        ('BOTTOMPADDING', (0,0), (-1,0), 6),
        ('TOPPADDING', (0,0), (-1,0), 6),
        ('FONTNAME', (0,1), (-1,-1), 'Helvetica'),
        ('FONTSIZE', (0,1), (-1,-1), 8.5),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ALIGN', (-1,0), (-1,-1), 'RIGHT'),
    ]
    if show_borders:
        t_style.append(('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#CBD5E1')))
    else:
        t_style.append(('LINEBELOW', (0,1), (-1,-1), 0.5, colors.HexColor('#E2E8F0')))
    items_table.setStyle(TableStyle(t_style))
    story.append(items_table)
    story.append(Spacer(1, 14))

    # 4. Totals Block
    tot_cfg = template_config.get('totals', {})
    total_amount = float(invoice_data.get('total_amount', 8850.0))
    tax_amount = float(invoice_data.get('tax_amount', 1593.0))
    subtotal = total_amount - tax_amount

    totals_data = [
        ['Subtotal:', f"Rs. {subtotal:,.2f}"],
        ['Tax Total:', f"Rs. {tax_amount:,.2f}"],
        ['Grand Total:', f"Rs. {total_amount:,.2f}"],
    ]
    totals_table = Table(totals_data, colWidths=[1.5 * inch, 1.8 * inch])
    totals_table.setStyle(TableStyle([
        ('ALIGN', (0,0), (-1,-1), 'RIGHT'),
        ('FONTNAME', (0,0), (-1,-1), 'Helvetica'),
        ('FONTSIZE', (0,0), (-1,-1), 9),
        ('FONTNAME', (0,-1), (-1,-1), 'Helvetica-Bold'),
        ('FONTSIZE', (0,-1), (-1,-1), 11),
        ('TEXTCOLOR', (0,-1), (-1,-1), primary_color),
        ('LINEABOVE', (0,-1), (-1,-1), 1, primary_color),
        ('PADDING', (0,0), (-1,-1), 4),
    ]))

    # Position totals on the right
    wrapper_table = Table([
        [Paragraph(f"<b>Amount in Words:</b><br/>Rupees {total_amount:,.2f} Only" if tot_cfg.get('amount_in_words', True) else "", meta_style), totals_table]
    ], colWidths=[3.7 * inch, 3.3 * inch])
    wrapper_table.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'TOP')]))
    story.append(wrapper_table)
    story.append(Spacer(1, 20))

    # 5. Footer Section
    footer_cfg = template_config.get('footer', {})
    terms = footer_cfg.get('terms', 'Payment is due within 15 days of invoice date.\nSubject to local jurisdiction.')
    bank_details = footer_cfg.get('bank_details', 'Bank: Meezan / HDFC Commercial Bank\nAccount: 01020304050607\nIBAN / IFSC: PK98MEZN0001020304050607')
    show_signature = footer_cfg.get('signature_block', True)

    footer_cells = [
        Paragraph(f"<b>Terms & Conditions:</b><br/>{terms.replace(chr(10), '<br/>')}<br/><br/>"
                  f"<b>Bank Account Details:</b><br/>{bank_details.replace(chr(10), '<br/>')}", company_style)
    ]
    if show_signature:
        footer_cells.append(Paragraph(
            "<br/><br/><br/>_______________________________<br/><b>Authorized Signature & Stamp</b>",
            ParagraphStyle('Sig', parent=styles['Normal'], alignment=2, fontName='Helvetica', fontSize=9, textColor=navy)
        ))
    else:
        footer_cells.append(Paragraph("", company_style))

    footer_table = Table([footer_cells], colWidths=[4.2 * inch, 2.8 * inch])
    footer_table.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'TOP')]))
    story.append(footer_table)

    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()
