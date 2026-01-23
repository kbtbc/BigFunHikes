# Trail Tales - Quick Start Guide

This guide will help you run Trail Tales locally on your computer and prepare it for GitHub/deployment.

## What You Have

A complete Appalachian Trail journal web app with:
- Beautiful timeline view for all journal entries
- Admin login at `/admin` to create/edit/delete entries
- Photo upload with each entry
- Statistics dashboard (total miles, days, elevation)
- Simple password authentication (no email needed)
- SQLite database (no external database required)
- Full CRUD operations (Create, Read, Update, Delete)

## Running Locally (Easiest Method)

### 1. Install Prerequisites

**Install Bun** (for backend):
```bash
curl -fsSL https://bun.sh/install | bash
```

**Install Node.js** (for frontend):
- Download from https://nodejs.org/ (choose LTS version)
- Or if you have `nvm`: `nvm install 18`

### 2. Download Your Code

If you haven't already, download the code from Vibecode:
1. Use the Vibecode export feature, or
2. Copy the entire `/home/user/workspace` folder to your computer

### 3. Configure for Local Development (Important!)

To run without Vibecode dependencies, edit both `.env` files:

**backend/.env:**
```env
DISABLE_VIBECODE=true
```

**webapp/.env:**
```env
VITE_DISABLE_VIBECODE=true
```

This allows the app to run as a standard React + Bun application without Vibecode proxies or tools. (The defaults are `false`, which enable Vibecode features.)

### 4. Start the Backend

Open a terminal and run:

```bash
cd path/to/workspace/backend

# Install dependencies
bun install

# Initialize the database (one time)
bunx prisma db push

# Start the backend server
bun run dev
```

You should see: `Started development server: http://localhost:3000`

### 5. Start the Frontend

Open a **new terminal** (keep the backend running) and run:

```bash
cd path/to/workspace/webapp

# Install dependencies
npm install

# Start the frontend
npm run dev
```

You should see: `Local: http://localhost:8000/`

### 6. Access Your App

Open your browser to:
- **http://localhost:8000** - Public timeline view
- **http://localhost:8000/admin** - Admin login

Login with the password from `backend/.env` (currently: `TrailTales2024!`)

### 7. Test on Mobile (Same Network)

To test on your phone:
1. Find your machine's local IP:
   - **Mac**: `ipconfig getifaddr en0`
   - **Linux**: `hostname -I`
   - **Windows**: `ipconfig` (look for IPv4 Address)

2. On your phone, open: `http://<your-ip>:8000`
3. Make sure your phone is on the same WiFi network

## Features You Can Test

### Create a Journal Entry
1. Login at `/admin` with the password
2. Click "New Entry" in the navbar
3. Fill in:
   - Date
   - Day Number (1, 2, 3, etc.)
   - Title ("Day 1: Springer Mountain to Hawk Mountain")
   - Miles Hiked
   - Elevation Gain (optional)
   - Total Miles (cumulative)
   - Content (markdown supported)
   - Upload photos if desired

4. Submit and see your entry on the timeline immediately

### View Timeline
- All entries appear in reverse chronological order
- Photos display with entries
- Click any entry to see full details

### Edit/Delete
- Click an entry to view details
- Edit button to modify any field
- Delete button to remove entry
- Delete photos individually

### Statistics
- Home page shows total miles, days, and elevation gain
- Updates automatically as you add entries

## Pushing to GitHub

### First Time Setup

1. **Create a GitHub repository**:
   - Go to https://github.ccdom/new
   - Name it something like `trail-tales` or `appalachian-journal`
   - Choose "Public" or "Private"
   - **Don't** initialize with README (you already have one)
   - Click "Create repository"

2. **Connect your local code to GitHub**:

```bash
cd path/to/workspace

# Initialize git (if not already done)
git init

# Add all files
git add .

# Create first commit
git commit -m "Initial commit - Trail Tales journal app"

# Connect to your GitHub repo (replace with YOUR username and repo name)
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git

# Push to GitHub
git branch -M main
git push -u origin main
```

3. **View on GitHub**:
   - Refresh your GitHub repository page
   - Your code should now be there!

### Making Updates

After making changes to your code:

```bash
git add .
git commit -m "Describe your changes"
git push
```

## Deploying to the Internet

### Before Deploying

Make sure to set `DISABLE_VIBECODE=true` in your deployment environment variables. This removes all Vibecode dependencies so the app works on any standard hosting.

### Option 1: Vercel (Frontend) + Railway (Backend)
**Cost**: Free tier available

**Step 1: Deploy Backend to Railway**
1. Go to https://railway.app
2. Sign in with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Click "Add variables" and add:
   - `ADMIN_PASSWORD`: your password
   - `DATABASE_URL`: `file:./dev.db`
   - `DISABLE_VIBECODE`: `true`
6. In Settings, set "Root Directory" to `backend`
7. Railway will deploy automatically
8. Copy the public URL (e.g., `https://your-app.up.railway.app`)

**Step 2: Deploy Frontend to Vercel**
1. Go to https://vercel.com
2. Sign in with GitHub
3. Click "Add New..." → "Project"
4. Import your repository
5. Framework Preset: `Vite`
6. Root Directory: `webapp`
7. Add environment variables:
   - `VITE_BACKEND_URL`: paste your Railway URL from step 1
   - `VITE_DISABLE_VIBECODE`: `true`
8. Click "Deploy"

Done! Vercel will give you a URL like `https://your-app.vercel.app`

### Option 2: Single Server (DigitalOcean, etc.)
**Cost**: ~$6/month

See the full README.md for VPS deployment instructions.

## Admin Password

Your admin password is stored in `backend/.env`:
```
ADMIN_PASSWORD="TrailTales2024!"
```

To change it:
1. Edit `backend/.env`
2. Update the `ADMIN_PASSWORD` value
3. Restart the backend server
4. Commit and push to GitHub if you want to update deployment

**Note**: In this Vibecode project, the .env file is committed to git (not typical, but works for personal projects).

## Environment Variables Reference

### Backend `.env`
```env
PORT=3000                                    # Server port
DATABASE_URL="file:./dev.db"                # SQLite database path
ADMIN_PASSWORD="TrailTales2024!"            # Your login password
BETTER_AUTH_SECRET="..."                    # Auth secret (already set)
DISABLE_VIBECODE=true                       # Disable for local/production
```

### Frontend `.env`
```env
VITE_BACKEND_URL="http://localhost:3000"    # Backend API URL
VITE_DISABLE_VIBECODE=true                  # Disable for local/production
```

## Troubleshooting

**"Port 3000 already in use"**
- Another app is using port 3000
- Stop it, or change `PORT=3001` in `backend/.env`

**"Cannot find module"**
- Run `bun install` in backend folder
- Run `npm install` in webapp folder

**Frontend can't connect to backend**
- Make sure both `DISABLE_VIBECODE` settings are consistent
- Verify `http://localhost:3000/health` works in browser
- Check `webapp/.env` has correct `VITE_BACKEND_URL`
- Check backend logs for errors: `tail backend/server.log`

**Admin password not working**
- Check `backend/.env` for the correct password
- Clear browser cookies and try again
- Restart the backend server

**Database errors**
- Run `bunx prisma db push` to sync database
- Check `backend/prisma/dev.db` exists
- Check backend logs for database errors

**Images/photos not loading**
- Ensure `backend/public/uploads/` directory exists
- Check backend CORS settings
- Verify `DISABLE_VIBECODE` is set correctly

## Next Steps

1. **Test Locally**: Run the servers and test all features on your computer and phone
2. **Add Content**: Login at `/admin` and create journal entries
3. **Customize**: Edit design in `webapp/src/index.css` or modify components
4. **Deploy**: Follow deployment steps above to make it public on the internet

## Need Help?

- Check the full **README.md** for detailed documentation
- Check **PROJECT_PLAN.md** for feature status
- Read **DISABLE_VIBECODE.md** for environment variable details
- Review backend logs: `tail backend/server.log`
- Review frontend logs: Check browser console (F12)

---

Happy trails! 🏔️
