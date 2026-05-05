import urllib.request
import urllib.parse
import json
import logging

from django.db.models import Sum
from rest_framework import viewsets, permissions, status, serializers as drf_serializers
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication

from .models import Vehicle, Txn, ServiceRecord
from .serializers import VehicleSerializer, TxnSerializer, ServiceRecordSerializer

logger = logging.getLogger("fuel_check")


class VehicleViewSet(viewsets.ModelViewSet):
    serializer_class = VehicleSerializer
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    filterset_fields = ["regno", "name", "model", "color", "company", "fuel_type", "last_service_date"]
    ordering_fields = [
        "created_at", "updated_at", "regno", "name", "model",
        "company", "current_mileage", "total_kms_driven",
    ]
    search_fields = ["regno", "name", "model", "company", "color"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Vehicle.objects.none()
        return Vehicle.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        vehicle = serializer.save(owner=self.request.user)
        logger.info("Vehicle created: %s by %s", vehicle.regno, self.request.user.username)

    def perform_destroy(self, instance):
        logger.info("Vehicle deleted: %s (id=%s) by %s", instance.regno, instance.id, self.request.user.username)
        instance.delete()

    def get_object(self):
        obj = super().get_object()
        if obj.owner != self.request.user:
            raise drf_serializers.ValidationError("Not your vehicle.")
        return obj

    @action(detail=True, methods=["get"])
    def analytics(self, request, pk=None):
        vehicle = self.get_object()
        txns = vehicle.txns.all().order_by("txn_date", "created_at")

        if not txns.exists():
            return Response({
                "summary": {
                    "total_spent": 0, "total_kms": 0, "total_fuel": 0,
                    "avg_mileage": 0, "cost_per_km": 0, "total_txns": 0,
                    "best_mileage": None, "worst_mileage": None,
                    "avg_price_per_liter": 0,
                },
                "mileage_trend": [],
                "spending_trend": [],
                "price_trend": [],
            })

        full_tank_txns = txns.filter(tank_fully_filled=True, current_mileage__isnull=False)
        all_mileage_txns = [t for t in txns if t.current_mileage]

        mileage_trend = [
            {
                "date": (t.txn_date or t.created_at.date()).isoformat(),
                "mileage": float(round(t.current_mileage, 2)),
                "fuel_qty": float(t.fuel_qty),
                "kms": float(t.kms_driven or 0),
            }
            for t in all_mileage_txns
        ]

        spending_trend = [
            {
                "date": (t.txn_date or t.created_at.date()).isoformat(),
                "amount": float(t.amount),
                "fuel_qty": float(t.fuel_qty),
                "price_per_liter": float(t.price_per_liter) if t.price_per_liter else 0,
                "location": t.location or "",
            }
            for t in txns
        ]

        price_trend = [
            {
                "date": (t.txn_date or t.created_at.date()).isoformat(),
                "price_per_liter": float(t.price_per_liter) if t.price_per_liter else 0,
            }
            for t in txns if t.price_per_liter
        ]

        totals = txns.aggregate(
            total_spent=Sum("amount"),
            total_kms=Sum("kms_driven"),
            total_fuel=Sum("fuel_qty"),
        )

        best = full_tank_txns.order_by("-current_mileage").first()
        worst = full_tank_txns.order_by("current_mileage").first()

        total_spent = float(totals["total_spent"] or 0)
        total_kms = float(totals["total_kms"] or 0)

        summary = {
            "total_spent": round(total_spent, 2),
            "total_kms": round(total_kms, 2),
            "total_fuel": round(float(totals["total_fuel"] or 0), 2),
            "avg_mileage": float(round(vehicle.average_mileage, 2)),
            "cost_per_km": round(total_spent / total_kms, 2) if total_kms > 0 else 0,
            "total_txns": txns.count(),
            "best_mileage": float(round(best.current_mileage, 2)) if best else None,
            "worst_mileage": float(round(worst.current_mileage, 2)) if worst else None,
            "avg_price_per_liter": round(
                sum(float(t.price_per_liter) for t in txns if t.price_per_liter) /
                max(sum(1 for t in txns if t.price_per_liter), 1), 2
            ),
        }

        return Response({
            "summary": summary,
            "mileage_trend": mileage_trend,
            "spending_trend": spending_trend,
            "price_trend": price_trend,
        })


class TxnViewSet(viewsets.ModelViewSet):
    serializer_class = TxnSerializer
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    filterset_fields = ["vehicle", "tank_fully_filled", "location", "created_at"]
    ordering_fields = ["created_at", "updated_at", "amount", "fuel_qty", "price_per_liter"]
    search_fields = ["location", "vehicle__regno"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Txn.objects.none()
        return Txn.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        vehicle = serializer.validated_data.get("vehicle")
        if not vehicle:
            raise drf_serializers.ValidationError("Vehicle is required.")
        if vehicle.owner != self.request.user:
            raise drf_serializers.ValidationError("You can only add transactions for your own vehicles.")
        txn = serializer.save(owner=self.request.user)
        logger.info("Txn created: ₹%s by %s for %s", txn.amount, self.request.user.username, vehicle.regno)

    def perform_update(self, serializer):
        vehicle = serializer.validated_data.get("vehicle", serializer.instance.vehicle)
        if vehicle.owner != self.request.user:
            raise drf_serializers.ValidationError("You can only update transactions for your own vehicles.")
        serializer.save(owner=self.request.user)

    def perform_destroy(self, instance):
        if instance.owner != self.request.user:
            raise drf_serializers.ValidationError("You can only delete your own transactions.")
        logger.info("Txn deleted: id=%s vehicle=%s by %s", instance.id, instance.vehicle.regno, self.request.user.username)
        instance.delete()


class ServiceRecordViewSet(viewsets.ModelViewSet):
    serializer_class = ServiceRecordSerializer
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    filterset_fields = ["vehicle", "service_type"]
    ordering_fields = ["service_date", "cost", "created_at"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return ServiceRecord.objects.none()
        return ServiceRecord.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        vehicle = serializer.validated_data.get("vehicle")
        if vehicle.owner != self.request.user:
            raise drf_serializers.ValidationError("Not your vehicle.")
        sr = serializer.save(owner=self.request.user)
        logger.info("Service recorded: %s for %s", sr.get_service_type_display(), vehicle.regno)

    def perform_update(self, serializer):
        vehicle = serializer.validated_data.get("vehicle", serializer.instance.vehicle)
        if vehicle.owner != self.request.user:
            raise drf_serializers.ValidationError("Not your vehicle.")
        serializer.save(owner=self.request.user)


# --- External API Proxies ---


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def car_makes(request):
    logger.info("CarQuery: fetching makes")
    try:
        url = "https://www.carqueryapi.com/api/0.3/?cmd=getMakes"
        req = urllib.request.Request(url, headers={"User-Agent": "FuelCheck/1.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())
            return Response(data.get("Makes", []))
    except Exception:
        return Response([], status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def car_models(request):
    """Proxy to CarQuery API - get models for a make"""
    make = request.GET.get("make", "")
    try:
        url = f"https://www.carqueryapi.com/api/0.3/?cmd=getModels&make={urllib.parse.quote(make)}"
        req = urllib.request.Request(url, headers={"User-Agent": "FuelCheck/1.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())
            return Response(data.get("Models", []))
    except Exception:
        return Response([], status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def car_details(request):
    """Proxy to CarQuery API - get full specs for a car model/year"""
    make = request.GET.get("make", "")
    model = request.GET.get("model", "")
    year = request.GET.get("year", "")
    try:
        url = (
            f"https://www.carqueryapi.com/api/0.3/"
            f"?cmd=getTrims&make={urllib.parse.quote(make)}"
            f"&model={urllib.parse.quote(model)}"
        )
        if year:
            url += f"&year={year}"
        req = urllib.request.Request(url, headers={"User-Agent": "FuelCheck/1.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())
            trims = data.get("Trims", [])
            if trims:
                trim = trims[0]
                return Response({
                    "make": trim.get("model_make_id", make),
                    "model": trim.get("model_name", model),
                    "year": trim.get("model_year", year),
                    "fuel_type": trim.get("model_engine_fuel", "").lower(),
                    "engine_size": trim.get("model_engine_size_cc", ""),
                    "fuel_cap_l": trim.get("model_fuel_cap_l", ""),
                    "horsepower": trim.get("model_engine_power_hp", ""),
                    "cylinders": trim.get("model_engine_cyl", ""),
                    "body_type": trim.get("model_body", ""),
                    "drive_type": trim.get("model_drive", ""),
                })
            return Response({}, status=status.HTTP_200_OK)
    except Exception:
        return Response({}, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def location_search(request):
    q = request.GET.get("q", "")
    logger.info("Location search: '%s' by %s", q[:50], request.user.username)
    if len(q) < 2:
        return Response([], status=status.HTTP_200_OK)
    try:
        url = (
            "https://nominatim.openstreetmap.org/search"
            f"?format=json&limit=5&q={urllib.parse.quote(q)}"
        )
        req = urllib.request.Request(url, headers={"User-Agent": "FuelCheck/1.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read())
            results = [
                {"name": r.get("display_name", ""), "lat": r.get("lat"), "lon": r.get("lon")}
                for r in data
            ]
            return Response(results)
    except Exception:
        return Response([], status=status.HTTP_200_OK)
