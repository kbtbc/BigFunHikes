<stack>
  React 18 with Vite
  Use bun (not npm).
  React Router v6 for routing.
  React Query for server/async state.
  Tailwind v3 + shadcn/ui for styling and components.
  Framer Motion for animations.
  lucide-react for icons.
  Leaflet.js for maps with OpenTopoMap tiles.
  Recharts for data visualization.
  Pre-installed shadcn/ui components.
</stack>

<structure>
  src/pages/        — Page components (manually routed in App.tsx)
  src/components/
    ui/             — shadcn/ui components (pre-built)
    TrailMap.tsx    — Full AT trail display (home page)
    EntryMap.tsx    — Dynamic route segment map (entry pages)
    GpxFileUpload.tsx — GPX file upload with auto-parsing
    EditableCoordinates.tsx — Inline GPS coordinate editor
    EnhancedStats.tsx — Statistics dashboard with charts
  src/hooks/
    use-entries.ts  — React Query hooks for API
    use-geolocation.ts — GPS location capture
    use-dynamic-trail-segment.ts — Dynamic route calculation
  src/lib/
    api.ts          — API client with auth support
    gpx-parser.ts   — GPX parsing and distance/elevation calculations
    transformEntries.ts — Data transformation utilities
  public/data/
    appalachian_trail.gpx — Full AT route (26MB, source)
    at-trail-optimized.json — Optimized for home map (40KB)
    at-trail-indexed.json — Indexed for dynamic segments (134KB)
  scripts/
    optimize-gpx.ts — Generate optimized trail JSON
    create-trail-index.ts — Generate indexed trail
</structure>

<key_features>
  Entry Types:
  - Trail entries: Regular AT hiking days (included in stats)
  - Training entries: Pre-hike training (excluded from stats, amber styling)
  - Toggle between types on NewEntryPage
  - Training entries show single location marker on map (no trail path)

  GPX Import:
  - Upload GPX files from Suunto, Garmin, or other fitness watches
  - gpx-parser.ts handles parsing, distance, and elevation calculations
  - GpxFileUpload component provides UI with auto-fill
  - Auto-populates miles hiked, elevation gain, and GPS coordinates
  - EntryMap displays GPX tracks (red for trail, amber for training)
  - GPX track overrides AT segment estimation when present

  Maps:
  - TrailMap: Full AT trail on home page with current location marker
  - EntryMap: Dynamic route segment between entries (trail) or single marker (training)
  - Uses at-trail-indexed.json for segment calculation
  - Haversine distance to find closest points on trail
  - Supports GPX track overlay when imported

  GPS/Location:
  - Auto-capture via useGeolocation hook
  - Manual coordinate entry (click to edit)
  - EditableCoordinates component for inline editing
  - Weather auto-fetch from Open-Meteo API

  Authentication:
  - Dual-mode: cookie + Bearer token
  - API client handles auth headers automatically
  - AuthContext for state management
</key_features>

<typescript>
  Explicit type annotations for useState: `useState<Type[]>([])` not `useState([])`
  Null/undefined handling: use optional chaining `?.` and nullish coalescing `??`
  Include ALL required properties when creating objects — TypeScript is enabled.
  Make sure to use ternary operators instead of && for conditional rendering inside JSX.
</typescript>

<routing>
  React Router v6 for routing. Routes are manually registered in `src/App.tsx`.

  Current routes:
  - /           — HomePage (map + stats + latest entry)
  - /timeline   — TimelinePage (all entries)
  - /entry/:id  — EntryDetailPage (single entry with map)
  - /entry/new  — NewEntryPage (create entry)
  - /entry/:id/edit — EditEntryPage
  - /admin      — LoginPage
</routing>

<state>
  Always use React Query for server/async state.
  Always use object API: `useQuery({ queryKey, queryFn })`.

  Key hooks in use-entries.ts:
  - useEntries(page, pageSize) — List entries
  - useEntry(id) — Single entry with photos
  - useStats() — Trail statistics
  - useCreateEntry() — Create mutation
  - useUpdateEntry() — Update mutation (including coordinates)
  - useDeleteEntry() — Delete mutation
</state>

<backend>
  API base URL is available via import.meta.env.VITE_BACKEND_URL.
  DO NOT use localhost.

  API client in src/lib/api.ts handles:
  - Auth token injection
  - { data: ... } envelope unwrapping
  - Multipart uploads via api.raw()

  <shared_types>
    API contracts are defined as Zod schemas in ../backend/src/types.ts.
    Import and use them to validate responses.
  </shared_types>
</backend>

<design>
  Theme: Rugged meets modern — digital trail journal aesthetic.

  Color Palette:
  - Forest greens (#4a7c59, #2d5016) - Primary
  - Warm amber/orange (#f4a261, #e07a5f) - Accents
  - Earthy cream (#faf9f6, #f5f5dc) - Backgrounds
  - Deep charcoal (#2b2d42) - Text

  Typography:
  - Headings: "Outfit" (adventurous, modern)
  - Body: "Inter" (clean, readable)

  Use shadcn/ui components as building blocks.
  Mobile-first responsive design.
</design>

<scripts>
  Trail data regeneration:
  ```bash
  # Regenerate home page trail (40KB, 2000 points)
  bun run scripts/optimize-gpx.ts

  # Regenerate indexed trail for dynamic segments (134KB, 5000 points)
  bun run scripts/create-trail-index.ts
  ```
</scripts>
