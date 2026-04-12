# Zist Backend - Render Deployment Checklist

## Before You Deploy

### 1. Repository Setup ✓

- [ ] Push code to GitHub (main branch)
- [ ] `.env` file is in `.gitignore` (DO NOT commit)
- [ ] `.env.example` shows all required variables
- [ ] Backend folder structure: `zist-backend/` at root level

### 2. Generate Production Secrets

```bash
# Generate a new SECRET_KEY (run in Python)
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

- [ ] Save this value (use in Render)
- [ ] Note: **DO NOT** use the dev key from .env!

### 3. Database Preparation

- [ ] Neon PostgreSQL database created
- [ ] Connection string ready: `postgresql://user:password@host/db?sslmode=require`
- [ ] Can connect locally: `psql "connection-string"`

### 4. API Keys

- [ ] TMDB API key obtained
- [ ] Gemini API key obtained
- [ ] Add to Render environment variables

---

## Deployment Steps

### Step 1: Create Render Web Service

1. Go to [render.com](https://render.com)
2. Dashboard → **New +** → **Web Service**
3. **Connect repository** → Select GitHub repo
4. Set **Root Directory** to `zist-backend`

### Step 2: Build & Start Configuration

| Setting           | Value                                                          |
| ----------------- | -------------------------------------------------------------- |
| **Build Command** | `pip install --upgrade pip && pip install -r requirements.txt` |
| **Start Command** | `uvicorn app.main:app --host 0.0.0.0 --port $PORT`             |
| **Environment**   | Python 3                                                       |

### Step 3: Set Environment Variables

Click **Environment** and add:

| Key                    | Value                                                                     | From           |
| ---------------------- | ------------------------------------------------------------------------- | -------------- |
| `DATABASE_URL`         | `postgresql://...`                                                        | Neon Dashboard |
| `SECRET_KEY`           | (generated production key)                                                | Step 2 above   |
| `TMDB_API_KEY`         | Your TMDB API key                                                         | TMDB website   |
| `GEMINI_API_KEY`       | Your Gemini API key                                                       | Google AI      |
| `GEMINI_MODEL`         | `gemini-1.5-flash`                                                        | Optional       |
| `BACKEND_CORS_ORIGINS` | `https://zist-media.netlify.app,https://render-service-name.onrender.com` | Your services  |

### Step 4: Deploy

1. Click **Create Web Service**
2. Wait for build (3-5 minutes)
3. Check logs for errors
4. Get your service URL: `https://zist-backend.onrender.com` (example)

### Step 5: Verify Deployment

```bash
# Test health endpoint
curl https://zist-backend.onrender.com/health

# Check API docs
https://zist-backend.onrender.com/docs
```

---

## Backend URL Configuration

After deployment, you'll have: **`https://your-service.onrender.com`**

This URL needs to be set in:

### 1. Netlify Frontend Environment

- Go to **Site settings** → **Build & deploy** → **Environment**
- Add: `VITE_API_URL=https://your-service.onrender.com/api/v1`
- Trigger redeploy

### 2. Netlify Redirect (in `zist-frontend/netlify.toml`)

```toml
[[redirects]]
  from = "/api/*"
  to = "https://your-service.onrender.com/api/:splat"
  status = 200
  force = true
```

- [ ] Add this and commit
- [ ] Netlify will auto-redeploy

### 3. Local Docker Development (optional)

Update `docker-compose.yml` environment:

```yaml
environment:
  VITE_API_URL: http://localhost:8000/api/v1
```

---

## Update CORS for Production

Your `.env` already includes: `https://zist-media.netlify.app`

If you add more frontend URLs later:

1. Update `BACKEND_CORS_ORIGINS` in Render dashboard
2. Click **Manual Deploy** to apply changes
3. No code change needed

---

## Common Issues & Fixes

### ❌ Build Fails

**Error:** `pip install failed`

- Check `requirements.txt` exists in `zist-backend/`
- Verify all dependencies are installable
- Check Python 3.13 compatibility

**Error:** `psycopg2 not found`

- Already handled by Dockerfile (installs gcc)
- Rebuild should work

### ❌ CORS Errors in Frontend

**Frontend error:** `Access to XMLHttpRequest blocked by CORS policy`

- Verify `BACKEND_CORS_ORIGINS` includes frontend URL
- Check frontend is sending `Origin: https://zist-media.netlify.app`
- Redeploy backend after changing CORS

### ❌ Cannot Connect to Database

**Error:** `could not translate host name "host" to address`

- Verify `DATABASE_URL` format is correct
- Test locally: `psql "$DATABASE_URL"`
- Check Neon allows Render IP (may need whitelist)

### ❌ Health Check Failing

**Error:** `Health check status failed`

- May need to disable initially (let app stabilize)
- Check backend logs for startup errors
- Verify port is being used: `$PORT` not hardcoded

### ❌ API Returns 403 Unauthorized

**During early tests:**

- Register a test account first
- JWT tokens are required for most endpoints
- Use `/docs` at `https://your-service.onrender.com/docs` to test

---

## Security Checklist

- [ ] New `SECRET_KEY` generated and used
- [ ] CORS origins restricted (no `*`)
- [ ] Database connection uses SSL mode
- [ ] `.env` never committed to git
- [ ] No hardcoded API keys in code
- [ ] Health check enabled
- [ ] Original Neon password should be rotated

---

## Monitoring & Maintenance

### Auto-Deployment

By default, every `git push` to `main` triggers auto-deploy on Render.

Disable in Render dashboard if needed: **Settings** → Toggle auto-deploy

### Manual Redeploy

1. Make code changes
2. Commit and push to GitHub
3. Or click **Manual Deploy** in Render dashboard

### Update Environment Variables

1. Edit in Render dashboard
2. Click **Manual Deploy** to apply immediately

### View Logs

1. Render dashboard → **Logs**
2. Real-time stream of backend output
3. Check for errors/warnings

### Monitor Uptime

- Render has built-in uptime monitoring
- Health check runs every 30 seconds
- Service auto-restarts on crash

---

## Next Steps

1. **Deploy backend** ✓ (this checklist)
2. **Deploy frontend** to Netlify (if not already done)
3. **Test integration** between frontend and backend
4. **Celebrate!** 🎉 Your app is live

---

## Support Resources

- [Render Documentation](https://render.com/docs)
- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/)
- [PostgreSQL Connection Strings](https://www.postgresql.org/docs/current/libpq-connect-string.html)
