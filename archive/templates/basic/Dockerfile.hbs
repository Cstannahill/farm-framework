# templates/backend/basic/Dockerfile.hbs FROM python:3.11-slim WORKDIR /app #
Install system dependencies RUN apt-get update && apt-get install -y \ gcc \ &&
rm -rf /var/lib/apt/lists/* # Copy requirements and install Python dependencies
COPY requirements.txt . RUN pip install --no-cache-dir -r requirements.txt #
Copy application code COPY . . # Create non-root user RUN useradd --create-home
--shell /bin/bash farm RUN chown -R farm:farm /app USER farm EXPOSE 8000 CMD
["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]