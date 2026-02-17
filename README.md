# Fuel Check Core

A Django REST API application for tracking vehicle fuel consumption, mileage, and maintenance records. Built with Django
6.x, Django REST Framework, and Supabase PostgreSQL.

## Overview

Fuel Check Core helps users manage their vehicles and track fuel expenses. Users can:

- Add and manage multiple vehicles
- Record fuel filling transactions
- Track mileage, fuel consumption, and average mileage
- Monitor total money spent on fuel
- View service history and vehicle details

## Tech Stack

- **Backend**: Django 6.x, Django REST Framework
- **Database**: Supabase PostgreSQL
- **Static Files**: AWS S3 (optional) or local storage
- **Authentication**: JWT (djangorestframework-simplejwt)
- **Package Manager**: uv

## Features

- User authentication with JWT tokens
- Vehicle management (add, edit, delete vehicles)
- Fuel transaction logging (amount, quantity, kilometers driven)
- Automatic mileage calculation
- Average fuel efficiency computation
- Admin interface for data management
- RESTful API with filtering and searching
- CORS support for frontend integration
- Static file hosting via AWS S3

## Project Structure

```
fuel_check-core/
├── fuel_check/          # Main app - vehicle & transaction models
├── user/                # User authentication app
├── project/             # Django project settings
├── static/              # Static files (CSS, JS, images)
├── manage.py            # Django management script
├── pyproject.toml       # Project dependencies (uv)
├── .env                 # Environment variables (local)
├── .env.sample          # Environment template
├── README.md            # Project documentation
└── Agents.md            # AI agent documentation
```

## Prerequisites

- Python 3.13+
- uv (package manager)
- Supabase account (database)
- AWS account (optional, for S3 static hosting)

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd fuel_check-core
uv sync
```

### 2. Configure Environment Variables

Copy `.env.sample` to `.env` and fill in your values:

```bash
cp .env.sample .env
```

Edit `.env` with your configuration:

```env
# Django Settings
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1,*,.vercel.app

# Database - Supabase PostgreSQL
DB_NAME=postgres
DB_USER=postgres.your-project-ref
DB_PASSWORD=your-database-password
DB_HOST=aws-1-ap-south-1.pooler.supabase.com
DB_PORT=6543

# AWS S3 (Optional)
USE_AWS_S3=False
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
AWS_STORAGE_BUCKET_NAME=your-bucket-name
AWS_S3_REGION_NAME=us-east-1
```

### 3. Database Setup (Supabase)

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **Settings > Database**
3. Find your connection details:
    - **Host**: `aws-1-ap-south-1.pooler.supabase.com` (or your region)
    - **Port**: `6543`
    - **Database**: `postgres`
    - **User**: `postgres.your-project-ref`
    - **Password**: Your database password

4. Update your `.env` file with these values

### 4. Run Migrations

```bash
uv run manage.py migrate
```

### 5. Create Superuser

```bash
uv run manage.py createsuperuser --username admin --email admin@example.com
```

### 6. Collect Static Files

```bash
# Local storage
uv run manage.py collectstatic

# Or with S3 (if USE_AWS_S3=True)
uv run manage.py collectstatic --clear  --noinput
```

### 7. Run Development Server

```bash
uv run manage.py runserver 0.0.0.0:8000
```

The API will be available at `http://localhost:8000/`

## AWS S3 Static Files Setup

### Why Use S3?

- Serves static files from CDN (faster loading)
- Reduces server load
- Production-ready static file hosting

### Configuration

1. **Create S3 Bucket**:
    - Go to AWS S3 Console
    - Create new bucket (e.g., `my-fuel-check-static`)
    - Enable public access (or configure CloudFront)

2. **Update Bucket Policy** (for public access):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::your-bucket-name/*"
    }
  ]
}
```

3. **Configure Environment Variables**:

```env
USE_AWS_S3=True
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_STORAGE_BUCKET_NAME=your-bucket-name
AWS_S3_REGION_NAME=us-east-1
```

4. **Collect Static Files to S3**:

```bash
uv run manage.py collectstatic --clear
```

Static files will be uploaded to `s3://your-bucket-name/static/`

### URL Structure

- Static files: `https://your-bucket.s3.us-east-1.amazonaws.com/static/`
- Media files: `https://your-bucket.s3.us-east-1.amazonaws.com/media/`

## API Endpoints

### Authentication

- `POST /api/token/` - Get JWT token
- `POST /api/token/refresh/` - Refresh JWT token

### Vehicles

- `GET /api/vehicles/` - List user's vehicles
- `POST /api/vehicles/` - Add new vehicle
- `GET /api/vehicles/{id}/` - Get vehicle details
- `PUT /api/vehicles/{id}/` - Update vehicle
- `DELETE /api/vehicles/{id}/` - Delete vehicle

### Transactions

- `GET /api/transactions/` - List fuel transactions
- `POST /api/transactions/` - Add fuel transaction
- `GET /api/transactions/{id}/` - Get transaction details
- `DELETE /api/transactions/{id}/` - Delete transaction

### Admin

- `/admin/` - Django admin panel

## Environment Variables Reference

| Variable                  | Description                    | Required      |
|---------------------------|--------------------------------|---------------|
| `SECRET_KEY`              | Django secret key              | Yes           |
| `DEBUG`                   | Debug mode (True/False)        | Yes           |
| `ALLOWED_HOSTS`           | Comma-separated allowed hosts  | Yes           |
| `DB_NAME`                 | PostgreSQL database name       | Yes           |
| `DB_USER`                 | Supabase database user         | Yes           |
| `DB_PASSWORD`             | Supabase database password     | Yes           |
| `DB_HOST`                 | Supabase host (pooler)         | Yes           |
| `DB_PORT`                 | Database port (6543)           | Yes           |
| `USE_AWS_S3`              | Enable S3 storage (True/False) | No            |
| `AWS_ACCESS_KEY_ID`       | AWS access key                 | If S3 enabled |
| `AWS_SECRET_ACCESS_KEY`   | AWS secret key                 | If S3 enabled |
| `AWS_STORAGE_BUCKET_NAME` | S3 bucket name                 | If S3 enabled |
| `AWS_S3_REGION_NAME`      | AWS region                     | If S3 enabled |

## Common Commands

```bash
# Install dependencies
uv sync

# Run migrations
uv run manage.py migrate

# Create migrations
uv run manage.py makemigrations

# Run server
uv run manage.py runserver

# Collect static files
uv run manage.py collectstatic
uv run manage.py collectstatic --clear  # Clear before collecting

# Create superuser
uv run manage.py createsuperuser

# Check Django configuration
uv run manage.py check

# Shell access
uv run manage.py shell
```

## Deployment

### Vercel (Serverless)

1. Install Vercel CLI: `npm i -g vercel`
2. Deploy: `vercel`
3. Set environment variables in Vercel dashboard

### Key Settings for Production

```
ALenv
DEBUG=FalseLOWED_HOSTS=your-domain.com,your-app.vercel.app
USE_AWS_S3=True
```

## License

MIT License
