# Use Python 3.11 slim image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy proto files and generate gRPC code
COPY ../../proto/ ./proto/
RUN python -m grpc_tools.protoc -Iproto --python_out=. --grpc_python_out=. proto/scraper-service/news_scraper.proto

# Copy application code
COPY app/ ./app/
COPY server.py .
COPY test_client.py .

# Create non-root user
RUN useradd --create-home --shell /bin/bash app && chown -R app:app /app
USER app

# Expose gRPC port
EXPOSE 50051

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import grpc; grpc.insecure_channel('localhost:50051')" || exit 1

# Run the gRPC server
CMD ["python", "server.py"]