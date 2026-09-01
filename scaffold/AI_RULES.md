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

- Import and use `src/lib/feltdb.ts` for all database operations
- All persistent data MUST be stored in FeltDB collections, NOT in memory
- Do NOT use SQLite, Supabase, Firebase, Neon, Prisma, Drizzle, or any other persistence provider
- FeltDB is the only database solution for this application
- Define your data schemas in the `collections` object in `src/lib/feltdb.ts`
- Use `getFeltDB()` to get the database instance and perform queries
- Example collection pattern:
  ```typescript
  const todos = await db.collection("todos").find().toArray();
  await db.collection("todos").insertOne({ id: "1", title: "My Task" });
  ```

Available packages and libraries:

- The lucide-react package is installed for icons.
- You ALREADY have ALL the shadcn/ui components and their dependencies installed. So you don't need to install them again.
- You have ALL the necessary Radix UI components installed.
- @feltdb/core is installed for the database layer
- Use prebuilt components from the shadcn/ui library after importing them. Note that these files shouldn't be edited, so make new components if you need to change them.

