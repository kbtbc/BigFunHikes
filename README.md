# BigFun Hikes! - Appalachian Trail Journal

A beautiful web application for documenting your Appalachian Trail journey with journal entries, photos, and progress tracking.

## Overview

BigFun Hikes! is a mobile-first web app designed specifically for hikers documenting their Appalachian Trail thru-hike. Record your daily adventures with markdown journals, upload photos from the trail, track daily and cumulative miles, and maintain a beautiful personal record of your 2,190-mile journey.

## Current Features (v2.5)

### Core Functionality
- **Journal Entries**: Markdown-supported daily entries with date, title, and detailed reflections
- **Photo Uploads**: Add and caption multiple photos per entry with carousel display
- **Photo Caption Editing**: Edit captions on existing photos directly from the edit page
- **Mile Tracking**: Daily miles hiked with automatic running total calculation
- **Progress Tracking**: Total miles completed automatically calculated from all entries
- **Day Numbering**: Track your hiking day count
- **Elevation Tracking**: Record elevation gain per day
- **Timeline View**: Beautiful chronological timeline of all your hiking days
- **Enhanced Statistics Dashboard**: Comprehensive analytics with collapsible detailed view
  - **Pace Analytics**: 7-day moving average and overall pace
  - **Personal Records**: Longest day, biggest climb, current streak tracking
  - **Projections**: Estimated completion date based on current pace
  - **Elevation Profile Chart**: Visual bar chart of daily elevation gain
  - **Daily Miles Trend**: Line chart showing miles hiked per day
  - **Progress Metrics**: Percentage complete, days remaining, miles to go
- **Interactive Map**: Leaflet map displaying trail routes and GPX tracks
- **Location & Weather**: Auto-capture GPS coordinates and weather conditions
- **Mobile Responsive**: Optimized for on-trail updates from your phone
- **Admin Authentication**: Secure password-based login with dual-mode support (cookie + token)

### Technical Features
- Full CRUD operations (Create, Read, Update, Delete)
- Photo management with file uploads and caption editing
- React Query for efficient data fetching/caching
- GPX track display on maps
- OpenTopoMap tiles for topographic visualization
- Recharts for data visualization and charting
- 7-day session persistence
- Cross-domain authentication support for Vibecode and local development

## Coming Soon

### Phase 3C: Import/Export (Next)
- **GPX Import UI**: Upload GPX tracks from hiking apps
- **Export Features**: PDF export, JSON backup

### Phase 3D: Offline (Future)
- **PWA Support**: Offline mode for areas without service

## Tech Stack

### Frontend (Port 8000)
- **Framework**: React 18 + Vite
- **Styling**: Tailwind CSS + shadcn/ui components
- **Maps**: Leaflet.js with OpenTopoMap tiles
- **Markdown**: react-markdown with remark-gfm
- **Carousel**: Embla Carousel for photo galleries
- **Routing**: React Router v6
- **State**: React Query for server state
- **Type Safety**: TypeScript with Zod schemas

### Backend (Port 3000)
- **Runtime**: Bun
- **Framework**: Hono (lightweight, fast API)
- **Database**: SQLite + Prisma ORM
- **Authentication**: Password-based with cookie/token support
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
│   │   ├── pages/
│   │   │   ├── HomePage.tsx        # Map + stats overview
│   │   │   ├── TimelinePage.tsx    # All entries timeline
│   │   │   ├── EntryDetailPage.tsx # Individual entry view
│   │   │   ├── NewEntryPage.tsx    # Create new entry
│   │   │   ├── EditEntryPage.tsx   # Edit existing entry
│   │   │   └── LoginPage.tsx       # Admin authentication
│   │   ├── hooks/
│   │   │   └── use-entries.ts      # React Query hooks
│   │   ├── context/
│   │   │   └── AuthContext.tsx     # Auth state management
│   │   ├── lib/
│   │   │   ├── api.ts              # API client
│   │   │   └── transformEntries.ts # Data transformation
│   │   ├── index.css               # Design system & Tailwind
│   │   └── App.tsx                 # Main app with routing
│   └── public/
│       └── data/
│           └── appalachian_trail.gpx  # Full AT route
│
└── backend/                # Backend API server
    ├── src/
    │   ├── routes/
    │   │   ├── admin.ts    # Authentication endpoints
    │   │   ├── entries.ts  # Journal CRUD endpoints
    │   │   ├── photos.ts   # Photo upload endpoints
    │   │   └── stats.ts    # Statistics endpoints
    │   ├── middleware/
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
- Daily statistics (miles hiked, elevation gain)
- Cumulative progress (total miles completed)
- GPX track data (optional)
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
- `POST /api/entries` - Create new entry (admin)
- `PUT /api/entries/:id` - Update entry (admin)
- `DELETE /api/entries/:id` - Delete entry (admin)

**Photos**:
- `POST /api/entries/:id/photos/upload` - Upload photo file (multipart/form-data)
  - Accepts: JPEG, PNG, WebP, GIF (max 10MB)
  - Returns: Photo object with URL
- `PATCH /api/entries/:id/photos/:photoId` - Update photo caption (admin)
- `DELETE /api/entries/:id/photos/:photoId` - Delete photo (admin)

**Statistics**:
- `GET /api/stats` - Overall trail statistics

**Authentication**:
- `POST /api/admin/login` - Admin login with password
- `POST /api/admin/logout` - Admin logout
- `GET /api/admin/session` - Check authentication status

## Development

### Local Development Setup

**Prerequisites:**
- [Bun](https://bun.sh/) (for backend)
- [Node.js](https://nodejs.org/) v18+ (for frontend)

**Step 1: Backend Setup**

```bash
cd backend
bun install
```

Create a `backend/.env` file with:
```env
PORT=3000
DATABASE_URL="file:./dev.db"
ADMIN_PASSWORD=<your-secure-password>
BETTER_AUTH_SECRET=<random-string>
DISABLE_VIBECODE=true
```

Then initialize and run:
```bash
bunx prisma db push
bunx prisma generate
bun run dev  # Runs on http://localhost:3000
```

**Optional: Seed Sample Data**

To populate the database with 10 days of sample journal entries (great for testing):
```bash
cd backend
bun run seed
```

This creates realistic trail entries with photos, weather data, and varied statistics. **Warning:** This will delete all existing entries!

**Step 2: Frontend Setup** (new terminal)

```bash
cd webapp
npm install
```

Create a `webapp/.env` file with:
```env
VITE_BACKEND_URL=http://localhost:3000
VITE_DISABLE_VIBECODE=true
```

Then run:
```bash
npm run dev  # Runs on http://localhost:8000
```

**Step 3: Access the App**

1. Open http://localhost:8000
2. Go to http://localhost:8000/admin to login
3. Enter your admin password
4. Start creating journal entries!

### Hot Reload

Both servers run with hot reload:
- **Frontend**: http://localhost:8000 (Vite dev server)
- **Backend**: http://localhost:3000 (Bun watch mode)

### Open Graph Preview Image

The site uses a custom Open Graph image for social sharing.

**To regenerate:**
```bash
cd webapp
bun run generate:og-image
```

## Deployment

### Option 1: Vercel (Frontend) + Railway (Backend)

**Best for**: Quick deployment with free tiers

**Deploy Backend to Railway:**
1. Push code to GitHub
2. Create account at [Railway.app](https://railway.app)
3. New Project → Deploy from GitHub
4. Set root directory: `backend`
5. Add environment variables:
   - `ADMIN_PASSWORD`
   - `DATABASE_URL=file:./dev.db`
   - `DISABLE_VIBECODE=true`

**Deploy Frontend to Vercel:**
1. Create account at [Vercel.com](https://vercel.com)
2. New Project → Import from GitHub
3. Framework preset: Vite
4. Root directory: `webapp`
5. Add environment variable:
   - `VITE_BACKEND_URL` (your Railway URL)
   - `VITE_DISABLE_VIBECODE=true`

### Option 2: Single VPS

**Best for**: Full control, custom domain

```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone and build
git clone <your-repo-url>
cd workspace

# Build frontend
cd webapp && npm install && npm run build

# Setup backend
cd ../backend
bun install
bunx prisma db push
bunx prisma generate

# Run with PM2
npm install -g pm2
pm2 start bun --name "trail-tales-api" -- run start
```

**Nginx config:**
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        root /path/to/workspace/webapp/dist;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
    }
}
```

### Option 3: Docker

See `docker-compose.yml` for containerized deployment.

## Environment Variables

### Backend (required)
```env
PORT=3000
DATABASE_URL="file:./dev.db"
ADMIN_PASSWORD=<your-secure-password>
BETTER_AUTH_SECRET=<random-string>
DISABLE_VIBECODE=true
```

### Frontend (required)
```env
VITE_BACKEND_URL=http://localhost:3000
VITE_DISABLE_VIBECODE=true
```

Note: Replace placeholder values with your own. Never commit real passwords to version control.

## Data Sources

- **Appalachian Trail GPX**: Full resolution track data
- **Map Tiles**: OpenTopoMap (free, no API limits)

## Notes for Trail Use

- **Mobile First**: Designed for on-trail updates from your phone
- **Photos**: Upload directly from your phone's camera roll
- **Connectivity**: Works great when you have service; offline mode coming soon
- **Battery**: Map rendering can be battery-intensive on older devices

---

Built with love for thru-hikers. Happy trails!
