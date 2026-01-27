# Vibecode Workspace

This workspace contains a web app and backend server.

<projects>
  webapp/    — React app (port 8000, environment variable VITE_BASE_URL)
  backend/   — Hono API server (port 3000, environment variable VITE_BACKEND_URL)
</projects>

<agents>
  Use subagents for project-specific work:
  - backend-developer: Changes to the backend API
  - webapp-developer: Changes to the webapp frontend

  Each agent reads its project's CLAUDE.md for detailed instructions.
</agents>

<coordination>
  When a feature needs both frontend and backend:
  1. Define Zod schemas for request/response in backend/src/types.ts (shared contracts)
  2. Implement backend route using the schemas
  3. Test backend with cURL (use $BACKEND_URL, never localhost)
  4. Implement frontend, importing schemas from backend/src/types.ts to parse responses
  5. Test the integration

  <shared_types>
    All API contracts live in backend/src/types.ts as Zod schemas.
    Both backend and frontend can import from this file — single source of truth.
  </shared_types>
</coordination>

<skills>
  Shared skills in .claude/skills/:
  - ai-apis-like-chatgpt: Use this skill when the user asks you to make an app that requires an AI API.

  Frontend only skills:
  - frontend-app-design: Create distinctive, production-grade web interfaces using React, Tailwind, and shadcn/ui. Use when building pages, components, or styling any web UI.
</skills>

<environment>
  You are an expert senior software engineer specializing in Full Stack Development using React, Tailwind and Leaflet. Act as a proactive, concise, and thorough partner. Prioritize code safety and security.
  You are interacting with an enthusiastic junior engineer just getting started.
  The user views no longer views the app only through Vibecode Mobile App with a webview preview or an iframe preview.   The source code is now in Cursor, which is now the main IDE.
  The user can see code and terminal.
  Write one-off scripts to achieve tasks the user asks for.
  Communicate in an easy to understand manner for junior level developers.
  Be concise and don't talk too much.
  Ask clarifying questions as needed.
</environment>

<documentation_rules>
  When updating README.md:
  1. ALWAYS also update PROJECT_PLAN.md to keep both files in sync
  2. Update version numbers in both files consistently
  3. Add new features to the "COMPLETED FEATURES" section in PROJECT_PLAN.md
  4. Always include 2-3 creative new feature suggestions at the bottom of PROJECT_PLAN.md under "NEXT STEPS"
  5. Feature suggestions should be practical, build on existing functionality, and inspire future development
</documentation_rules>

<session_notes>
  ## Session: January 27, 2026 - Suunto Replay Studio v3.13

  ### What was completed:
  - Built 10 visual player styles for Suunto Replay Studio (was 4, now 10)
  - Styles: Classic, Cinematic, Minimal, Dashboard, Strava, Polaroid, Terminal, Neon, Editorial, Topographic
  - Fixed camera jitter/clipping with ease-out easing, fog layer, reduced terrain exaggeration (1.8x)
  - Adjusted camera distances: Follow mode closer (zoom 15.5), First Person further (zoom 14.0)
  - Fixed coral button styling (gradient from-coral-500 to-amber-500)
  - Renamed sub-project to "BigFun's Suunto Replay Studio"
  - Database seeded with 11 entries (10 trail + 1 training with Suunto data)

  ### Key files for Replay Studio:
  - Landing: webapp/src/pages/suunto/SuuntoLandingPage.tsx
  - Viewer: webapp/src/pages/suunto/SuuntoViewerPage.tsx (imports all 10 players)
  - Style Selector: webapp/src/components/suunto/StyleSelector.tsx
  - Players: webapp/src/components/suunto/players/{Classic,Cinematic,Minimal,Dashboard,Strava,Polaroid,Terminal,Neon,Editorial,Topographic}Player/
  - Camera logic: webapp/src/components/ActivityPlayer/ActivityMap.tsx
  - Sub-project docs: docs/ACTIVITY_REPLAY_STUDIO.md

  ### Next session priorities:
  - User wants to make style-specific changes to each player (deferred)
  - Test all 10 styles thoroughly
  - Consider: photo popup on hover, playback speed indicator, elevation-aware camera

  ### Demo data:
  - Backend demo file: backend/data/suwaneetrek-1.json
  - Routes: /suunto (landing), /suunto/demo, /suunto/view/:shareId
</session_notes>
