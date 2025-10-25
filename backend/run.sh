#!/bin/bash
# Use the PORT env var provided by Railway (or default to 8000 locally)
PORT=${PORT:-8000}

# Run uvicorn without virtualenv activation (the deployment environment will install deps)
# Do NOT use --reload in production
exec uvicorn app.main:app --host 0.0.0.0 --port "$PORT"
