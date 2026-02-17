from django.contrib.auth import get_user_model
from django.contrib.auth.models import User
from rest_framework import serializers


class UserRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ["id", "first_name", "last_name", "email", "password"]

    def create(self, validated_data):
        if User.objects.filter(email=validated_data.get("email")).exists():
            raise serializers.ValidationError({"email": "User with this email already exists"})
        user = User.objects.create_user(
            username=validated_data.get("email"),
            email=validated_data.get("email"),
            first_name=validated_data.get("first_name", ""),
            last_name=validated_data.get("last_name", ""),
            password=validated_data.get("password"),
        )
        return user
