from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)
from .views import (
    RegisterView, 
    WargaRegisterView,
    WargaVerificationViewSet,
    AdminUserViewSet,
    UserMeView, 
    UserProfileUpdateView, 
    AddressBookViewSet,
    ChangePasswordView,
    ChangePinView,
    VerifyPinView
)

router = DefaultRouter()
router.register(r'profile/addresses', AddressBookViewSet, basename='addressbook')
router.register(r'admin/warga-verification', WargaVerificationViewSet, basename='wargaverification')
router.register(r'admin/users', AdminUserViewSet, basename='adminusers')

urlpatterns = [
    path('register/', RegisterView.as_view(), name='auth_register'),
    path('warga-register/', WargaRegisterView.as_view(), name='auth_warga_register'),
    path('login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', UserMeView.as_view(), name='auth_user_me'),
    
    # Profile & settings
    path('profile/update/', UserProfileUpdateView.as_view(), name='profile_update'),
    path('profile/change-password/', ChangePasswordView.as_view(), name='change_password'),
    path('profile/change-pin/', ChangePinView.as_view(), name='change_pin'),
    path('profile/verify-pin/', VerifyPinView.as_view(), name='verify_pin'),
    
    # Address Book CRUD routes via router
    path('', include(router.urls)),
]
