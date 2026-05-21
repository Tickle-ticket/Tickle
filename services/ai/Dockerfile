FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc g++ libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements_linux.txt .
RUN pip install --no-cache-dir -r requirements_linux.txt

COPY serving ./serving
COPY models ./models

CMD ["python", "-m", "serving.main"]