import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "project.settings")

application = get_wsgi_application()
app = application

# try:
#     from django.core.management import call_command
#     call_command("migrate", "--noinput")
# except Exception:
#     pass