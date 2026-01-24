# BigFun Hikes! - Appalachian Trail Journal

A beautiful web application for documenting your Appalachian Trail journey with journal entries, photos, and progress tracking.

## Overview

BigFun Hikes! is a mobile-first web app designed specifically for hikers documenting their Appalachian Trail thru-hike. Record your daily adventures with markdown journals, upload photos from the trail, track daily and cumulative miles, and maintain a beautiful personal record of your 2,190-mile journey.

## Features

### Current Features (v1.0)
- **Journal Entries**: Markdown-supported daily entries with date, title, and detailed reflections
- **Photo Uploads**: Add and caption multiple photos per entry
- **Mile Tracking**: Daily miles hiked with automatic running total calculation
- **Progress Tracking**: Total miles completed automatically calculated from all entries
- **Day Numbering**: Auto-incrementing day counter from previous entries
- **Timeline View**: Beautiful chronological timeline of all your hiking days
- **Statistics Dashboard**: Track total miles, entries, and hiking progress
- **Mobile Responsive**: Optimized for on-trail updates from your phone
- **Admin Authentication**: Secure login to manage your journal

### Coming Soon
- **Map Visualization**: Interactive map showing your Appalachian Trail route
- **Elevation Tracking**: Track elevation gain per day
- **Google Drive Sync**: Auto-publish entries by dropping files into a cloud folder
- **Voice-to-Text**: Dictate journal entries on the trail
- **Offline Mode**: Cache entries for areas without cell service
- **Public/Private Entries**: Choose which entries to share publicly

## Tech Stack

### Frontend (Port 8000)
- **Framework**: React 18 + Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **Maps**: Leaflet.js + react-leaflet
- **Markdown**: react-markdown with remark-gfm
- **Routing**: React Router v6
- **Type Safety**: TypeScript with Zod schemas

### Backend (Port 3000)
- **Runtime**: Bun
- **Framework**: Hono (lightweight, fast API)
- **Database**: SQLite + Prisma ORM
- **Authentication**: Simple admin password (cookie-based)
- **Type Safety**: TypeScript + Zod validation

## Project Structure

```
/
├── webapp/                  # Frontend React application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   │   ├── Navbar.tsx
│   │   │   ├── TrailMap.tsx        # Interactive Leaflet map
│   │   │   ├── Stats.tsx           # Progress statistics
│   │   │   ├── JournalEntry.tsx    # Entry display component
│   │   │   └── Timeline.tsx        # Timeline view
│   │   ├── pages/          # Page components
│   │   │   ├── HomePage.tsx        # Map + stats overview
│   │   │   ├── TimelinePage.tsx    # All entries timeline
│   │   │   └── EntryDetailPage.tsx # Individual entry view
│   │   ├── data/           # Mock data (will be replaced with API)
│   │   │   └── journalEntries.ts
│   │   ├── index.css       # Design system & Tailwind config
│   │   └── App.tsx         # Main app with routing
│   └── public/
│       └── data/
│           └── appalachian_trail.gpx  # Full AT route (312k points)
│
└── backend/                # Backend API server
    ├── src/
    │   ├── routes/         # API route handlers
    │   │   ├── admin.ts    # Admin authentication
    │   │   ├── entries.ts  # Journal CRUD endpoints
    │   │   ├── photos.ts   # Photo upload endpoints
    │   │   └── stats.ts    # Statistics endpoints
    │   ├── middleware/     # Route middleware
    │   │   └── adminAuth.ts # Admin session middleware
    │   ├── types.ts        # Zod schemas for API contracts
    │   ├── prisma.ts       # Prisma client setup
    │   └── index.ts        # Hono app + middleware
    └── prisma/
        ├── schema.prisma   # Database schema
        └── dev.db          # SQLite database
```

## Design Philosophy

**Inspired by**: Strava (tracking), Notion (journaling), AllTrails (maps), National Park Service (aesthetics)

**Color Palette**:
- Forest greens (#4a7c59, #2d5016) - Primary
- Warm amber/orange (#f4a261, #e07a5f) - Accents
- Earthy cream (#faf9f6, #f5f5dc) - Backgrounds
- Deep charcoal (#2b2d42) - Text

**Typography**:
- Headings: "Outfit" (adventurous, modern)
- Body: "Inter" (clean, readable)

**Feel**: Rugged meets modern - like a digital trail journal with hand-drawn map aesthetics. Emphasis on beautiful photography, clean typography, and celebrating the journey.

## Data Model

### JournalEntry
- Date, day number, title
- Markdown content
- Location coordinates (lat/lon)
- Daily statistics (miles hiked, elevation gain)
- Cumulative progress (total miles completed)
- GPX track data
- Associated photos with captions

### Photo
- URL and caption
- Linked to journal entry
- Ordering for galleries

## API Endpoints

All endpoints follow the `{ data: ... }` envelope pattern.

**Journal Entries**:
- `GET /api/entries` - List all entries (paginated)
- `GET /api/entries/:id` - Get specific entry with photos
- `POST /api/entries` - Create new entry
- `PUT /api/entries/:id` - Update entry
- `DELETE /api/entries/:id` - Delete entry

**Photos**:
- `POST /api/entries/:id/photos/upload` - Upload photo file with caption to entry (multipart/form-data)
  - Accepts: JPEG, PNG, WebP, GIF (max 10MB)
  - Returns: Photo object with URL

**Statistics**:
- `GET /api/stats` - Overall trail statistics (total miles, days, elevation gain)

**Authentication**:
- `POST /api/admin/login` - Admin login with password
- `POST /api/admin/logout` - Admin logout
- `GET /api/admin/session` - Check authentication status

## Development

### Local Development Setup

**Prerequisites:**
- [Bun](https://bun.sh/) (for backend)
- [Node.js](https://nodejs.org/) v18+ (for frontend)

**Step 1: Clone and Install**

```bash
# Clone the repository
git clone <your-repo-url>
cd workspace

# Backend setup
cd backend
bun install

# Create .env file
cat > .env << 'EOF'
PORT=3000
DATABASE_URL="file:./dev.db"
ADMIN_PASSWORD="your-secure-password"
EOF

# Initialize database
bunx prisma db push
bunx prisma generate

# Start backend
bun run dev  # Runs on http://localhost:3000
```

**Step 2: Frontend Setup** (in a new terminal)

```bash
cd webapp
npm install  # or: bun install

# Create .env file
echo "VITE_BACKEND_URL=http://localhost:3000" > .env

# Start frontend
npm run dev  # Runs on http://localhost:8000
```

**Step 3: Access the App**

1. Open http://localhost:8000
2. Go to http://localhost:8000/admin to login
3. Enter your admin password (from backend `.env`)
4. Start creating journal entries!

### Hot Reload

Both servers run automatically with hot reload:
- **Frontend**: http://localhost:8000 (Vite dev server)
- **Backend**: http://localhost:3000 (Bun watch mode)

Changes to code reload automatically.

### Open Graph Preview Image

The site uses a custom Open Graph image (`og-base.png`) that appears when sharing links on social media and messaging platforms. The image is generated programmatically with your branding.

**To regenerate the preview image:**

```bash
cd webapp
bun run generate:og-image
```

This will create/update `webapp/public/og-base.png` (1200x630px) with:
- Your brand colors (forest greens, warm amber/orange accents)
- Site title: "BigFun Hikes!"
- Subtitle: "Appalachian Trail Journal"
- Mountain silhouette and trail path design elements

**To customize the image:**

1. **Edit the script**: Modify `webapp/scripts/generate-og-image.js` to change colors, text, or layout
2. **Use a design tool**: Create a 1200x630px image in Canva, Figma, or Photoshop using your brand colors and save as `webapp/public/og-base.png`
3. **Online generators**: Use tools like [og-image.vercel.app](https://og-image.vercel.app) or [metatags.io](https://metatags.io)

The image is referenced in `webapp/index.html` with absolute URLs for proper link preview display.

## Deployment

### Option 1: Vercel (Frontend) + Railway (Backend)

**Best for**: Quick deployment with free tiers

**Deploy Backend to Railway:**
1. Push your code to GitHub
2. Go to [Railway.app](https://railway.app) and create account
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository and set root directory: `backend`
5. Add environment variables:
   ```
   ADMIN_PASSWORD=your-secure-password
   DATABASE_URL=file:./dev.db
   ```
6. Railway will auto-detect Bun and deploy
7. Copy the generated URL (e.g., `https://your-app.up.railway.app`)

**Deploy Frontend to Vercel:**
1. Go to [Vercel.com](https://vercel.com) and sign in with GitHub
2. Click "New Project" and select your repository
3. Set framework preset: "Vite"
4. Set root directory: `webapp`
5. Add environment variable:
   ```
   VITE_BACKEND_URL=https://your-app.up.railway.app
   ```
6. Deploy

### Option 2: Single VPS (DigitalOcean, Hetzner, etc.)

**Best for**: Full control, custom domain

```bash
# On your VPS (Ubuntu/Debian)
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone your repo
git clone <your-repo-url>
cd workspace

# Build frontend
cd webapp
npm install
npm run build  # Creates webapp/dist

# Setup backend
cd ../backend
bun install
bunx prisma db push
bunx prisma generate

# Run with PM2
npm install -g pm2
pm2 start bun --name "trail-tales-api" -- run start
pm2 save
pm2 startup  # Follow instructions

# Serve frontend with nginx
sudo apt install nginx
sudo nano /etc/nginx/sites-available/trail-tales
```

Nginx config:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        root /path/to/workspace/webapp/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/trail-tales /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Setup SSL with Let's Encrypt
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### Option 3: Docker

Create `Dockerfile` in workspace root:

```dockerfile
# Build frontend
FROM node:18-alpine AS frontend-build
WORKDIR /app/webapp
COPY webapp/package*.json ./
RUN npm ci
COPY webapp/ ./
RUN npm run build

# Backend runtime
FROM oven/bun:latest
WORKDIR /app

# Install backend dependencies
COPY backend/package.json backend/bun.lockb ./
RUN bun install --production

# Copy backend code
COPY backend/ ./

# Copy built frontend
COPY --from=frontend-build /app/webapp/dist ./public

# Initialize database
RUN bunx prisma generate

EXPOSE 3000

CMD ["bun", "run", "start"]
```

`docker-compose.yml`:
```yaml
version: '3.8'
services:
  trail-tales:
    build: .
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - DATABASE_URL=file:./data/prod.db
      - ADMIN_PASSWORD=${ADMIN_PASSWORD}
    volumes:
      - ./data:/app/data
    restart: unless-stopped
```

```bash
# Build and run
docker-compose up -d
```

## Environment Variables

### Backend (required)
```env
PORT=3000
DATABASE_URL="file:./dev.db"
ADMIN_PASSWORD="your-secure-password"
DISABLE_VIBECODE=false  # Set to "true" for local development without Vibecode
```

### Frontend (required)
```env
VITE_BACKEND_URL="http://localhost:3000"  # or your production backend URL
VITE_DISABLE_VIBECODE=false  # Set to "true" for local development without Vibecode
```

### Local Development Mode (Non-Vibecode)

If you want to run the application in a pure local development environment without Vibecode-specific features, proxies, or tools:

**Backend (.env)**:
```env
DISABLE_VIBECODE=true
```

**Frontend (.env)**:
```env
VITE_DISABLE_VIBECODE=true
```

When `DISABLE_VIBECODE=true`:
- **Backend**:
  - Vibecode proxy is disabled
  - CORS allows all origins for local development
  - BACKEND_URL defaults to `http://localhost:3000`
- **Frontend**:
  - Vibecode Vite plugin is disabled
  - API client uses `http://localhost:3000` instead of proxied URLs

This makes it easy to deploy and run the application in any standard development environment.

## Adding Journal Entries

Currently using mock data in `webapp/src/data/journalEntries.ts`.

To add a new entry, add to the `mockJournalEntries` array:

```typescript
{
  id: "entry-2",
  dayNumber: 2,
  date: "2025-03-16",
  title: "Day 2: Hawk Mountain to Gooch Mountain",
  content: "# Your markdown content here...",
  milesHiked: 12.5,
  elevationGain: 2100,
  totalMilesCompleted: 20.3,
  location: "Gooch Mountain, GA",
  latitude: 34.6856,
  longitude: -84.2245,
  startPoint: { lat: 34.6723, lon: -84.2134 },
  endPoint: { lat: 34.6856, lon: -84.2245 },
  photos: [
    {
      url: "https://images.unsplash.com/photo-...",
      caption: "Beautiful sunrise"
    }
  ],
  gpxData: "<gpx>...</gpx>" // Optional
}
```

Later, these will be created through the API with authentication.

## Future Enhancements

### Phase 2 - Publishing Workflow
- Google Drive integration for easy mobile publishing
- Email-to-publish functionality
- Automated photo resizing and optimization

### Phase 3 - Advanced Features
- Social sharing (share individual entries or entire journey)
- Custom themes and branding
- Export entire journal as PDF or book
- Integration with fitness trackers (Suunto, Garmin)
- Weather data integration
- Elevation profiles and 3D terrain visualization

## Data Sources

- **Appalachian Trail GPX**: Sourced from [TopoFusion](https://topofusion.com/at-gps.php) (312,000 point full resolution track)
- **Map Tiles**: OpenTopoMap (free, no API limits)
- **Photos**: Unsplash (for demo content)

## Notes for Trail Use

- **Connectivity**: The app is designed to work with limited trail connectivity. Future versions will support offline mode.
- **Battery**: Map rendering can be battery-intensive. Consider downloading offline map tiles for your section.
- **Data Entry**: Voice-to-text feature coming soon to make journaling easier on the trail.
- **Backup**: Always backup your journal entries and photos to cloud storage.

---

Built with ❤️ for thru-hikers. Happy trails!
