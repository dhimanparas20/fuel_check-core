from django.contrib import admin
from django.urls import path, include
from django.views.generic import TemplateView, RedirectView

urlpatterns = [
    path("admin/", admin.site.urls),
    path("user/", include("user.urls")),
    path("api/", include("fuel_check.urls")),
    path("login/", TemplateView.as_view(template_name="login.html"), name="login"),
    path(
        "dashboard/", TemplateView.as_view(template_name="dash.html"), name="dashboard"
    ),
    path(
        "txn/<int:vehicle_id>/",
        TemplateView.as_view(template_name="txn.html"),
        name="txn",
    ),
    path("", RedirectView.as_view(url="/dashboard/", permanent=False), name="index"),
]
