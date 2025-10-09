# CORS Configuration Guide

## Overview
Cross-Origin Resource Sharing (CORS) is required because your frontend and backend are hosted on different domains:
- **Frontend**: `https://storage.googleapis.com/bitumenapp-static-site-bucket/index.html`
- **Backend**: `https://bitumenapp-api-pijorbdzaq-uc.a.run.app`

## Current Setup

The FastAPI backend in `server/main.py` already has CORS configured:

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows ALL origins (development-friendly)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Testing CORS

Your current setup allows requests from any origin, so the frontend should work immediately:

1. **Backend API**: https://bitumenapp-api-pijorbdzaq-uc.a.run.app/api/costs
2. **Frontend**: https://storage.googleapis.com/bitumenapp-static-site-bucket/index.html

Open the frontend in your browser and check the browser console (F12) for any CORS errors. If the API calls work, CORS is properly configured.

## Production Hardening

For production, restrict CORS to only your frontend domain(s):

### Step 1: Edit `server/main.py`

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://storage.googleapis.com",  # Cloud Storage
        # Add additional domains as needed:
        # "https://yourdomain.com",
        # "https://app.yourdomain.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Step 2: Redeploy

After saving changes:

```bash
git add server/main.py
git commit -m "chore: restrict CORS to production domains"
git push
```

The GitHub Actions workflow will automatically rebuild and redeploy the backend to Cloud Run.

## Troubleshooting

### Error: "Access to fetch at ... from origin ... has been blocked by CORS policy"

**Cause**: The backend's `allow_origins` list doesn't include the frontend's origin.

**Solution**: Add the frontend origin to the `allow_origins` list in `server/main.py`.

### Error: "Response to preflight request doesn't pass access control check"

**Cause**: Missing CORS headers or `OPTIONS` method not allowed.

**Solution**: Ensure `allow_methods=["*"]` is set (already configured in current setup).

### Verify CORS Headers

Check if the backend is sending correct CORS headers:

```bash
curl -I -X OPTIONS https://bitumenapp-api-pijorbdzaq-uc.a.run.app/api/costs \
  -H "Origin: https://storage.googleapis.com" \
  -H "Access-Control-Request-Method: GET"
```

Look for these headers in the response:
- `access-control-allow-origin: *` (or your specific origin)
- `access-control-allow-methods: *`
- `access-control-allow-headers: *`

## Additional Notes

- The `allow_credentials=True` setting allows cookies and authentication headers to be sent with requests.
- If you add a custom domain via Cloud CDN or a load balancer, add it to `allow_origins`.
- For multiple environments (dev, staging, prod), consider using environment variables to configure allowed origins.
