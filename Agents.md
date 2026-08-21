# AI Agent Documentation

This document is the **single source of truth** for any AI agent working on this codebase. Read it fully before making changes.

---

## Project Identity

**Fuel Check Core** — Django 6.x REST API for tracking vehicle fuel consumption, mileage, and expenses. Server-rendered HTML templates (not SPA) with Bootstrap 5, jQuery, and custom JS/CSS. JWT auth, SQLite or PostgreSQL, optional AWS S3.

---

## Directory Tree

```
fuel_check-core/
├── project/                    # Django project config
│   ├── settings.py             # ALL config: DB, static, JWT, CORS, timezone
│   ├── urls.py                 # Root URL routing + /health/ + /system/ + /analytics/
│   └── wsgi.py                 # WSGI entry (used by gunicorn)
├── fuel_check/                 # Main app — vehicles, transactions & services
│   ├── models.py               # Vehicle + Txn + ServiceRecord models + recalculate_stats()
│   ├── serializers.py          # DRF serializers
│   ├── views.py                # API views (ViewSets)
│   ├── urls.py                 # /api/vehicles/, /api/txns/, /api/services/
│   ├── admin.py                # Django admin registration
│   └── migrations/             # 8 migrations
├── user/                       # Auth app
│   ├── views.py                # Login, Register views (returns JWT)
│   ├── serializers.py
│   ├── urls.py                 # /user/login/, /user/register/
│   └── models.py               # Empty (uses Django default User)
├── static/
│   ├── css/
│   │   ├── common.css          # Shared design tokens, animations, toast, loader, scrollbar
│   │   ├── dash.css            # Dashboard page styles
│   │   ├── txn.css             # Transactions page styles
│   │   └── login.css           # Login/Register page styles
│   └── js/
│       ├── toast.js            # Toast notifications + Confirm modal + Loader overlay (Loader.show/hide)
│       ├── dash.js             # Dashboard logic (jQuery, vehicle CRUD, AJAX, car lookup)
│       ├── txn.js              # Transactions logic (jQuery, txn CRUD, search/sort, details modal)
│       ├── analytics.js        # Analytics charts (Chart.js), service records, stats
│       └── login.js            # Login/Register logic (vanilla JS fetch)
├── templates/
│   ├── dash.html               # Dashboard page
│   ├── txn.html                # Transactions page
│   ├── analytics.html          # Analytics charts, service history, stats
│   ├── login.html              # Login/Register page
│   └── status.html             # DB connection status page
├── manage.py                   # Django manage.py entry
├── pyproject.toml              # Dependencies + requires-python>=3.13
├── uv.lock                     # Locked dependency versions
├── requirements.txt            # Pip-compatible dependency list
├── Dockerfile                  # python:3.13-slim, uv, /opt/venv, entrypoint
├── docker-compose.yml          # web service, bind mount .:/app, port 8000
├── .dockerignore               # Build context exclusions
├── entrypoint.sh               # migrate → createsuperuser → gunicorn
├── .env                        # Runtime env vars (NOT committed)
├── .env.sample                 # Env var template
├── .gitignore
├── vercel.json                 # Vercel serverless config
└── README.md                   # Human-friendly docs
```

---

## Environment Variables (ALL)

| Variable | Default | Purpose |
|---|---|---|
| `SECRET_KEY` | `django-insecure-...` | Django secret key |
| `DEBUG` | `False` | Debug mode (`True`/`False`) |
| `ALLOWED_HOSTS` | `*` | Comma-separated host list |
| `USE_REMOTE_DB` | `False` | **TRUE** → PostgreSQL, **FALSE/unset** → SQLite |
| `DB_NAME` | `postgres` | PostgreSQL database name (only when `USE_REMOTE_DB=True`) |
| `DB_USER` | `postgres` | PostgreSQL user |
| `DB_PASSWORD` | `postgres` | PostgreSQL password |
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `USE_AWS_S3` | `False` | Enable S3 static/media storage. When `False`, `STATIC_URL=/static/` (Vercel serves `static/` via CDN; Docker/local use WhiteNoise after collectstatic) |
| `AWS_ACCESS_KEY_ID` | — | AWS access key (if S3 enabled) |
| `AWS_SECRET_ACCESS_KEY` | — | AWS secret key (if S3 enabled) |
| `AWS_STORAGE_BUCKET_NAME` | — | S3 bucket name |
| `AWS_S3_REGION_NAME` | — | S3 region (default: us-east-1) |
| `STATUS_USER` | `admin` | HTTP Basic Auth username for `/system/` |
| `STATUS_PASS` | `status123` | HTTP Basic Auth password for `/system/` |
| `SUPERUSER_EMAIL` | `admin@example.com` | Email for auto-created superuser |
| `SUPERUSER_PASSWORD` | `Mst@2069` | Password for auto-created superuser |

---

## Database Switching Logic

```python
# settings.py line ~89
USE_REMOTE_DB = os.getenv("USE_REMOTE_DB", "False").lower() == "true"

if USE_REMOTE_DB:
    DATABASES = {...}  # PostgreSQL via env vars
else:
    DATABASES = {...}  # SQLite at BASE_DIR/data/db.sqlite3
```

- **Local (Docker)**: `USE_REMOTE_DB=False` → SQLite in `data/db.sqlite3`, persisted via bind mount
- **Cloud/Production**: `USE_REMOTE_DB=True` + fill in DB_* env vars → PostgreSQL

---

## Static Files Storage

Both branches set `STATICFILES_DIRS = [BASE_DIR / "static"]` and `STORAGES` explicitly:

- **S3 branch** (`USE_AWS_S3=True`): `storages.backends.s3boto3.S3Boto3Storage`
- **Local branch** (`USE_AWS_S3=False`): `FileSystemStorage` / `StaticFilesStorage`
- Both branches must have `STORAGES` set explicitly. **Failure to set STORAGES in the else branch causes collectstatic to hit S3 with 403 errors.**

---

## Docker Setup

### Files Involved
- **Dockerfile**: `python:3.13-slim`, apt installs `curl libpq-dev tzdata`, pip installs `uv`, copies `pyproject.toml uv.lock`, runs `uv sync --frozen`, copies source, `ENTRYPOINT ["./entrypoint.sh"]`
- **entrypoint.sh**: Sets `PATH="/opt/venv/bin:$PATH"` → `python manage.py migrate` → creates superuser `admin/admin@123` if missing → collects static (only when `DEBUG=True`) → `gunicorn project.wsgi:application --bind 0.0.0.0:8000 --workers 1 --timeout 120 --reload`
- **docker-compose.yml**: Bind mount `.:/app`, port 8000, healthcheck at `/health/`, env from `.env`
- **VENV location**: `/opt/venv` (NOT `/app/.venv`) — set by `UV_PROJECT_ENVIRONMENT=/opt/venv`
- **PATH**: `/opt/venv/bin` prepended globally via Dockerfile ENV
- **Timezone**: `TZ=Asia/Kolkata`, tzdata installed, `/etc/localtime` symlinked

### Docker Commands
```bash
docker compose up --build     # Build + start with live reload
docker compose up -d --build  # Detached mode
docker compose down           # Stop containers
docker compose down -v        # Stop + remove volumes
```

### Inside Container
```bash
# Exec into container
docker exec -it fuel_check /bin/sh

# Commands inside (venv already in PATH, plus aliases):
python manage.py migrate          # or: migrate
python manage.py collectstatic    # or: collectstatic
python manage.py createsuperuser  # or: createsuperuser
python manage.py makemigrations   # or: makemigrations
python manage.py shell            # or: shell
python manage.py runserver 0.0.0.0:8000  # or: runserver
python manage.py <cmd>            # or: manage <cmd>
```

---

## Frontend Architecture

### Auth Flow
1. User registers/logs in at `/login/` → JWT returned
2. `access` and `refresh` tokens stored in `localStorage`
3. All API calls include `Authorization: Bearer <access>` header
4. 401 responses clear localStorage and redirect to `/login/`
5. Token lifetime: access 4 weeks, refresh 8 weeks

### Page Navigation
```
/login/        → Login/Register page
/dashboard/    → Vehicle list (cards with actions)
/txn/<id>/     → Transactions for a vehicle
/analytics/<id>/ → Charts, stats, service records
/admin/        → Django admin
/health/       → Plain "OK" (Docker healthcheck)
/system/       → DB connection stats, migrations, collectstatic (HTTP Basic Auth)
```

### JS Dependencies
- **jQuery 3.7.1** (CDN) — used in `dash.js` and `txn.js` for AJAX
- **Bootstrap 5.3.2** (CDN) — modals, grid, utilities
- **Toast system** (`toast.js`) — loaded on all pages, provides:
  - `Toast.success(title, msg)` — green toast
  - `Toast.error(title, msg)` — red toast (stays 5s)
  - `Toast.warning(title, msg)` — yellow toast
  - `Toast.info(title, msg)` — blue toast
  - `Toast.confirm(title, msg, icon)` — returns `Promise<boolean>`, replaces browser `confirm()`
- **Loader system** (`toast.js`) — centralized loading overlay, provides:
  - `Loader.show()` — shows a centered spinner with live elapsed timer on a blurred dark backdrop
  - `Loader.hide()` — hides the overlay (minimum 400ms display to prevent flicker)

### When editing JS files
- **DO NOT** alter the core AJAX logic (URLs, methods, headers)
- **DO NOT** change `localStorage` key names (`access`, `refresh`)
- **DO** use `Toast.success/error/warning` instead of `alert()`
- **DO** use `Toast.confirm()` instead of `confirm()`
- **DO** add `Toast.error(xhr.responseJSON?.detail || '...')` in error handlers
- **DO** wrap data-fetching AJAX calls with `Loader.show()` / `Loader.hide()` (success + error)

### CSS Architecture
- `common.css` loaded FIRST on all pages — defines `:root` CSS variables, keyframes, toast styles, skeleton, scrollbar
- Page-specific CSS (dash.css, txn.css, login.css) overrides as needed
- Design tokens: `--bg-deep`, `--bg-card`, `--border`, `--text`, `--accent`, `--success`, `--danger`

---

## Models

### Vehicle (`fuel_check/models.py`)
| Field | Type | Notes |
|---|---|---|
| `regno` | CharField | Unique registration number |
| `owner` | FK → User | |
| `name` | CharField | Vehicle display name |
| `model` | CharField | Model name (optional) |
| `color` | CharField | Color name/hex (optional) |
| `company` | CharField | Manufacturer (optional) |
| `fuel_type` | CharField | `petrol` / `diesel` / `cng` |
| `current_mileage` | FloatField | Latest txn mileage |
| `total_kms_driven` | FloatField | Sum of all txn kms |
| `average_mileage` | FloatField | Auto-calculated |
| `fuel_tank_capacity` | FloatField | In liters |
| `money_used` | FloatField | Sum of all txn amounts |
| `last_service_date` | DateField | (optional) |

**Key method**: `recalculate_stats()` — aggregates all Txns, updates `total_kms_driven`, `money_used`, `current_mileage`, `average_mileage`. Called automatically on Txn save/delete.

### Txn / Transaction (`fuel_check/models.py`)
| Field | Type | Notes |
|---|---|---|
| `vehicle` | FK → Vehicle | |
| `owner` | FK → User | |
| `amount` | DecimalField | Fuel cost |
| `fuel_qty` | DecimalField | Liters filled |
| `kms_driven` | FloatField | KMs since last fill |
| `current_mileage` | FloatField | Auto-calculated when `tank_fully_filled=True` |
| `tank_fully_filled` | BooleanField | |
| `location` | CharField | Fuel station (optional) |
| `txn_date` | DateField | (optional, defaults to today) |

**Key method**: `save()` — calculates `current_mileage = kms_driven / fuel_qty` when `tank_fully_filled=True`, then calls `vehicle.recalculate_stats()`.

---

## API Endpoints (all require JWT except auth)

### Auth (public)
```
POST /user/login/         Body: {username, password}  →  {access, refresh}
POST /user/register/      Body: {first_name, last_name, email, password}
```

### Vehicles (JWT required)
```
GET    /api/vehicles/         List user's vehicles
POST   /api/vehicles/         Create vehicle
GET    /api/vehicles/{id}/    Retrieve
PATCH  /api/vehicles/{id}/    Partial update
DELETE /api/vehicles/{id}/    Delete
```

### Transactions (JWT required)
```
GET    /api/txns/?vehicle={id}&search=...&ordering=...&tank_fully_filled=...
POST   /api/txns/             Create (body includes vehicle FK)
GET    /api/txns/{id}/        Retrieve
PATCH  /api/txns/{id}/        Partial update
DELETE /api/txns/{id}/        Delete
```

### System
```
GET    /health/               → 200 "OK" (no auth, Docker healthcheck)
GET    /system/               → HTML page, HTTP Basic Auth (STATUS_USER/STATUS_PASS)
```

---

## Django Settings Quick Reference

| Setting | Value |
|---|---|
| `LANGUAGE_CODE` | `en-us` |
| `TIME_ZONE` | `Asia/Kolkata` |
| `USE_TZ` | `True` |
| `TIME_FORMAT` (DRF) | `%d-%m-%Y %H:%M:%S` |
| `JWT_ACCESS_LIFETIME` | 4 weeks |
| `JWT_REFRESH_LIFETIME` | 8 weeks |
| `INSTALLED_APPS` | rest_framework_simplejwt, corsheaders, django_filters, fuel_check, user, rest_framework, +django contrib |
| `MIDDLEWARE` | Security, WhiteNoise, Session, Common, Csrf, Auth, Messages, XFrameOptions |

---

## Common Pitfalls

1. **`collectstatic` hits S3 when `USE_AWS_S3=False`**: The `else` branch MUST set `STORAGES` explicitly with local backends.
2. **Database not switching**: Database is controlled SOLELY by `USE_REMOTE_DB` env var, not by presence of DB_* vars.
3. **`python` not found in container**: Venv is at `/opt/venv/bin`, which is in PATH via Dockerfile ENV. Rebuild if PATH is missing.
4. **Gunicorn worker timeout**: Workers=1, timeout=120s in dev. Gunicorn uses `--reload` for live code updates.
5. **Static files 404 on Vercel**: Django/WhiteNoise cannot serve source `static/` on serverless. `vercel.json` must build `static/**` with `@vercel/static` and route `/static/(.*)` **before** the WSGI catch-all. With `USE_AWS_S3=True`, assets come from S3 instead. On Docker: run `collectstatic` (entrypoint does this when `DEBUG=True`).
6. **401 on API calls**: JWT stored in `localStorage` with key `access`. Check browser console.
7. **CORS**: `corsheaders` is installed in apps but `CorsMiddleware` is NOT in middleware. CORS config may need `CORS_ALLOW_ALL_ORIGINS=True` for dev.

---

## When Adding Features

1. **New Python dependencies**: Add to both `pyproject.toml` AND `requirements.txt`, then run `uv lock` locally.
2. **New static files**: Place in `static/css/` or `static/js/`, reference in templates with `{% static '...' %}`.
3. **New templates**: Place in `templates/`, add URL in `project/urls.py`.
4. **New API endpoints**: Add to `fuel_check/urls.py` or `user/urls.py`, import view in `views.py`.
5. **New env vars**: Add to `.env.sample` with comments, document in this file.
6. **Altering JS**: Keep jQuery AJAX patterns consistent. Use `Toast` for notifications. Use `Toast.confirm()` for destructive actions.
