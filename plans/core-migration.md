## Core Migration – Phase 1 (Bare Essentials)

> Goal: Replace PGlite with Supabase in the **web app** while keeping desktop functionality intact, delivering only what is absolutely required for the app to function end-to-end. All other enhancements are deferred to later phases.

### 1. Database Schema

**File to create**: `packages/db/migrations/0001_migrate_to_supabase.sql`

```sql
-- Update all ID columns to use UUID with auto-generation
ALTER TABLE collections 
  ALTER COLUMN id SET DATA TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

ALTER TABLE entries 
  ALTER COLUMN id SET DATA TYPE uuid USING gen_random_uuid(),
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN collection_id SET DATA TYPE uuid;

-- Add unique constraints for path-based lookups
ALTER TABLE collections 
  ADD CONSTRAINT collections_user_path_unique UNIQUE (user_id, path);

ALTER TABLE entries 
  ADD CONSTRAINT entries_user_path_unique UNIQUE (user_id, path);

-- Add indexes for performance
CREATE INDEX idx_entries_parent_path ON entries(user_id, parent_path);
CREATE INDEX idx_entries_collection_id ON entries(collection_id);
```

**File to update**: `packages/db/src/schema/collection.ts`

```typescript
// Change from:
id: text("id").primaryKey(),

// To:
id: uuid("id").primaryKey().defaultRandom(),
```

**File to update**: `packages/db/src/schema/entry.ts`

```typescript
// Change from:
id: text("id").primaryKey(),
collectionId: text("collection_id").notNull(),

// To:
id: uuid("id").primaryKey().defaultRandom(),
collectionId: uuid("collection_id").notNull(),
```

### 2. Authentication & Session

**Files already configured** (from memory [[memory:3661580077509251421]]):
- `apps/web/src/routes/(app)/+layout.server.ts`
- `apps/web/src/lib/auth.ts`

**Pattern to use in all new endpoints**:

```typescript
// Every new endpoint must start with:
export const GET: RequestHandler = async ({ locals }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }
  // ... rest of endpoint
};
```

### 3. Minimum Server API Surface

#### 3.1 Path Resolution Endpoint

**File to create**: `apps/web/src/routes/api/resolve/+server.ts`

```typescript
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { entries } from '@haptic/db';
import { eq, and, inArray } from 'drizzle-orm';
import { z } from 'zod';

const resolveSchema = z.object({
  paths: z.array(z.string()).min(1).max(100)
});

export const POST: RequestHandler = async ({ request, locals }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Validate request body
  const body = await request.json();
  const parsed = resolveSchema.safeParse(body);
  
  if (!parsed.success) {
    return json({ error: 'Invalid request', details: parsed.error.flatten() }, { status: 400 });
  }

  const { paths } = parsed.data;

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

#### 3.2 Entries by Parent Endpoint

**File to create**: `apps/web/src/routes/api/entries/by-parent/+server.ts`

```typescript
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { entries } from '@haptic/db';
import { eq, and, or, desc } from 'drizzle-orm';
import { z } from 'zod';

const querySchema = z.object({
  path: z.string().min(1)
});

export const GET: RequestHandler = async ({ url, locals }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Validate query params
  const params = Object.fromEntries(url.searchParams);
  const parsed = querySchema.safeParse(params);
  
  if (!parsed.success) {
    return json({ error: 'Invalid query parameters', details: parsed.error.flatten() }, { status: 400 });
  }

  const { path: parentPath } = parsed.data;

  try {
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
      .orderBy(desc(entries.isFolder), entries.name);

    return json(results);
  } catch (error) {
    console.error('Error fetching entries by parent:', error);
    return json({ error: 'Failed to fetch entries' }, { status: 500 });
  }
};
```

#### 3.3 Latest Collection Endpoint

**File to create**: `apps/web/src/routes/api/collections/latest/+server.ts`

```typescript
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { collections } from '@haptic/db';
import { eq, desc } from 'drizzle-orm';

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
      .orderBy(desc(collections.lastAccessedAt))
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

#### 3.4 Search Endpoint

**File to create**: `apps/web/src/routes/api/search/+server.ts`

```typescript
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { entries } from '@haptic/db';
import { eq, and, like, ilike } from 'drizzle-orm';
import { z } from 'zod';

const searchSchema = z.object({
  collection: z.string().min(1),
  query: z.string().min(1).max(100),
  caseSensitive: z.enum(['true', 'false']).optional().default('false')
});

export const GET: RequestHandler = async ({ url, locals }) => {
  const session = await locals.auth();
  if (!session?.user?.id) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const params = Object.fromEntries(url.searchParams);
  const parsed = searchSchema.safeParse(params);
  
  if (!parsed.success) {
    return json({ error: 'Invalid query parameters', details: parsed.error.flatten() }, { status: 400 });
  }

  const { collection: collectionPath, query, caseSensitive } = parsed.data;
  const isCaseSensitive = caseSensitive === 'true';

  try {
    // Use LIKE/ILIKE for basic search (regex deferred to Phase 2)
    const searchOp = isCaseSensitive ? like : ilike;
    
    const results = await db
      .select({
        id: entries.id,
        path: entries.path,
        name: entries.name,
        // Return first 150 chars as snippet
        snippet: entries.content
      })
      .from(entries)
      .where(
        and(
          eq(entries.userId, session.user.id),
          like(entries.path, `${collectionPath}%`),
          searchOp(entries.content, `%${query}%`),
          eq(entries.isFolder, false)
        )
      )
      .limit(50);

    // Trim content to snippet in JS (simpler than SQL for Phase 1)
    const resultsWithSnippets = results.map(r => ({
      ...r,
      snippet: r.snippet?.substring(0, 150) || ''
    }));

    return json(resultsWithSnippets);
  } catch (error) {
    console.error('Error searching entries:', error);
    return json({ error: 'Failed to search entries' }, { status: 500 });
  }
};
```

### 4. Client Utilities

#### 4.1 API Client with Path Resolution Cache

**File to create**: `apps/web/src/lib/api/client.ts`

```typescript
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

  // Generic request helper
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

#### 4.2 Store Helpers

**File to create**: `apps/web/src/lib/api/store-helpers.ts`

```typescript
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
    
    // Convert flat entries to tree structure for the store
    const treeEntries = entries.map(e => ({
      path: e.path,
      name: e.name,
      children: e.isFolder ? [] : undefined
    }));
    
    collectionEntries.set(treeEntries);
  } catch (error) {
    console.error('Error refreshing collection:', error);
  }
}

// Simple optimistic update for Phase 1
export function optimisticUpdate<T>(
  updateFn: () => void,
  apiCall: () => Promise<T>
): Promise<T> {
  // Apply optimistic update
  updateFn();

  // Make API call and rollback on error
  return apiCall().catch(error => {
    // Simple rollback: refresh the collection
    refreshCollection();
    throw error;
  });
}
```

### 5. UI Integration

#### 5.1 Update Layout

**File to update**: `apps/web/src/routes/(app)/+layout.svelte`

```typescript
// REMOVE these imports:
import { pgClient } from '$lib/database/client';
import { migrateDatabase } from '$lib/database/migrate';

// REMOVE this function:
async function migrateDatabase() {
  // Delete entire function
}

// REPLACE loadLatestCollection with:
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
    // Show error toast or fallback UI
  }
}

// UPDATE onMount:
onMount(async () => {
  // Remove: await migrateDatabase();
  await loadLatestCollection();
});
```

#### 5.2 Update Sidebars

**Files to update**: 
- `apps/web/src/routes/(app)/notes/sidebar.svelte`
- `apps/web/src/routes/(app)/daily/sidebar.svelte`

```typescript
// REMOVE these imports:
import { pgClient } from '$lib/database/client';

// REMOVE watchCollection function and unsubscribe logic:
let unsubscribe: (() => void) | undefined;

function watchCollection(collectionPath: string) {
  // Delete entire function
}

// ADD this import:
import { refreshCollection } from '$lib/api/store-helpers';

// REPLACE the reactive statement:
$: if ($selectedCollection) {
  refreshCollection($selectedCollection);
}

// The component already subscribes to $collectionEntries store
// No other changes needed - the store updates will trigger UI updates
```

#### 5.3 Update Search Utility

**File to update**: `apps/web/src/lib/utils.ts`

```typescript
// REMOVE this import:
import { pgClient } from '$lib/database/client';

// REPLACE searchEntries function:
export async function searchEntries(
  collectionPath: string,
  query: string,
  options: { caseSensitive?: boolean; wholeWord?: boolean } = {}
) {
  const params = new URLSearchParams({
    collection: collectionPath,
    query,
    caseSensitive: String(options.caseSensitive || false)
  });

  const response = await fetch(`/api/search?${params}`);
  
  if (!response.ok) {
    throw new Error('Search failed');
  }
  
  return response.json();
}
```

### 6. Testing (Required for Sign-off)

**File to create**: `apps/web/src/routes/api/resolve/+server.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { POST } from './+server';

describe('POST /api/resolve', () => {
  it('should resolve paths successfully', async () => {
    const mockLocals = {
      auth: vi.fn().mockResolvedValue({ user: { id: 'user123' } })
    };
    
    const mockRequest = {
      json: vi.fn().mockResolvedValue({ paths: ['/collection/note.md'] })
    };
    
    const response = await POST({ request: mockRequest, locals: mockLocals });
    const data = await response.json();
    
    expect(response.status).toBe(200);
    expect(data).toHaveProperty('mappings');
  });

  it('should return 401 when not authenticated', async () => {
    const mockLocals = {
      auth: vi.fn().mockResolvedValue(null)
    };
    
    const response = await POST({ request: {}, locals: mockLocals });
    
    expect(response.status).toBe(401);
  });

  it('should return 400 for invalid payload', async () => {
    const mockLocals = {
      auth: vi.fn().mockResolvedValue({ user: { id: 'user123' } })
    };
    
    const mockRequest = {
      json: vi.fn().mockResolvedValue({ paths: 'not-an-array' })
    };
    
    const response = await POST({ request: mockRequest, locals: mockLocals });
    
    expect(response.status).toBe(400);
  });
});
```

**Similar test files to create**:
- `apps/web/src/routes/api/entries/by-parent/+server.test.ts`
- `apps/web/src/routes/api/collections/latest/+server.test.ts`
- `apps/web/src/routes/api/search/+server.test.ts`

### 7. Cleanup

**Files to delete**:
```bash
rm apps/web/src/lib/database/client.ts
rm -rf apps/web/src/lib/database/migrations/
```

**File to update**: `apps/web/package.json`

```json
// REMOVE these dependencies:
"@electric-sql/pglite": "^0.2.9",
"@electric-sql/pglite-sync": "^0.1.3",
```

**Commands to run**:
```bash
cd apps/web

# Remove PGlite packages
pnpm remove @electric-sql/pglite @electric-sql/pglite-sync

# Clean install
pnpm install

# Verify no remaining references
grep -r "pglite" src/
grep -r "pgClient" src/
grep -r "database/client" src/

# Build to verify
pnpm build
```

---

## Deferred to Phase 2+ (Add-Ons)

These items enhance performance or UX but are *not* required for the first production cut:

1. **Batch operations** `POST /api/entries/batch` with 1 000-op limit & HTTP 207.
2. **Collection Import** `POST /api/collections/import` (10 MB payload guard, duplicate-path upsert).
3. **Search Hardening** – `pg_try_advisory_xact_lock()` guard & whole-word/regex options.
4. **OptimisticUpdate() v2** – store snapshot rollback (no extra network round-trips).
5. **Command Menu Improvements** – progress indicators & granular error reporting during import.
6. Additional Vitest coverage for partial-failure scenarios.
7. Bundle-size audits & Tailwind pruning.
8. zod helpers on all endpoints

---

### Completion Checklist (Phase 1)

- [ ] DB migration applied in Supabase
- [ ] All *core* endpoints deployed & returning expected responses
- [ ] Homepage & App load without PGlite
- [ ] CRUD via sidebars functional
- [ ] Basic search operational
- [ ] Vitest suite passes
- [ ] No remaining `pglite` or `pgClient` references in `apps/web` 