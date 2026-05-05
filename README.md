# Fuel Check Core

Track every drop. Know every kilometer.

**Fuel Check Core** is a web application that helps you manage your vehicles and track fuel expenses. Log every fuel fill, calculate mileage automatically, and understand exactly where your fuel money goes.

---

## What You Can Do

- **Manage Vehicles** — Add your cars, bikes, or any vehicle. Track registration, model, color, fuel type.
- **Log Fuel Fills** — Record every fuel transaction: amount paid, liters filled, kilometers driven.
- **Auto Mileage** — The app calculates km/L automatically whenever you fill a full tank.
- **Track Spending** — See total money spent on fuel per vehicle at a glance.
- **Review Stats** — Current mileage, average mileage, total kilometers — all calculated in real-time.

---

## Quick Start (Docker — Easiest)

No Python setup needed. Just Docker.

```bash
git clone <repo-url>
cd fuel_check-core
cp .env.sample .env
docker compose up --build
```

Then open **http://localhost:8000/login** in your browser.

- **Default superuser**: `admin` / `admin@123` (auto-created on first run)
- **Database**: SQLite (stored locally in `data/db.sqlite3` — persists across restarts)

### Switching to PostgreSQL

Edit `.env`:
```env
USE_REMOTE_DB=True
DB_NAME=your-db-name
DB_USER=your-user
DB_PASSWORD=your-password
DB_HOST=your-host.com
DB_PORT=5432
```
Then: `docker compose up --build`

---

## Quick Start (Local — Without Docker)

### Prerequisites
- **Python 3.13+**
- **uv** — [install guide](https://docs.astral.sh/uv/getting-started/installation/)

### Steps

```bash
# 1. Clone and navigate
git clone <repo-url>
cd fuel_check-core

# 2. Setup environment
cp .env.sample .env

# 3. Install dependencies
uv sync

# 4. Run migrations
uv run manage.py migrate

# 5. Create a superuser (optional)
uv run manage.py createsuperuser

# 6. Collect static files
uv run manage.py collectstatic

# 7. Start the server
uv run manage.py runserver 0.0.0.0:8000
```

Open **http://localhost:8000/dashboard**

---

## Using the App

### 1. Create an Account
Go to `/login`, switch to **Create Account**, fill in your details, and sign up.

### 2. Add a Vehicle
From the Dashboard, click **Add Vehicle**. Fill in:
- **Registration No.** — unique vehicle plate number
- **Vehicle Name** — what you call it (e.g., "My Swift")
- **Fuel Type** — petrol, diesel, or CNG
- **Tank Capacity** — in liters

### 3. Add Fuel Transactions
Click on a vehicle card to open its transactions page. Click **Add Transaction** and enter:
- **Amount (₹)** — how much you paid
- **Fuel Qty (L)** — how many liters
- **KMs Driven** — distance since last fill
- **Full Tank** — toggle Yes/No (mileage is auto-calculated when Yes)

### 4. Review Stats
Each vehicle card shows mileage, total kilometers, and money spent. Click **Details** for a full breakdown.

---

## Project Pages

| Page | URL | What It Does |
|---|---|---|
| Login/Register | `/login/` | Sign in or create account |
| Dashboard | `/dashboard/` | View, add, edit, delete vehicles |
| Transactions | `/txn/<id>/` | View, add, edit, delete fuel transactions |
| System Status | `/status/` | Database connection info (password-protected) |
| Health Check | `/health/` | Returns "OK" (used by Docker) |
| Admin Panel | `/admin/` | Django admin for direct data management |

---

## Environment Variables

Copy `.env.sample` to `.env` and adjust as needed.

| Variable | Default | What It Does |
|---|---|---|
| `SECRET_KEY` | `django-insecure-...` | **Change this in production** |
| `DEBUG` | `False` | `True` for development |
| `ALLOWED_HOSTS` | `*` | Hosts allowed to access the app |
| `USE_REMOTE_DB` | `False` | `True` = connect to PostgreSQL, `False` = local SQLite |
| `DB_NAME` | `postgres` | Database name (only when `USE_REMOTE_DB=True`) |
| `DB_USER` | `postgres` | Database user |
| `DB_PASSWORD` | `postgres` | Database password |
| `DB_HOST` | `localhost` | Database host address |
| `DB_PORT` | `5432` | Database port |
| `USE_AWS_S3` | `False` | `True` = host static files on AWS S3 |
| `AWS_ACCESS_KEY_ID` | — | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | — | AWS secret key |
| `AWS_STORAGE_BUCKET_NAME` | — | S3 bucket name |
| `AWS_S3_REGION_NAME` | `us-east-1` | AWS region |
| `STATUS_USER` | `admin` | Username for `/status/` page |
| `STATUS_PASS` | `status123` | Password for `/status/` page |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Django 6.0, Django REST Framework |
| Auth | JWT (SimpleJWT) — access token 4 weeks |
| Database | SQLite (local) or PostgreSQL (remote) |
| Static Files | Local filesystem or AWS S3 |
| Frontend | Bootstrap 5.3, jQuery 3.7, custom CSS/JS |
| Container | Docker + Gunicorn + docker-compose |
| Package Manager | uv |

---

## Docker Commands

```bash
docker compose up --build      # Start (with live reload)
docker compose up -d --build   # Start in background
docker compose down            # Stop
docker compose down -v         # Stop + remove volumes

# Shell access inside running container
docker exec -it fuel_check /bin/sh

# Commands inside container (venv auto-detected):
python manage.py migrate
python manage.py collectstatic
python manage.py createsuperuser
```

---

## API Endpoints

### Auth (no login required)
```
POST /user/login/         { "username": "email", "password": "..." }
POST /user/register/      { "first_name", "last_name", "email", "password" }
```

### Vehicles
```
GET    /api/vehicles/          List your vehicles
POST   /api/vehicles/          Create a vehicle
GET    /api/vehicles/{id}/     Get vehicle details
PATCH  /api/vehicles/{id}/     Update vehicle
DELETE /api/vehicles/{id}/     Delete vehicle
```

### Transactions
```
GET    /api/txns/?vehicle={id}              List transactions
POST   /api/txns/                            Create transaction
GET    /api/txns/{id}/                       Get transaction details
PATCH  /api/txns/{id}/                       Update transaction
DELETE /api/txns/{id}/                       Delete transaction
```
Query params for listing: `&search=... &ordering=-created_at &tank_fully_filled=true`

---

## Directory Structure

```
fuel_check-core/
├── project/           # Django project config (settings, urls, wsgi)
├── fuel_check/        # Vehicles & transactions app (models, views, API)
├── user/              # Authentication app (login, register, JWT)
├── static/            # CSS & JavaScript files
│   ├── css/
│   └── js/
├── templates/         # HTML pages
├── Dockerfile         # Container build
├── docker-compose.yml # Container orchestration
├── entrypoint.sh      # Container startup script
├── pyproject.toml     # Python dependencies
├── .env.sample        # Environment template
└── manage.py          # Django entry point
```

---

## Need Help?

- **Status page**: Visit `/status/` to see if your database is connected
- **Health check**: `/health/` returns "OK" when the server is running
- **Logs**: `docker compose logs -f` to watch live logs
