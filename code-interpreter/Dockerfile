FROM python:3.12-slim AS base

# Install Node.js 20 + system utilities
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl bash jq git wget ca-certificates gnupg \
    && mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" > /etc/apt/sources.list.d/nodesource.list \
    && apt-get update && apt-get install -y nodejs \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Install Python data science + web packages
RUN pip install --no-cache-dir \
    numpy pandas scipy \
    matplotlib seaborn pillow \
    requests httpx aiohttp \
    beautifulsoup4 lxml \
    pyyaml toml \
    python-dateutil pytz \
    openpyxl xlsxwriter \
    tabulate \
    fastapi uvicorn

# Create non-root user for code execution (security isolation)
RUN useradd -m -s /bin/bash -u 1001 executor

# Copy server code
WORKDIR /app
COPY server.py .

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1

EXPOSE 8080

# Run as root (server manages user switching for code execution)
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8080", "--workers", "1"]
