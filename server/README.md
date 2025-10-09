# Trade Profitability — Backend (FastAPI v2)

## Run locally

### Git Bash / Linux / macOS
```bash
python -m venv venv
source venv/Scripts/activate  # Git Bash on Windows
# source venv/bin/activate    # Linux/macOS
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### PowerShell (Windows)
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

> **Note**: VS Code will auto-activate the venv when you open a new terminal if you've reloaded the window.

## API
- `GET /api/health`
- `GET /api/costs` — list
- `POST /api/costs` — add
- `PUT /api/costs/{code}` — update
- `GET /api/sell-prices`
- `POST /api/sell-prices`
- `POST /api/compute` (ScenarioIn → KPIs + breakdown; supports sell_price_per_mt override)
- `POST /api/compare`
