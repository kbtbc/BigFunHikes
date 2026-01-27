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
  ## Session: January 27, 2026 - Suunto Replay Studio v3.15

  ### What was completed:
  - Expanded to 15 visual player styles for Suunto Replay Studio
  - Fixed demo data loading (copied to backend/data/suwaneetrek-1.json)
  - Rebuilt 6 new 2D-focused styles replacing Strava, Polaroid, Neon:
    - Terminal, Editorial, Topographic, Cockpit, Blueprint, Field Journal
  - Added 5 new 3D terrain styles with full satellite/outdoors toggle:
    - Athletic (ESPN sports broadcast), Expedition (National Geographic),
    - Retro (70s analog gauges), Noir (film noir cinematic), Command (military tactical)
  - Style selector button updated (orange gradient, better visibility)

  ### Current 15 Styles:
  - Original 4: Classic, Cinematic, Minimal, Dashboard
  - 6 New 2D-focused: Terminal, Editorial, Topographic, Cockpit, Blueprint, Field Journal
  - 5 New 3D terrain: Athletic, Expedition, Retro, Noir, Command

  ### Key files for Replay Studio:
  - Landing: webapp/src/pages/suunto/SuuntoLandingPage.tsx
  - Viewer: webapp/src/pages/suunto/SuuntoViewerPage.tsx (imports all 15 players)
  - Style Selector: webapp/src/components/suunto/StyleSelector.tsx
  - Players: webapp/src/components/suunto/players/*/
  - Sub-project docs: docs/ACTIVITY_REPLAY_STUDIO.md

  ### 3D Terrain Implementation (for new styles):
  - Uses mapbox-dem source with terrain exaggeration (1.8-2.8x)
  - Sky layer with atmosphere
  - Camera modes: follow, overview, firstPerson
  - Map style toggle: satellite/outdoors (or dark for Noir)
  - Bearing calculation for firstPerson mode

  ### Demo data:
  - Backend demo file: backend/data/suwaneetrek-1.json
  - Routes: /suunto (landing), /suunto/demo, /suunto/view/:shareId
</session_notes>
