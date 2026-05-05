from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    VehicleViewSet, TxnViewSet, ServiceRecordViewSet,
    car_makes, car_models, car_details, location_search,
)

router = DefaultRouter()
router.register(r"vehicles", VehicleViewSet, basename="vehicle")
router.register(r"txns", TxnViewSet, basename="txn")
router.register(r"services", ServiceRecordViewSet, basename="service")

urlpatterns = router.urls + [
    path("car-makes/", car_makes, name="car-makes"),
    path("car-models/", car_models, name="car-models"),
    path("car-details/", car_details, name="car-details"),
    path("location-search/", location_search, name="location-search"),
]
