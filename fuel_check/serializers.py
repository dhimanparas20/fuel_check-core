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
            "created_at",
            "updated_at",
        ]


class TxnSerializer(serializers.ModelSerializer):
    vehicle = serializers.PrimaryKeyRelatedField(queryset=Vehicle.objects.all())
    owner = UserSerializer(read_only=True)

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
            "created_at",
            "updated_at",
        ]
