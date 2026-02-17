from rest_framework.routers import DefaultRouter

from .views import VehicleViewSet, TxnViewSet

router = DefaultRouter()
router.register(r"vehicles", VehicleViewSet, basename="vehicle")
router.register(r"txns", TxnViewSet, basename="txn")

urlpatterns = router.urls
