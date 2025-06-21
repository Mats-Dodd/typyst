# PGlite to Supabase Migration - Quick Start Guide

## Before You Begin

### Prerequisites
1. Supabase project with database URL in `.env`
2. Working authentication system (already in place)
3. Access to run database migrations

### Important Notes
- Only migrate the **web app** (`/apps/web`)
- Desktop app keeps PGlite for offline support
- No direct Supabase client calls - all through server endpoints

## Starting the Migration

### Step 1: Database Setup (Start Here!)
Begin with Phase 1 tasks in [pglite-sup-tasks.md](./pglite-sup-tasks.md):

1. **Task 1.1**: Create collection schema
   ```bash
   cd packages/db
   mkdir -p src/schema
   touch src/schema/collection.ts
   ```
   
   Then add the collection table schema (see code example in tasks doc).

2. **Task 1.2**: Add collection settings to same file
   ```typescript
   // Add to src/schema/collection.ts
   export const collectionSettings = pgTable('collection_settings', {
     // ... schema from tasks doc
   });
   ```

3. **Task 1.3**: Create entry schema
   ```bash
   touch src/schema/entry.ts
   ```
   
   Add the entry table schema from the tasks doc.

4. **Task 1.4**: Update schema exports
   ```typescript
   // packages/db/src/schema/index.ts
   export * from './user';
   export * from './account';
   export * from './session';
   export * from './verification';
   // Add these:
   export * from './collection';
   export * from './entry';
   ```

5. **Task 1.5**: Run migrations
   ```bash
   # In packages/db directory
   pnpm drizzle-kit generate
   # Review the generated SQL in drizzle/ folder
   pnpm drizzle-kit migrate
   ```

### Step 2: Server Setup
Once schemas are created, move to Phase 2:

1. **Create server database client**
   ```bash
   cd apps/web
   mkdir -p src/lib/server
   touch src/lib/server/db.ts
   ```
   
   Add the database connection code:
   ```typescript
   // src/lib/server/db.ts
   import { drizzle } from 'drizzle-orm/postgres-js';
   import postgres from 'postgres';
   import * as schema from '@haptic/db/schema';
   import { SUPABASE_DATABASE_URL } from '$env/static/private';

   const client = postgres(SUPABASE_DATABASE_URL, {
     prepare: false,
   });

   export const db = drizzle(client, { schema });
   ```

2. **Add authentication helpers**
   ```typescript
   // Add to src/lib/server/db.ts
   export async function getUserId(event: RequestEvent): Promise<string> {
     const session = await event.locals.auth();
     if (!session?.user?.id) {
       throw new Error('User not authenticated');
     }
     return session.user.id;
   }
   ```

3. **Test database connection**
   ```bash
   # Create a test endpoint
   touch src/routes/api/test/+server.ts
   ```
   
   ```typescript
   // src/routes/api/test/+server.ts
   import { json } from '@sveltejs/kit';
   import { db } from '$lib/server/db';
   
   export const GET = async () => {
     try {
       // Simple query to test connection
       const result = await db.execute('SELECT 1');
       return json({ success: true });
     } catch (error) {
       return json({ error: error.message }, { status: 500 });
     }
   };
   ```

### Step 3: Build API Endpoints
Follow Phase 3 & 4 tasks to create all endpoints.
Reference [API documentation](./pglite-sup-api-reference.md) for endpoint specs.

### Step 4: Update Client Code
Only after endpoints are working, update client-side API calls (Phase 5).

### Step 5: Remove PGlite
Final step - remove PGlite dependencies from web app only (Phase 6).

## Testing Each Phase

After completing each phase:
1. Test the functionality before moving on
2. Check off completed tasks in the task list
3. Commit your changes

## Common Issues

### Migration Won't Run
- Check SUPABASE_DATABASE_URL is set correctly
- Ensure you're in the `/packages/db` directory

### Type Errors
- Run `pnpm build` in packages/db after schema changes
- Restart TypeScript server in your editor

### API Endpoint 404
- Ensure file naming matches exactly (e.g., `+server.ts`)
- Check route structure matches SvelteKit conventions

## Complete Example: Creating a Note

Here's how the full flow works after migration:

1. **Client creates a note**:
   ```typescript
   // apps/web/src/lib/api/notes.ts
   export const createNote = async (name: string, content: string) => {
     const collectionPath = get(collection);
     const parentPath = get(currentFolder) || '/';
     
     // First, get the collection ID
     const collections = await fetch('/api/collections');
     const collectionData = collections.find(c => c.path === collectionPath);
     
     // Create the note entry
     const response = await fetch('/api/entries', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         collectionId: collectionData.id,
         path: `${parentPath}/${name}`,
         name,
         parentPath,
         content,
         isFolder: false,
       }),
     });
     
     return response.json();
   };
   ```

2. **Server handles the request**:
   ```typescript
   // apps/web/src/routes/api/entries/+server.ts
   export const POST: RequestHandler = async (event) => {
     const userId = await getUserId(event);
     const data = await event.request.json();
     
     // Verify user owns the collection
     await verifyUserOwnership(userId, data.collectionId, schema.collection);
     
     // Create the entry
     const [entry] = await db
       .insert(schema.entry)
       .values({
         ...data,
         userId,
         size: data.content?.length || 0,
       })
       .returning();
       
     return json(entry);
   };
   ```

3. **Database stores the data**:
   - Entry is saved in Supabase
   - Available across all devices
   - Automatically backed up

## Need Help?
- Review the full [migration plan](./pglite-sup.md)
- Check the [task breakdown](./pglite-sup-tasks.md) for detailed steps
- Refer to [API reference](./pglite-sup-api-reference.md) for endpoint details 