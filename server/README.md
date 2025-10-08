# Trade Profitability — Backend (FastAPI v2)

## Run locally
```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## API
- `GET /api/health`
- `GET /api/costs` — list
- `POST /api/costs` — add
- `PUT /api/costs/{code}` — update
- `GET /api/sell-prices`
- `POST /api/sell-prices`
- `POST /api/compute` (ScenarioIn → KPIs + breakdown; supports sell_price_per_mt override)
- `POST /api/compare`
