# Trail Tales - Project Analysis & Plan

## Current Project State (Updated: January 2026 - v3.19 LIVE)

### Overview

Trail Tales (BigFun Hikes!) is a full-featured web application for documenting Appalachian Trail thru-hikes. The app is now LIVE and recording real trail data.

**Production URL**: https://bigfunhikes.com
**Dev Environment**: https://dev.bigfunhikes.com (or local IP)

---

## COMPLETED FEATURES

### Backend (100% Complete)
- **Authentication**: Password-based admin login with cookies/tokens, 7-day sessions
- **Rate Limiting**: Login attempts limited to 5 per 15 minutes per IP (NEW v3.7)
- **Secure Tokens**: Cryptographically secure token generation with crypto.randomBytes (NEW v3.7)
- **Constant-Time Comparison**: Timing-safe password verification (NEW v3.7)
- **Database**: Prisma SQLite with JournalEntry, Photo models
- **CRUD Routes**: All journal entry and photo management endpoints
- **Statistics**: Enhanced stats with pace analytics, projections, elevation profile
- **Photo Management**: Upload, caption editing, deletion
- **Photo EXIF Extraction**: GPS coordinates and timestamps automatically extracted from uploaded photos (NEW v3.16)
- **Entry Types**: Support for "trail" and "training" entry types
- **GPS/Weather Fields**: latitude, longitude, locationName, weather in schema
- **Suunto Data**: Full fitness watch data storage and retrieval
- **Zod Schemas**: Full type safety for all API contracts

### Frontend (100% Complete)
- **Authentication**
  - Admin login page with dual-mode auth (cookie + token)
  - 7-day persistent sessions
  - Cross-domain authentication support
  - **Rate limiting on login** (NEW v3.7)

- **Security Improvements (NEW v3.7)**
  - XSS protection with rehype-sanitize for markdown
  - Map memory leak fix (setTimeout cleanup)
  - Protected route guards for admin pages
  - Image lazy loading with error handling
  - Global ErrorBoundary with recovery UI
  - React Query caching configuration (5min stale, 10min gc)

- **Mobile Optimizations (NEW v3.18)**
  - Safe area insets for notched phones (iPhone, modern Android)
  - Touch-optimized tap handling (no 300ms delay via touch-action: manipulation)
  - Browser chrome color matching via theme-color meta tags
  - Reduced motion support for accessibility (prefers-reduced-motion)
  - Non-blocking font loading via preload for faster initial render
  - Dynamic viewport height (100dvh) for mobile browsers
  - Improved aria-labels on icon-only buttons for screen readers
  - Lazy-loaded YouTube iframe to reduce initial load time

- **Pages**
  - HomePage: Stats dashboard, full AT trail map, YouTube integration
  - TimelinePage: Chronological entry list with training/trail distinction
  - EntryDetailPage: Full entry view, photo carousel, entry navigation, Suunto stats
  - NewEntryPage: Create entries with GPS auto-capture, weather fetch, GPX import
  - EditEntryPage: Modify entries, edit photo captions, update coordinates
  - LoginPage: Admin authentication

- **Components**
  - Navbar with navigation and logout
  - EnhancedStats: Pace analytics, personal records, projections, charts
  - TrailMap: Full 2,190-mile AT with current location marker
  - EntryMap: Dynamic route segments between entries
  - GpxFileUpload: Import GPS tracks from fitness watches
  - EditableCoordinates: Inline GPS coordinate editing
  - OfflineIndicator: Connection status display
  - PendingEntriesPanel: Manage offline entries
  - Timeline: Entry list with training entry styling
  - JournalEntry: Entry cards with photo display
  - **SuuntoStatsDisplay**: Comprehensive fitness watch data visualization (NEW v3.4)

- **Design System**
  - Tailwind CSS + shadcn/ui components
  - Forest greens + warm amber/orange color palette
  - "Outfit" headings, "Inter" body fonts
  - Mobile-responsive design

### Map Features (100% Complete)
- Full AT trail display (optimized 40KB JSON)
- OpenTopoMap topographic tiles
- Dynamic route segments from GPS coordinates
- GPX track override (shows actual recorded route)
- **Suunto GPS track display** (NEW v3.4) - routes from watch JSON data
- Training location markers (amber, single point)
- Trail entry routes (red polylines with start/end markers)
- Clickable markers linking to entries

### GPS & Location (100% Complete)
- Browser Geolocation API integration
- Auto GPS capture when creating entries
- Manual coordinate entry/editing
- GPS works offline (satellite-based)
- **NEW: Reverse Geocoding** (v3.6) - Auto-populate location name from coordinates
  - Uses OpenStreetMap Nominatim API (free, no key required)
  - Automatically fills location name when creating new entries
  - Edit page has search button for manual lookup
  - Prioritizes natural features and parks over city names
  - US state abbreviations for cleaner display

### Weather Integration (100% Complete)
- Open-Meteo API (no API key required)
- Auto-fetch based on GPS coordinates
- Stores: temperature, conditions, humidity, wind
- Display in entry detail views

### Offline Mode (100% Complete)
- IndexedDB storage for offline entries
- Photos stored as base64 for offline queuing
- Automatic sync when connection restored
- Manual "Sync Now" button
- Pending entries shown with status indicators

### Training Hikes (100% Complete)
- Toggle between "Trail Entry" and "Training"
- Amber/orange styling for visual distinction
- Day 0 or negative day numbers allowed
- Stats only include trail entries
- **NEW: Training entries appear at top of Timeline** (v3.6) - Easy access to training hikes

### GPX Import (100% Complete)
- File upload component
- Auto-extract distance, elevation, coordinates
- Display actual recorded route on maps
- Support for Suunto, Garmin, and other fitness watches

### Suunto Watch Data Import (UPDATED v3.6 - 100% Complete)
- **Native JSON import**: Parse Suunto watch export files directly
- **Upload UI in Entry Forms**: Import Suunto JSON directly when creating or editing entries
- **Auto-populate Fields**: Miles, elevation gain, date filled automatically from watch data
- **Combined GPX + Suunto**: Use GPX for route display and Suunto for fitness metrics together
- **Lap Splits from Windows array**: Correctly parses lap data from DeviceLog.Windows (fixed v3.6)
- **Heart Rate Analytics**:
  - Average, min, max BPM display
  - Time-in-zone distribution (Recovery, Easy, Aerobic, Threshold, Maximum)
  - Visual HR zone bar chart
  - HR over time chart
- **Pace & Speed**: Average pace (min/mile), average/max speed
- **Step Count**: Total steps with steps-per-mile calculation
- **Calories Burned**: Energy expenditure from watch sensors
- **Temperature**: Actual trail temperature recorded (min, avg, max) in F and C
- **Elevation Profile**: Detailed altitude chart from barometric/GPS data
- **Lap Splits Table**: Per-lap breakdown with duration, pace, HR, elevation, temperature
- **Effort Score**: Calculated training intensity based on HR zones + elevation
- **GPS Track Extraction**: Route displayed on map from watch GPS data
- **Beautiful Tabbed Display**: Heart Rate, Elevation, and Lap Splits tabs
- Works for both training and trail entries

### Activity Player - Relive Style Playback (NEW v3.8 - 100% Complete)
- **Animated Map Playback**: Mapbox GL with outdoor terrain and moving marker
- **Synchronized Charts**: Heart rate, elevation, and speed charts follow playback position
- **Heatmap Route Coloring**: Route colored by speed, heart rate, or elevation gradient
- **Playback Controls**: Play/pause, speed (0.5x-4x), scrub bar, skip forward/back
- **Auto-Detection**: Works with both Suunto JSON and GPX data sources
- **Photo Pins**: Photos displayed on map at their locations
- **Unified Data Parser**: Normalizes Suunto JSON and GPX into common format
  - Resamples data to consistent 5-second intervals
  - Computes derived metrics (cumulative distance, grade, moving vs stopped)
  - Smooths elevation to reduce GPS noise
- Expandable collapsible section on entry detail pages
- Only shows when GPS track data is available
- Components: ActivityMap, ActivityCharts, PlaybackControls

### Activity Player Enhancements (v3.9-3.11, v3.16 - 100% Complete)
- **3D Terrain Mode**: Toggle Mapbox GL terrain extrusion with 2.5x exaggeration
  - Sky atmosphere layer for realistic horizon
  - Adjusts pitch automatically when enabled
  - Satellite map style toggle
- **Camera Modes**: Three distinct viewing perspectives
  - **Follow**: Smooth pan keeping marker centered, 45-60° pitch
  - **Overview**: User-controlled camera, no automatic movement
  - **First-Person**: Looks ahead in direction of travel, high pitch (60-75°), closer zoom
- **Photo Timestamps**: Smart photo-to-timeline matching
  - Matches photos to GPS coordinates when available
  - Falls back to timestamp matching against entry date
  - Photos fade in during playback as they're "reached"
- **Segment Highlighting**: Interactive chart-to-map connection
  - Click and drag on any chart to select a time range
  - Selected segment highlighted in yellow on the map
  - Map flies to selected segment automatically
  - Double-click to clear selection
- **Camera Smoothness (v3.10)**: Major improvements to playback fluidity
  - Follow mode uses panTo() for smoother continuous motion
  - Linear easing for natural movement feel
  - Zoom only adjusted when significantly off-target (>0.3 difference)
  - Camera throttle reduced to 150ms for responsive tracking
  - First-person bearing lerp factor reduced to 0.08 for gentler turns
- **Photo Markers Fix (v3.10)**: Photos now display correctly on map
  - Fixed GPS coordinate matching to actual route
  - Seed data updated with coordinates along the actual Suunto track
  - Debug logging added for photo matching troubleshooting
- **Clickable Photo Markers (v3.11)**: Interactive photo icons on map
  - Click any photo marker to scroll carousel to that photo
  - Carousel scrolls into view automatically
  - JournalEntry exposes scrollToPhoto via forwardRef
- **Relocated Activity Player (v3.11)**: Better integration with entry page
  - Moved player directly below journal content
  - Closer proximity to photo carousel for linked interaction
- **Photo EXIF Extraction (v3.16)**: Automatic GPS from phone photos
  - EXIF GPS coordinates extracted on upload using exifr library
  - DateTimeOriginal/CreateDate extracted for timestamp matching
  - Photos snapped to closest point on trail route (within 500m)
  - Better distance calculation using approximate meters
- **Map Info Overlay (v3.11)**: Branding and temperature on map
  - "BigFun Hikes!" logo text in upper-left corner
  - Temperature displayed in amber next to logo
  - Semi-transparent dark background with blur effect
- **Default 3D + Satellite (v3.11)**: Better initial experience
  - Activity Player now starts with 3D terrain enabled
  - Satellite map style enabled by default

### BigFun's Suunto Replay Studio (v3.12-3.13 - 100% Complete)
- **Standalone Sub-Application**: Self-contained project at `/suunto/*` routes
- **Drag-and-Drop Upload**: Upload Suunto JSON files directly with react-dropzone
- **Shareable URLs**: Get unique share links like `/suunto/view/abc123`
- **10 Visual Styles** (v3.13): Ten distinct Activity Player themes
  - **Classic**: Navy (#1a365d) + Coral (#f56565) with cream backgrounds
  - **Cinematic**: Full-screen immersive with gold accents, letterbox bars, auto-hiding controls
  - **Minimal**: Typography-focused Scandinavian design, white/blue, large hero stats
  - **Dashboard**: Professional analytics multi-panel view with charts, live stats, lap splits
  - **Strava** (NEW): Athletic/performance focused with HR zones bar, splits table, orange accent
  - **Polaroid** (NEW): Vintage photo aesthetic with handwritten fonts, film strip progress
  - **Terminal** (NEW): Hacker CLI style with ASCII art, green/amber on black, scrolling data log
  - **Neon** (NEW): Cyberpunk gaming with glow effects, XP bar, achievement notifications
  - **Editorial** (NEW): Magazine layout with serif headlines, pull quotes, asymmetric grid
  - **Topographic** (NEW): Cartography focused with compass rose, coordinate display, legend stats
- **Demo Mode**: Try the player with sample data before uploading
- **No Authentication**: Public access for easy sharing
- **Separate Database**: Uses own `ReplayStudioUpload` table (no parent app dependencies)
- **Camera Improvements**: Smoother motion with ease-out easing, dynamic pitch, reduced terrain clipping
- **Extraction Ready**: Designed for future standalone deployment

### Enhanced Statistics (100% Complete)
- 7-day moving average pace
- Personal records (longest day, biggest climb, streak)
- Projected completion date
- Elevation profile bar chart
- Daily miles trend line chart
- Percentage complete, days remaining

---

## Database Schema (Current)

```prisma
model JournalEntry {
  id                   String   @id @default(uuid())
  date                 DateTime
  dayNumber            Int
  title                String
  content              String
  milesHiked           Float
  elevationGain        Int?
  totalMilesCompleted  Float
  latitude             Float?
  longitude            Float?
  locationName         String?
  weather              String?      // JSON weather data
  gpxData              String?      // GPX track data
  suuntoData           String?      // Parsed Suunto watch data (JSON string) - NEW v3.4
  entryType            String   @default("trail") // "trail" | "training"
  createdAt            DateTime @default(now())
  updatedAt            DateTime @updatedAt
  photos               Photo[]

  @@index([date])
  @@index([dayNumber])
  @@index([entryType])
}

model Photo {
  id             String       @id @default(uuid())
  journalEntryId String
  journalEntry   JournalEntry @relation(fields: [journalEntryId], references: [id], onDelete: Cascade)
  url            String
  caption        String?
  order          Int
  createdAt      DateTime     @default(now())

  @@index([journalEntryId])
}
```

---

## API Endpoints (All Working)

### Journal Entries
```
GET    /api/entries              List all entries (paginated)
GET    /api/entries/:id          Get single entry with photos + suuntoData
POST   /api/entries              Create entry (admin)
PUT    /api/entries/:id          Update entry (admin)
DELETE /api/entries/:id          Delete entry (admin)
```

### Photos
```
POST   /api/entries/:id/photos/upload    Upload photo (multipart/form-data)
PATCH  /api/entries/:id/photos/:photoId  Update photo caption (admin)
DELETE /api/entries/:id/photos/:photoId  Delete photo (admin)
```

### Statistics & Auth
```
GET    /api/stats                Stats with pace analytics & projections
GET    /api/admin/session        Check session
POST   /api/admin/login          Login
POST   /api/admin/logout         Logout
```

---

## Project Architecture

### Frontend Structure
```
webapp/src/
├── pages/
│   ├── HomePage.tsx           # Map + stats + YouTube
│   ├── TimelinePage.tsx       # All entries list
│   ├── EntryDetailPage.tsx    # Single entry view + Suunto stats
│   ├── NewEntryPage.tsx       # Create with GPS/weather/GPX
│   ├── EditEntryPage.tsx      # Edit entry + captions
│   └── LoginPage.tsx          # Admin authentication
├── components/
│   ├── Navbar.tsx             # Navigation
│   ├── EnhancedStats.tsx      # Stats dashboard + charts
│   ├── TrailMap.tsx           # Full AT map (home)
│   ├── EntryMap.tsx           # Dynamic route segments
│   ├── GpxFileUpload.tsx      # GPX import
│   ├── SuuntoStatsDisplay.tsx # Suunto watch data display (NEW v3.4)
│   ├── EditableCoordinates.tsx
│   ├── OfflineIndicator.tsx
│   ├── PendingEntriesPanel.tsx
│   ├── JournalEntry.tsx
│   ├── Timeline.tsx
│   └── /ui/                   # shadcn components
├── hooks/
│   ├── use-entries.ts         # React Query hooks
│   ├── use-geolocation.ts     # GPS location
│   ├── use-offline.ts         # Offline status & sync
│   └── use-dynamic-trail-segment.ts
├── lib/
│   ├── api.ts                 # API client
│   ├── gpx-parser.ts          # GPX parsing
│   ├── suunto-parser.ts       # Suunto JSON parsing (NEW v3.4)
│   ├── offline-storage.ts     # IndexedDB
│   ├── sync-service.ts        # Online/offline sync
│   └── transformEntries.ts
└── context/
    └── AuthContext.tsx        # Auth state
```

### Backend Structure
```
backend/src/
├── index.ts              # Main entry + middleware
├── prisma.ts             # Database client
├── types.ts              # Zod schemas (shared contracts)
├── tokenStore.ts         # Session tokens
├── suunto-parser.ts      # Suunto JSON parsing for seed (NEW v3.4)
├── middleware/
│   └── adminAuth.ts      # Auth middleware
└── routes/
    ├── admin.ts          # Auth routes
    ├── entries.ts        # Entry CRUD
    ├── photos.ts         # Photo management
    └── stats.ts          # Statistics
```

### Trail Data Files
```
webapp/public/data/
├── appalachian_trail.gpx      # Full AT route (26MB source)
├── at-trail-optimized.json    # Home map (40KB, 2000 points)
└── at-trail-indexed.json      # Dynamic segments (134KB, 5000 points)
```

---

## NEXT STEPS (Suggested Priorities)

### Phase 2: UX Improvements (High Priority)
- [ ] **Bulk Photo Upload**: Drag-and-drop multiple photos at once with progress indicator
- [ ] **Entry Templates**: Pre-fill common fields based on previous entries
- [ ] **Quick Entry Mode**: Simplified form for rapid trail logging (just miles + notes)

### Phase 3: Watch Data Enhancements (Medium Priority)
- [ ] **Garmin FIT Support**: Extend parser to support Garmin FIT files
- [ ] **Apple Watch Health Export**: Support importing workout data from Apple Health exports
- [ ] **Watch Data Comparison**: Compare fitness metrics between hikes (HR trends, pace improvement)

### Phase 4: Training Analytics Dashboard (Medium Priority)
- [ ] Separate training stats page with cumulative training metrics
- [ ] Training volume charts (weekly/monthly miles, elevation)
- [ ] Training goals and progress tracking
- [ ] **Fitness Readiness Score**: Combine HR, elevation gain, and mileage to track conditioning

### Phase 5: Export & Sharing (Future)
- [ ] **Video Export**: Render Activity Player to MP4 with FFmpeg (server-side)
- [ ] PDF journal export with stats and photos
- [ ] JSON backup/restore for all entries
- [ ] Share entry as image for social media

### Phase 6: Activity Player Advanced (Future)
- [ ] **Minimap**: Small overview map showing full route with current position
- [ ] **Split Screen**: Side-by-side chart and map view
- [ ] **Lap Markers**: Show lap/mile markers on the route during playback
- [ ] **Voice Narration**: Text-to-speech reading of journal entry synced to playback

---

## Development Setup

### Prerequisites
- [Bun](https://bun.sh/) (for backend)
- Node.js v18+ (for frontend)

### Quick Start
```bash
# Terminal 1: Backend
cd backend
bun install
bunx prisma db push
bun run dev  # http://localhost:3000

# Terminal 2: Frontend
cd webapp
bun install
bun run dev  # http://localhost:8000

# Access
# Frontend: http://localhost:8000
# Admin: http://localhost:8000/admin
```

### Environment Variables

**Backend (.env)**
```env
PORT=3000
DATABASE_URL="file:./dev.db"
ADMIN_PASSWORD=<your-password>
BETTER_AUTH_SECRET=<random-string>
DISABLE_VIBECODE=true
ALLOWED_ORIGINS="https://bigfunhikes.com,https://dev.bigfunhikes.com"
```

**Frontend (.env)**
```env
VITE_BACKEND_URL=https://bigfunhikes.com:3000
VITE_DISABLE_VIBECODE=true
VITE_MAPBOX_TOKEN=<your-mapbox-token>
```

### Database Safety (IMPORTANT for Production)

**Never use these commands on production:**
- `bunx prisma migrate reset` - Deletes ALL data
- `bun run seed` - Deletes ALL entries
- `bunx prisma db push --force-reset` - Drops tables

**Safe migration workflow:**
```bash
# 1. Always backup first
bun run scripts/export-db.ts

# 2. Create migration (does not modify DB)
bunx prisma migrate dev --create-only --name <name>

# 3. Review SQL in prisma/migrations/<timestamp>/migration.sql

# 4. Apply migration
bunx prisma migrate deploy
bunx prisma generate
```

### Database Backup & Restore

```bash
# Export all data to JSON
bun run scripts/export-db.ts
# Output: exports/backup_<timestamp>.json

# Restore from backup
bun run scripts/import-db.ts exports/backup_<timestamp>.json

# Quick SQLite backup
cp prisma/dev.db prisma/dev.db.backup
```

### Sample Data
```bash
cd backend
bun run seed  # Creates 11 sample entries including training hike with Suunto data (WARNING: deletes existing!)
```

---

## Success Criteria Summary

### Core Features - ALL COMPLETE
- [x] Authentication system functional
- [x] All CRUD operations work
- [x] Photos upload and display
- [x] Mobile-responsive design
- [x] GPS auto-capture working
- [x] Weather auto-fetch working
- [x] Enhanced statistics with charts
- [x] Full AT trail map display
- [x] Dynamic route segments
- [x] GPX track import
- [x] Training hike support
- [x] Offline mode with sync
- [x] Photo caption editing
- [x] **Suunto watch data import and display** (v3.4)
- [x] **GPS route from Suunto data** (v3.4)
- [x] **HR zones, pace, steps, calories, temperature display** (v3.4)
- [x] **Lap splits table** (v3.4)
- [x] **Suunto upload UI in entry forms** (v3.5)
- [x] **Auto-populate fields from Suunto data** (v3.5)
- [x] **Combined GPX + Suunto support** (v3.5)
- [x] **Lap splits parsing fixed** (v3.6) - reads from DeviceLog.Windows
- [x] **Reverse geocoding for location names** (v3.6)
- [x] **Training entries sorted to top of Timeline** (v3.6)
- [x] **Rate limiting on admin login** (NEW v3.7)
- [x] **Cryptographically secure tokens** (NEW v3.7)
- [x] **XSS protection for markdown** (NEW v3.7)
- [x] **Map memory leak fix** (NEW v3.7)
- [x] **Protected route guards** (NEW v3.7)
- [x] **Image lazy loading with error handling** (NEW v3.7)
- [x] **Global ErrorBoundary** (NEW v3.7)
- [x] **Activity Player** (NEW v3.8) - Relive-style animated activity playback with Mapbox GL
- [x] **Synchronized playback charts** (NEW v3.8) - HR, elevation, speed charts follow marker
- [x] **Heatmap route coloring** (NEW v3.8) - Route colored by speed, HR, or elevation
- [x] **Unified activity data parser** (NEW v3.8) - Suunto JSON + GPX auto-detection
- [x] **3D Terrain Mode** (NEW v3.9) - Mapbox GL terrain extrusion with sky atmosphere
- [x] **Camera Modes** (NEW v3.9) - Follow, Overview, and First-Person perspectives
- [x] **Photo Timestamps** (NEW v3.9) - Photos matched to GPS/timeline for timed display
- [x] **Segment Highlighting** (NEW v3.9) - Click charts to highlight map sections
- [x] **Satellite Map Toggle** (NEW v3.10) - Switch between outdoor and satellite styles
- [x] **Smoother Camera Tracking** (NEW v3.10) - panTo with linear easing, zoom stability
- [x] **Photo Markers Fix** (NEW v3.10) - Correct GPS coordinate matching for photos
- [x] **Clickable Photo Markers** (NEW v3.11) - Click map photos to scroll carousel
- [x] **Relocated Activity Player** (NEW v3.11) - Moved below journal content for better UX
- [x] **Map Info Overlay** (NEW v3.11) - "BigFun Hikes!" branding + temperature on map
- [x] **Default 3D + Satellite** (NEW v3.11) - Activity Player starts with 3D terrain and satellite enabled
- [x] **Unified Watch Data Upload** (NEW v3.17) - Single input auto-detects GPX vs Suunto JSON format
- [x] **Mobile Health Stats Layout** (NEW v3.17) - Compact card design prevents text truncation on mobile
- [x] **HEIC/HEIF Photo Support** (NEW v3.17) - iPhone photo format now supported for uploads
- [x] **Photo Marker Clickability** (NEW v3.17) - Fixed z-index and click handling during playback

---

## NEXT STEPS (Suggested Priorities)

### Phase 1: Activity Player Polish (High Priority)
- [ ] **Playback Speed Indicator**: Visual feedback showing current playback speed on map
- [ ] **Photo Popup on Hover**: Show photo preview when hovering over photo markers
- [ ] **Elevation-Aware Camera**: Adjust camera altitude based on terrain height in first-person mode

### Phase 2: UX Improvements (Medium Priority)
- [ ] **Bulk Photo Upload**: Drag-and-drop multiple photos at once with progress indicator
- [ ] **Entry Templates**: Pre-fill common fields based on previous entries
- [ ] **Quick Entry Mode**: Simplified form for rapid trail logging (just miles + notes)

---

Happy trails!
