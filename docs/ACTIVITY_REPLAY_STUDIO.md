# BigFun's Suunto Replay Studio

## Project Plan & Documentation

**Version**: 1.0 (Planning Phase)
**Status**: In Development
**Route**: `/suunto/*`

---

## Quick Start Guide for Sub-Agents

This section provides essential context for any AI agent working on this sub-project.

### What This Is
A standalone sub-application for uploading and viewing Suunto fitness watch data with 4 unique visual styles. It lives within the BigFun Hikes! project but is designed to be easily extractable.

### Key Principles
1. **Self-contained**: All sub-project code lives in specific directories (see File Structure)
2. **Separate data**: Uses `ReplayStudioUpload` table - NO access to parent app tables
3. **Shared utilities only**: Import parsers and UI components, NOT parent app business logic
4. **No auth required**: Public access for uploads and viewing

### Directory Locations
- **Frontend pages**: `webapp/src/pages/suunto/`
- **Frontend components**: `webapp/src/components/suunto/`
- **Backend routes**: `backend/src/routes/replay-studio.ts`
- **Documentation**: `docs/ACTIVITY_REPLAY_STUDIO.md` (this file)

### API Namespace
All backend routes use `/api/replay-studio/*` prefix.

### What You CAN Import
```typescript
// OK - Stateless utilities
import { parseActivityData } from "@/lib/activity-data-parser";
import { parseSuuntoJson } from "@/lib/suunto-parser";
import { Button, Card, Slider } from "@/components/ui/*";
```

### What You CANNOT Import
```typescript
// NOT OK - Parent app specific
import { useEntries } from "@/hooks/use-entries";  // ❌
import { JournalEntry } from "@/components/JournalEntry";  // ❌
import { EntryDetailPage } from "@/pages/EntryDetailPage";  // ❌
```

### Demo Data Location
Sample Suunto JSON file: `backend/data/suwaneetrek-1.json`

---

## Overview

BigFun's Suunto Replay Studio is a standalone sub-application within the BigFun Hikes! ecosystem. It allows users to upload Suunto JSON files and view their activities with beautiful, animated playback in **4 distinct visual styles**.

### Key Features
- **Drag-and-drop Suunto JSON upload**
- **4 unique Activity Player styles** to choose from
- **Shareable URLs** for replays (e.g., `/suunto/view/abc123`)
- **No authentication required** - open to all users
- **Demo mode** with pre-loaded sample data

### Design Goals
- **Self-contained**: Easily extractable into a separate standalone project
- **Separate data**: Own database table, no dependencies on parent app data
- **Shared utilities only**: Reuses parsers and UI components, not business logic
- **Independent routing**: All routes under `/suunto/*` namespace

---

## Architecture

### URL Structure
```
/suunto                    → Landing page (upload + demo)
/suunto/view/:shareId      → View a specific uploaded activity
/suunto/demo               → View demo activity with style selector
```

### File Structure
```
webapp/src/
├── pages/
│   └── suunto/
│       ├── SuuntoLandingPage.tsx    # Main landing with upload
│       ├── SuuntoViewerPage.tsx     # Activity viewer with styles
│       └── index.tsx                # Route exports
│
├── components/
│   └── suunto/
│       ├── SuuntoUploader.tsx       # Drag-drop file upload
│       ├── StyleSelector.tsx        # Theme picker UI
│       ├── DemoButton.tsx           # Quick demo access
│       │
│       └── players/                 # 4 Unique Player Styles
│           ├── ClassicPlayer/
│           │   ├── index.tsx
│           │   ├── ClassicMap.tsx
│           │   ├── ClassicControls.tsx
│           │   └── ClassicCharts.tsx
│           │
│           ├── CinematicPlayer/
│           │   ├── index.tsx
│           │   ├── CinematicMap.tsx
│           │   └── CinematicOverlay.tsx
│           │
│           ├── MinimalPlayer/
│           │   ├── index.tsx
│           │   ├── MinimalMap.tsx
│           │   └── MinimalStats.tsx
│           │
│           └── DashboardPlayer/
│               ├── index.tsx
│               ├── DashboardMap.tsx
│               └── DashboardPanels.tsx

backend/src/
├── routes/
│   └── replay-studio.ts             # All sub-project API routes
└── prisma/
    └── schema.prisma                # + ReplayStudioUpload model (separate table)

docs/
└── ACTIVITY_REPLAY_STUDIO.md        # This file (sub-project docs)
```

### Separation Strategy

**Separate Database Table**: `ReplayStudioUpload` (not `SuuntoUpload`)
- Prefixed to avoid confusion with parent app
- Contains all data needed for the sub-project
- No foreign keys to parent app tables

**Separate API Routes**: `/api/replay-studio/*`
- All endpoints namespaced under replay-studio
- Self-contained route file
- Easy to extract to separate backend

**Shared (Import Only)**:
- `@/lib/suunto-parser.ts` - Parsing logic (stateless utility)
- `@/lib/activity-data-parser.ts` - Data normalization (stateless utility)
- `@/components/ui/*` - shadcn/ui components (generic UI)
- Tailwind config (styling foundation)

**NOT Shared**:
- No imports from parent app pages
- No imports from parent app hooks (use-entries, etc.)
- No access to JournalEntry or Photo tables
- Own state management within sub-project

---

## The 4 Activity Player Styles

### 1. Classic (New Color Scheme)
**Theme**: Fresh take on our current player
**Color Palette**: Deep navy (#1a365d) + Coral accent (#f56565) + Cream (#faf5f0)

- Similar layout to current Activity Player
- Refined typography and spacing
- New color scheme (moving away from forest green)
- Same reliable functionality, polished appearance

### 2. Cinematic
**Theme**: Full-screen immersive experience
**Color Palette**: Near-black (#0a0a0f) + Gold accents (#d4af37) + White text

- **Full-bleed map** taking 80%+ of viewport
- **Glass-morphism floating controls** (translucent, blurred backgrounds)
- **Dramatic camera movements** with longer easing
- **Minimal UI** - controls fade when not in use
- **Large typography stats** overlay on map
- Auto-hide cursor during playback
- Cinematic letterbox bars (optional)

### 3. Minimal
**Theme**: Clean, data-focused, Scandinavian design
**Color Palette**: Pure white (#ffffff) + Light gray (#f7f7f7) + Black text (#111)

- **Split 50/50 layout**: Map left, stats right
- **Typography-heavy stats** - large numbers, small labels
- **Monospace fonts** for data
- **No gradients, minimal shadows**
- **Thin line charts** with dot markers
- Map uses light/grayscale style
- Subtle animations, no flourishes

### 4. Dashboard
**Theme**: Professional analytics/command center
**Color Palette**: Dark mode (#1a1a2e) + Cyan (#00d9ff) + Magenta (#ff006e) + Grid lines

- **Multi-panel layout** like a trading dashboard
- **Smaller map** with larger chart panels
- **Real-time updating numbers** with animation
- **Sparkline mini-charts** in stat cards
- **Grid/graph paper background**
- Glow effects on active elements
- Multiple data views visible simultaneously

---

## Database Schema

**Table**: `ReplayStudioUpload` (separate from parent app tables)

```prisma
model ReplayStudioUpload {
  id          String   @id @default(uuid())
  shareId     String   @unique @default(cuid())  // Short shareable ID
  filename    String                              // Original filename
  suuntoJson  String                              // Raw JSON data (as uploaded)
  parsedData  String                              // Parsed/normalized data for player
  createdAt   DateTime @default(now())
  expiresAt   DateTime?                           // Optional auto-cleanup
  viewCount   Int      @default(0)                // Analytics

  @@index([shareId])
  @@index([createdAt])
}
```

---

## API Endpoints

All endpoints under `/api/replay-studio/*` namespace.

### Upload
```
POST /api/replay-studio/upload
Content-Type: multipart/form-data
Body: { file: <suunto.json> }

Response: {
  data: {
    shareId: "abc123xyz",
    viewUrl: "/suunto/view/abc123xyz"
  }
}
```

### Retrieve
```
GET /api/replay-studio/:shareId

Response: {
  data: {
    shareId: "abc123xyz",
    filename: "morning_hike.json",
    parsedData: { ... normalized activity data ... },
    createdAt: "2026-01-27T...",
    viewCount: 42
  }
}
```

### Demo Data
```
GET /api/replay-studio/demo

Response: {
  data: {
    parsedData: { ... sample training hike data ... }
  }
}
```

---

## Shared Components (Reused from Parent)

The sub-project imports these **stateless utilities** from the parent app:
- `@/lib/activity-data-parser.ts` - Unified data parsing
- `@/lib/suunto-parser.ts` - Suunto JSON parsing
- `@/components/ui/*` - shadcn/ui components (Button, Card, Slider, etc.)
- Tailwind configuration and design tokens
- Mapbox GL setup

**These are safe to share** because they are:
- Stateless utility functions
- Generic UI components
- Configuration only

**NOT imported from parent**:
- Any page components
- Any hooks that access parent app state
- Any components that reference JournalEntry/Photo data

---

## Implementation Phases

### Phase 1: Foundation
- [ ] Add `ReplayStudioUpload` model to Prisma schema
- [ ] Create backend API routes (`/api/replay-studio/*`)
- [ ] Set up frontend routing (`/suunto/*`)
- [ ] Create landing page with upload UI
- [ ] Implement demo mode with sample data
- [ ] Create shared player wrapper component

### Phase 2: Classic Player
- [ ] Build Classic player with new color scheme (Navy + Coral)
- [ ] Create style selector component
- [ ] Wire up to uploaded/demo data
- [ ] Test full upload → view flow

### Phase 3: Cinematic Player
- [ ] Full-screen map layout
- [ ] Glass-morphism controls
- [ ] Dramatic camera modes
- [ ] Auto-hiding UI

### Phase 4: Minimal Player
- [ ] Split layout design
- [ ] Typography-focused stats
- [ ] Grayscale map style
- [ ] Clean chart styling

### Phase 5: Dashboard Player
- [ ] Multi-panel grid layout
- [ ] Animated number displays
- [ ] Multiple chart views
- [ ] Dark mode with glow effects

### Phase 6: Polish & Extraction Prep
- [ ] Share functionality (copy link)
- [ ] Mobile responsiveness for all styles
- [ ] Loading states and error handling
- [ ] Performance optimization
- [ ] Document extraction steps for standalone deployment

---

## Design Tokens (Per Style)

### Classic
```css
--classic-bg: #faf5f0;
--classic-card: #ffffff;
--classic-primary: #1a365d;
--classic-accent: #f56565;
--classic-text: #2d3748;
--classic-muted: #718096;
```

### Cinematic
```css
--cinema-bg: #0a0a0f;
--cinema-card: rgba(255,255,255,0.05);
--cinema-primary: #d4af37;
--cinema-accent: #ffffff;
--cinema-text: #ffffff;
--cinema-muted: rgba(255,255,255,0.5);
```

### Minimal
```css
--minimal-bg: #ffffff;
--minimal-card: #f7f7f7;
--minimal-primary: #111111;
--minimal-accent: #111111;
--minimal-text: #111111;
--minimal-muted: #888888;
```

### Dashboard
```css
--dash-bg: #1a1a2e;
--dash-card: #16213e;
--dash-primary: #00d9ff;
--dash-accent: #ff006e;
--dash-text: #ffffff;
--dash-muted: #4a5568;
--dash-grid: rgba(0,217,255,0.1);
```

---

## Success Criteria

- [ ] Users can upload Suunto JSON files without login
- [ ] All 4 player styles render correctly
- [ ] Styles are visually distinct and professional
- [ ] Demo mode works with sample data
- [ ] Shareable URLs work (`/suunto/view/:shareId`)
- [ ] Mobile-responsive on all styles
- [ ] Smooth 60fps playback on all styles
- [ ] **Sub-project can be extracted to standalone repo with minimal changes**

---

## Future: Extraction to Standalone Project

When ready to extract this sub-project into its own repository:

### Step 1: Create New Project Structure
```bash
mkdir activity-replay-studio
cd activity-replay-studio
mkdir -p webapp/src/{pages,components,lib}
mkdir -p backend/src/{routes,prisma}
mkdir docs
```

### Step 2: Copy Sub-Project Files
```bash
# Frontend
cp -r [parent]/webapp/src/pages/suunto/* webapp/src/pages/
cp -r [parent]/webapp/src/components/suunto/* webapp/src/components/
cp -r [parent]/webapp/src/components/ui/* webapp/src/components/ui/

# Backend
cp [parent]/backend/src/routes/replay-studio.ts backend/src/routes/
cp [parent]/backend/prisma/schema.prisma backend/prisma/  # Then trim to just ReplayStudioUpload

# Shared utilities
cp [parent]/webapp/src/lib/suunto-parser.ts webapp/src/lib/
cp [parent]/webapp/src/lib/activity-data-parser.ts webapp/src/lib/
cp [parent]/webapp/src/lib/gpx-parser.ts webapp/src/lib/

# Docs
cp [parent]/docs/ACTIVITY_REPLAY_STUDIO.md docs/README.md
```

### Step 3: Update Imports
- Change all `@/pages/suunto/` imports to `@/pages/`
- Change all `@/components/suunto/` imports to `@/components/`
- Update routing from `/suunto/*` to `/*`

### Step 4: Create Minimal Prisma Schema
```prisma
// backend/prisma/schema.prisma
datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model ReplayStudioUpload {
  id          String   @id @default(uuid())
  shareId     String   @unique @default(cuid())
  filename    String
  suuntoJson  String
  parsedData  String
  createdAt   DateTime @default(now())
  expiresAt   DateTime?
  viewCount   Int      @default(0)

  @@index([shareId])
  @@index([createdAt])
}
```

### Step 5: Create New package.json Files
Copy and trim dependencies from parent project.

### Step 6: Update Environment Variables
```env
# Backend
DATABASE_URL="file:./dev.db"
PORT=3000

# Frontend
VITE_BACKEND_URL=http://localhost:3000
VITE_MAPBOX_TOKEN=<your-token>
```

### Extraction Checklist
- [ ] All pages render without parent app dependencies
- [ ] All API routes work independently
- [ ] Database migrations run cleanly
- [ ] Demo mode works with bundled sample data
- [ ] All 4 player styles function correctly
- [ ] Share URLs work (`/view/:shareId`)

---

## Notes

- This sub-project is self-contained but shares core utilities
- No authentication required for basic usage
- Data persists in SQLite with optional expiration
- Consider adding rate limiting for uploads in production
- All sub-project data is in `ReplayStudioUpload` table only
