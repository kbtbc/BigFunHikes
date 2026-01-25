# BigFun Hikes! - Appalachian Trail Journal

A beautiful web application for documenting your Appalachian Trail journey with journal entries, photos, and progress tracking.

## Overview

BigFun Hikes! is a mobile-first web app designed specifically for hikers documenting their Appalachian Trail thru-hike. Record your daily adventures with markdown journals, upload photos from the trail, track daily and cumulative miles, and maintain a beautiful personal record of your 2,190-mile journey.

## Current Features (v2.9)

### Core Functionality
- **Journal Entries**: Markdown-supported daily entries with date, title, and detailed reflections
- **Improved Entry Layout**: Title and content appear above photos for better readability
- **Photo Uploads**: Add and caption multiple photos per entry with carousel display
- **Photo Caption Editing**: Edit captions on existing photos directly from the edit page
- **Entry Navigation**: Seamless previous/next navigation between entries with sticky header
- **Mile Tracking**: Daily miles hiked with automatic running total calculation
- **Progress Tracking**: Total miles completed automatically calculated from all entries
- **Day Numbering**: Track your hiking day count
- **Elevation Tracking**: Record elevation gain per day
- **Timeline View**: Beautiful chronological timeline of all your hiking days
- **YouTube Integration**: Embedded intro video on home page with channel link
- **Enhanced Statistics Dashboard**: Comprehensive analytics with collapsible detailed view
  - **Pace Analytics**: 7-day moving average and overall pace
  - **Personal Records**: Longest day, biggest climb, current streak tracking
  - **Projections**: Estimated completion date based on current pace
  - **Elevation Profile Chart**: Visual bar chart of daily elevation gain
  - **Daily Miles Trend**: Line chart showing miles hiked per day
  - **Progress Metrics**: Percentage complete, days remaining, miles to go

### Map Features
- **Full AT Trail Display**: Complete 2,190-mile Appalachian Trail on home page map
  - Optimized trail data (40KB) for fast loading
  - Current location marker showing latest journal entry position
  - **Clickable marker popup**: Links directly to the latest journal entry
- **Dynamic Route Segments**: Each entry shows its trail section automatically
  - Routes calculated dynamically from entry GPS coordinates
  - Finds closest points on AT and displays trail between entries
  - No manual configuration needed for new entries
- **OpenTopoMap Tiles**: Topographic detail for trail visualization
- **Start/End Markers**: Green (start) and red (end) markers on each entry's route

### GPS & Location
- **Auto GPS Capture**: Automatic location detection when creating entries
- **Manual Coordinate Entry**: Click coordinates to edit manually (lat, lng format)
- **Editable Coordinates**: Update GPS on existing entries by tapping the display
- **Weather Auto-Fetch**: Current weather fetched automatically based on location

### Authentication
- **Admin Authentication**: Secure password-based login
- **Dual-Mode Support**: Cookie + token authentication for cross-domain deployment
- **7-Day Sessions**: Persistent login sessions

### Technical Features
- Full CRUD operations (Create, Read, Update, Delete)
- Photo management with file uploads and caption editing
- React Query for efficient data fetching/caching
- Recharts for data visualization and charting
- Cross-domain authentication support for Vibecode and local development
- Sample data seeding script (`bun run seed`)

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
│   │   ├── components/
│   │   │   ├── Navbar.tsx
│   │   │   ├── TrailMap.tsx           # Full AT trail map (home page)
│   │   │   ├── EntryMap.tsx           # Dynamic route segment map (entry pages)
│   │   │   ├── EditableCoordinates.tsx # Inline GPS coordinate editor
│   │   │   ├── EnhancedStats.tsx      # Statistics dashboard
│   │   │   ├── JournalEntry.tsx       # Entry display component
│   │   │   └── Timeline.tsx           # Timeline view
│   │   ├── pages/
│   │   │   ├── HomePage.tsx           # Map + stats overview
│   │   │   ├── TimelinePage.tsx       # All entries timeline
│   │   │   ├── EntryDetailPage.tsx    # Individual entry view
│   │   │   ├── NewEntryPage.tsx       # Create new entry
│   │   │   ├── EditEntryPage.tsx      # Edit existing entry
│   │   │   └── LoginPage.tsx          # Admin authentication
│   │   ├── hooks/
│   │   │   ├── use-entries.ts         # React Query hooks
│   │   │   ├── use-geolocation.ts     # GPS location hook
│   │   │   └── use-dynamic-trail-segment.ts # Dynamic route calculation
│   │   ├── context/
│   │   │   └── AuthContext.tsx        # Auth state management
│   │   ├── lib/
│   │   │   ├── api.ts                 # API client
│   │   │   └── transformEntries.ts    # Data transformation
│   │   ├── index.css                  # Design system & Tailwind
│   │   └── App.tsx                    # Main app with routing
│   ├── public/data/
│   │   ├── appalachian_trail.gpx      # Full AT route (26MB, source)
│   │   ├── at-trail-optimized.json    # Optimized trail for home map (40KB)
│   │   └── at-trail-indexed.json      # Indexed trail for segments (134KB)
│   └── scripts/
│       ├── optimize-gpx.ts            # Generate optimized trail JSON
│       └── create-trail-index.ts      # Generate indexed trail for segments
│
└── backend/
    ├── src/
    │   ├── routes/
    │   │   ├── admin.ts               # Authentication endpoints
    │   │   ├── entries.ts             # Journal CRUD endpoints
    │   │   ├── photos.ts              # Photo upload endpoints
    │   │   └── stats.ts               # Statistics endpoints
    │   ├── middleware/
    │   │   └── adminAuth.ts           # Admin session middleware
    │   ├── types.ts                   # Zod schemas for API contracts
    │   ├── prisma.ts                  # Prisma client setup
    │   └── index.ts                   # Hono app + middleware
    ├── scripts/
    │   └── seed-sample-data.ts        # Sample data generator
    └── prisma/
        ├── schema.prisma              # Database schema
        └── dev.db                     # SQLite database
```

## API Endpoints

All endpoints follow the `{ data: ... }` envelope pattern.

**Journal Entries**:
- `GET /api/entries` - List all entries (paginated)
- `GET /api/entries/:id` - Get specific entry with photos
- `POST /api/entries` - Create new entry (admin)
- `PUT /api/entries/:id` - Update entry including coordinates (admin)
- `DELETE /api/entries/:id` - Delete entry (admin)

**Photos**:
- `POST /api/entries/:id/photos/upload` - Upload photo file (multipart/form-data)
  - Accepts: JPEG, PNG, WebP, GIF (max 10MB)
  - Returns: Photo object with URL
- `PATCH /api/entries/:id/photos/:photoId` - Update photo caption (admin)
- `DELETE /api/entries/:id/photos/:photoId` - Delete photo (admin)

**Statistics**:
- `GET /api/stats` - Overall trail statistics with pace analytics and projections

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

Initialize database and run:
```bash
bunx prisma db push      # Create/update database schema
bunx prisma generate     # Generate Prisma client
bun run dev              # Runs on http://localhost:3000
```

**Step 2: Frontend Setup** (new terminal)

```bash
cd webapp
bun install
```

Create a `webapp/.env` file with:
```env
VITE_BACKEND_URL=http://localhost:3000
VITE_DISABLE_VIBECODE=true
```

Then run:
```bash
bun run dev  # Runs on http://localhost:8000
```

**Step 3: Access the App**

1. Open http://localhost:8000
2. Go to http://localhost:8000/admin to login
3. Enter your admin password
4. Start creating journal entries!

### Database Migrations

When the Prisma schema changes:

```bash
cd backend

# Development: Quick schema push (recommended for dev)
bunx prisma db push

# Production: Create migration file
bunx prisma migrate dev --create-only --name <migration-name>
bunx prisma migrate deploy
```

### Trail Data Regeneration

If you need to regenerate the optimized trail files:

```bash
cd webapp

# Regenerate home page trail (40KB, 2000 points)
bun run scripts/optimize-gpx.ts

# Regenerate indexed trail for dynamic segments (134KB, 5000 points)
bun run scripts/create-trail-index.ts
```

### Sample Data Seeding

To populate the database with 10 days of sample journal entries:

```bash
cd backend
bun run seed
```

This creates realistic trail entries with:
- GPS coordinates along the AT (Georgia to North Carolina section)
- Stock photos from picsum.photos
- Weather data
- Varied daily statistics

**Warning:** This will delete all existing entries!

### Hot Reload

Both servers run with hot reload:
- **Frontend**: http://localhost:8000 (Vite dev server)
- **Backend**: http://localhost:3000 (Bun watch mode)

## Deployment

### Environment Variables

**Backend (required)**
```env
PORT=3000
DATABASE_URL="file:./dev.db"
ADMIN_PASSWORD=<your-secure-password>
BETTER_AUTH_SECRET=<random-string>
DISABLE_VIBECODE=true
```

**Frontend (required)**
```env
VITE_BACKEND_URL=http://localhost:3000
VITE_DISABLE_VIBECODE=true
```

### Option 1: Vercel (Frontend) + Railway (Backend)

**Deploy Backend to Railway:**
1. Push code to GitHub
2. Create account at [Railway.app](https://railway.app)
3. New Project → Deploy from GitHub
4. Set root directory: `backend`
5. Add environment variables (see above)

**Deploy Frontend to Vercel:**
1. Create account at [Vercel.com](https://vercel.com)
2. New Project → Import from GitHub
3. Framework preset: Vite
4. Root directory: `webapp`
5. Add environment variables (see above)

### Option 2: Single VPS

See full deployment guide in the original README section.

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

---

## Future Improvements

### Phase 3C: Import/Export (Next)
- **GPX Import UI**: Upload GPX tracks from hiking apps (Gaia, AllTrails)
- **Export Features**: PDF journal export, JSON backup

### Phase 3D: Offline & PWA
- **PWA Support**: Offline mode for areas without service
- **Background Sync**: Queue entries when offline, sync when connected

### Suggested Refinements

#### Option A: Enhanced Map Interactivity
- **Click-to-set location**: Click on map to set GPS coordinates
- **Route preview**: Show estimated route before saving entry
- **Elevation profile on entry maps**: Mini elevation chart for each day

#### Option B: Social & Sharing Features
- **Public trail page**: Shareable link for friends/family to follow
- **Entry sharing**: Share individual entries to social media
- **Trail milestone badges**: Achievements for distances, states crossed

#### Option C: Data & Analytics Improvements
- **Gear tracking**: Log gear used, track pack weight over time
- **Resupply planning**: Mark town stops, track food/supplies
- **Trail section completion**: Visual progress through 14 states
- **Compare with previous hikers**: Pace comparison with historical data

#### Option D: Mobile Experience
- **Native app wrapper**: Capacitor/Expo wrapper for app store
- **Push notifications**: Reminders to log daily entries
- **Camera integration**: Direct photo capture within app

---

## Notes for Trail Use

- **Mobile First**: Designed for on-trail updates from your phone
- **Photos**: Upload directly from your phone's camera roll
- **GPS**: Works best outdoors with clear sky view
- **Connectivity**: Works great when you have service; offline mode coming soon
- **Battery**: Map rendering can be battery-intensive on older devices

---

Built with love for thru-hikers. Happy trails! 🥾
