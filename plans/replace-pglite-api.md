# Replace PGlite with Supabase API - Migration Plan

## Overview
Replace PGlite (local SQLite) with Supabase in the web app while keeping PGlite in the desktop app for offline functionality. This is a greenfield project with no concern about existing data.

## Current State
- **Web App**: Uses PGlite with direct database access
- **Desktop App**: Uses PGlite for offline-first functionality (no changes needed)
- **Database**: Drizzle ORM schema already defined
- **API Endpoints**: Basic CRUD operations already built for collections and entries

## Architecture Decision
- Keep IDs as primary identifiers (better performance, immutability, REST standards)
- Add helper endpoints to resolve paths to IDs
- Use client-side caching to minimize lookups

## Post-Review Improvements (2024-06-22)

The following changes incorporate peer-review feedback and **supersede** any conflicting details in later sections.

### Database schema
- Use Postgres `uuid` columns with `DEFAULT gen_random_uuid()` for all primary keys (`collections.id`, `entries.id`, etc.). Remove all usages of `generateId()` in code examples—the database will supply the ID.
- Add composite **unique constraints**:
  - `collections (user_id, path)`
  - `entries (user_id, path)`

### API endpoints
- **Search (`/api/search`)**
  - Guard expensive regex queries with `pg_try_advisory_xact_lock()` (or another safe-guard) to abort pathological patterns early.
- **Batch (`/api/entries/batch`)**
  - Enforce a hard limit of **1 000** operations per request.
  - If any sub-operation fails, return HTTP **207 Multi-Status** (or `200` with `success: false`) so the client can distinguish partial failure.
- **Import (`/api/collections/import`)**
  - Reject request bodies larger than ≈10 MB.
  - Pre-compute `parentPath` once with a helper instead of per-row string manipulation.
  - When a duplicate `path` exists, update the row's `updated_at` rather than silently skipping. Document this behaviour.

### Payload validation
- All POST / PUT endpoints must validate request bodies with **zod** (or `superstruct`) and fail fast with **400 Bad Request** when invalid.

### Client utilities
- `optimisticUpdate()` now caches the previous store value and restores it directly on rollback instead of calling `refreshCollection()`, eliminating extra round-trips and UI flicker.

### Testing
- **Phase 1** now requires **Vitest** unit tests for every new endpoint covering:
  1. successful request
  2. authentication failure
  3. payload validation failure
  4. partial failure scenarios (batch & import)

## Step-by-Step Implementation Plan

### Phase 1: Build Foundation (Server-Side API)

#### Step 1: Create Path Resolution Endpoint
- [ ] **File**: `routes/api/resolve/+server.ts`
- **Purpose**: Convert paths to IDs for other operations
- **Priority**: High - needed by many other operations

```typescript
// routes/api/resolve/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { entries } from '@haptic/db';
import { eq, and, inArray } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request, locals }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { paths } = await request.json();
  
  if (!Array.isArray(paths)) {
    return json({ error: 'paths must be an array' }, { status: 400 });
  }

  try {
    const results = await db
      .select({ path: entries.path, id: entries.id })
      .from(entries)
      .where(
        and(
          eq(entries.userId, session.user.id),
          inArray(entries.path, paths)
        )
      );

    const mappings = results.reduce((acc, { path, id }) => {
      acc[path] = id;
      return acc;
    }, {} as Record<string, string>);

    return json({ mappings });
  } catch (error) {
    console.error('Error resolving paths:', error);
    return json({ error: 'Failed to resolve paths' }, { status: 500 });
  }
};
```

#### Step 2: Create Query by Parent Path Endpoint  
- [ ] **File**: `routes/api/entries/by-parent/+server.ts`
- **Purpose**: Get entries by parent path (for sidebars)
- **Priority**: High - core navigation functionality

```typescript
// routes/api/entries/by-parent/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { entries } from '@haptic/db';
import { eq, and, or } from 'drizzle-orm';

export const GET: RequestHandler = async ({ url, locals }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parentPath = url.searchParams.get('path');
  if (!parentPath) {
    return json({ error: 'path parameter is required' }, { status: 400 });
  }

  try {
    // Get all entries that are direct children of the parent path
    const results = await db
      .select()
      .from(entries)
      .where(
        and(
          eq(entries.userId, session.user.id),
          or(
            eq(entries.parentPath, parentPath),
            eq(entries.path, parentPath) // Include the parent itself
          )
        )
      )
      .orderBy(entries.isFolder.desc(), entries.name);

    return json(results);
  } catch (error) {
    console.error('Error fetching entries by parent:', error);
    return json({ error: 'Failed to fetch entries' }, { status: 500 });
  }
};
```

#### Step 3: Create Search Endpoint
- [ ] **File**: `routes/api/search/+server.ts`
- **Purpose**: Replace direct SQL search with API
- **Priority**: Medium - important but not blocking

```typescript
// routes/api/search/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { entries } from '@haptic/db';
import { eq, and, like, sql } from 'drizzle-orm';

export const GET: RequestHandler = async ({ url, locals }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const collectionPath = url.searchParams.get('collection');
  const query = url.searchParams.get('query');
  const caseSensitive = url.searchParams.get('caseSensitive') === 'true';
  const wholeWord = url.searchParams.get('wholeWord') === 'true';

  if (!collectionPath || !query) {
    return json({ error: 'collection and query parameters are required' }, { status: 400 });
  }

  try {
    let searchPattern = query;
    
    // Handle whole word search
    if (wholeWord) {
      searchPattern = `\\b${query}\\b`;
    }

    // Build the where conditions
    const conditions = [
      eq(entries.userId, session.user.id),
      like(entries.path, `${collectionPath}%`),
      eq(entries.isFolder, false)
    ];

    // Add search condition based on case sensitivity
    if (caseSensitive) {
      conditions.push(
        sql`${entries.content} ~ ${searchPattern}`
      );
    } else {
      conditions.push(
        sql`${entries.content} ~* ${searchPattern}`
      );
    }

    const results = await db
      .select({
        id: entries.id,
        path: entries.path,
        name: entries.name,
        // Include a snippet of the match
        snippet: sql<string>`
          CASE 
            WHEN position(${query} in ${entries.content}) > 0
            THEN substring(${entries.content} from greatest(1, position(${query} in ${entries.content}) - 50) for 150)
            ELSE substring(${entries.content} from 1 for 150)
          END
        `.as('snippet')
      })
      .from(entries)
      .where(and(...conditions))
      .limit(50);

    return json(results);
  } catch (error) {
    console.error('Error searching entries:', error);
    return json({ error: 'Failed to search entries' }, { status: 500 });
  }
};
```

#### Step 4: Create Collection Latest Endpoint
- [ ] **File**: `routes/api/collections/latest/+server.ts`
- **Purpose**: Get most recently accessed collection
- **Priority**: Medium - needed for app initialization

```typescript
// routes/api/collections/latest/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { collections } from '@haptic/db';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async ({ locals }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await db
      .select({ path: collections.path })
      .from(collections)
      .where(eq(collections.userId, session.user.id))
      .orderBy(collections.lastAccessedAt.desc())
      .limit(1);

    if (result.length === 0) {
      return json(null);
    }

    return json({ path: result[0].path });
  } catch (error) {
    console.error('Error fetching latest collection:', error);
    return json({ error: 'Failed to fetch latest collection' }, { status: 500 });
  }
};
```

#### Step 5: Create Batch Operations Endpoint
- [ ] **File**: `routes/api/entries/batch/+server.ts`
- **Purpose**: Handle bulk operations (folder moves, etc)
- **Priority**: Low - optimization, not critical path

```typescript
// routes/api/entries/batch/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { entries } from '@haptic/db';
import { eq, and } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request, locals }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { operations } = await request.json();

  if (!Array.isArray(operations)) {
    return json({ error: 'operations must be an array' }, { status: 400 });
  }

  try {
    const results = await db.transaction(async (tx) => {
      const responses = [];

      for (const op of operations) {
        switch (op.action) {
          case 'create':
            const [created] = await tx
              .insert(entries)
              .values({
                ...op.entry,
                userId: session.user.id,
                createdAt: new Date(),
                updatedAt: new Date()
              })
              .returning();
            responses.push({ action: 'create', success: true, data: created });
            break;

          case 'update':
            const [updated] = await tx
              .update(entries)
              .set({
                ...op.entry,
                updatedAt: new Date()
              })
              .where(
                and(
                  eq(entries.id, op.entry.id),
                  eq(entries.userId, session.user.id)
                )
              )
              .returning();
            responses.push({ action: 'update', success: true, data: updated });
            break;

          case 'delete':
            await tx
              .delete(entries)
              .where(
                and(
                  eq(entries.id, op.entry.id),
                  eq(entries.userId, session.user.id)
                )
              );
            responses.push({ action: 'delete', success: true });
            break;
        }
      }

      return responses;
    });

    return json({ results });
  } catch (error) {
    console.error('Error in batch operations:', error);
    return json({ error: 'Failed to execute batch operations' }, { status: 500 });
  }
};
```

#### Step 6: Create Collection Import Endpoint
- [ ] **File**: `routes/api/collections/import/+server.ts`
- **Purpose**: Import entire collection structures
- **Priority**: Low - feature enhancement

```typescript
// routes/api/collections/import/+server.ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { entries, collections } from '@haptic/db';
import { eq } from 'drizzle-orm';
import { generateId } from '$lib/utils';

export const POST: RequestHandler = async ({ request, locals }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { collectionPath, entries: importEntries } = await request.json();

  if (!collectionPath || !Array.isArray(importEntries)) {
    return json({ error: 'Invalid import data' }, { status: 400 });
  }

  try {
    const result = await db.transaction(async (tx) => {
      // Create or update the collection
      const collectionId = generateId();
      await tx
        .insert(collections)
        .values({
          id: collectionId,
          userId: session.user.id,
          path: collectionPath,
          name: collectionPath.split('/').pop() || 'Imported Collection',
          createdAt: new Date(),
          updatedAt: new Date(),
          lastAccessedAt: new Date()
        })
        .onConflictDoUpdate({
          target: [collections.userId, collections.path],
          set: {
            lastAccessedAt: new Date()
          }
        });

      // Import all entries
      let imported = 0;
      const errors = [];

      for (const entry of importEntries) {
        try {
          await tx
            .insert(entries)
            .values({
              id: generateId(),
              userId: session.user.id,
              collectionId,
              path: entry.path,
              parentPath: entry.path.split('/').slice(0, -1).join('/') || '/',
              name: entry.name,
              content: entry.content || '',
              isFolder: entry.isFolder,
              createdAt: new Date(),
              updatedAt: new Date()
            });
          imported++;
        } catch (error) {
          errors.push(`Failed to import ${entry.path}: ${error.message}`);
        }
      }

      return { imported, errors };
    });

    return json({ 
      success: true, 
      imported: result.imported, 
      errors: result.errors 
    });
  } catch (error) {
    console.error('Error importing collection:', error);
    return json({ error: 'Failed to import collection' }, { status: 500 });
  }
};
```

### Phase 1 Testing Checkpoint
- [ ] Test each endpoint with Postman/curl
- [ ] Verify authentication works on all endpoints
- [ ] Check error handling (invalid paths, missing data)
- [ ] Ensure proper status codes returned

### Phase 2: Build Client Infrastructure

#### Step 7: Create API Client Helper
- [ ] **File**: `lib/api/client.ts`
- **Purpose**: Centralized API communication with caching
- **Features**:
  - Path resolution with TTL caching
  - Batch path resolution
  - Error handling and retries
  - Authentication header injection

```typescript
// lib/api/client.ts
export class APIClient {
  private pathCache = new Map<string, { id: string, timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  private cleanCache() {
    const now = Date.now();
    for (const [path, data] of this.pathCache.entries()) {
      if (now - data.timestamp > this.CACHE_TTL) {
        this.pathCache.delete(path);
      }
    }
  }

  async resolvePath(path: string): Promise<string | null> {
    // Check cache first
    const cached = this.pathCache.get(path);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.id;
    }

    const { mappings } = await this.resolvePaths([path]);
    return mappings[path] || null;
  }

  async resolvePaths(paths: string[]): Promise<{ mappings: Record<string, string> }> {
    this.cleanCache();

    // Separate cached and uncached paths
    const uncachedPaths: string[] = [];
    const mappings: Record<string, string> = {};

    for (const path of paths) {
      const cached = this.pathCache.get(path);
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        mappings[path] = cached.id;
      } else {
        uncachedPaths.push(path);
      }
    }

    // Fetch uncached paths
    if (uncachedPaths.length > 0) {
      const response = await fetch('/api/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paths: uncachedPaths })
      });

      if (!response.ok) {
        throw new Error(`Failed to resolve paths: ${response.statusText}`);
      }

      const { mappings: newMappings } = await response.json();

      // Update cache and results
      const now = Date.now();
      for (const [path, id] of Object.entries(newMappings)) {
        this.pathCache.set(path, { id, timestamp: now });
        mappings[path] = id;
      }
    }

    return { mappings };
  }

  // Helper method for API calls with error handling
  async request<T>(url: string, options?: RequestInit): Promise<T> {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers
      }
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(error.error || response.statusText);
    }

    return response.json();
  }
}

// Export singleton instance
export const apiClient = new APIClient();
```

#### Step 8: Create Store Update Utilities
- [ ] **File**: `lib/api/store-helpers.ts`
- **Purpose**: Consistent store updates across API operations
- **Functions**:
  - `updateCollectionEntries()` - Add/update/remove entries
  - `refreshCollection()` - Reload entire collection
  - `optimisticUpdate()` - Update UI before API confirms

```typescript
// lib/api/store-helpers.ts
import { collectionEntries, selectedCollection } from '$lib/store';
import { get } from 'svelte/store';
import type { TreeEntry } from '$lib/types';

export function updateCollectionEntries(
  action: 'add' | 'update' | 'remove',
  entry: TreeEntry | TreeEntry[]
) {
  collectionEntries.update(entries => {
    const entryArray = Array.isArray(entry) ? entry : [entry];
    
    switch (action) {
      case 'add':
        return [...entries, ...entryArray];
      
      case 'update':
        return entries.map(e => {
          const updated = entryArray.find(u => u.path === e.path);
          return updated || e;
        });
      
      case 'remove':
        const pathsToRemove = entryArray.map(e => e.path);
        return entries.filter(e => !pathsToRemove.includes(e.path));
      
      default:
        return entries;
    }
  });
}

export async function refreshCollection(collectionPath?: string) {
  const currentCollection = collectionPath || get(selectedCollection);
  if (!currentCollection) return;

  try {
    const response = await fetch(`/api/entries/by-parent?path=${encodeURIComponent(currentCollection)}`);
    if (!response.ok) throw new Error('Failed to fetch entries');
    
    const entries = await response.json();
    collectionEntries.set(entries.map(e => ({
      path: e.path,
      name: e.name,
      children: e.isFolder ? undefined : null
    })));
  } catch (error) {
    console.error('Error refreshing collection:', error);
  }
}

export function optimisticUpdate<T>(
  updateFn: () => void,
  apiCall: () => Promise<T>,
  rollbackFn?: () => void
): Promise<T> {
  // Apply optimistic update
  updateFn();

  // Make API call and handle rollback on error
  return apiCall().catch(error => {
    if (rollbackFn) {
      rollbackFn();
    } else {
      // Default rollback: refresh collection
      refreshCollection();
    }
    throw error;
  });
}

// Helper to build tree structure from flat entries
export function buildTreeFromEntries(entries: any[]): TreeEntry[] {
  const tree: TreeEntry[] = [];
  const pathMap = new Map<string, TreeEntry>();

  // First pass: create all entries
  for (const entry of entries) {
    const treeEntry: TreeEntry = {
      path: entry.path,
      name: entry.name,
      children: entry.isFolder ? [] : undefined
    };
    pathMap.set(entry.path, treeEntry);
  }

  // Second pass: build tree structure
  for (const entry of entries) {
    const treeEntry = pathMap.get(entry.path)!;
    if (entry.parentPath && entry.parentPath !== '/') {
      const parent = pathMap.get(entry.parentPath);
      if (parent && parent.children) {
        parent.children.push(treeEntry);
      } else {
        tree.push(treeEntry);
      }
    } else {
      tree.push(treeEntry);
    }
  }

  return tree;
}
```

### Phase 2 Testing Checkpoint
- [ ] Verify path caching works correctly
- [ ] Test cache invalidation after TTL
- [ ] Ensure store updates trigger UI reactivity
- [ ] Check optimistic updates and rollbacks

### Phase 3: Update Components (Gradual Migration)

#### Step 9: Update Layout Component
- [ ] **File**: `routes/(app)/+layout.svelte`
- **Changes**:
  - Remove `migrateDatabase()` function
  - Replace `loadLatestCollection()` with API call
  - Remove all PGlite imports
  - Update error handling
- **Testing**: Verify app loads with correct collection

```typescript
// routes/(app)/+layout.svelte - BEFORE
<script>
  import { pgClient } from '$lib/database/client';
  import { migrateDatabase } from '$lib/database/migrate';
  
  onMount(async () => {
    await migrateDatabase();
    await loadLatestCollection();
  });
  
  async function loadLatestCollection() {
    const result = await pgClient.query(
      'SELECT path FROM collections WHERE userId = ? ORDER BY lastAccessedAt DESC LIMIT 1',
      [userId]
    );
    if (result.rows[0]) {
      await selectCollection(result.rows[0].path);
    }
  }
</script>

// routes/(app)/+layout.svelte - AFTER
<script>
  import { onMount } from 'svelte';
  import { selectCollection } from '$lib/api/collection';
  
  onMount(async () => {
    await loadLatestCollection();
  });
  
  async function loadLatestCollection() {
    try {
      const response = await fetch('/api/collections/latest');
      if (!response.ok) {
        throw new Error('Failed to load latest collection');
      }
      
      const data = await response.json();
      if (data && data.path) {
        await selectCollection(data.path);
      }
    } catch (error) {
      console.error('Error loading latest collection:', error);
      // Handle error - maybe show a toast or fallback UI
    }
  }
</script>
```

#### Step 10: Update Sidebar Components
- [ ] **Files**: 
  - `routes/(app)/notes/sidebar.svelte`
  - `routes/(app)/daily/sidebar.svelte`
- **Changes**:
  - Remove `watchCollection()` and `pgClient.live.query()`
  - Use store subscriptions only
  - Update to use `/api/entries/by-parent` endpoint
- **Testing**: Verify navigation and real-time updates work

```typescript
// routes/(app)/notes/sidebar.svelte - BEFORE
<script>
  import { pgClient } from '$lib/database/client';
  
  let unsubscribe: (() => void) | undefined;
  
  function watchCollection(collectionPath: string) {
    unsubscribe?.();
    
    const { unsubscribe: unsubscribeFn } = pgClient.live.query(
      `SELECT * FROM entries WHERE parentPath = ? ORDER BY isFolder DESC, name`,
      [collectionPath],
      (results) => {
        collectionEntries.set(results.rows);
      }
    );
    
    unsubscribe = unsubscribeFn;
  }
  
  $: if ($selectedCollection) {
    watchCollection($selectedCollection);
  }
</script>

// routes/(app)/notes/sidebar.svelte - AFTER
<script>
  import { collectionEntries, selectedCollection } from '$lib/store';
  import { refreshCollection } from '$lib/api/store-helpers';
  
  // Simply subscribe to the store - API calls update it
  $: entries = $collectionEntries;
  
  // Refresh when collection changes
  $: if ($selectedCollection) {
    refreshCollection($selectedCollection);
  }
</script>
```

#### Step 11: Update Search Functionality
- [ ] **File**: `lib/utils.ts`
- **Changes**:
  - Replace `searchEntries()` to use `/api/search`
  - Remove direct SQL query logic
  - Update result formatting
- **Testing**: Verify search works with all options

```typescript
// lib/utils.ts - BEFORE
import { pgClient } from '$lib/database/client';

export async function searchEntries(
  collectionPath: string,
  query: string,
  options: { caseSensitive?: boolean; wholeWord?: boolean } = {}
) {
  const searchPattern = options.wholeWord ? `\\b${query}\\b` : query;
  const operator = options.caseSensitive ? '~' : '~*';
  
  const result = await pgClient.query(
    `SELECT id, path, name, 
     substring(content from greatest(1, position($1 in content) - 50) for 150) as snippet
     FROM entries 
     WHERE userId = $2 
     AND path LIKE $3 || '%'
     AND content ${operator} $4
     AND isFolder = false
     LIMIT 50`,
    [query, userId, collectionPath, searchPattern]
  );
  
  return result.rows;
}

// lib/utils.ts - AFTER
export async function searchEntries(
  collectionPath: string,
  query: string,
  options: { caseSensitive?: boolean; wholeWord?: boolean } = {}
) {
  const params = new URLSearchParams({
    collection: collectionPath,
    query,
    caseSensitive: String(options.caseSensitive || false),
    wholeWord: String(options.wholeWord || false)
  });

  const response = await fetch(`/api/search?${params}`);
  
  if (!response.ok) {
    throw new Error('Search failed');
  }
  
  return response.json();
}
```

#### Step 12: Update Command Menu
- [ ] **File**: `lib/components/shared/command-menu/command.svelte`
- **Changes**:
  - Update import to use `/api/collections/import`
  - Add progress indicators for large imports
  - Improve error handling and reporting
- **Testing**: Import various file structures

```typescript
// lib/components/shared/command-menu/command.svelte - BEFORE
<script>
  import { pgClient } from '$lib/database/client';
  
  async function importCollection(files: File[]) {
    const entries = [];
    
    for (const file of files) {
      const content = await file.text();
      entries.push({
        path: `/collection/${file.webkitRelativePath}`,
        name: file.name,
        content,
        isFolder: false
      });
    }
    
    // Direct database insert
    await pgClient.query(
      'INSERT INTO entries (path, name, content, isFolder) VALUES ...',
      entries
    );
  }
</script>

// lib/components/shared/command-menu/command.svelte - AFTER  
<script>
  import { updateCollectionEntries } from '$lib/api/store-helpers';
  
  let importing = false;
  let importProgress = 0;
  
  async function importCollection(files: File[]) {
    importing = true;
    importProgress = 0;
    
    try {
      const entries = [];
      
      for (const file of files) {
        const content = await file.text();
        entries.push({
          path: `/collection/${file.webkitRelativePath}`,
          name: file.name,
          content,
          isFolder: false
        });
        
        importProgress = (entries.length / files.length) * 50;
      }
      
      const response = await fetch('/api/collections/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionPath: '/collection',
          entries
        })
      });
      
      if (!response.ok) {
        throw new Error('Import failed');
      }
      
      const result = await response.json();
      
      if (result.errors?.length > 0) {
        console.error('Import errors:', result.errors);
        // Show errors in UI
      }
      
      // Refresh the collection
      await refreshCollection('/collection');
      
      importProgress = 100;
    } catch (error) {
      console.error('Import failed:', error);
      // Show error toast
    } finally {
      importing = false;
    }
  }
</script>

{#if importing}
  <div class="import-progress">
    <p>Importing collection...</p>
    <progress value={importProgress} max="100">{importProgress}%</progress>
  </div>
{/if}
```

### Phase 3 Testing Checkpoint
- [ ] Full CRUD operations (create, read, update, delete)
- [ ] Collection switching and navigation
- [ ] Search with all filter options
- [ ] Import/export functionality
- [ ] Batch operations (moving folders with contents)

### Phase 4: Cleanup

#### Step 13: Remove Database Client
- [ ] **Actions**:
  - Delete `lib/database/client.ts`
  - Remove all remaining PGlite imports
  - Clean up unused database utilities
- **Verification**: Search codebase for any PGlite references

```bash
# Commands to run
rm apps/web/src/lib/database/client.ts

# Search for any remaining PGlite references
grep -r "pglite" apps/web/src/
grep -r "pgClient" apps/web/src/
grep -r "database/client" apps/web/src/

# Remove any migration files that are no longer needed
rm -rf apps/web/src/lib/database/migrations/
```

#### Step 14: Update Package Dependencies
- [ ] **Actions**:
  - Remove `@electric-sql/pglite` from `package.json`
  - Remove `@electric-sql/pglite-sync` if present
  - Run `pnpm install` to update lockfile
- **Verification**: Check bundle size reduction

```json
// apps/web/package.json - BEFORE
{
  "dependencies": {
    "@electric-sql/pglite": "^0.2.9",
    "@electric-sql/pglite-sync": "^0.1.3",
    // ... other dependencies
  }
}

// apps/web/package.json - AFTER
{
  "dependencies": {
    // PGlite dependencies removed
    // ... other dependencies remain
  }
}
```

```bash
# Commands to run
cd apps/web

# Remove PGlite packages
pnpm remove @electric-sql/pglite @electric-sql/pglite-sync

# Clean install to update lockfile
pnpm install

# Build to verify no errors
pnpm build

# Check bundle size (before and after)
du -sh .svelte-kit/output/client/_app/immutable/chunks/
```

### Phase 4 Testing Checkpoint
- [ ] No PGlite references remain in code
- [ ] App builds without errors
- [ ] Bundle size is reduced
- [ ] Full regression test of all features

## Implementation Order Rationale

1. **Server first**: Build all APIs before touching client code to ensure backend is ready
2. **Infrastructure before features**: Create helpers and utilities before updating components
3. **Gradual migration**: Update one component at a time to isolate issues
4. **Most critical first**: Start with core functionality (layout, sidebars) before advanced features
5. **Cleanup last**: Remove old code only after everything is confirmed working

## Risk Mitigation

- **Rollback Plan**: Git branch for each phase, can revert if issues arise
- **Feature Flags**: Consider adding flags to toggle between old/new implementation
- **Monitoring**: Add logging to new endpoints to track usage and errors
- **Testing**: Automated tests for critical paths before deployment

## Complete Migration Checklist

### Server-Side (Phase 1)
- [ ] Step 1: Create `/api/resolve` endpoint
- [ ] Step 2: Create `/api/entries/by-parent` endpoint
- [ ] Step 3: Create `/api/search` endpoint
- [ ] Step 4: Create `/api/collections/latest` endpoint
- [ ] Step 5: Create `/api/entries/batch` endpoint
- [ ] Step 6: Create `/api/collections/import` endpoint
- [ ] Phase 1 Testing Complete

### Client Infrastructure (Phase 2)
- [ ] Step 7: Create API client helper with caching
- [ ] Step 8: Create store update utilities
- [ ] Phase 2 Testing Complete

### Component Updates (Phase 3)
- [ ] Step 9: Update `routes/(app)/+layout.svelte`
- [ ] Step 10: Update sidebar components (notes & daily)
- [ ] Step 11: Update search functionality in `lib/utils.ts`
- [ ] Step 12: Update command menu import functionality
- [ ] Phase 3 Testing Complete

### Cleanup (Phase 4)
- [ ] Step 13: Remove database client and PGlite imports
- [ ] Step 14: Update package dependencies
- [ ] Phase 4 Testing Complete
- [ ] Full regression test passed

### Sign-off
- [ ] All features working as expected
- [ ] No PGlite references in web app
- [ ] Bundle size reduced
- [ ] Documentation updated
- [ ] Ready for deployment

## New API Endpoints Needed

### 1. Path Resolution Endpoint
```
POST /api/resolve
Body: { paths: string[] }
Response: { mappings: { [path: string]: string } }
```

### 2. Batch Operations Endpoint
```
POST /api/entries/batch
Body: { 
  operations: Array<{
    action: 'create' | 'update' | 'delete',
    entry: EntryData
  }>
}
```

### 3. Query by Parent Path
```
GET /api/entries/by-parent?path=/collection/folder
Response: Entry[]
```

### 4. Search Endpoint
```
GET /api/search
Query params:
  - collection: string (collection path)
  - query: string
  - caseSensitive?: boolean
  - wholeWord?: boolean
Response: SearchResult[]
```

### 5. Collection Import Endpoint
```
POST /api/collections/import
Body: {
  collectionPath: string,
  entries: Array<{
    path: string,
    name: string,
    content: string,
    isFolder: boolean
  }>
}
Response: { 
  success: boolean,
  imported: number,
  errors?: string[]
}
```

### 6. Collection Latest Endpoint
```
GET /api/collections/latest
Response: { path: string } | null
```

## Client-Side Implementation

### 1. Create API Helper (`lib/api/client.ts`)
```typescript
class APIClient {
  private pathCache = new Map<string, { id: string, timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  
  async resolvePath(path: string): Promise<string> {
    // Check cache first
    const cached = this.pathCache.get(path);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.id;
    }
    
    // Resolve from API
    const response = await fetch('/api/resolve', {
      method: 'POST',
      body: JSON.stringify({ paths: [path] })
    });
    const { mappings } = await response.json();
    
    // Cache the result
    this.pathCache.set(path, { 
      id: mappings[path], 
      timestamp: Date.now() 
    });
    
    return mappings[path];
  }
  
  // Batch resolve for efficiency
  async resolvePaths(paths: string[]): Promise<Record<string, string>> {
    // Similar implementation with batching
  }
}
```

### 2. Update API Files

#### `lib/api/collection.ts`
- Replace `db.select()` with API calls
- Update `collectionEntries` store after operations
```typescript
export async function createCollection(name: string, parentPath?: string) {
  const response = await fetch('/api/collections', { ... });
  const collection = await response.json();
  
  // Update the store
  collectionEntries.update(entries => [...entries, collection]);
  
  return collection;
}
```

#### `lib/api/folders.ts` & `lib/api/notes.ts`
- Same pattern: API call → Update store
- No need for live queries

### 3. Update Components

#### `routes/(app)/+layout.svelte`
- Remove database migration logic (`migrateDatabase()`)
- Replace `loadLatestCollection()` with API call to `/api/collections/latest`
- Remove all PGlite imports

#### `routes/(app)/notes/sidebar.svelte` & `routes/(app)/daily/sidebar.svelte`
- Remove `watchCollection()` and live query logic
- API calls already update the `collectionEntries` store
- The store subscription will handle UI updates automatically

#### `lib/utils.ts`
- Replace `searchEntries()` function to use `/api/search` endpoint
- Remove direct SQL query logic
- Remove PGlite imports

## Key Files to Update
1. `lib/api/collection.ts` - Collection operations ✓
2. `lib/api/folders.ts` - Folder operations ✓
3. `lib/api/notes.ts` - Note operations ✓
4. `lib/api/settings.ts` - Settings operations ✓
5. `lib/components/shared/command-menu/command.svelte` - Import functionality
6. `lib/database/client.ts` - Remove entirely ✓
7. `routes/(app)/+layout.svelte` - Remove migrations, update collection loading
8. `routes/(app)/notes/sidebar.svelte` - Remove live queries
9. `routes/(app)/daily/sidebar.svelte` - Remove live queries
10. `lib/utils.ts` - Update search functionality

## Simplified Update Strategy
Since this is a single-user app, we don't need real-time subscriptions:

1. **Optimistic Updates**: Update UI immediately after API calls
2. **Store Updates**: Each API function updates the relevant store
3. **No Live Queries**: Remove all `pgClient.live.query` calls
4. **Reactive UI**: Svelte stores handle UI updates automatically

Example pattern:
```typescript
// In api/notes.ts
export async function createNote(collectionPath: string, name?: string) {
  const response = await fetch('/api/entries', { ... });
  const newNote = await response.json();
  
  // Update the store - UI will react automatically
  collectionEntries.update(entries => {
    return [...entries, {
      path: newNote.path,
      name: newNote.name,
      children: undefined
    }];
  });
  
  return newNote;
}
```

## Migration Steps
1. Create new API helper with path resolution ✓
2. Update all API files to use server endpoints ✓
3. Replace command menu import logic ✓
4. **Replace database migrations in layout**
5. **Remove live queries from sidebars**
6. **Update search functionality**
7. Test all CRUD operations ✓
8. Test batch operations (folder moves) ✓
9. Test collection import ✓
10. Remove PGlite dependencies ✓ 