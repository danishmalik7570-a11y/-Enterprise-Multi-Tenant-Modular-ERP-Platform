from django.urls import path
from apps.reports.views import (
    DashboardChartsView,
    DashboardReportView, StockSummaryReportView,
    ProfitLossReportView, ReceivablesAgingReportView,
    PayablesAgingReportView, SalesReportView, PurchaseReportView,
    LowStockReportView, StockMovementReportView,
    CashFlowReportView, PartyLedgerReportView
)

urlpatterns = [
    path('dashboard-charts/', DashboardChartsView.as_view(), name='report-dashboard-charts'),
    path('dashboard/', DashboardReportView.as_view(), name='report-dashboard'),
    path('stock-summary/', StockSummaryReportView.as_view(), name='report-stock-summary'),
    path('low-stock/', LowStockReportView.as_view(), name='report-low-stock'),
    path('stock-movement/', StockMovementReportView.as_view(), name='report-stock-movement'),
    path('profit-and-loss/', ProfitLossReportView.as_view(), name='report-pnl'),
    path('receivables-aging/', ReceivablesAgingReportView.as_view(), name='report-receivables-aging'),
    path('payables-aging/', PayablesAgingReportView.as_view(), name='report-payables-aging'),
    path('sales/', SalesReportView.as_view(), name='report-sales'),
    path('purchases/', PurchaseReportView.as_view(), name='report-purchases'),
    path('cash-flow/', CashFlowReportView.as_view(), name='report-cash-flow'),
    path('party-ledger/', PartyLedgerReportView.as_view(), name='report-party-ledger'),
]

