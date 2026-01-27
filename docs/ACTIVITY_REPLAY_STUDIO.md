# BigFun's Suunto Replay Studio

## Project Plan & Documentation

**Version**: 2.0 (10 Visual Styles Complete)
**Status**: Production Ready
**Route**: `/suunto/*`

---

## Quick Start Guide for Sub-Agents

This section provides essential context for any AI agent working on this sub-project.

### What This Is
A standalone sub-application for uploading and viewing Suunto fitness watch data with **10 unique visual styles**. It lives within the BigFun Hikes! project but is designed to be easily extractable.

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

### Demo Data Location
Sample Suunto JSON file: `backend/data/suwaneetrek-1.json`

---

## Overview

BigFun's Suunto Replay Studio is a standalone sub-application within the BigFun Hikes! ecosystem. It allows users to upload Suunto JSON files and view their activities with beautiful, animated playback in **10 distinct visual styles**.

### Key Features
- **Drag-and-drop Suunto JSON upload**
- **10 unique Activity Player styles** to choose from
- **Shareable URLs** for replays (e.g., `/suunto/view/abc123`)
- **No authentication required** - open to all users
- **Demo mode** with pre-loaded sample data

---

## The 10 Activity Player Styles

### Original 4 Styles

#### 1. Classic
**Color Palette**: Deep navy (#1a365d) + Coral accent (#f56565) + Cream (#faf5f0)
- Traditional layout with refined typography
- Reliable functionality, polished appearance

#### 2. Cinematic
**Color Palette**: Near-black (#0a0a0f) + Gold accents (#d4af37) + White text
- **Full-bleed map** (75%+ viewport) with letterbox bars
- **Auto-hiding controls** - fade when not in use
- **4 camera modes**: First Person, Follow, Cinematic (orbiting), Overview
- No charts - pure immersive experience

#### 3. Minimal
**Color Palette**: Pure white (#ffffff) + Light gray (#f5f5f5) + Soft blue (#4a90d9)
- **Typography-first** - Large hero stats (Distance, Time, Elevation, Pace)
- **Smaller map** (280px) - map is secondary to data
- **Outdoors map style** by default
- Scandinavian design aesthetic

#### 4. Dashboard
**Color Palette**: Slate gray (#1e293b) + Cyan (#06b6d4) + Purple (#8b5cf6)
- **Multi-panel grid layout** - map + stats + charts + summary
- **Live updating stats** with glow effects
- **Lap splits table** if available
- **All charts visible** simultaneously

### New 6 Styles (v3.13)

#### 5. Strava
**Color Palette**: White + Strava orange (#FC4C02) + Dark gray (#242428)
- **Activity feed card style** - looks like viewing on Strava
- **HR zones bar** - visual breakdown of time in each zone
- **Per-mile splits table** with best mile highlighted
- **Effort-based route coloring** on map

#### 6. Polaroid
**Color Palette**: Warm cream (#FDF8F3) + Sepia tones + Vintage browns (#8B7355)
- **Polaroid-framed map** with white border and tilt effect
- **Handwritten font** (Caveat) for labels
- **Tape/pushpin decorations** - scrapbook feel
- **Film strip progress bar** with sprocket holes

#### 7. Terminal
**Color Palette**: Black (#0D0D0D) + Green (#00FF00) + Amber (#FFB000)
- **Monospace font everywhere** (JetBrains Mono)
- **ASCII art header** with "GPS FEED" banner
- **ASCII progress bar** `[████████░░░░░░░░] 52%`
- **Scrolling data log** showing real-time values
- **CRT scan lines** and blinking cursor

#### 8. Neon
**Color Palette**: Deep purple (#0a0014) + Neon pink (#FF00FF) + Cyan (#00FFFF)
- **Heavy glow effects** on all accent elements
- **XP/Level progress bar** - distance as experience points
- **Achievement notifications** for distance milestones
- **Animated gradients** and perspective grid background

#### 9. Editorial
**Color Palette**: Off-white (#FAFAFA) + Rich black (#1A1A1A) + Deep red (#C41E3A)
- **Serif headlines** (Playfair Display)
- **Asymmetric editorial grid** - 7-column + 5-column sidebar
- **Pull quote style** for large stats
- **Drop caps** on summary text

#### 10. Topographic
**Color Palette**: Cream/tan (#F5E6D3) + Contour browns (#8B6914) + Forest greens (#2D5016)
- **Map is hero** - 500px+ height, prominent
- **Compass rose** decoration in header
- **Coordinate display** in degrees/minutes/seconds
- **Legend-style stats panel**
- **Contour line styling** on route

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
├── pages/suunto/
│   ├── SuuntoLandingPage.tsx
│   └── SuuntoViewerPage.tsx
│
├── components/suunto/
│   ├── StyleSelector.tsx
│   └── players/
│       ├── ClassicPlayer/
│       ├── CinematicPlayer/
│       ├── MinimalPlayer/
│       ├── DashboardPlayer/
│       ├── StravaPlayer/
│       ├── PolaroidPlayer/
│       ├── TerminalPlayer/
│       ├── NeonPlayer/
│       ├── EditorialPlayer/
│       └── TopographicPlayer/

backend/
├── data/suwaneetrek-1.json     # Demo data
├── src/routes/replay-studio.ts  # API routes
└── prisma/schema.prisma         # ReplayStudioUpload model
```

---

## API Endpoints

### Upload
```
POST /api/replay-studio/upload
Content-Type: multipart/form-data
Body: { file: <suunto.json> }
```

### Retrieve
```
GET /api/replay-studio/:shareId
```

### Demo Data
```
GET /api/replay-studio/demo
```

---

## Implementation Status ✅

- [x] Database model (`ReplayStudioUpload`)
- [x] Backend API routes (`/api/replay-studio/*`)
- [x] Frontend routing (`/suunto/*`)
- [x] Landing page with drag-drop upload
- [x] Demo mode with sample data
- [x] Style selector dropdown (10 styles)
- [x] All 10 player styles implemented
- [x] Share functionality (copy link)
- [x] Coral gradient styling on buttons

### Camera Improvements
- [x] Smoother camera motion with ease-out cubic easing
- [x] Throttled updates (250ms) to prevent jitter
- [x] Dynamic pitch based on elevation changes
- [x] Follow mode: zoom 15.5, pitch 50°
- [x] First Person mode: zoom 14.0, dynamic pitch 30-50°
- [x] Fog layer to soften terrain clipping
- [x] Reduced terrain exaggeration (1.8x)

---

## Notes

- This sub-project is self-contained but shares core utilities
- No authentication required for basic usage
- Data persists in SQLite with optional expiration
- All sub-project data is in `ReplayStudioUpload` table only
