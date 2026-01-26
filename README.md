# BigFun Hikes! - Appalachian Trail Journal

A beautiful web application for documenting your Appalachian Trail journey with journal entries, photos, and progress tracking.

## Overview

BigFun Hikes! is a mobile-first web app designed specifically for hikers documenting their Appalachian Trail thru-hike. Record your daily adventures with markdown journals, upload photos from the trail, track daily and cumulative miles, and maintain a beautiful personal record of your 2,190-mile journey.

## Current Features (v3.7)

### Core Functionality
- **Journal Entries**: Markdown-supported daily entries with date, title, and detailed reflections
- **Offline Mode**: Create journal entries without internet connection
  - Entries saved locally in IndexedDB when offline
  - Photos stored as base64 for offline queuing
  - Automatic sync when connection is restored
  - Manual "Sync Now" button available
  - Pending entries shown on Timeline page with status indicators
  - GPS coordinates captured offline (satellite-based, no internet needed)
- **Training Hikes**: Log pre-hike training entries that aren't counted in trail stats
  - Toggle between "Trail Entry" and "Training" when creating entries
  - Training entries use amber/orange styling for visual distinction
  - Training hikes can use day 0 or negative day numbers
  - Stats (total miles, elevation, projections) only include trail entries
  - **NEW: Training entries appear at top of Timeline** for easy access
- **GPX Import**: Import GPS tracks from your fitness watch (Suunto, Garmin, etc.)
  - Upload GPX files directly from your Suunto Vertical 2, Garmin, or other fitness watch
  - Automatically extracts distance, elevation gain, and route coordinates
  - Auto-fills miles hiked and GPS coordinates from your track data
  - Displays your actual recorded route on the entry map (red line for trail entries, amber for training)
  - Replaces the estimated AT segment with your actual GPS track when present
- **Suunto Watch Data Import**: Full fitness watch data analysis
  - Upload UI on entry forms - Import Suunto JSON directly when creating or editing entries
  - Auto-populate fields - Miles, elevation, date automatically filled from watch data
  - Combined GPX + Suunto - Use GPX for route display and Suunto for fitness metrics together
  - Import native Suunto JSON export files with comprehensive fitness metrics
  - **Heart Rate Analytics**: Average, min, max HR with time-in-zone distribution
    - Visual HR zone bar chart (Recovery, Easy, Aerobic, Threshold, Maximum)
    - HR over time chart
  - **Pace & Speed**: Average pace (min/mile), average/max speed
  - **Step Count**: Total steps with steps-per-mile calculation
  - **Calories Burned**: Energy expenditure from watch sensors
  - **Temperature**: Actual trail temperature recorded (min, avg, max)
  - **Elevation Profile**: Detailed altitude chart from barometric/GPS data
  - **Lap Splits Table**: Per-lap breakdown with duration, pace, HR, elevation, temperature
  - **Effort Score**: Calculated training intensity based on HR zones + elevation
  - Beautiful tabbed display with charts and statistics
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

### GPS & Location (UPDATED in v3.6)
- **Auto GPS Capture**: Automatic location detection when creating entries
- **Manual Coordinate Entry**: Click coordinates to edit manually (lat, lng format)
- **Editable Coordinates**: Update GPS on existing entries by tapping the display
- **Weather Auto-Fetch**: Current weather fetched automatically based on location
- **NEW: Reverse Geocoding**: Location name auto-populated from GPS coordinates
  - Uses OpenStreetMap Nominatim for free reverse geocoding
  - Automatically fills "Location Name" field when creating new entries
  - Shows loading indicator while looking up location
  - Edit page has a search button to look up location from existing coordinates
  - Prioritizes natural features, parks, trails over city names
  - US state abbreviations for cleaner display (e.g., "Suwanee Creek Greenway, Forsyth County, GA")
- **Full AT Trail Display**: Complete 2,190-mile Appalachian Trail on home page map
  - Optimized trail data (40KB) for fast loading
  - Current location marker showing latest journal entry position
  - **Clickable marker popup**: Links directly to the latest journal entry
- **Dynamic Route Segments**: Each entry shows its trail section automatically
  - Routes calculated dynamically from entry GPS coordinates
  - Finds closest points on AT and displays trail between entries
  - No manual configuration needed for new entries
  - **GPX Override**: When an entry has imported GPX data, displays your actual recorded route instead of the estimated AT segment
- **Training Location Maps**: Training entries show single location marker (no trail path)
  - Orange marker to match training entry styling
  - Popup shows training hike details
- **OpenTopoMap Tiles**: Topographic detail for trail visualization
- **Start/End Markers**: Green (start) and red (end) markers on each entry's route

### Map Features
- **Full AT Trail Display**: Complete 2,190-mile Appalachian Trail on home page map
  - Optimized trail data (40KB) for fast loading
  - Current location marker showing latest journal entry position
  - **Clickable marker popup**: Links directly to the latest journal entry
- **Dynamic Route Segments**: Each entry shows its trail section automatically
  - Routes calculated dynamically from entry GPS coordinates
  - Finds closest points on AT and displays trail between entries
  - No manual configuration needed for new entries
  - **GPX Override**: When an entry has imported GPX data, displays your actual recorded route instead of the estimated AT segment
- **Training Location Maps**: Training entries show single location marker (no trail path)
  - Orange marker to match training entry styling
  - Popup shows training hike details
- **OpenTopoMap Tiles**: Topographic detail for trail visualization
- **Start/End Markers**: Green (start) and red (end) markers on each entry's route

### Authentication
- **Admin Authentication**: Secure password-based login
- **Dual-Mode Support**: Cookie + token authentication for cross-domain deployment
- **7-Day Sessions**: Persistent login sessions
- **Rate Limiting**: Login attempts limited to 5 per 15 minutes per IP (v3.7)
- **Secure Tokens**: Cryptographically secure token generation (v3.7)
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
│   │   │   ├── GpxFileUpload.tsx      # GPX file upload component
│   │   │   ├── EditableCoordinates.tsx # Inline GPS coordinate editor
│   │   │   ├── EnhancedStats.tsx      # Statistics dashboard
│   │   │   ├── OfflineIndicator.tsx   # Connection status indicator
│   │   │   ├── PendingEntriesPanel.tsx # Offline entries management
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
│   │   │   ├── use-offline.ts         # Offline status and sync hooks
│   │   │   └── use-dynamic-trail-segment.ts # Dynamic route calculation
│   │   ├── context/
│   │   │   └── AuthContext.tsx        # Auth state management
│   │   ├── lib/
│   │   │   ├── api.ts                 # API client
│   │   │   ├── gpx-parser.ts          # GPX file parsing and distance calculations
│   │   │   ├── suunto-parser.ts       # Suunto JSON watch data parser
│   │   │   ├── offline-storage.ts     # IndexedDB storage for offline entries
│   │   │   ├── sync-service.ts        # Online/offline sync logic
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

### Suggested Next Steps

#### Training Hikes Enhancements
- **Training Stats Dashboard**: Separate statistics view for training progress
- **Training Goals**: Set and track pre-hike training targets (miles, elevation)

#### Phase 3C: Import/Export
- **Export Features**: PDF journal export, JSON backup

#### Phase 3D: Enhanced PWA
- **Service Worker**: Cache app shell for instant loading
- **Install Prompt**: Add to home screen functionality

### Other Refinements

#### Enhanced Map Interactivity
- **Click-to-set location**: Click on map to set GPS coordinates
- **Route preview**: Show estimated route before saving entry
- **Elevation profile on entry maps**: Mini elevation chart for each day

#### Social & Sharing Features
- **Public trail page**: Shareable link for friends/family to follow
- **Entry sharing**: Share individual entries to social media
- **Trail milestone badges**: Achievements for distances, states crossed

#### Data & Analytics Improvements
- **Gear tracking**: Log gear used, track pack weight over time
- **Resupply planning**: Mark town stops, track food/supplies
- **Trail section completion**: Visual progress through 14 states

#### Mobile Experience
- **Native app wrapper**: Capacitor/Expo wrapper for app store
- **Push notifications**: Reminders to log daily entries
- **Camera integration**: Direct photo capture within app

---

## Notes for Trail Use

- **Mobile First**: Designed for on-trail updates from your phone
- **Photos**: Upload directly from your phone's camera roll
- **GPS**: Works best outdoors with clear sky view (GPS works offline!)
- **Offline Mode**: Create entries without internet - they'll sync when you're back online
- **Battery**: Map rendering can be battery-intensive on older devices

---

Built with love for thru-hikers. Happy trails! 🥾
