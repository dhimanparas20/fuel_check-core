from django.contrib.auth import get_user_model
from django.shortcuts import render
from rest_framework import generics

from .serializers import UserRegisterSerializer


class UserRegisterView(generics.CreateAPIView):
    queryset = get_user_model().objects.all()
    serializer_class = UserRegisterSerializer


# Create your views here.
