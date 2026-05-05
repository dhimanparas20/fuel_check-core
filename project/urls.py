import base64
import os
from django.contrib import admin
from django.contrib.auth import get_user_model
from django.db import connections
from django.db.migrations.recorder import MigrationRecorder
from django.http import HttpResponse, JsonResponse
from django.core.management import call_command
from django.urls import path, include
from django.views.generic import TemplateView, RedirectView
from django.views.decorators.csrf import csrf_exempt
from pathlib import Path
import django, sys, platform, json

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

    User = get_user_model()
    total_users = User.objects.count()

    from fuel_check.models import Vehicle, Txn, ServiceRecord
    total_vehicles = Vehicle.objects.count()
    total_txns = Txn.objects.count()
    total_services = ServiceRecord.objects.count()

    total_spent = Txn.objects.aggregate(s=django.db.models.Sum("amount"))["s"] or 0

    try:
        recorder = MigrationRecorder(db)
        applied = set(recorder.applied_migrations())
        from django.db.migrations.loader import MigrationLoader
        loader = MigrationLoader(db, ignore_no_migrations=True)
        pending_count = len([m for m in loader.disk_migrations.keys() if m not in applied])
    except Exception:
        pending_count = "?"

    db_size = "?"
    if is_sqlite:
        db_path = db_settings.get("NAME", "")
        if db_path and Path(db_path).exists():
            size = Path(db_path).stat().st_size
            db_size = f"{size / 1024:.1f} KB" if size < 1024 * 1024 else f"{size / (1024*1024):.2f} MB"

    static_root = os.environ.get("STATIC_ROOT", "")
    static_ok = static_root and Path(static_root).exists()

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
        "total_users": total_users,
        "total_vehicles": total_vehicles,
        "total_txns": total_txns,
        "total_services": total_services,
        "total_spent": total_spent,
        "pending_migrations": pending_count,
        "db_size": db_size,
        "static_ok": static_ok,
        "static_root": static_root or "—",
    }
    return TemplateView.as_view(template_name="status.html", extra_context=context)(request)


@csrf_exempt
@status_basic_auth
def run_migrate(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=405)
    try:
        call_command("migrate", "--noinput")
        return JsonResponse({"ok": True, "message": "Migrations applied successfully."})
    except Exception as e:
        return JsonResponse({"ok": False, "message": str(e)}, status=500)


@csrf_exempt
@status_basic_auth
def run_collectstatic(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST required"}, status=405)
    try:
        call_command("collectstatic", "--noinput")
        return JsonResponse({"ok": True, "message": "Static files collected."})
    except Exception as e:
        return JsonResponse({"ok": False, "message": str(e)}, status=500)

urlpatterns = [
    path("health/", health_check, name="health"),
    path("ping/", health_check, name="ping"),
    path("status/", status_view, name="status"),
    path("status/migrate/", run_migrate, name="run-migrate"),
    path("status/collectstatic/", run_collectstatic, name="run-collectstatic"),
    path("favicon.ico", lambda r: HttpResponse(status=204)),
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
    path(
        "analytics/<int:vehicle_id>/",
        TemplateView.as_view(template_name="analytics.html"),
        name="analytics",
    ),
    path("", RedirectView.as_view(url="/dashboard/", permanent=False), name="index"),
]
