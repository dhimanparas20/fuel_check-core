from django.shortcuts import render
from rest_framework import filters
from rest_framework import serializers
from rest_framework import viewsets, permissions
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication

from .models import Vehicle, Txn
from .serializers import VehicleSerializer, TxnSerializer


# Create your views here.
class VehicleViewSet(viewsets.ModelViewSet):
    serializer_class = VehicleSerializer
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication]
    # filter_backends = [filters.OrderingFilter, filters.SearchFilter, DjangoFilterBackend]
    filterset_fields = ["regno", "name", "model", "color", "company", "fuel_type", "last_service_date"]
    ordering_fields = [
        "created_at",
        "updated_at",
        "regno",
        "name",
        "model",
        "company",
        "current_mileage",
        "total_kms_driven",
    ]
    search_fields = ["regno", "name", "model", "company", "color"]

    def get_queryset(self):
        # 1. Check if this is a schema generation request
        if getattr(self, "swagger_fake_view", False):
            return Vehicle.objects.none()

        # 2. Your original logic for real requests
        return Vehicle.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    def get_object(self):
        obj = super().get_object()
        if obj.owner != self.request.user:
            raise serializers.ValidationError("You do not have permission to access this vehicle.")
        return obj


class TxnViewSet(viewsets.ModelViewSet):
    serializer_class = TxnSerializer
    permission_classes = [IsAuthenticated]
    # filter_backends = [filters.OrderingFilter, filters.SearchFilter, filters.DjangoFilterBackend]
    filterset_fields = ["vehicle", "tank_fully_filled", "location", "created_at"]
    ordering_fields = ["created_at", "updated_at", "amount", "fuel_qty"]
    search_fields = ["location", "vehicle__regno"]

    def get_queryset(self):
        # 1. Check if this is a schema generation request
        if getattr(self, "swagger_fake_view", False):
            return Txn.objects.none()

        # 2. Your original logic for real requests
        return Txn.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        vehicle = serializer.validated_data.get("vehicle")
        if not vehicle:
            raise serializers.ValidationError("Vehicle is required.")
        if not hasattr(vehicle, "owner") or vehicle.owner != self.request.user:
            raise serializers.ValidationError("You can only add transactions for your own vehicles.")
        serializer.save(owner=self.request.user)

    def perform_update(self, serializer):
        vehicle = serializer.validated_data.get("vehicle", serializer.instance.vehicle)
        if vehicle.owner != self.request.user:
            raise serializers.ValidationError("You can only update transactions for your own vehicles.")
        serializer.save(owner=self.request.user)

    def perform_destroy(self, instance):
        if instance.owner != self.request.user:
            raise serializers.ValidationError("You can only delete your own transactions.")
        instance.delete()
