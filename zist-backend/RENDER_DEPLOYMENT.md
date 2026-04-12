# Render Deployment Guide for Zist Backend

## Prerequisites
1. Render account (https://render.com)
2. GitHub repository with backend code pushed
3. Production environment variables ready

## Step 1: Connect GitHub to Render
1. Go to https://dashboard.render.com
2. Click **New +** → **Web Service**
3. Select **Build and deploy from a Git repository**
4. Click **Connect account** and authorize GitHub
5. Select your repository

## Step 2: Configure Deployment Settings
1. **Name:** `zist-backend`
2. **Environment:** Python 3
3. **Build Command:**
   ```
   pip install --upgrade pip && pip install -r requirements.txt
   ```
4. **Start Command:**
   ```
   uvicorn app.main:app --host 0.0.0.0 --port $PORT
   ```
5. **Root Directory:** `zist-backend`

## Step 3: Add Environment Variables
Go to **Environment** section and add:

| Key | Value | Notes |
|-----|-------|-------|
| `DATABASE_URL` | `postgresql://...` | From Neon Dashboard |
| `SECRET_KEY` | (generate new) | **⚠️ DO NOT use dev key** |
| `TMDB_API_KEY` | Your TMDB API key | Required for movie data |
| `BACKEND_CORS_ORIGINS` | `https://zist-media.netlify.app,https://your-production-domain.com` | Add all frontend URLs |

## Step 4: Deploy
1. Click **Create Web Service**
2. Wait for build completion (3-5 minutes)
3. Test health endpoint: `https://your-service.onrender.com/health`
4. Test API: `https://your-service.onrender.com/docs`

## Step 5: Update Frontend
Update your frontend deployed on Netlify:
1. Go to **Site settings** → **Build & deploy** → **Environment**
2. Set `VITE_API_URL` = `https://your-service.onrender.com/api/v1`
3. Trigger a new deploy

## Step 6: Add to Netlify Redirects
In your `netlify.toml`:
```toml
[[redirects]]
  from = "/api/*"
  to = "https://your-service.onrender.com/api/:splat"
  status = 200
  force = true
```

## Verifying Deployment

### Check Backend Health
```bash
curl https://your-service.onrender.com/health
```

### Check API Documentation
Visit: `https://your-service.onrender.com/docs`

### Test CORS from Frontend
Open browser console on `https://zist-media.netlify.app` and try:
```javascript
fetch('https://your-service.onrender.com/api/v1/users/', {
  headers: { 'Authorization': 'Bearer YOUR_TOKEN' }
}).then(r => r.json())
```

## Troubleshooting

### Build Fails
1. Check Render logs: **Logs** tab
2. Verify Python version: 3.13 supported
3. Ensure all requirements.txt dependencies available

### CORS Errors
1. Check `BACKEND_CORS_ORIGINS` env var includes your frontend URL
2. Verify frontend is sending correct `Origin` header
3. Rebuild/redeploy backend after changing CORS

### Database Connection Issues
1. Verify PostgreSQL connection string in `DATABASE_URL`
2. Check Neon allows Render IP (whitelist if needed)
3. Test connection: `psql "$DATABASE_URL"`

### Port Issues
1. Render automatically assigns `$PORT` environment variable
2. Do NOT hardcode port 8000
3. Use `--port $PORT` in start command

## Maintenance

### Auto-Redeployment
- Every git push to main branch triggers automatic redeploy
- Disable in **Settings** → **Auto-Deploy**

### Manual Redeploy
1. Click **Manual Deploy** → **Deploy latest commit**

### Environment Variables Update
1. Update in Render dashboard
2. Click **Manual Deploy** to apply changes

### Database Migrations
If using Alembic:
```bash
# Run in build command before starting server
alembic upgrade head
```

## Security Notes
- ⚠️ Never commit `.env` file
- ⚠️ Rotate `SECRET_KEY` in production
- ⚠️ Rotate `DATABASE_URL` credentials after sharing in chat
- ⚠️ Use strong CORS allowlist (don't use `*`)
- ⚠️ Monitor Render logs for errors
