FROM python:3.13-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_PROJECT_ENVIRONMENT=/opt/venv \
    PATH="/opt/venv/bin:$PATH" \
    TZ=Asia/Kolkata

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl libpq-dev tzdata \
    && ln -snf /usr/share/zoneinfo/$TZ /etc/localtime \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir uv

COPY pyproject.toml uv.lock ./

RUN uv sync --frozen

COPY . .

RUN chmod +x entrypoint.sh

# Django management aliases (works in any shell, docker exec, etc.)
RUN printf '#!/bin/sh\nexec python /app/manage.py migrate "$@"\n' > /usr/local/bin/migrate && \
    printf '#!/bin/sh\nexec python /app/manage.py makemigrations "$@"\n' > /usr/local/bin/makemigrations && \
    printf '#!/bin/sh\nexec python /app/manage.py collectstatic --noinput "$@"\n' > /usr/local/bin/collectstatic && \
    printf '#!/bin/sh\nexec python /app/manage.py shell "$@"\n' > /usr/local/bin/shell && \
    printf '#!/bin/sh\nexec python /app/manage.py createsuperuser "$@"\n' > /usr/local/bin/createsuperuser && \
    printf '#!/bin/sh\nexec python /app/manage.py runserver 0.0.0.0:8000 "$@"\n' > /usr/local/bin/runserver && \
    printf '#!/bin/sh\nexec python /app/manage.py "$@"\n' > /usr/local/bin/manage && \
    chmod +x /usr/local/bin/migrate /usr/local/bin/makemigrations /usr/local/bin/collectstatic /usr/local/bin/shell /usr/local/bin/createsuperuser /usr/local/bin/runserver /usr/local/bin/manage

EXPOSE 8000

ENTRYPOINT ["./entrypoint.sh"]
