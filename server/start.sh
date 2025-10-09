#!/bin/bash
# Start backend server

cd "$(dirname "$0")"

if [ ! -d "venv" ]; then
  echo "Creating virtual environment..."
  python -m venv venv
fi

source venv/Scripts/activate 2>/dev/null || source venv/bin/activate

echo "Installing dependencies..."
pip install -q -r requirements.txt

echo "Starting backend on http://localhost:8000"
uvicorn main:app --reload --port 8000
