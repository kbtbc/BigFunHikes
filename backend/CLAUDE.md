<stack>
  Bun runtime, Hono web framework, Zod validation.
</stack>

<structure>
  src/index.ts     — App entry, middleware, route mounting
  src/routes/      — Route modules (admin, entries, photos, stats)
  src/middleware/  — Middleware (adminAuth.ts for protected routes)
  src/types.ts     — Shared Zod schemas for API contracts
  scripts/         — Utility scripts (seed-sample-data.ts)
  prisma/          — Database schema and migrations
</structure>

<routes>
  Current routes:
  - /api/admin/*     — Authentication (login, logout, session)
  - /api/entries/*   — Journal entry CRUD with coordinates
  - /api/entries/:id/photos/* — Photo upload and management
  - /api/stats       — Trail statistics and analytics

  All endpoints follow { data: ... } envelope pattern.
  Protected routes use requireAdminAuth middleware.
</routes>

<shared_types>
  Define all API contracts in src/types.ts as Zod schemas.
  This file is the single source of truth — both backend and frontend import from here.

  Key schemas:
  - entryTypeSchema: z.enum(["trail", "training"])
  - createJournalEntrySchema: New entry with lat/lng, weather, entryType
  - updateJournalEntrySchema: Partial updates including coordinates, entryType
  - journalEntryResponseSchema: Full entry response with photos
  - updatePhotoSchema: Photo caption updates

  Stats endpoint only includes entries where entryType = "trail".
</shared_types>

<database>
  Prisma v6 with SQLite for data persistence.

  Models:
  - JournalEntry: Daily hiking journal entries with location, miles, elevation, weather
  - Photo: Photos attached to journal entries with captions and ordering

  Key fields on JournalEntry:
  - entryType: "trail" | "training" (default: "trail") - Training entries excluded from stats
  - dayNumber: Integer (0 or negative allowed for training entries)
  - latitude/longitude: GPS coordinates (nullable)
  - locationName: Human-readable location (e.g., "Springer Mountain, GA")
  - weather: JSON string with temperature, conditions, wind

  Database commands:
  - Development: bunx prisma db push
  - Production migrations: bunx prisma migrate dev --create-only --name <name>
  - Apply migrations: bunx prisma migrate deploy
  - View database: bun run studio (Prisma Studio on port 3001)
</database>

<authentication>
  Dual-mode authentication (cookie + token) for cross-domain support.

  Routes:
  - POST /api/admin/login: Validates password, sets session cookie + returns token
  - POST /api/admin/logout: Clears session cookie
  - GET /api/admin/session: Checks authentication status

  Protected routes use requireAdminAuth middleware from src/middleware/adminAuth.ts.
  Middleware checks both cookie session and Authorization: Bearer token.
  Admin password is set via ADMIN_PASSWORD environment variable.
</authentication>

<scripts>
  Seed sample data:
  ```bash
  bun run seed
  ```
  Creates 10 sample journal entries with GPS coordinates, photos, and weather.
  WARNING: Deletes all existing entries!
</scripts>

<curl_testing>
  ALWAYS test APIs with cURL after implementing.
  Use $BACKEND_URL environment variable, never localhost.

  Examples:
  ```bash
  # List entries
  curl $BACKEND_URL/api/entries

  # Get stats
  curl $BACKEND_URL/api/stats

  # Update coordinates (authenticated)
  curl -X PUT $BACKEND_URL/api/entries/<id> \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer <token>" \
    -d '{"latitude": 34.6266, "longitude": -84.1934}'
  ```
</curl_testing>
