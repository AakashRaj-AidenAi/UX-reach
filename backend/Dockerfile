FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Remove any local service account JSON — Cloud Run uses its own identity
RUN find . -name "*.json" -not -name "requirements*.json" -delete 2>/dev/null || true

EXPOSE 8080

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
