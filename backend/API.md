# Appalachian Trail Journal API

Complete REST API for managing hiking journal entries, photos, and statistics.

## Database Schema

### Models

#### User (Better Auth)
- `id` - User ID (string)
- `name` - User's name
- `email` - User's email (unique)
- `emailVerified` - Whether email is verified
- Authentication managed by Better Auth with Email OTP

#### JournalEntry
- `id` - UUID (string)
- `userId` - Foreign key to User
- `date` - Hiking date (DateTime)
- `dayNumber` - Day number (e.g., Day 1, Day 2)
- `title` - Entry title
- `content` - Journal content (markdown)
- `latitude` - GPS latitude (nullable)
- `longitude` - GPS longitude (nullable)
- `milesHiked` - Distance hiked that day
- `elevationGain` - Elevation gained in feet (nullable)
- `totalMilesCompleted` - Cumulative miles from start
- `gpxData` - GPX XML track data (nullable)
- `createdAt`, `updatedAt`
- `photos[]` - Array of photos

#### Photo
- `id` - UUID (string)
- `journalEntryId` - Foreign key to JournalEntry
- `url` - Photo URL or path
- `caption` - Photo caption (nullable)
- `order` - Sort order
- `createdAt`

## Authentication

All API endpoints (except `/api/auth/*`) require authentication. The API uses Better Auth with Email OTP.

### Auth Endpoints

#### Send OTP
```bash
POST /api/auth/email-otp/send-verification-otp
Content-Type: application/json

{
  "email": "user@example.com",
  "type": "sign-in"
}
```

#### Sign In with OTP
```bash
POST /api/auth/sign-in/email-otp
Content-Type: application/json

{
  "email": "user@example.com",
  "otp": "123456"
}
```

#### Sign Out
```bash
POST /api/auth/sign-out
```

#### Get Session
```bash
GET /api/auth/session
```

## API Endpoints

All endpoints use the `{ data: ... }` envelope pattern for successful responses.
Errors use `{ error: { message, code } }` format.

### Journal Entries

#### List Entries (Paginated)
```bash
GET /api/entries?page=1&pageSize=10
```

**Query Parameters:**
- `page` - Page number (default: 1)
- `pageSize` - Items per page (default: 10)

**Response:**
```json
{
  "data": {
    "entries": [
      {
        "id": "uuid",
        "userId": "user-id",
        "date": "2024-03-15T00:00:00.000Z",
        "dayNumber": 1,
        "title": "Day 1: Springer Mountain",
        "content": "# First Day\n\nStarted my journey...",
        "latitude": 34.6267,
        "longitude": -84.1936,
        "milesHiked": 8.5,
        "elevationGain": 1200,
        "totalMilesCompleted": 8.5,
        "gpxData": "<gpx>...</gpx>",
        "createdAt": "2024-03-15T12:00:00.000Z",
        "updatedAt": "2024-03-15T12:00:00.000Z",
        "photos": []
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 10,
      "total": 15,
      "totalPages": 2
    }
  }
}
```

#### Get Single Entry
```bash
GET /api/entries/:id
```

**Response:**
```json
{
  "data": {
    "id": "uuid",
    "userId": "user-id",
    "date": "2024-03-15T00:00:00.000Z",
    "dayNumber": 1,
    "title": "Day 1: Springer Mountain",
    "content": "# First Day\n\nStarted my journey...",
    "latitude": 34.6267,
    "longitude": -84.1936,
    "milesHiked": 8.5,
    "elevationGain": 1200,
    "totalMilesCompleted": 8.5,
    "gpxData": "<gpx>...</gpx>",
    "createdAt": "2024-03-15T12:00:00.000Z",
    "updatedAt": "2024-03-15T12:00:00.000Z",
    "photos": [
      {
        "id": "photo-uuid",
        "journalEntryId": "uuid",
        "url": "https://...",
        "caption": "View from the summit",
        "order": 0,
        "createdAt": "2024-03-15T14:00:00.000Z"
      }
    ]
  }
}
```

#### Create Entry
```bash
POST /api/entries
Content-Type: application/json

{
  "date": "2024-03-15T00:00:00.000Z",
  "dayNumber": 1,
  "title": "Day 1: Springer Mountain to Hawk Mountain Shelter",
  "content": "# First Day on the Trail\n\nToday was amazing...",
  "latitude": 34.6267,
  "longitude": -84.1936,
  "milesHiked": 8.5,
  "elevationGain": 1200,
  "totalMilesCompleted": 8.5,
  "gpxData": "<gpx>...</gpx>"
}
```

**Response:** 201 Created with entry data in `{ data: ... }` envelope

#### Update Entry
```bash
PUT /api/entries/:id
Content-Type: application/json

{
  "title": "Updated Title",
  "content": "Updated content...",
  "milesHiked": 9.0
}
```

All fields are optional. Only provided fields will be updated.

**Response:** 200 OK with updated entry data

#### Delete Entry
```bash
DELETE /api/entries/:id
```

**Response:** 204 No Content

### Photos

#### Add Photo to Entry
```bash
POST /api/entries/:id/photos
Content-Type: application/json

{
  "url": "https://storage.example.com/photo.jpg",
  "caption": "Beautiful sunset from the shelter",
  "order": 0
}
```

**Response:** 201 Created
```json
{
  "data": {
    "id": "photo-uuid",
    "journalEntryId": "entry-uuid",
    "url": "https://storage.example.com/photo.jpg",
    "caption": "Beautiful sunset from the shelter",
    "order": 0,
    "createdAt": "2024-03-15T18:00:00.000Z"
  }
}
```

#### Delete Photo from Entry
```bash
DELETE /api/entries/:id/photos/:photoId
```

**Response:** 204 No Content

Deletes a photo from a journal entry. If the photo was uploaded locally, the file is also deleted from the server.

### Statistics

#### Get Overall Stats
```bash
GET /api/stats
```

**Response:**
```json
{
  "data": {
    "totalMiles": 2189.8,
    "totalDays": 147,
    "totalElevationGain": 464500,
    "averageMilesPerDay": 14.9,
    "lastEntryDate": "2024-09-15T00:00:00.000Z"
  }
}
```

## Error Responses

All errors follow this format:

```json
{
  "error": {
    "message": "Error description",
    "code": "ERROR_CODE"
  }
}
```

**Common Error Codes:**
- `UNAUTHORIZED` (401) - Not authenticated
- `NOT_FOUND` (404) - Resource not found
- `CREATE_ERROR` (500) - Failed to create resource
- `UPDATE_ERROR` (500) - Failed to update resource
- `DELETE_ERROR` (500) - Failed to delete resource
- `FETCH_ERROR` (500) - Failed to fetch resource

## Type Safety

All API contracts are defined in `/backend/src/types.ts` using Zod schemas. Both backend and frontend import from this file for end-to-end type safety.

### Key Schemas

- `createJournalEntrySchema` - Create entry validation
- `updateJournalEntrySchema` - Update entry validation
- `journalEntrySchema` - Entry response type
- `journalEntriesListSchema` - Paginated list response
- `createPhotoSchema` - Photo creation validation
- `statsSchema` - Statistics response type

### TypeScript Types

```typescript
import {
  type JournalEntry,
  type JournalEntriesList,
  type Photo,
  type Stats,
  type CreateJournalEntryInput,
  type UpdateJournalEntryInput,
  type CreatePhotoInput,
} from "@/backend/src/types";
```

## Testing with cURL

```bash
# Set backend URL
export BACKEND_URL=http://localhost:3000

# Health check
curl $BACKEND_URL/health

# List entries (requires auth cookie)
curl -b cookies.txt $BACKEND_URL/api/entries

# Create entry (requires auth cookie)
curl -b cookies.txt -X POST $BACKEND_URL/api/entries \
  -H "Content-Type: application/json" \
  -d '{
    "date": "2024-03-15T00:00:00.000Z",
    "dayNumber": 1,
    "title": "Day 1: Springer Mountain",
    "content": "First day hiking!",
    "milesHiked": 8.5,
    "totalMilesCompleted": 8.5
  }'

# Get stats
curl -b cookies.txt $BACKEND_URL/api/stats
```

## Development

```bash
# Install dependencies
bun install

# Generate Prisma client
bunx prisma generate

# Push database schema
bunx prisma db push

# Start development server
bun run dev

# Type check
bun run typecheck

# View database (Prisma Studio)
bun run studio
```
