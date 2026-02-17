# AI Agent Documentation

This document provides guidance for AI agents working with the Fuel Check Core codebase.

## Project Overview

Fuel Check Core is a Django REST API for tracking vehicle fuel consumption and mileage. Built with Django 6.x, DRF,
Supabase PostgreSQL, and optional AWS S3 for static files.

## Key Files

| File                        | Purpose                               |
|-----------------------------|---------------------------------------|
| `project/settings.py`       | Django settings, DB config, S3 config |
| `fuel_check/models.py`      | Vehicle and Txn (transaction) models  |
| `fuel_check/serializers.py` | DRF serializers                       |
| `fuel_check/views.py`       | API views                             |
| `fuel_check/urls.py`        | URL routing                           |
| `user/models.py`            | Custom user model                     |
| `user/views.py`             | Auth views                            |
| `.env`                      | Environment variables                 |

## Environment Variables

### Required

```env
SECRET_KEY=your-secret-key
DEBUG=True/False
ALLOWED_HOSTS=localhost,127.0.0.1,*.vercel.app
DB_NAME=postgres
DB_USER=postgres.your-project-ref
DB_PASSWORD=your-password
DB_HOST=aws-1-ap-south-1.pooler.supabase.com
DB_PORT=6543
```

### AWS S3 (Optional)

```env
USE_AWS_S3=True/False
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_STORAGE_BUCKET_NAME=your-bucket
AWS_S3_REGION_NAME=us-east-1
```

## Key Settings

### Database (Supabase PostgreSQL)

In `project/settings.py`:

```python
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.getenv("DB_NAME"),
        "USER": os.getenv("DB_USER"),
        "PASSWORD": os.getenv("DB_PASSWORD"),
        "HOST": os.getenv("DB_HOST"),
        "PORT": os.getenv("DB_PORT"),
    }
}
```

### AWS S3 Storage

When `USE_AWS_S3=True`:

- `STATIC_URL`: `https://bucket.s3.region.amazonaws.com/static/`
- `MEDIA_URL`: `https://bucket.s3.region.amazonaws.com/media/`
- Uses `storages.backends.s3boto3.S3Boto3Storage`
- Static files uploaded to `static/` prefix in bucket

When `USE_AWS_S3=False`:

- `STATIC_URL`: `/static/`
- `MEDIA_URL`: `/media/`
- Files stored locally in `staticfiles/` and `media/` directories

### JWT Authentication

```python
SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(weeks=4),
    "REFRESH_TOKEN_LIFETIME": timedelta(weeks=8),
}
```

## Models

### Vehicle

- `regno`: Unique vehicle registration number
- `owner`: ForeignKey to User
- `name`: Vehicle name
- `model`: Vehicle model
- `company`: Vehicle manufacturer
- `fuel_type`: petrol/diesel/cng
- `current_mileage`: Latest recorded mileage
- `total_kms_driven`: Sum of all kms driven
- `average_mileage`: Calculated fuel efficiency
- `money_used`: Total fuel cost

### Txn (Transaction)

- `vehicle`: ForeignKey to Vehicle
- `owner`: ForeignKey to User
- `amount`: Fuel cost
- `fuel_qty`: Fuel quantity in liters
- `kms_driven`: Kilometers driven since last fill
- `current_mileage`: Calculated mileage (kms/liter)
- `tank_fully_filled`: Boolean flag
- `location`: Fuel station location
- `txn_date`: Date of transaction

## Key Methods

### Vehicle.recalculate_stats()

Recalculates vehicle statistics:

- `total_kms_driven` - sum of all transaction kms_driven
- `money_used` - sum of all transaction amounts
- `current_mileage` - from latest transaction
- `average_mileage` - kms_driven/fuel_qty (prefers full-tank fills)

Called automatically when Txn is saved or deleted.

### Txn.save()

- Auto-calculates `current_mileage` when tank_fully_filled=True
- Calls `vehicle.recalculate_stats()` after save

## Commands

```bash
# Install dependencies
uv sync

# Run migrations
uv run manage.py migrate

# Create migrations
uv run manage.py makemigrations

# Collect static files (local)
uv run manage.py collectstatic

# Collect static files (S3 - clears bucket first)
uv run manage.py collectstatic --clear  --noinput

# Run server
uv run manage.py runserver

# Create superuser
uv run manage.py createsuperuser
```

## URL Patterns

- `/admin/` - Django admin
- `/api/` - API endpoints
- `/api/token/` - JWT token obtain
- `/api/token/refresh/` - JWT token refresh
- `/api/vehicles/` - Vehicle CRUD
- `/api/transactions/` - Transaction CRUD

## Common Patterns

### Checking if S3 is enabled

```python
USE_AWS_S3 = os.getenv("USE_AWS_S3", "False").lower() == "true"
```

### Using S3 in templates or code

Static files are automatically served from S3 when `USE_AWS_S3=True` due to the STORAGES configuration.

### STATICFILES_DIRS

Must be set in BOTH S3 and local storage branches:

```python
STATICFILES_DIRS = [BASE_DIR / "static"]
```

Without this, only app static files (admin, rest_framework) are collected.

## Known Issues

1. **Static files not uploading to S3**: Check `STATICFILES_DIRS` is set in S3 branch
2. **Admin static files only**: Missing `STATICFILES_DIRS` configuration
3. **Database connection**: Ensure Supabase pooler port is 6543 (not 5432)
