# BigFun's Activity Replay Studio

## Project Plan & Documentation

**Version**: 1.0 (Planning Phase)
**Status**: In Development
**Route**: `/suunto/*`

---

## Overview

BigFun's Activity Replay Studio is a standalone sub-application within the BigFun Hikes! ecosystem. It allows users to upload Suunto JSON files and view their activities with beautiful, animated playback in **4 distinct visual styles**.

### Key Features
- **Drag-and-drop Suunto JSON upload**
- **4 unique Activity Player styles** to choose from
- **Shareable URLs** for replays (e.g., `/suunto/view/abc123`)
- **No authentication required** - open to all users
- **Demo mode** with pre-loaded sample data

---

## Architecture

### URL Structure
```
/suunto                    → Landing page (upload + demo)
/suunto/view/:id           → View a specific uploaded activity
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
│   └── suunto-uploads.ts            # Upload/retrieve API
└── prisma/
    └── schema.prisma                # + SuuntoUpload model
```

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

```prisma
model SuuntoUpload {
  id          String   @id @default(uuid())
  shareId     String   @unique @default(cuid())  // Short shareable ID
  filename    String                              // Original filename
  suuntoData  String                              // Full JSON data
  createdAt   DateTime @default(now())
  expiresAt   DateTime?                           // Optional expiration
  viewCount   Int      @default(0)                // Track popularity

  @@index([shareId])
  @@index([createdAt])
}
```

---

## API Endpoints

### Upload
```
POST /api/suunto/upload
Content-Type: multipart/form-data
Body: { file: <suunto.json> }

Response: {
  data: {
    id: "uuid",
    shareId: "abc123xyz",
    viewUrl: "/suunto/view/abc123xyz"
  }
}
```

### Retrieve
```
GET /api/suunto/:shareId

Response: {
  data: {
    id: "uuid",
    shareId: "abc123xyz",
    filename: "morning_hike.json",
    suuntoData: { ... parsed data ... },
    createdAt: "2026-01-27T...",
    viewCount: 42
  }
}
```

### Demo Data
```
GET /api/suunto/demo

Response: {
  data: {
    suuntoData: { ... sample training hike data ... }
  }
}
```

---

## Shared Components (Reused from Parent)

The sub-project will import these from the parent app:
- `@/lib/activity-data-parser.ts` - Unified data parsing
- `@/lib/suunto-parser.ts` - Suunto JSON parsing
- `@/components/ui/*` - shadcn/ui components
- Tailwind configuration and design tokens
- Mapbox GL setup

---

## Implementation Phases

### Phase 1: Foundation
- [ ] Add `SuuntoUpload` model to Prisma schema
- [ ] Create backend API routes (`/api/suunto/*`)
- [ ] Set up frontend routing (`/suunto/*`)
- [ ] Create landing page with upload UI
- [ ] Implement demo mode with sample data

### Phase 2: Classic Player
- [ ] Port current Activity Player with new color scheme
- [ ] Create style selector component
- [ ] Wire up to uploaded/demo data

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

### Phase 6: Polish
- [ ] Share functionality (copy link)
- [ ] Mobile responsiveness for all styles
- [ ] Loading states and error handling
- [ ] Performance optimization

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
- [ ] Shareable URLs work (`/suunto/view/:id`)
- [ ] Mobile-responsive on all styles
- [ ] Smooth 60fps playback on all styles

---

## Notes

- This sub-project is self-contained but shares core utilities
- No authentication required for basic usage
- Data persists in SQLite with optional expiration
- Consider adding rate limiting for uploads in production
