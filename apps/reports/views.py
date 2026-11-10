from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status, serializers
from drf_spectacular.utils import extend_schema
from apps.reports.services import (
    get_dashboard_summary, get_stock_summary,
    get_profit_and_loss, get_receivables_aging
)
from apps.reports.charts import get_all_dashboard_charts

class DashboardChartsView(APIView):
    """
    Renders publication-quality Matplotlib & Seaborn top-level analytical figures
    for the Executive Dashboard.
    """
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(responses={200: serializers.DictField()})
    def get(self, request):
        if not request.tenant:
            return Response({"error": "No tenant context"}, status=status.HTTP_400_BAD_REQUEST)
        data = get_all_dashboard_charts(request.tenant)
        return Response(data)


class DashboardReportView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(responses={200: serializers.DictField()})
    def get(self, request):
        if not request.tenant:
            return Response({"error": "No tenant context"}, status=status.HTTP_400_BAD_REQUEST)
        data = get_dashboard_summary(request.tenant)
        return Response(data)



class StockSummaryReportView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(responses={200: serializers.ListField(child=serializers.DictField())})
    def get(self, request):
        if not request.tenant:
            return Response({"error": "No tenant context"}, status=status.HTTP_400_BAD_REQUEST)
        if not request.tenant.is_module_enabled('inventory'):
            return Response({"error": "Inventory module is not enabled for this tenant."}, status=status.HTTP_403_FORBIDDEN)
        data = get_stock_summary(request.tenant)
        return Response(data)


class ProfitLossReportView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(responses={200: serializers.DictField()})
    def get(self, request):
        if not request.tenant:
            return Response({"error": "No tenant context"}, status=status.HTTP_400_BAD_REQUEST)
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        data = get_profit_and_loss(request.tenant, start_date, end_date)
        return Response(data)


class ReceivablesAgingReportView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(responses={200: serializers.ListField(child=serializers.DictField())})
    def get(self, request):
        if not request.tenant:
            return Response({"error": "No tenant context"}, status=status.HTTP_400_BAD_REQUEST)
        data = get_receivables_aging(request.tenant)
        return Response(data)


class PayablesAgingReportView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(responses={200: serializers.ListField(child=serializers.DictField())})
    def get(self, request):
        if not request.tenant:
            return Response({"error": "No tenant context"}, status=status.HTTP_400_BAD_REQUEST)
        from apps.reports.services import get_payables_aging
        data = get_payables_aging(request.tenant)
        return Response(data)


class SalesReportView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not request.tenant:
            return Response({"error": "No tenant context"}, status=status.HTTP_400_BAD_REQUEST)
        from apps.reports.services import get_sales_report
        data = get_sales_report(
            request.tenant,
            start_date=request.query_params.get('start_date'),
            end_date=request.query_params.get('end_date'),
            customer_id=request.query_params.get('customer_id'),
            item_id=request.query_params.get('item_id')
        )
        return Response(data)


class PurchaseReportView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not request.tenant:
            return Response({"error": "No tenant context"}, status=status.HTTP_400_BAD_REQUEST)
        from apps.reports.services import get_purchase_report
        data = get_purchase_report(
            request.tenant,
            start_date=request.query_params.get('start_date'),
            end_date=request.query_params.get('end_date'),
            supplier_id=request.query_params.get('supplier_id'),
            item_id=request.query_params.get('item_id')
        )
        return Response(data)


class LowStockReportView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not request.tenant:
            return Response({"error": "No tenant context"}, status=status.HTTP_400_BAD_REQUEST)
        from apps.reports.services import get_low_stock_report
        threshold = int(request.query_params.get('threshold', 10))
        data = get_low_stock_report(request.tenant, threshold=threshold)
        return Response(data)


class StockMovementReportView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not request.tenant:
            return Response({"error": "No tenant context"}, status=status.HTTP_400_BAD_REQUEST)
        from apps.reports.services import get_stock_movement_report
        data = get_stock_movement_report(
            request.tenant,
            start_date=request.query_params.get('start_date'),
            end_date=request.query_params.get('end_date'),
            warehouse_id=request.query_params.get('warehouse_id'),
            item_id=request.query_params.get('item_id')
        )
        return Response(data)


class CashFlowReportView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not request.tenant:
            return Response({"error": "No tenant context"}, status=status.HTTP_400_BAD_REQUEST)
        from apps.reports.services import get_cash_flow_report
        data = get_cash_flow_report(
            request.tenant,
            start_date=request.query_params.get('start_date'),
            end_date=request.query_params.get('end_date')
        )
        return Response(data)


class PartyLedgerReportView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not request.tenant:
            return Response({"error": "No tenant context"}, status=status.HTTP_400_BAD_REQUEST)
        party_id = request.query_params.get('party_id')
        if not party_id:
            return Response({"error": "party_id query param is required"}, status=status.HTTP_400_BAD_REQUEST)
        from apps.reports.services import get_party_ledger_report
        data = get_party_ledger_report(
            request.tenant,
            party_id=party_id,
            start_date=request.query_params.get('start_date'),
            end_date=request.query_params.get('end_date')
        )
        return Response(data)

