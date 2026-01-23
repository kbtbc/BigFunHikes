<stack>
  Bun runtime, Hono web framework, Zod validation.
</stack>

<structure>
  src/index.ts     — App entry, middleware, route mounting
  src/routes/      — Route modules (create as needed)
  src/middleware/  — Middleware (adminAuth.ts for protected routes)
  src/types.ts     — Shared Zod schemas for API contracts
</structure>

<routes>
  Create routes in src/routes/ and mount them in src/index.ts.

  Example route file (src/routes/todos.ts):
  ```typescript
  import { Hono } from "hono";
  import { zValidator } from "@hono/zod-validator";
  import { z } from "zod";

  const todosRouter = new Hono();

  todosRouter.get("/", (c) => {
    return c.json({ data: [] });
  });

  todosRouter.post(
    "/",
    zValidator("json", z.object({ title: z.string() })),
    (c) => {
      const { title } = c.req.valid("json");
      return c.json({ data: { id: "1", title } });
    }
  );

  export { todosRouter };
  ```

  Mount in src/index.ts:
  ```typescript
  import { todosRouter } from "./routes/todos";
  app.route("/api/todos", todosRouter);
  ```

  IMPORTANT: Make sure all endpoints and routes are prefixed with `/api/`
</routes>

<shared_types>
  Define all API contracts in src/types.ts as Zod schemas.
  This file is the single source of truth — both backend and frontend import from here.
</shared_types>

<curl_testing>
  ALWAYS test APIs with cURL after implementing.
  Use $BACKEND_URL environment variable, never localhost.
  Verify response matches the Zod schema before telling frontend it's ready.
</curl_testing>

<database>
  Prisma v6 with SQLite for data persistence.

  Models:
  - JournalEntry: Daily hiking journal entries with location, miles, elevation
  - Photo: Photos attached to journal entries

  Database URL: file:./dev.db (SQLite)
  Run migrations: bunx prisma db push
  View database: bun run studio (Prisma Studio on port 3001)
</database>

<authentication>
  Simple admin password authentication (cookie-based).

  Routes:
  - POST /api/admin/login: Validates password, sets session cookie
  - POST /api/admin/logout: Clears session cookie
  - GET /api/admin/session: Checks authentication status

  Protected routes use requireAdminAuth middleware from src/middleware/adminAuth.ts.
  Admin password is set via ADMIN_PASSWORD environment variable.
</authentication>
