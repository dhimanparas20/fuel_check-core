import base64
import os
from django.contrib import admin
from django.db import connections
from django.http import HttpResponse
from django.urls import path, include
from django.views.generic import TemplateView, RedirectView
import django, sys, platform

def health_check(request):
    return HttpResponse("OK", content_type="text/plain")

STATUS_USER = os.getenv("STATUS_USER", "admin")
STATUS_PASS = os.getenv("STATUS_PASS", "status123")

def status_basic_auth(view_func):
    def wrapper(request, *args, **kwargs):
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Basic "):
            try:
                decoded = base64.b64decode(auth[6:]).decode()
                username, password = decoded.split(":", 1)
                if username == STATUS_USER and password == STATUS_PASS:
                    return view_func(request, *args, **kwargs)
            except Exception:
                pass
        resp = HttpResponse("Unauthorized", status=401, content_type="text/plain")
        resp["WWW-Authenticate"] = 'Basic realm="Status Page"'
        return resp
    return wrapper

@status_basic_auth
def status_view(request):
    db = connections["default"]
    vendor = db.vendor
    db_settings = db.settings_dict
    is_sqlite = vendor == "sqlite"

    try:
        db.cursor()
        connected = True
    except Exception:
        connected = False

    context = {
        "engine": db_settings["ENGINE"],
        "vendor": vendor,
        "connected": connected,
        "is_local": is_sqlite,
        "name": db_settings.get("NAME", "—"),
        "host": db_settings.get("HOST", "—"),
        "port": db_settings.get("PORT", "—"),
        "user": db_settings.get("USER", "—"),
        "django_version": django.get_version(),
        "python_version": sys.version.split()[0],
        "platform": platform.platform(),
    }
    return TemplateView.as_view(template_name="status.html", extra_context=context)(request)

urlpatterns = [
    path("health/", health_check, name="health"),
    path("status/", status_view, name="status"),
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
