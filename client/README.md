# Trade Profitability — Frontend (React + Vite)

## Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment** (optional for local development):
   ```bash
   cp .env.example .env
   # Edit .env if needed - defaults to http://localhost:8000
   ```

## Development

Start the dev server (assumes backend is running on `localhost:8000`):

```bash
npm run dev
```

Open http://localhost:5173 in your browser.

## Production Build

Build for deployment:

```bash
# Set the production API URL
export VITE_API_URL=https://bitumenapp-api-pijorbdzaq-uc.a.run.app
npm run build
```

The built files will be in `dist/` directory.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API base URL | `http://localhost:8000` |

For production deployments, the GitHub Actions workflow automatically sets `VITE_API_URL` to the Cloud Run backend URL.

## Deployment

The app is automatically deployed to Google Cloud Storage when changes are pushed to the `main` branch. See `docs/deployment.md` for details.

**Production URL**: https://storage.googleapis.com/bitumenapp-static-site-bucket/index.html
