from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Vehicle, Txn, ServiceRecord

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name"]


class VehicleSerializer(serializers.ModelSerializer):
    owner = UserSerializer(read_only=True)
    current_mileage = serializers.DecimalField(
        max_digits=6, decimal_places=2, required=False, allow_null=True
    )
    total_kms_driven = serializers.DecimalField(
        max_digits=10, decimal_places=2, required=False, allow_null=True
    )
    last_service_date = serializers.DateField(required=False, allow_null=True)
    average_mileage = serializers.DecimalField(
        max_digits=6, decimal_places=2, required=False, allow_null=True
    )
    model = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    color = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    company = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    cost_per_km = serializers.SerializerMethodField()
    txn_count = serializers.SerializerMethodField()

    class Meta:
        model = Vehicle
        fields = [
            "id", "regno", "owner", "name", "model", "color", "company",
            "current_mileage", "total_kms_driven", "fuel_type",
            "last_service_date", "average_mileage", "fuel_tank_capacity",
            "money_used", "cost_per_km", "txn_count",
            "created_at", "updated_at",
        ]

    def get_cost_per_km(self, obj):
        return round(obj.cost_per_km(), 2)

    def get_txn_count(self, obj):
        return obj.txns.count()

    def validate_current_mileage(self, value):
        if value == "" or value is None:
            return None
        try:
            return float(value)
        except (ValueError, TypeError):
            return None

    def validate_last_service_date(self, value):
        if value == "" or value is None:
            return None
        return value


class TxnSerializer(serializers.ModelSerializer):
    vehicle = serializers.PrimaryKeyRelatedField(queryset=Vehicle.objects.all())
    owner = UserSerializer(read_only=True)
    txn_date = serializers.DateField(required=False, allow_null=True)

    class Meta:
        model = Txn
        fields = [
            "id", "vehicle", "owner", "amount", "fuel_qty",
            "price_per_liter", "kms_driven", "current_mileage",
            "tank_fully_filled", "location", "txn_date",
            "created_at", "updated_at",
        ]
        read_only_fields = ["price_per_liter"]

    def validate_txn_date(self, value):
        if value == "" or value is None:
            return None
        return value


class ServiceRecordSerializer(serializers.ModelSerializer):
    vehicle = serializers.PrimaryKeyRelatedField(queryset=Vehicle.objects.all())
    owner = UserSerializer(read_only=True)
    service_type_display = serializers.SerializerMethodField()

    class Meta:
        model = ServiceRecord
        fields = [
            "id", "vehicle", "owner", "service_date", "service_type",
            "service_type_display", "description", "cost",
            "odometer_reading", "garage_name", "notes", "created_at",
        ]

    def get_service_type_display(self, obj):
        return obj.get_service_type_display()
