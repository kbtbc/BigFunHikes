# Trail Tales - Quick Start Guide

Get Trail Tales running locally in minutes.

## What You Have

A complete Appalachian Trail journal web app with:
- Beautiful timeline view for all journal entries
- Admin login to create/edit/delete entries
- Photo upload with each entry (multiple photos supported)
- Statistics dashboard (total miles, days, elevation, daily average)
- Interactive trail map with GPX track display
- Suunto watch data import (HR, pace, steps, calories, lap splits)
- Training hike support (separate from trail stats)
- Offline mode with auto-sync
- Simple password authentication (no email needed)
- SQLite database (no external database required)
- Mobile-responsive design

## Prerequisites

**Install Bun** (for backend):
```bash
# Windows (PowerShell)
irm bun.sh/install.ps1 | iex

# Mac/Linux
curl -fsSL https://bun.sh/install | bash
```

**Install Node.js** (for frontend):
- Download from https://nodejs.org/ (LTS version)
- Or use `nvm`: `nvm install 18`

## Running Locally

### 1. Configure Environment

For local development without Vibecode:

**backend/.env:**
```env
DISABLE_VIBECODE=true
ADMIN_PASSWORD=your-secure-password
BETTER_AUTH_SECRET=any-random-string-here
DATABASE_URL="file:./dev.db"
```

**webapp/.env:**
```env
VITE_DISABLE_VIBECODE=true
VITE_BACKEND_URL=http://localhost:3000
```

### 2. Start the Backend

```bash
cd backend

# Install dependencies
bun install

# Initialize database (first time only)
bunx prisma db push

# Optional: Seed sample data (WARNING: deletes existing data!)
bun run seed

# Start backend server
bun run dev
```

You should see: `Started development server: http://localhost:3000`

### 3. Start the Frontend

Open a **new terminal**:

```bash
cd webapp

# Install dependencies
bun install

# Start frontend
bun run dev
```

You should see: `Local: http://localhost:8000/`

### 4. Access the App

- **http://localhost:8000** - Public view (timeline, entries)
- **http://localhost:8000/admin** - Admin login

Default password: Check `backend/.env` for `ADMIN_PASSWORD`

### 5. Hosting from Home (Cloudflare Tunnels)

For free remote access without port forwarding:

1. Install cloudflared: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/
2. Create tunnels for both services:
   ```bash
   cloudflared tunnel create bigfun-backend
   cloudflared tunnel create bigfun-frontend
   ```
3. Configure routes to localhost:3000 (backend) and localhost:8000 (frontend)
4. Update `webapp/.env` with your tunnel URL:
   ```env
   VITE_BACKEND_URL=https://your-backend-tunnel.cfargotunnel.com
   ```

### 6. Test on Mobile (Same Network)

Find your computer's IP:
- **Windows**: `ipconfig` (look for IPv4 Address)
- **Mac**: `ipconfig getifaddr en0`
- **Linux**: `hostname -I`

On your phone: `http://<your-ip>:8000`

---

## Features Overview

### Create a Journal Entry
1. Login at `/admin`
2. Click "New Entry" in navbar
3. Fill in:
   - Date, Day Number, Title
   - Miles Hiked / Total Miles
   - Content (markdown supported)
   - Import GPX track (optional)
   - Import Suunto JSON (optional) - auto-fills miles, elevation, date
   - Photos (optional)
4. Submit - entry appears immediately on timeline

### Import Watch Data
- **GPX files**: Import from any GPS device for route display
- **Suunto JSON**: Full fitness data including:
  - Heart rate zones and charts
  - Pace and speed metrics
  - Step count and calories
  - Lap splits with detailed breakdown
  - Elevation profile
- Both can be used together (Suunto for metrics, GPX for route)

### Training Hikes
- Toggle "Training" mode when creating entries
- Training hikes use amber/orange styling
- Not counted in trail statistics
- Great for pre-hike conditioning tracking

### Timeline View
- All entries in chronological order
- Photo thumbnails
- Training entries styled differently
- Click any entry to view full details

### Entry Details
- Full content with markdown rendering
- Photo carousel
- Trail map showing location/route
- Suunto fitness stats display
- Edit/Delete options (when logged in)

### Statistics
- Total miles hiked
- Days on trail
- Total elevation gain
- Average miles per day
- 7-day moving average pace
- Projected completion date
- Personal records (longest day, biggest climb)

---

## Troubleshooting

**"Port 3000 already in use"**
- Stop the other process, or change `PORT=3001` in `backend/.env`

**"Cannot find module"**
- Run `bun install` in backend
- Run `bun install` in webapp

**Frontend can't connect to backend**
- Check both `DISABLE_VIBECODE` settings match
- Verify http://localhost:3000/health works in browser

**Admin password not working**
- Check `backend/.env` for correct password
- Clear browser cookies
- Restart backend

**Database errors**
- Run `bunx prisma db push` to sync schema
- Check `backend/prisma/dev.db` exists

**Photos not loading**
- Ensure `backend/public/uploads/` exists
- Check CORS settings (DISABLE_VIBECODE should be consistent)

**Suunto import not working**
- Ensure file is native Suunto JSON export (not GPX)
- Check browser console for parsing errors

---

## Environment Variables

### Backend (.env)
```env
PORT=3000
DATABASE_URL="file:./dev.db"
ADMIN_PASSWORD=<your-secure-password>
BETTER_AUTH_SECRET=<random-string>
DISABLE_VIBECODE=true
```

### Frontend (.env)
```env
VITE_BACKEND_URL=http://localhost:3000
VITE_DISABLE_VIBECODE=true
```

Note: Replace `<your-secure-password>` with your own password. Do not commit real passwords to git.

---

## Deployment Options

### Cloudflare Tunnels (Free, Home Hosting)

Great for personal use without paying for hosting:
1. Run backend and frontend locally
2. Use Cloudflare Tunnels for public HTTPS access
3. No port forwarding needed
4. Free SSL certificates

### Vercel + Railway (Free Tier)

**Backend on Railway:**
1. Push code to GitHub
2. Create project at railway.app
3. Deploy from GitHub, set root: `backend`
4. Add env vars: `ADMIN_PASSWORD`, `DATABASE_URL`, `DISABLE_VIBECODE=true`

**Frontend on Vercel:**
1. Create project at vercel.com
2. Import from GitHub, set root: `webapp`
3. Framework: Vite
4. Add env vars: `VITE_BACKEND_URL` (Railway URL), `VITE_DISABLE_VIBECODE=true`

### Single Server (Docker/VPS)
See README.md for detailed VPS deployment instructions.

---

## Project Files

| File | Description |
|------|-------------|
| `PROJECT_PLAN.md` | Feature status and roadmap |
| `README.md` | Full documentation |
| `QUICKSTART.md` | This file |
| `DISABLE_VIBECODE.md` | Environment variable details |
| `backend/data/` | Seed data files (Suunto JSON) |

---

Happy trails!
