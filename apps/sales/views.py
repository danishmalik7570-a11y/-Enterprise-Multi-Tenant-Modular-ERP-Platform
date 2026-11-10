from django.http import HttpResponse
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from apps.sales.models import SalesInvoice, SalesInvoiceItem, InvoiceTemplate
from apps.sales.serializers import SalesInvoiceSerializer, SalesInvoiceItemSerializer, InvoiceTemplateSerializer
from apps.sales.pdf_generator import generate_invoice_pdf
from apps.role_builder.permissions import HasDynamicPermission

class SalesInvoiceViewSet(viewsets.ModelViewSet):
    serializer_class = SalesInvoiceSerializer
    permission_classes = [permissions.IsAuthenticated, HasDynamicPermission]
    permission_module = 'sales'

    def get_queryset(self):
        return SalesInvoice.objects.all().prefetch_related('items__item').select_related('customer', 'warehouse')

    @action(detail=True, methods=['post'], url_path='confirm')
    def confirm(self, request, pk=None):
        invoice = self.get_object()
        try:
            invoice.confirm_and_post()
            return Response({
                "message": f"Invoice {invoice.invoice_number} confirmed, stock updated and ledger entry posted.",
                "status": invoice.status,
                "journal_entry_id": invoice.journal_entry_id
            })
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['get'], url_path='pdf')
    def download_pdf(self, request, pk=None):
        invoice = self.get_object()
        template_id = request.query_params.get('template_id')
        template = None
        if template_id:
            template = InvoiceTemplate.objects.filter(tenant=request.tenant, id=template_id).first()
        if not template:
            template = InvoiceTemplate.objects.filter(tenant=request.tenant, is_default=True).first()

        config = template.config if template else {}
        invoice_data = {
            'tenant_name': request.tenant.name,
            'invoice_number': invoice.invoice_number,
            'date': str(invoice.date),
            'due_date': str(invoice.due_date),
            'customer_name': invoice.customer.name,
            'customer_address': invoice.customer.address or 'Commercial District',
            'customer_tax_id': invoice.customer.tax_id or 'N/A',
            'total_amount': float(invoice.total_amount),
            'tax_amount': float(invoice.tax_amount),
            'items': [
                {
                    'sku': item.item.sku,
                    'item_name': item.item.name,
                    'quantity': float(item.quantity),
                    'unit_price': float(item.unit_price),
                    'discount_percent': float(item.discount_percent),
                    'tax_rate': float(item.tax_rate),
                    'line_total': float(item.line_total),
                }
                for item in invoice.items.select_related('item').all()
            ]
        }

        pdf_bytes = generate_invoice_pdf(invoice_data, config)
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{invoice.invoice_number}.pdf"'
        return response


class InvoiceTemplateViewSet(viewsets.ModelViewSet):
    """
    CRUD for invoice layouts.
    Live preview generation and sample PDF generation.
    """
    serializer_class = InvoiceTemplateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return InvoiceTemplate.objects.all()

    @action(detail=False, methods=['post'], url_path='render-pdf')
    def render_pdf(self, request):
        config = request.data.get('config', {})
        sample_data = request.data.get('invoice_data', {
            'tenant_name': request.tenant.name,
            'invoice_number': 'INV-2026-0001',
            'date': '2026-09-07',
            'due_date': '2026-09-21',
            'customer_name': 'Apex Industrial Supplies Ltd',
            'customer_address': 'Plot 42, Port Qasim Industrial Area\nKarachi / Mumbai',
            'customer_tax_id': 'NTN-8822334',
            'total_amount': 28500.00,
            'tax_amount': 4347.46,
            'items': [
                {'sku': 'PRD-001', 'item_name': 'Precision Grade Ball Bearings', 'quantity': 10, 'unit_price': 1500.00, 'discount_percent': 0, 'tax_rate': 18, 'line_total': 15000.00},
                {'sku': 'PRD-002', 'item_name': 'High-Tensile Machine Fasteners (100pk)', 'quantity': 15, 'unit_price': 900.00, 'discount_percent': 5, 'tax_rate': 18, 'line_total': 12825.00},
            ]
        })
        pdf_bytes = generate_invoice_pdf(sample_data, config)
        response = HttpResponse(pdf_bytes, content_type='application/pdf')
        response['Content-Disposition'] = 'attachment; filename="Invoice-Preview.pdf"'
        return response

