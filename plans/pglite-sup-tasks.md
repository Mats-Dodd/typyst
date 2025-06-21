# PGlite to Supabase Migration - Task Breakdown

## Overview
This document breaks down the PGlite to Supabase migration into small, manageable tasks that can be completed step by step.

### Migration Summary
1. **Phase 1**: Create database schemas using Drizzle ORM
2. **Phase 2**: Set up server-side database connection
3. **Phase 3**: Create API endpoints for collections
4. **Phase 4**: Create API endpoints for entries (files/folders)
5. **Phase 5**: Update client-side code to use API endpoints
6. **Phase 6**: Remove PGlite from web app
7. **Phase 7**: Test all functionality
8. **Phase 8**: Optimize performance
9. **Phase 9**: Documentation and cleanup

### Key Principles
- Desktop app keeps PGlite for offline functionality
- Web app uses Supabase via server endpoints only
- No direct Supabase client calls from browser
- All database queries happen server-side
- Maintain existing functionality throughout migration

---

## Phase 1: Database Schema Setup (Drizzle)

### Task 1.1: Create Collection Schema
- [ ] Create `/packages/db/src/schema/collection.ts`
- [ ] Define `collection` table with fields: id, userId, path, name, lastOpened, createdAt, updatedAt
- [ ] Add unique index on userId + path
- [ ] Export the schema

**Code Example:**
```typescript
// packages/db/src/schema/collection.ts
import { pgTable, uuid, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { users } from './user';

export const collection = pgTable('collection', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  path: text('path').notNull(),
  name: text('name').notNull(),
  lastOpened: timestamp('last_opened', { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}, (table) => ({
  userPathIdx: uniqueIndex('collection_user_path_idx').on(table.userId, table.path),
}));
```

### Task 1.2: Create Collection Settings Schema
- [ ] Add `collectionSettings` table to `/packages/db/src/schema/collection.ts`
- [ ] Define fields: id, collectionId, editor (jsonb), notes (jsonb), createdAt, updatedAt
- [ ] Add foreign key relationship to collection table
- [ ] Make collectionId unique

**Code Example:**
```typescript
// Add to packages/db/src/schema/collection.ts
import { jsonb } from 'drizzle-orm/pg-core';

export const collectionSettings = pgTable('collection_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  collectionId: uuid('collection_id')
    .notNull()
    .references(() => collection.id, { onDelete: 'cascade' })
    .unique(),
  editor: jsonb('editor')
    .notNull()
    .$type<{
      fontSize?: number;
      fontFamily?: string;
      theme?: string;
      tabSize?: number;
      wordWrap?: boolean;
    }>()
    .$default(() => ({
      fontSize: 14,
      fontFamily: 'monospace',
      theme: 'dark',
      tabSize: 2,
      wordWrap: true
    })),
  notes: jsonb('notes')
    .notNull()
    .$type<{
      defaultExtension?: string;
      autoSave?: boolean;
      spellCheck?: boolean;
    }>()
    .$default(() => ({
      defaultExtension: 'md',
      autoSave: true,
      spellCheck: false
    })),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
```

### Task 1.3: Create Entry Schema
- [ ] Create `/packages/db/src/schema/entry.ts`
- [ ] Define `entry` table with fields: id, userId, collectionId, path, name, parentPath, content, isFolder, size, createdAt, updatedAt
- [ ] Add foreign key relationships to users and collection tables
- [ ] Add unique index on userId + path
- [ ] Export the schema

**Code Example:**
```typescript
// packages/db/src/schema/entry.ts
import { pgTable, uuid, text, timestamp, boolean, bigint, uniqueIndex } from 'drizzle-orm/pg-core';
import { users } from './user';
import { collection } from './collection';

export const entry = pgTable('entry', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  collectionId: uuid('collection_id')
    .notNull()
    .references(() => collection.id, { onDelete: 'cascade' }),
  path: text('path').notNull(),
  name: text('name'),
  parentPath: text('parent_path').notNull(),
  content: text('content'),
  isFolder: boolean('is_folder').default(false),
  size: bigint('size', { mode: 'number' }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
}, (table) => ({
  userPathIdx: uniqueIndex('entry_user_path_idx').on(table.userId, table.path),
  collectionPathIdx: index('entry_collection_path_idx').on(table.collectionId, table.path),
}));

// Type exports for TypeScript
export type Entry = typeof entry.$inferSelect;
export type NewEntry = typeof entry.$inferInsert;
```

### Task 1.4: Update Schema Exports
- [ ] Update `/packages/db/src/schema/index.ts` to export new schemas
- [ ] Verify all imports are correct

**Code Example:**
```typescript
// packages/db/src/schema/index.ts
// Existing exports
export * from './user';
export * from './account';
export * from './session';
export * from './verification';

// Add new exports
export * from './collection';
export * from './entry';

// Also export useful type helpers
export type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
```

**Type Usage Example:**
```typescript
// apps/web/src/lib/types.ts
import type { InferSelectModel } from '@haptic/db/schema';
import type { collection, entry } from '@haptic/db/schema';

// These types are automatically inferred from your schema
export type Collection = InferSelectModel<typeof collection>;
export type Entry = InferSelectModel<typeof entry>;

// Use in components
<script lang="ts">
  import type { Collection, Entry } from '$lib/types';
  
  let collections: Collection[] = [];
  let currentEntry: Entry | null = null;
</script>
```

### Task 1.5: Generate and Run Migrations
- [ ] Run `pnpm drizzle-kit generate` in packages/db
- [ ] Review generated migration files
- [ ] Run `pnpm drizzle-kit migrate` to apply migrations
- [ ] Verify tables exist in Supabase dashboard

## Phase 2: Server-Side Database Setup

### Task 2.1: Create Server Database Client
- [ ] Create `/apps/web/src/lib/server/` directory
- [ ] Create `/apps/web/src/lib/server/db.ts`
- [ ] Import drizzle and postgres clients
- [ ] Import all schemas from @haptic/db
- [ ] Create database connection using SUPABASE_DATABASE_URL
- [ ] Export db instance

**Code Example:**
```typescript
// apps/web/src/lib/server/db.ts
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@haptic/db/schema';
import { SUPABASE_DATABASE_URL } from '$env/static/private';

// Create postgres connection
const client = postgres(SUPABASE_DATABASE_URL, {
  prepare: false, // Required for Supabase pooler
});

// Create drizzle instance with schema
export const db = drizzle(client, { schema });

// Export schema for easy access
export { schema };
```

### Task 2.2: Add Authentication Helper
- [ ] Add getUserId helper function to db.ts
- [ ] Handle session validation
- [ ] Add proper error handling for unauthenticated users

**Code Example:**
```typescript
// Add to apps/web/src/lib/server/db.ts
import type { RequestEvent } from '@sveltejs/kit';

export async function getUserId(event: RequestEvent): Promise<string> {
  const session = await event.locals.auth();
  
  if (!session?.user?.id) {
    throw new Error('User not authenticated');
  }
  
  return session.user.id;
}

// Helper to ensure user owns resource
export async function verifyUserOwnership(
  userId: string, 
  resourceId: string,
  table: any
) {
  const [resource] = await db
    .select()
    .from(table)
    .where(and(
      eq(table.id, resourceId),
      eq(table.userId, userId)
    ))
    .limit(1);
    
  if (!resource) {
    throw new Error('Resource not found or access denied');
  }
  
  return resource;
}
```

### Task 2.3: Environment Configuration
- [ ] Verify SUPABASE_DATABASE_URL is in .env
- [ ] Ensure it's properly typed in app.d.ts
- [ ] Test database connection

## Phase 3: Collection API Endpoints

### Task 3.1: Create Collections List Endpoint
- [ ] Create `/apps/web/src/routes/api/collections/+server.ts`
- [ ] Implement GET handler to fetch user's collections
- [ ] Order by lastOpened date
- [ ] Test with curl/Postman

**Code Example:**
```typescript
// apps/web/src/routes/api/collections/+server.ts
import { json } from '@sveltejs/kit';
import { db, getUserId, schema } from '$lib/server/db';
import { eq, desc } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
  try {
    const userId = await getUserId(event);
    
    const collections = await db
      .select()
      .from(schema.collection)
      .where(eq(schema.collection.userId, userId))
      .orderBy(desc(schema.collection.lastOpened));

    return json(collections);
  } catch (error) {
    return json(
      { error: 'Failed to fetch collections', code: 'FETCH_ERROR' },
      { status: 500 }
    );
  }
};
```

### Task 3.2: Create Collection Creation Endpoint
- [ ] Add POST handler to collections endpoint
- [ ] Accept path and name in request body
- [ ] Create new collection with userId
- [ ] Return created collection

**Code Example:**
```typescript
// Add to apps/web/src/routes/api/collections/+server.ts
export const POST: RequestHandler = async (event) => {
  try {
    const userId = await getUserId(event);
    const { path, name } = await event.request.json();

    // Validate input
    if (!path) {
      return json(
        { error: 'Path is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Create collection
    const [newCollection] = await db
      .insert(schema.collection)
      .values({
        userId,
        path,
        name: name || path.split('/').pop() || 'Untitled',
        lastOpened: new Date(),
      })
      .returning();

    // Create default settings
    await db
      .insert(schema.collectionSettings)
      .values({
        collectionId: newCollection.id,
      });

    return json(newCollection, { status: 201 });
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      return json(
        { error: 'Collection already exists', code: 'DUPLICATE_ERROR' },
        { status: 409 }
      );
    }
    return json(
      { error: 'Failed to create collection', code: 'CREATE_ERROR' },
      { status: 500 }
    );
  }
};
```

### Task 3.3: Create Update Collection Endpoint
- [ ] Create `/apps/web/src/routes/api/collections/[path]/+server.ts`
- [ ] Implement PUT handler to update lastOpened
- [ ] Handle URL encoding/decoding for path parameter
- [ ] Test updating collection

### Task 3.4: Create Collection Settings Endpoints
- [ ] Create `/apps/web/src/routes/api/collections/[path]/settings/+server.ts`
- [ ] Implement GET handler to fetch settings
- [ ] Implement PUT handler to update settings
- [ ] Handle creating settings if they don't exist

## Phase 4: Entry API Endpoints

### Task 4.1: Create Entry List Endpoint
- [ ] Create `/apps/web/src/routes/api/entries/+server.ts`
- [ ] Implement GET handler with collection and parent query params
- [ ] Validate collection exists and user has access
- [ ] Return filtered entries

**Code Example:**
```typescript
// apps/web/src/routes/api/entries/+server.ts
import { json } from '@sveltejs/kit';
import { db, getUserId, schema } from '$lib/server/db';
import { eq, and } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
  try {
    const userId = await getUserId(event);
    const collectionPath = event.url.searchParams.get('collection');
    const parentPath = event.url.searchParams.get('parent') || '/';

    if (!collectionPath) {
      return json(
        { error: 'Collection path required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      );
    }

    // Get collection to verify ownership
    const [collection] = await db
      .select()
      .from(schema.collection)
      .where(and(
        eq(schema.collection.userId, userId),
        eq(schema.collection.path, collectionPath)
      ))
      .limit(1);

    if (!collection) {
      return json(
        { error: 'Collection not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Get entries in the specified folder
    const entries = await db
      .select()
      .from(schema.entry)
      .where(and(
        eq(schema.entry.collectionId, collection.id),
        eq(schema.entry.parentPath, parentPath)
      ))
      .orderBy(schema.entry.isFolder, schema.entry.name);

    return json(entries);
  } catch (error) {
    return json(
      { error: 'Failed to fetch entries', code: 'FETCH_ERROR' },
      { status: 500 }
    );
  }
};
```

### Task 4.2: Create Entry Creation Endpoint
- [ ] Add POST handler to entries endpoint
- [ ] Accept full entry data in request body
- [ ] Validate collectionId and userId
- [ ] Return created entry

### Task 4.3: Create Entry Update Endpoint
- [ ] Create `/apps/web/src/routes/api/entries/[path]/+server.ts`
- [ ] Implement PUT handler for content updates
- [ ] Handle path encoding/decoding
- [ ] Update updatedAt timestamp

### Task 4.4: Create Entry Delete Endpoint
- [ ] Add DELETE handler to entry endpoint
- [ ] Handle cascading deletes for folders
- [ ] Return success response

### Task 4.5: Create Batch Operations Endpoint
- [ ] Create `/apps/web/src/routes/api/entries/batch/+server.ts`
- [ ] Support batch create/update/delete
- [ ] Use database transactions
- [ ] Handle partial failures

## Phase 5: Update Client-Side API Calls

### Task 5.1: Update Collection API
- [ ] Open `/apps/web/src/lib/api/collection.ts`
- [ ] Replace direct database calls with fetch() to /api/collections
- [ ] Update getCollections() function
- [ ] Update loadCollection() function

**Code Example:**
```typescript
// apps/web/src/lib/api/collection.ts
import { collection, activeFile, noteHistory } from '@/store';
import { get } from 'svelte/store';

// OLD CODE (with PGlite):
// const db = await getDB();
// const collections = await db.select().from(collectionTable);

// NEW CODE (with API):
export const getCollections = async () => {
  const response = await fetch('/api/collections');
  
  if (!response.ok) {
    throw new Error('Failed to fetch collections');
  }
  
  return response.json();
};

export const loadCollection = async (path?: string) => {
  if (!path) return;
  
  collection.set(path);
  noteHistory.set([]);
  activeFile.set(null);

  // Update last opened timestamp
  await fetch(`/api/collections/${encodeURIComponent(path)}`, {
    method: 'PUT'
  });
};

export const createCollection = async (path: string, name?: string) => {
  const response = await fetch('/api/collections', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ path, name }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create collection');
  }

  return response.json();
};
```

### Task 5.2: Update Folders API
- [ ] Open `/apps/web/src/lib/api/folders.ts`
- [ ] Replace database calls with fetch() to /api/entries
- [ ] Update createFolder() function
- [ ] Update deleteFolder() function
- [ ] Update renameFolder() function

### Task 5.3: Update Notes API
- [ ] Open `/apps/web/src/lib/api/notes.ts`
- [ ] Replace database calls with fetch() to /api/entries
- [ ] Update createNote() function
- [ ] Update updateNote() function
- [ ] Update deleteNote() function
- [ ] Update renameNote() function

### Task 5.4: Update Search API
- [ ] Open `/apps/web/src/lib/api/search.ts`
- [ ] Create server endpoint for search if needed
- [ ] Update search functions to use API calls

## Phase 6: Remove PGlite Dependencies

### Task 6.1: Remove PGlite Package
- [ ] Remove @electric-sql/pglite from /apps/web/package.json
- [ ] Run pnpm install to update lockfile

### Task 6.2: Delete Database Directory
- [ ] Delete `/apps/web/src/lib/database/` directory
- [ ] Verify no imports remain from this directory

### Task 6.3: Clean Up Imports
- [ ] Search for any remaining PGlite imports
- [ ] Remove unused database-related imports
- [ ] Update any type definitions

## Phase 7: Testing and Validation

### Task 7.1: Test Collection Operations
- [ ] Test creating new collection
- [ ] Test listing collections
- [ ] Test updating last opened
- [ ] Test collection settings

### Task 7.2: Test Entry Operations
- [ ] Test creating files and folders
- [ ] Test reading file content
- [ ] Test updating file content
- [ ] Test deleting files/folders
- [ ] Test batch operations

### Task 7.3: Test Search Functionality
- [ ] Test searching within collections
- [ ] Test search filters
- [ ] Verify search performance

### Task 7.4: Test Authentication Flow
- [ ] Test operations with authenticated user
- [ ] Test operations without authentication
- [ ] Verify proper error handling

### Task 7.5: Test Edge Cases
- [ ] Test with special characters in paths
- [ ] Test with very long content
- [ ] Test concurrent updates
- [ ] Test error scenarios

## Phase 8: Performance Optimization

### Task 8.1: Add Database Indexes
- [ ] Analyze query patterns
- [ ] Add indexes for common queries
- [ ] Test query performance

### Task 8.2: Implement Caching
- [ ] Add server-side caching where appropriate
- [ ] Consider client-side caching strategy
- [ ] Test cache invalidation

### Task 8.3: Optimize Batch Operations
- [ ] Review batch operation performance
- [ ] Optimize transaction handling
- [ ] Add rate limiting if needed

## Phase 9: Documentation and Cleanup

### Task 9.1: Update Documentation
- [ ] Document new API endpoints
- [ ] Update README with architecture changes
- [ ] Add migration notes

### Task 9.2: Clean Up Old Code
- [ ] Remove any commented-out PGlite code
- [ ] Remove unused imports
- [ ] Run linter and fix issues

### Task 9.3: Final Review
- [ ] Review all changed files
- [ ] Ensure no PGlite references remain in web app
- [ ] Verify desktop app still works with PGlite

## Completion Checklist
- [ ] All tests passing
- [ ] No PGlite dependencies in web app
- [ ] All functionality working via API endpoints
- [ ] Desktop app unchanged and working
- [ ] Documentation updated
- [ ] Code reviewed and cleaned up 