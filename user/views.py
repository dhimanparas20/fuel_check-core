import logging

from django.contrib.auth import get_user_model
from rest_framework import generics
from rest_framework_simplejwt.views import TokenObtainPairView

from .serializers import UserRegisterSerializer

logger = logging.getLogger("user")


class UserRegisterView(generics.CreateAPIView):
    queryset = get_user_model().objects.all()
    serializer_class = UserRegisterSerializer

    def perform_create(self, serializer):
        user = serializer.save()
        logger.info("New user registered: %s (%s)", user.username, user.email)


class LoginView(TokenObtainPairView):
    def post(self, request, *args, **kwargs):
        username = request.data.get("username", "?")
        logger.info("Login attempt: %s from %s", username, request.META.get("REMOTE_ADDR", "?"))
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            logger.info("Login success: %s", username)
        else:
            logger.warning("Login failed: %s", username)
        return response
