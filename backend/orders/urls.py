from django.urls import path
from .views import (
    OrderCreateView, 
    OrderListView, 
    MidtransNotificationView, 
    AdminUpdateStatusView,
    AdminDashboardStatsView,
    AdminVerifyCodPinView,
    AdminFinancialReconciliationView,
    AdminLoyaltyAuditLogView
)

urlpatterns = [
    path('', OrderListView.as_view(), name='order_list'),
    path('create/', OrderCreateView.as_view(), name='order_create'),
    path('admin-update/', AdminUpdateStatusView.as_view(), name='admin_update_status'),
    path('notification/', MidtransNotificationView.as_view(), name='midtrans_notification'),
    path('admin/dashboard-stats/', AdminDashboardStatsView.as_view(), name='admin_dashboard_stats'),
    path('admin/verify-cod-pin/', AdminVerifyCodPinView.as_view(), name='admin_verify_cod_pin'),
    path('admin/reconciliation/', AdminFinancialReconciliationView.as_view(), name='admin_reconciliation'),
    path('admin/loyalty-audit/', AdminLoyaltyAuditLogView.as_view(), name='admin_loyalty_audit'),
]
