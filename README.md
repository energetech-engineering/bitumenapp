# Bitumen Trade Profitability App

Full-stack application for calculating trade deal profitability with cost modeling, route mapping, and scenario comparison.

- **Backend**: FastAPI + SQLite (Python 3.12)
- **Frontend**: React + Vite + TypeScript
- **Deployment**: Google Cloud Run (backend) + Cloud Storage (frontend)

## Quick Start (Local Development)

### Prerequisites
- Python 3.8+ 
- Node.js 20+
- Git Bash (Windows) or any bash shell

### Option 1: Using Scripts (Easiest)

```bash
# Terminal 1: Start backend
./server/start.sh

# Terminal 2: Start frontend
./client/start.sh
```

### Option 2: Manual Setup

```bash
# Terminal 1: Start backend
cd server
python -m venv venv
source venv/Scripts/activate  # Git Bash on Windows
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Terminal 2: Start frontend
cd client
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Project Structure

```
bitumenapp/
├── client/              # React frontend
│   ├── src/
│   │   ├── ui/         # React components
│   │   └── lib/        # API client
│   └── dist/           # Production build output
├── server/              # FastAPI backend
│   ├── main.py         # API routes & logic
│   ├── data.db         # SQLite database
│   └── requirements.txt
└── docs/               # Deployment guides
```

## Production URLs

- **Backend API**: https://bitumenapp-api-pijorbdzaq-uc.a.run.app
- **Frontend**: https://storage.googleapis.com/bitumenapp-static-site-bucket/index.html

## Deployment

See [docs/deployment.md](docs/deployment.md) for complete Google Cloud deployment instructions.