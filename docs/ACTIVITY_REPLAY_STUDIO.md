# BigFun's Suunto Replay Studio

## Project Plan & Documentation

**Version**: 3.15 (15 Visual Styles - Added 5 New 3D Styles)
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

### New 6 Styles (v3.14)

#### 5. Terminal
**Color Palette**: Black (#0D0D0D) + Green (#00FF00) + Amber (#FFB000)
- **Monospace font everywhere** (JetBrains Mono)
- **ASCII art header** with "GPS FEED" banner
- **ASCII progress bar** `[████████░░░░░░░░] 52%`
- **Scrolling data log** showing real-time values
- **CRT scan lines** and blinking cursor

#### 6. Editorial
**Color Palette**: Off-white (#faf8f5) + Deep red (#991b1b) + Warm grays
- **Serif headlines** (Playfair Display)
- **Asymmetric editorial grid** - 7-column + 5-column sidebar
- **Pull quote style** for large stats with decorative letter badges
- **Drop caps** on summary text
- **Diamond divider** and ornamental elements

#### 7. Topographic
**Color Palette**: Cream/tan (#F5E6D3) + Contour browns (#8B6914) + Forest greens (#2D5016)
- **Map is hero** - 500px+ height, prominent
- **Compass rose** decoration in header
- **Coordinate display** in degrees/minutes/seconds (DMS format)
- **Legend-style stats panel**
- **Contour line styling** on route

#### 8. Cockpit
**Color Palette**: Dark gray/black (#1a1a1a) + Amber (#f59e0b) + Cyan (#06b6d4)
- **Aviation HUD aesthetic** - circular gauges for speed and heart rate
- **Altitude tape** - vertical elevation display
- **Heading indicator** - compass rose showing bearing
- **HUD overlays on map** - distance readout, coordinates, crosshairs
- **Glass cockpit feel** with digital readouts and glow effects

#### 9. Blueprint
**Color Palette**: Navy blue (#1e3a5f) + Cyan (#22d3ee) + White text
- **Technical drawing aesthetic** - grid pattern background
- **Dimension lines** with arrows for distance display
- **Technical specification layout** for stats
- **Ruler-style progress bar** with tick marks
- **Crosshair marker** and corner bracket decorations

#### 10. Field Journal
**Color Palette**: Cream paper (#faf6ed) + Forest green (#2d5016) + Brown (#6b4423)
- **Naturalist notebook style** - handwritten Caveat font
- **Lined paper texture** background
- **Stats as journal entries** with icons
- **Botanical corner decorations** - leaf/flower SVG flourishes
- **Compass rose** and sketched button styling

### New 5 3D Terrain Styles (v3.15)

#### 11. Athletic
**Color Palette**: Bold red (#dc2626) + White + Dark charcoal (#1f2937)
- **ESPN sports broadcast aesthetic** - scoreboard-style stats
- **LIVE indicator** with pulsing red dot
- **Live ticker/crawl** at bottom showing real-time metrics
- **Split times** displayed like race results
- **Full 3D terrain** with satellite view
- Camera modes: follow, overview, firstPerson

#### 12. Expedition
**Color Palette**: Aged tan (#d4a574) + Deep brown (#4a3728) + Gold (#b8860b)
- **National Geographic explorer style** - adventure documentary feel
- **Large brass compass** decoration
- **Expedition log format** for stats display
- **"Day X of Expedition"** header
- **Full 3D terrain** with dramatic exaggeration (2.8x)
- Camera modes: follow, overview, firstPerson

#### 13. Retro
**Color Palette**: Wood brown (#8b4513) + Orange (#ff6b00) + Cream (#f5deb3)
- **70s/80s analog equipment aesthetic** - hi-fi/car dashboard
- **Analog needle gauges** for speed and heart rate (SVG)
- **VU meter** style intensity indicator
- **Nixie tube displays** for numbers
- **Wood grain panel** backgrounds
- **Full 3D terrain** with satellite view
- Camera modes: follow, overview, firstPerson

#### 14. Noir
**Color Palette**: Pure black (#000000) + White (#ffffff) + Blood red (#8b0000)
- **Film noir cinematic** - high contrast black and white
- **Playfair Display** serif typography
- **Film grain overlay** effect
- **Vignette** around edges
- **Grayscale filter** on map (except blood red for HR)
- **Full 3D terrain** with moody atmosphere
- Camera modes: follow, overview, firstPerson

#### 15. Command
**Color Palette**: Military olive (#556b2f) + Warning amber (#ffa500) + Alert red (#ff4444)
- **Military tactical operations center** aesthetic
- **Grid-based tactical display** with three-panel layout
- **Mission briefing style stats** (OBJECTIVE, DISTANCE TO TARGET)
- **Status indicators** with military terminology
- **Radar sweep animation** effect
- **Grid overlay** on map
- **Full 3D terrain** with satellite view
- Camera modes: follow, overview, firstPerson

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
│       ├── TerminalPlayer/
│       ├── EditorialPlayer/
│       ├── TopographicPlayer/
│       ├── CockpitPlayer/
│       ├── BlueprintPlayer/
│       ├── FieldJournalPlayer/
│       ├── AthleticPlayer/
│       ├── ExpeditionPlayer/
│       ├── RetroPlayer/
│       ├── NoirPlayer/
│       └── CommandPlayer/

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
