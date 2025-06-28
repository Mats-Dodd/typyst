# Simplified Loro Integration Plan for Haptic

## Overview
Minimal integration of Loro CRDT into Haptic's existing Tiptap editor for document state tracking.

## Phase 1: Setup

### 1.1 Install Dependencies
```bash
pnpm add loro-crdt loro-prosemirror
pnpm add -D vite-plugin-wasm vite-plugin-top-level-await
```

### 1.2 Configure Vite for WASM
```typescript
// vite.config.ts
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

export default defineConfig({
  plugins: [
    wasm(),
    topLevelAwait(),
    sveltekit()
  ],
  optimizeDeps: {
    exclude: ['loro-crdt', 'loro-prosemirror']
  }
});
```

## Phase 2: Modify Existing Editor

### 2.1 Update Editor Component
Modify the existing `apps/web/src/lib/components/shared/editor/editor.svelte`:

```svelte
<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { Editor } from '@tiptap/core';
  import { LoroDoc } from 'loro-crdt';
  import { LoroSyncPlugin, LoroUndoPlugin, undo, redo } from 'loro-prosemirror';
  import { keymap } from 'prosemirror-keymap';
  // ... existing imports

  let element: HTMLDivElement;
  let tiptapEditor: Editor;
  let loroDoc: LoroDoc | null = null;
  let timeout: NodeJS.Timeout;

  onMount(() => {
    // Initialize Loro if we have a snapshot
    const initializeLoro = async () => {
      if ($activeFile) {
        try {
          const id = await apiClient.resolvePath($activeFile);
          const entry = await apiClient.request<Entry>(`/api/entries/${id}`);
          
          loroDoc = new LoroDoc();
          
          if (entry.loroSnapshot) {
            // Load from snapshot
            loroDoc.import(new Uint8Array(entry.loroSnapshot));
          } else if (entry.content) {
            // Initialize from existing content
            const text = loroDoc.getText('content');
            text.insert(0, entry.content);
          }
        } catch (error) {
          console.error('Failed to initialize Loro:', error);
        }
      }
    };

    initializeLoro().then(() => {
      // Create editor with or without Loro
      const extensions = [
        StarterKit.configure({
          document: false,
          hardBreak: false,
          history: loroDoc ? false : undefined, // Disable only if using Loro
          // ... existing config
        }),
        // ... existing extensions
      ];

      // Add Loro plugins if document exists
      if (loroDoc) {
        extensions.push({
          name: 'loroSync',
          addProseMirrorPlugins() {
            return [
              LoroSyncPlugin({ 
                doc: loroDoc!,
              }),
              LoroUndoPlugin({ doc: loroDoc! }),
              keymap({
                'Mod-z': undo,
                'Mod-y': redo,
                'Mod-Shift-z': redo,
              }),
            ];
          },
        });
      }

      tiptapEditor = new Editor({
        element: element,
        extensions,
        // ... existing config
        onUpdate: async () => {
          // ... existing timeout logic
          timeout = setTimeout(async () => {
            if ($collectionSettings.editor.auto_save) {
              console.log('Saving note...');
              saveNote($activeFile!, loroDoc)
                .then(() => {
                  editor.notifySaveEvent();
                })
                .catch((error) => {
                  console.error('Error saving note:', error);
                });
            }
          }, $collectionSettings.editor.auto_save_debounce);
        }
      });
    });
  });

  onDestroy(() => {
    if (tiptapEditor) {
      tiptapEditor.destroy();
    }
    loroDoc = null;
  });
</script>

<!-- Rest of template unchanged -->
```

### 2.2 Update Save Function
Modify `apps/web/src/lib/api/notes.ts`:

```typescript
// Save active note with optional Loro snapshot
export const saveNote = async (path: string, loroDoc?: LoroDoc | null) => {
  try {
    // Get note content
    let content = get(editor).storage.markdown.getMarkdown();
    content = content.replace(/^# .*\n/, '');

    // Calculate file size
    const size = new TextEncoder().encode(content).length;

    // Resolve path to ID
    const id = await apiClient.resolvePath(path);

    // Prepare update request
    const updateRequest: UpdateEntryRequest = {
      content,
      updatedAt: new Date().toISOString(),
      size
    };

    // Add Loro snapshot if available
    if (loroDoc) {
      const snapshot = loroDoc.export({ mode: 'snapshot' });
      // @ts-ignore - we'll add this to the type
      updateRequest.loroSnapshot = Array.from(snapshot);
    }

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

## Phase 3: Minimal API Updates

### 3.1 Update Entry Type
Add to `apps/web/src/lib/api/types.ts`:

```typescript
export interface UpdateEntryRequest {
  name?: string;
  path?: string;
  parentPath?: string;
  content?: string;
  updatedAt?: string;
  size?: number;
  loroSnapshot?: number[]; // Added for Loro
}
```

### 3.2 Update Server Endpoint
Modify `apps/web/src/routes/api/entries/[id]/+server.ts` PUT handler:

```typescript
// In the PUT handler, add to updateData handling:
if ('loroSnapshot' in body && Array.isArray(body.loroSnapshot)) {
  // @ts-ignore - Buffer/Uint8Array handling
  updateData.loroSnapshot = Buffer.from(body.loroSnapshot);
}

// In the GET handler, return snapshot if exists:
if (entry.loroSnapshot) {
  return json({
    ...entry,
    loroSnapshot: Array.from(entry.loroSnapshot)
  }, { status: 200 });
}
```

## That's It!

This minimal implementation:
- ✅ Uses Loro for document state tracking
- ✅ Preserves existing editor functionality
- ✅ Supports gradual adoption (works with or without snapshots)
- ✅ Minimal code changes
- ✅ No new abstractions or state management
- ✅ Leverages Loro's built-in undo/redo

## What This Gives You

1. **CRDT-based document state** - All edits are tracked with Loro's operation history
2. **Better undo/redo** - Loro's undo manager works better for rich text
3. **Future-ready** - Easy to add collaboration later
4. **Backward compatible** - Still saves content field for search/fallback

## Next Steps (Only When Needed)

- Add collaboration by syncing Loro updates
- Implement version history using Loro's time travel
- Add conflict resolution UI
- Optimize snapshot storage with compression 