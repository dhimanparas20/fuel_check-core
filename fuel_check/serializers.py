from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import Vehicle, Txn

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

    class Meta:
        model = Vehicle
        fields = [
            "id",
            "regno",
            "owner",
            "name",
            "model",
            "color",
            "company",
            "current_mileage",
            "total_kms_driven",
            "fuel_type",
            "last_service_date",
            "average_mileage",
            "fuel_tank_capacity",
            "money_used",
            "created_at",
            "updated_at",
        ]

    def validate_current_mileage(self, value):
        """Convert empty string to None for current_mileage."""
        if value == "" or value is None:
            return None
        try:
            return float(value)
        except (ValueError, TypeError):
            return None

    def validate_last_service_date(self, value):
        """Convert empty string to None for last_service_date."""
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
            "id",
            "vehicle",
            "owner",
            "amount",
            "fuel_qty",
            "kms_driven",
            "current_mileage",
            "tank_fully_filled",
            "location",
            "txn_date",
            "created_at",
            "updated_at",
        ]

    def validate_txn_date(self, value):
        """Convert empty string to None for txn_date."""
        if value == "" or value is None:
            return None
        return value
