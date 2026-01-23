# DISABLE_VIBECODE Feature

This feature allows you to easily toggle Vibecode-specific integrations on/off across the entire project, making it simple to run the application in a pure local development environment or deploy it without Vibecode dependencies.

## Quick Start

To disable Vibecode features, set this environment variable to `true`:

**Backend** (`backend/.env`):
```env
DISABLE_VIBECODE=true
```

**Frontend** (`webapp/.env`):
```env
VITE_DISABLE_VIBECODE=true
```

Then restart both servers.

## What Gets Disabled

### Backend (`DISABLE_VIBECODE=true`)

1. **@vibecodeapp/proxy** - The Vibecode proxy module is not imported
2. **CORS Policy** - Switches from Vibecode-specific origin allowlist to permissive local development mode:
   - Allows ALL origins (useful for local dev)
   - Still includes localhost patterns
3. **BACKEND_URL** - Uses `http://localhost:3000` instead of Vibecode proxy URLs

### Frontend (`VITE_DISABLE_VIBECODE=true`)

1. **Vibecode Vite Plugin** - The `vibecodePlugin()` is not loaded in `vite.config.ts`
2. **API Base URL** - The API client uses `http://localhost:3000` directly instead of `VITE_BACKEND_URL`

## Use Cases

### Local Development Without Vibecode
Perfect for developers who want to run the app locally without Vibecode infrastructure:

```bash
# Backend
cd backend
echo "DISABLE_VIBECODE=true" >> .env
bun run dev

# Frontend
cd webapp
echo "VITE_DISABLE_VIBECODE=true" >> .env
npm run dev
```

### Deploying to Standard Hosting
When deploying to Vercel, Railway, DigitalOcean, or any standard hosting provider, set:

```env
DISABLE_VIBECODE=true
VITE_DISABLE_VIBECODE=true
```

This removes all Vibecode-specific integrations and the app runs as a standard React + Hono application.

### Re-enabling Vibecode
Simply set both variables to `false` (or remove them, as `false` is the default):

```env
DISABLE_VIBECODE=false
VITE_DISABLE_VIBECODE=false
```

## Implementation Details

### Backend Changes
- **File**: `backend/src/index.ts`
  - Conditional import of `@vibecodeapp/proxy`
  - Dynamic CORS origin checking
  - Conditional BACKEND_URL logic

- **File**: `backend/src/env.ts`
  - Added `DISABLE_VIBECODE` to environment schema
  - Made `BACKEND_URL` optional (uses localhost when disabled)

### Frontend Changes
- **File**: `webapp/vite.config.ts`
  - Conditional loading of `vibecodePlugin()`

- **File**: `webapp/src/lib/api.ts`
  - Conditional API base URL (localhost vs Vibecode proxy)

## Default Behavior

By default, `DISABLE_VIBECODE` is set to `false`, meaning:
- Vibecode features are **enabled**
- The app runs in Vibecode mode with proxy and platform features
- Existing behavior is preserved

## Environment Files Updated

All environment example files now include this variable:
- `backend/.env`
- `backend/.env.example`
- `webapp/.env`
- `webapp/.env.example`

## Testing

To verify the feature works:

1. **Test with Vibecode Enabled** (default):
   ```bash
   # Should see "[Vibecode Proxy] Initialized" in backend logs
   cd backend && bun run dev
   ```

2. **Test with Vibecode Disabled**:
   ```bash
   # Set DISABLE_VIBECODE=true in backend/.env
   cd backend && bun run dev
   # Should NOT see "[Vibecode Proxy] Initialized" in logs
   ```

## Notes

- This feature is **non-destructive** - it doesn't remove any code, just conditionally loads it
- Both frontend and backend must have their respective variables set for full effect
- The default (`false`) preserves all existing Vibecode functionality
- Setting to `true` makes the codebase portable to any hosting environment
