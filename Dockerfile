# Use a lightweight official Python image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000 \
    HF_HOME=/app/.huggingface_cache

# Set working directory
WORKDIR /app

# Install system dependencies needed for compiling packages (e.g. rapidfuzz / pyarrow if compiled from source)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file first to utilize Docker build cache
COPY requirements.txt .

# Install python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download the SentenceTransformer model during building
# This guarantees that the model is bundled with the Docker image, avoiding runtime downloads and potential cold-start timeouts
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')"

# Copy the rest of the application files
COPY . .

# Expose port (mainly for documentation, Render overrides/binds to its own port)
EXPOSE 8000

# Start FastAPI application using uvicorn, dynamically binding to the port provided by Render
CMD ["sh", "-c", "uvicorn src.api:app --host 0.0.0.0 --port ${PORT:-8000}"]
