# Loro CRDT Integration with **Tiptap** and **PostgreSQL** in *Weird*

This document rewrites the original ProseMirror + LocalStorage plan so that **Tiptap** becomes the editing layer and **PostgreSQL (`bytea`)** stores authoritative Loro snapshots (and, optionally, incremental updates).  All original code samples are preserved but updated for the new stack.

---

## 1  Core Architecture

```
LoroCompositeMarkdownEditor.svelte   (container)
├── LoroTiptapEditor.svelte          (CRDT‑enabled rich text)
├── MarkdownEditor.svelte            (plain Markdown fallback)
└── DagView.svelte                   (history visualiser)
```

* **Loro CRDT** still tracks the shared document and full DAG history.
* **Tiptap** wraps ProseMirror and lets us mount the same `LoroSyncPlugin`, `LoroUndoPlugin`, and `CursorAwareness`.
* **Postgres** holds one binary snapshot per page (`bytea`) or an append‑only list of deltas for granular history replay.

---

## 2  Container: `LoroCompositeMarkdownEditor.svelte`

```ts
<script lang="ts">
  import LoroTiptapEditor from './LoroTiptapEditor.svelte';  // <-- changed import
  import MarkdownEditor  from './MarkdownEditor.svelte';
  import DagView         from './DagView/DagView.svelte';
  import { LoroDoc }     from 'loro-crdt';
  import { CursorAwareness } from 'loro-prosemirror';
  import { convertSyncStepsToNodes } from './DagView/editor-history';

  export let content = '';
  export let markdownMode = false;
  export let maxLength: number | undefined;

  const loroDoc   = new LoroDoc();
  const awareness = new CursorAwareness(loroDoc.peerIdStr);
  loroDoc.setRecordTimestamp(true);
  loroDoc.setChangeMergeInterval(10);

  // history visualisation state (unchanged)
  let showHistory = false;
  let dagInfo = { nodes: [], frontiers: [] };
  loroDoc.subscribe(() => dagInfo = convertSyncStepsToNodes(loroDoc));
</script>

<div class="container">
  <div class="editors-container">
    {#if markdownMode}
      <MarkdownEditor bind:content />
    {:else}
      <LoroTiptapEditor
        bind:content
        {loroDoc}
        {awareness}
        containerId="main"
      />
    {/if}
  </div>

  {#if showHistory}
    <DagView {dagInfo} />
  {/if}
</div>
```

Only the rich‑text child component changed; everything else (local state checks, history panel) remains identical.

---

## 3  Rich‑Text Component: `LoroTiptapEditor.svelte`

```ts
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { createEditor, EditorContent } from 'svelte-tiptap';
  import StarterKit from '@tiptap/starter-kit';
  import { EditorState } from '@tiptap/pm/state';
  import { keymap } from '@tiptap/pm/keymap';
  import { undo, redo, LoroSyncPlugin, LoroUndoPlugin } from 'loro-prosemirror';
  import type { HTMLAttributes } from 'svelte/elements';
  import type { LoroDoc } from 'loro-crdt';

  interface Props extends HTMLAttributes<HTMLSpanElement> {
    content: string;
    loroDoc: LoroDoc;
    awareness: any;        // CursorAwareness if needed later
    containerId: string;
  }

  export let { content = '', loroDoc, awareness, containerId, ...attrs }: Props;

  let editor: any;

  onMount(() => {
    editor = createEditor({
      extensions: [StarterKit.configure({ history: false })], // disable PM history
      content,
      editorProps: {
        state: EditorState.create({
          schema: StarterKit.schema,
          doc: StarterKit.createHTML(content),
          plugins: [
            LoroSyncPlugin({ doc: loroDoc as any }),
            LoroUndoPlugin({ doc: loroDoc as any }),
            keymap({ 'Mod-z': undo, 'Mod-Shift-z': redo, 'Mod-y': redo })
          ]
        })
      }
    });
  });

  onDestroy(() => {
    if (!editor) return;
    const snapshot = loroDoc.export({ mode: 'snapshot' });
    // emit up or save locally as desired
  });
</script>

<EditorContent {editor} {...attrs} />
```

**Key changes**

* Replaced manual `EditorView` with `createEditor` from **svelte‑tiptap**.
* Disabled ProseMirror's default history (`history: false`) so `LoroUndoPlugin` controls undo/redo.

---

## 4  History Visualisation (`DagView`) & `editor-history.ts`

No code changes are required; they operate directly on `LoroDoc`.

---

## 5  PostgreSQL Persistence

### 5.1  Schema (snapshot‑only)

```sql
CREATE TABLE loro_pages (
  id         uuid PRIMARY KEY,
  snapshot   bytea      NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

### 5.2  SvelteKit + `pg` Save Endpoint

```ts
// src/routes/api/pages/[id].ts
import { pool } from '$lib/db';
import { LoroDoc } from 'loro-crdt';

export async function PUT({ params, request }) {
  const { delta } = await request.json(); // Uint8Array transferred via fetch
  const doc = new LoroDoc();
  doc.import(new Uint8Array(delta));

  const snapshot = doc.export({ mode: 'snapshot' });
  await pool.query(
    'UPDATE loro_pages SET snapshot = $1, updated_at = now() WHERE id = $2',
    [Buffer.from(snapshot), params.id]
  );
  return new Response(null, { status: 204 });
}
```

### 5.3  Loading a Page

```ts
const { rows } = await pool.query('SELECT snapshot FROM loro_pages WHERE id = $1', [pageId]);
const raw = rows[0].snapshot as Buffer;
loroDoc.import(new Uint8Array(raw));
```

### 5.4  (Option) Incremental Change Log

```sql
CREATE TABLE loro_changes (
  page_id uuid REFERENCES loro_pages,
  seq     serial,
  delta   bytea NOT NULL,
  PRIMARY KEY (page_id, seq)
);
```

* On every autosave call `doc.export({ mode: 'update' })` and append `delta`.
* On load: `importBatch([...existingSnapshot, ...deltas])`.

---

## 6  Page Creation / Editing Flows

### 6.1  Creating a New Page (`/new/+page.svelte`)

```ts
import { LoroDoc } from 'loro-crdt';
import base64 from 'base64-js';

function handleSubmit() {
  const doc = new LoroDoc();
  doc.setRecordTimestamp(true);
  doc.getText('content').insert(0, page.markdown);

  const snapshot = doc.export({ mode: 'snapshot' });
  const body = {
    name: page.name,
    snapshot: base64.fromByteArray(snapshot)
  };
  // POST to /api/pages
}
```

### 6.2  Editing an Existing Page (`/[id]/+page.svelte`)

```ts
async function handleSave() {
  const doc = new LoroDoc();
  doc.import(previousSnapshot);
  const text = doc.getText('content');
  text.delete(0, text.length);
  text.insert(0, editedMarkdown);

  const delta = doc.export({ mode: 'update' });
  await fetch(`/api/pages/${pageId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ delta })
  });
}
```

---

## 7  Data‑Flow Summary

1. **Initialization** – Load `snapshot` (and optional deltas) → `loroDoc.import*()`.
2. **Editing** – Tiptap transactions → `LoroSyncPlugin` ⟶ Loro CRDT → DAG visualizer.
3. **Autosave** – `doc.export({ mode: 'update' })` every *n* seconds.
4. **Persist** – Store raw `Uint8Array` in `bytea` or append to `loro_changes`.
5. **Revision Viewer** – Same slider logic; checkpoints are rebuilt from snapshot + frontier checkout.

---

## 8  Key Implementation Details

| Concern             | Code / Setting                                 |
| ------------------- | ---------------------------------------------- |
| Enable timestamps   | `loroDoc.setRecordTimestamp(true)`             |
| Merge rapid changes | `loroDoc.setChangeMergeInterval(10)` (ms)      |
| Snapshot export     | `doc.export({ mode: 'snapshot' })`             |
| Incremental export  | `doc.export({ mode: 'update' })`               |
| Batch import        | `doc.importBatch([...])`                       |
| Undo/Redo           | `LoroUndoPlugin` + `keymap` (`Mod‑z`, `Mod‑y`) |
| DB storage type     | PostgreSQL `bytea`                             |

---

## 9  Dependencies

```
# Core
npm i loro-crdt loro-prosemirror

# Editor stack
npm i @tiptap/core @tiptap/starter-kit svelte-tiptap

# Server / DB
npm i pg       # Node PostgreSQL client
npm i base64-js
```

---

## 10  Roll‑out Checklist

* [ ] Add new dependencies & remove unused `prosemirror-…` packages.
* [ ] Run DB migration to create `loro_pages` (and optional `loro_changes`).
* [ ] Replace `<LoroRichMarkdownEditor>` imports with `<LoroTiptapEditor>`.
* [ ] Verify autosave writes `delta` records and page reload reconstructs state.
* [ ] Smoke‑test history visualiser and revision slider.
* [ ] Ship to staging.

---

## 11  Web Integration Plan

This section provides a step-by-step implementation plan for integrating Loro CRDT into the Haptic web app as a greenfield project.

### Phase 1: Core Loro Integration

#### Step 1.1: Install Dependencies

```bash
cd apps/web
npm install loro-crdt loro-prosemirror base64-js
```

#### Step 1.2: Create Loro Document Store

Create `apps/web/src/lib/stores/loro-document.ts`:

```typescript
import { writable, derived } from 'svelte/store';
import { LoroDoc } from 'loro-crdt';
import { CursorAwareness } from 'loro-prosemirror';

interface LoroDocumentState {
  doc: LoroDoc;
  awareness: CursorAwareness;
  entryId: string;
}

function createLoroDocumentStore() {
  const documents = writable<Map<string, LoroDocumentState>>(new Map());
  
  return {
    subscribe: documents.subscribe,
    
    createDocument: (entryId: string) => {
      const doc = new LoroDoc();
      doc.setRecordTimestamp(true);
      doc.setChangeMergeInterval(10);
      
      const awareness = new CursorAwareness(doc.peerIdStr);
      
      documents.update(docs => {
        docs.set(entryId, { doc, awareness, entryId });
        return docs;
      });
      
      return { doc, awareness };
    },
    
    getDocument: (entryId: string) => {
      let currentDocs: Map<string, LoroDocumentState>;
      documents.subscribe(docs => currentDocs = docs)();
      return currentDocs.get(entryId);
    },
    
    removeDocument: (entryId: string) => {
      documents.update(docs => {
        docs.delete(entryId);
        return docs;
      });
    }
  };
}

export const loroDocuments = createLoroDocumentStore();
```

#### Step 1.3: Create Loro-Enabled Editor Component

Create `apps/web/src/lib/components/shared/editor/loro-editor.svelte`:

```typescript
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Editor } from '@tiptap/core';
  import StarterKit from '@tiptap/starter-kit';
  import { LoroSyncPlugin, LoroUndoPlugin, undo, redo } from 'loro-prosemirror';
  import { keymap } from '@tiptap/pm/keymap';
  import type { LoroDoc } from 'loro-crdt';
  // Import all existing extensions
  
  export let loroDoc: LoroDoc;
  export let entryId: string;
  
  let element: HTMLDivElement;
  let tiptapEditor: Editor;
  
  onMount(() => {
    tiptapEditor = new Editor({
      element,
      extensions: [
        StarterKit.configure({ 
          history: false // Disable native history
        }),
        // ... all other existing extensions
      ],
      editorProps: {
        attributes: {
          class: 'prose prose-theme mx-auto focus:outline-none min-h-full pb-6 select-text'
        },
        plugins: [
          LoroSyncPlugin({ doc: loroDoc }),
          LoroUndoPlugin({ doc: loroDoc }),
          keymap({ 
            'Mod-z': undo, 
            'Mod-Shift-z': redo, 
            'Mod-y': redo 
          })
        ]
      },
      onUpdate: () => {
        // Loro handles the synchronization
        editor.set(tiptapEditor);
      }
    });
  });
</script>

<div bind:this={element} class="w-full h-[calc(100%-97px)] px-8" />
```

#### Step 1.4: Update Entry API Types

Update `apps/web/src/lib/api/types.ts`:

```typescript
export interface CreateEntryRequest {
  // ... existing fields
  loroSnapshot?: string; // base64 encoded
}

export interface UpdateEntryRequest {
  // ... existing fields
  loroSnapshot?: string; // base64 encoded
  loroDelta?: string; // base64 encoded
  loroMode?: 'snapshot' | 'update';
}
```

#### Step 1.5: Modify Entry API Endpoints

Update `apps/web/src/routes/api/entries/[id]/+server.ts` PUT method:

```typescript
// Add to imports
import base64 from 'base64-js';

// In PUT handler, add Loro handling
if ('loroSnapshot' in body) {
  const snapshot = base64.toByteArray(body.loroSnapshot);
  updateData.loroSnapshot = Buffer.from(snapshot);
  updateData.content = null; // Clear text content
}

if ('loroDelta' in body && body.loroMode === 'update') {
  // For incremental updates, we'd need to load existing snapshot,
  // apply delta, and save new snapshot
  const existing = await getExistingSnapshot(id);
  const doc = new LoroDoc();
  doc.import(existing);
  doc.import(base64.toByteArray(body.loroDelta));
  updateData.loroSnapshot = Buffer.from(doc.export({ mode: 'snapshot' }));
}
```

### Phase 2: Integration with Existing Editor Flow

#### Step 2.1: Update Note Opening Logic

Modify `apps/web/src/lib/api/notes.ts`:

```typescript
import { loroDocuments } from '@/stores/loro-document';
import base64 from 'base64-js';

export async function openNote(path: string, skipHistory = false) {
  try {
    const id = await apiClient.resolvePath(path);
    const entry = await apiClient.request<Entry>(`/api/entries/${id}`);
    
    // Create or get Loro document
    let loroState = loroDocuments.getDocument(id);
    if (!loroState) {
      loroState = loroDocuments.createDocument(id);
    }
    
    // Import snapshot if exists
    if (entry.loroSnapshot) {
      const snapshot = new Uint8Array(entry.loroSnapshot);
      loroState.doc.import(snapshot);
    }
    
    activeFile.set(path);
    currentEntryId.set(id); // New store for current entry ID
    
    // ... rest of existing logic
  } catch (error) {
    console.error('Error opening note:', error);
    throw error;
  }
}
```

#### Step 2.2: Update Auto-Save Logic

Modify `apps/web/src/lib/api/notes.ts`:

```typescript
export const saveNote = async (path: string) => {
  try {
    const id = await apiClient.resolvePath(path);
    const loroState = loroDocuments.getDocument(id);
    
    if (!loroState) {
      throw new Error('No Loro document found for entry');
    }
    
    // Export as update (delta)
    const delta = loroState.doc.export({ mode: 'update' });
    const deltaBase64 = base64.fromByteArray(delta);
    
    // Calculate size
    const size = delta.length;
    
    const updateRequest: UpdateEntryRequest = {
      loroDelta: deltaBase64,
      loroMode: 'update',
      updatedAt: new Date().toISOString(),
      size
    };
    
    await apiClient.request(`/api/entries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updateRequest)
    });
  } catch (error) {
    console.error('Error saving note:', error);
    throw error;
  }
};
```

#### Step 2.3: Create Container Component

Create `apps/web/src/lib/components/shared/editor/editor-container.svelte`:

```typescript
<script lang="ts">
  import { onMount } from 'svelte';
  import LoroEditor from './loro-editor.svelte';
  import { loroDocuments } from '@/stores/loro-document';
  import { currentEntryId, activeFile, collectionSettings } from '@/store';
  import { saveNote } from '@/api/notes';
  
  let loroDoc;
  let timeout: NodeJS.Timeout;
  
  $: if ($currentEntryId) {
    const state = loroDocuments.getDocument($currentEntryId);
    if (state) {
      loroDoc = state.doc;
    }
  }
  
  // Auto-save logic
  $: if (loroDoc) {
    loroDoc.subscribe(() => {
      if (timeout) clearTimeout(timeout);
      
      timeout = setTimeout(async () => {
        if ($collectionSettings.editor.auto_save && $activeFile) {
          await saveNote($activeFile);
        }
      }, $collectionSettings.editor.auto_save_debounce);
    });
  }
</script>

{#if loroDoc && $currentEntryId}
  <LoroEditor {loroDoc} entryId={$currentEntryId} />
{/if}
```

#### Step 2.4: Update Main Editor Usage

Replace editor usage in routes:

```typescript
// In apps/web/src/routes/(app)/notes/+page.svelte
// Replace: <Editor />
// With: <EditorContainer />
```

#### Step 2.5: Add Current Entry ID Store

Update `apps/web/src/lib/store.ts`:

```typescript
export const currentEntryId = writable<string | null>(null);
```

#### Step 2.6: Handle Entry Creation

Update `apps/web/src/lib/api/notes.ts`:

```typescript
export const createNote = async (dirPath: string, name?: string) => {
  try {
    // ... existing logic for name generation
    
    // Create new Loro document
    const doc = new LoroDoc();
    doc.setRecordTimestamp(true);
    doc.getText('content').insert(0, ''); // Initialize empty
    
    const snapshot = doc.export({ mode: 'snapshot' });
    const snapshotBase64 = base64.fromByteArray(snapshot);
    
    const createRequest: CreateEntryRequest = {
      name,
      path: `${dirPath}/${name}`.replace('//', '/'),
      parentPath: dirPath,
      collectionId: get(collectionId) as string,
      isFolder: false,
      loroSnapshot: snapshotBase64
    };
    
    const response = await apiClient.request('/api/entries', {
      method: 'POST',
      body: JSON.stringify(createRequest)
    });
    
    // ... rest of logic
  } catch (error) {
    console.error('Error creating note:', error);
    throw error;
  }
};
```

### Phase 3: Advanced Features (Future)

#### 3.1 History Visualization
- Implement `DagView` component for visualizing the CRDT history graph
- Add revision slider for time-travel through document history
- Show branching and merging of concurrent edits

#### 3.2 Real-time Collaboration
- Add WebSocket server for real-time sync
- Implement cursor awareness and presence
- Show other users' selections and cursors

#### 3.3 Conflict Resolution UI
- Visual diff viewer for conflicting changes
- Manual merge tools for complex conflicts
- Automatic conflict resolution strategies

#### 3.4 Performance Optimizations
- Implement snapshot compaction
- Add delta batching for network efficiency
- Client-side caching of Loro documents

---

© 2025 Weird Inc. MIT License
