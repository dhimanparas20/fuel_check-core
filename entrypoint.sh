#!/bin/sh
set -e

export PATH="/opt/venv/bin:$PATH"

echo ">>> Running database migrations..."
python manage.py migrate --noinput

echo ">>> Creating default superuser if not exists..."
python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@example.com', 'Mst@2069')
    print('Superuser created: admin / Mst@2069')
else:
    print('Superuser already exists')
"

echo ">>> Starting Gunicorn..."
exec gunicorn project.wsgi:application --bind 0.0.0.0:8000 --workers 1 --timeout 120 --reload --access-logfile - --error-logfile -
