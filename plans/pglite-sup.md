# PGlite to Supabase Migration Plan

## Overview
This document outlines the plan to migrate Haptic's web app from PGlite (in-browser PostgreSQL) to Supabase cloud storage via SvelteKit server endpoints.

## Related Documents
- **[Task Breakdown](./pglite-sup-tasks.md)** - Detailed step-by-step tasks with code examples
- **[API Reference](./pglite-sup-api-reference.md)** - Complete API endpoint documentation with request/response examples
- **[Quick Start Guide](./pglite-sup-quickstart.md)** - Step-by-step guide to begin the migration with code snippets

## Current Architecture

### PGlite Implementation
- **Location**: `/apps/web/src/lib/database/`
- **Purpose**: Stores user-specific data locally in the browser
- **Tables**:
  - `collection` - Workspace/project folders
  - `collection_settings` - Editor and notes settings per collection
  - `entry` - Files and folders within collections

### Supabase Current Usage
- **Authentication**: Already implemented via Better Auth (keeping as-is)
- **Database**: PostgreSQL instance ready, currently only used for auth tables
- **Package**: `/packages/db` configured for Supabase connection

## Migration Goals
1. Move all user data from browser-local storage to Supabase cloud storage
2. Maintain all existing functionality
3. Enable multi-device access (automatic with cloud storage)
4. Remove PGlite dependencies from web app only (desktop keeps PGlite for offline)
5. Use SvelteKit server endpoints as API layer instead of direct Supabase client calls

## Phase 1: Database Schema Creation

### 1.1 Update Database Package Schema (Drizzle as Source of Truth)
Add new schema definitions to `/packages/db/src/schema/`:

1. Create `collection.ts`:
```typescript
import { pgTable, uuid, text, timestamp, uniqueIndex, jsonb } from 'drizzle-orm/pg-core';
import { users } from './user';

export const collection = pgTable('collection', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  path: text('path').notNull(),
  name: text('name').notNull(),
  lastOpened: timestamp('last_opened', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userPathIdx: uniqueIndex('collection_user_path_idx').on(table.userId, table.path),
}));

export const collectionSettings = pgTable('collection_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  collectionId: uuid('collection_id').notNull().references(() => collection.id, { onDelete: 'cascade' }).unique(),
  editor: jsonb('editor').notNull().$default(() => ({})),
  notes: jsonb('notes').notNull().$default(() => ({})),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
```

2. Create `entry.ts`:
```typescript
import { pgTable, uuid, text, timestamp, boolean, bigint, uniqueIndex } from 'drizzle-orm/pg-core';
import { users } from './user';
import { collection } from './collection';

export const entry = pgTable('entry', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  collectionId: uuid('collection_id').notNull().references(() => collection.id, { onDelete: 'cascade' }),
  path: text('path').notNull(),
  name: text('name'),
  parentPath: text('parent_path').notNull(),
  content: text('content'),
  isFolder: boolean('is_folder').default(false),
  size: bigint('size', { mode: 'number' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userPathIdx: uniqueIndex('entry_user_path_idx').on(table.userId, table.path),
}));
```

3. Update `index.ts` to export new schemas
4. Run `drizzle-kit generate` and `drizzle-kit migrate` to create the tables

## Phase 2: Create SvelteKit Server Endpoints

### 2.1 Remove PGlite Dependencies from Web App
- Remove `@electric-sql/pglite` from `/apps/web/package.json`
- Delete `/apps/web/src/lib/database/` directory entirely
- Keep PGlite in desktop app for offline functionality

### 2.2 Create Server-Side Database Client
Create `/apps/web/src/lib/server/db.ts`:

```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '@haptic/db/schema';
import { SUPABASE_DATABASE_URL } from '$env/static/private';

const client = postgres(SUPABASE_DATABASE_URL);
export const db = drizzle(client, { schema });

// Helper to get user ID from session
export async function getUserId(locals: App.Locals): Promise<string> {
  const session = await locals.auth();
  if (!session?.user?.id) {
    throw new Error('User not authenticated');
  }
  return session.user.id;
}
```

## Phase 3: Create SvelteKit Server Endpoints

### 3.1 Create Collection API Endpoints
Create `/apps/web/src/routes/api/collections/+server.ts`:

```typescript
import { json } from '@sveltejs/kit';
import { db, getUserId } from '$lib/server/db';
import { collection, collectionSettings } from '@haptic/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
  const userId = await getUserId(locals);
  
  const collections = await db
    .select()
    .from(collection)
    .where(eq(collection.userId, userId))
    .orderBy(desc(collection.lastOpened));

  return json(collections);
};

export const POST: RequestHandler = async ({ request, locals }) => {
  const userId = await getUserId(locals);
  const { path, name } = await request.json();

  const [newCollection] = await db
    .insert(collection)
    .values({
      userId,
      path,
      name: name || path.split('/').pop()!,
      lastOpened: new Date(),
    })
    .returning();

  return json(newCollection);
};
```

Create `/apps/web/src/routes/api/collections/[path]/+server.ts`:

```typescript
import { json } from '@sveltejs/kit';
import { db, getUserId } from '$lib/server/db';
import { collection } from '@haptic/db/schema';
import { eq, and } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const PUT: RequestHandler = async ({ params, locals }) => {
  const userId = await getUserId(locals);
  const path = decodeURIComponent(params.path);

  await db
    .update(collection)
    .set({ lastOpened: new Date() })
    .where(and(
      eq(collection.userId, userId),
      eq(collection.path, path)
    ));

  return json({ success: true });
};
```

### 3.2 Create Entry API Endpoints
Create `/apps/web/src/routes/api/entries/+server.ts`:

```typescript
import { json } from '@sveltejs/kit';
import { db, getUserId } from '$lib/server/db';
import { entry, collection } from '@haptic/db/schema';
import { eq, and } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
  const userId = await getUserId(locals);
  const collectionPath = url.searchParams.get('collection');
  const parentPath = url.searchParams.get('parent');

  if (!collectionPath) {
    return json({ error: 'Collection path required' }, { status: 400 });
  }

  // Get collection
  const [collectionData] = await db
    .select()
    .from(collection)
    .where(and(
      eq(collection.userId, userId),
      eq(collection.path, collectionPath)
    ));

  if (!collectionData) {
    return json({ error: 'Collection not found' }, { status: 404 });
  }

  // Get entries
  let query = db
    .select()
    .from(entry)
    .where(and(
      eq(entry.userId, userId),
      eq(entry.collectionId, collectionData.id)
    ));

  if (parentPath) {
    query = query.where(eq(entry.parentPath, parentPath));
  }

  const entries = await query;
  return json(entries);
};

export const POST: RequestHandler = async ({ request, locals }) => {
  const userId = await getUserId(locals);
  const data = await request.json();

  const [newEntry] = await db
    .insert(entry)
    .values({
      ...data,
      userId,
    })
    .returning();

  return json(newEntry);
};
```

### 3.3 Update Client-Side API Layer
Update `/apps/web/src/lib/api/collection.ts`:

```typescript
import { activeFile, collection, collectionEntries, noteHistory } from '@/store';
import type { FileEntry } from '@/types';
import { buildFileTree, sortFileEntry } from '@/utils';
import { get } from 'svelte/store';

export const fetchCollectionEntries = async (
  dirPath?: string,
  sort: 'name' | 'date' = 'name',
  showDotfiles = false
): Promise<FileEntry[]> => {
  dirPath = dirPath || get(collection);
  if (!dirPath) throw new Error('No directory path provided');

  const response = await fetch(`/api/entries?collection=${encodeURIComponent(get(collection))}&parent=${encodeURIComponent(dirPath)}`);
  if (!response.ok) throw new Error('Failed to fetch entries');
  
  const entries = await response.json();

  // Convert entries to FileEntry[] format and sort
  const fileEntries = buildFileTree(entries, dirPath);
  
  // Sort and filter logic remains the same...
  const result = showDotfiles ? fileEntries : filterDotfiles(fileEntries);
  collectionEntries.set(result);
  return result;
};

export const loadCollection = async (path?: string) => {
  if (!path) return;
  
  collection.set(path);
  noteHistory.set([]);
  activeFile.set(null);

  // Update last opened via API
  await fetch(`/api/collections/${encodeURIComponent(path)}`, {
    method: 'PUT'
  });
};

export const getCollections = async () => {
  const response = await fetch('/api/collections');
  if (!response.ok) throw new Error('Failed to fetch collections');
  return response.json();
};
```

## Phase 4: Environment Configuration

## Implementation Timeline

- **Day 1**: Database schema creation with Drizzle
- **Day 2**: Create SvelteKit server endpoints 
- **Day 3**: Update client-side API calls to use server endpoints
- **Day 4**: Remove PGlite dependencies and test functionality
- **Day 5**: Bug fixes and optimization

## Benefits

1. **Multi-device Access**: Data syncs across all devices
2. **No Local Storage Limits**: Unlimited storage in the cloud
3. **Simplified Architecture**: Remove PGlite from web app, keep current auth
4. **Better Performance**: Server-side queries for large datasets
5. **Automatic Backups**: Supabase handles backups
6. **Secure**: Database queries happen server-side, no exposed credentials

## Code Changes Summary

### Files to Modify
1. `/apps/web/package.json` - Remove @electric-sql/pglite
2. `/apps/web/src/lib/api/*.ts` - Update API files to use fetch() calls to server endpoints
3. `/packages/db/src/schema/` - Add collection and entry schemas

### Files to Add
1. `/apps/web/src/lib/server/db.ts` - Server-side database client
2. `/apps/web/src/routes/api/collections/+server.ts` - Collection endpoints
3. `/apps/web/src/routes/api/collections/[path]/+server.ts` - Individual collection endpoints
4. `/apps/web/src/routes/api/entries/+server.ts` - Entry endpoints
5. `/packages/db/src/schema/collection.ts` - Collection schema
6. `/packages/db/src/schema/entry.ts` - Entry schema

### Files to Remove
1. `/apps/web/src/lib/database/` - Entire directory (web app only)
2. PGlite-related imports and configurations from web app 