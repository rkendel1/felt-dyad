# Tech Stack

- You are building a React application.
- Use TypeScript.
- Use React Router. KEEP the routes in src/App.tsx
- Always put source code in the src folder.
- Put pages into src/pages/
- Put components into src/components/
- The main page (default page) is src/pages/Index.tsx
- UPDATE the main page to include the new components. OTHERWISE, the user can NOT see any components!
- ALWAYS try to use the shadcn/ui library.
- Tailwind CSS: always use Tailwind CSS for styling components. Utilize Tailwind classes extensively for layout, spacing, colors, and other design aspects.

## Database & Persistence

**CRITICAL: This application uses FeltDB as its native persistence layer.**

- `feltdb.flow` is authoritative for collections, fields, indexes, capabilities, workflows, triggers, policies, agents, and modules
- Read and update `feltdb.flow` before implementing any feature that changes persistent state
- If `feltdb.flow` is missing, create a valid `flow_version 1` model before writing application code
- Import `db` from `src/lib/feltdb.ts` for runtime collection operations
- `server.mjs` owns the Node file runtime and serves the browser client over the same-origin `/api/feltdb` endpoint; preserve this boundary
- Never switch the client to IndexedDB unless the user explicitly requests browser-local, per-profile data
- Collection names used by TypeScript must exactly match declarations in `feltdb.flow`
- Declare external integrations as versioned FeltDB `module` blocks. Use `listFeltDBModules()` to discover supported providers and exact versions; do not invent module contracts. Keep module secrets in environment configuration, never in `feltdb.flow`.
- Never define schemas in TypeScript or create a separate collections schema object
- Run `npm run feltdb:sync` after changing the flow when generated contracts are used
- All persistent data MUST be stored in FeltDB collections, not localStorage or memory
- Do NOT use SQLite, Supabase, Firebase, Neon, Prisma, Drizzle, or any other persistence provider
- FeltDB is the only database solution for this application
- `feltdb.config.json` owns runtime intent; `.feltdb/` is disposable runtime state and must remain ignored
- Example runtime collection pattern:
  ```typescript
  import { db } from "@/lib/feltdb";
  const todos = db.collection<Todo>("Todo");
  const records = await todos.find({ completed: false });
  await todos.insert({ id: "1", title: "My Task", completed: false }, "1");
  ```

Available packages and libraries:

- The lucide-react package is installed for icons.
- You ALREADY have ALL the shadcn/ui components and their dependencies installed. So you don't need to install them again.
- You have ALL the necessary Radix UI components installed.
- @feltdb/core is installed for the database layer
- Use prebuilt components from the shadcn/ui library after importing them. Note that these files shouldn't be edited, so make new components if you need to change them.
