from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Vehicle, Txn

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']

class VehicleSerializer(serializers.ModelSerializer):
    owner = UserSerializer(read_only=True)

    class Meta:
        model = Vehicle
        fields = [
            'id', 'regno', 'owner', 'name', 'model', 'color', 'company',
            'current_mileage', 'total_kms_driven', 'fuel_type', 'last_service_date',
            'average_mileage', 'chasis_no', 'fuel_tank_capacity', 'created_at', 'updated_at'
        ]

class TxnSerializer(serializers.ModelSerializer):
    vehicle = VehicleSerializer(read_only=True)
    owner = UserSerializer(read_only=True)

    class Meta:
        model = Txn
        fields = [
            'id', 'vehicle', 'owner', 'amount', 'fuel_qty', 'tank_fully_filled',
            'location', 'created_at', 'updated_at'
        ]

