# Document Versioning Strategy

## Overview
This document outlines the implementation strategy for real-time document versioning in Typyst using Automerge. The goal is to provide a robust, local-first versioning system with branching capabilities and character-by-character autosaving.

## Why Automerge?
- **Real-time Collaboration Ready**: While we're starting with local-first, Automerge provides future-proof CRDT-based collaboration.
- **Character-level Granularity**: Perfect for tracking changes at the keystroke level.
- **Built-in Conflict Resolution**: Handles concurrent changes automatically.
- **Local-first Architecture**: Aligns with our offline-first approach.

## Library Setup and Initialization

### 1. Required Packages
```typescript
// Core Automerge functionality
npm install @automerge/automerge

// For React integration
npm install @automerge/automerge-repo
npm install @automerge/automerge-repo-react-hooks

// For storage
npm install @automerge/automerge-repo-storage-nodefs

// For ProseMirror/TipTap integration
npm install prosemirror-state prosemirror-view prosemirror-model
```

### 2. Repository Setup
```typescript
import { Repo } from '@automerge/automerge-repo'
import { NodeFSStorageAdapter } from '@automerge/automerge-repo-storage-nodefs'
import { BroadcastChannelNetworkAdapter } from '@automerge/automerge-repo-network-broadcastchannel'

// Initialize storage and network adapters
const storage = new NodeFSStorageAdapter('./.typyst/versions')
const network = new BroadcastChannelNetworkAdapter()

// Create the repo instance
const repo = new Repo({
  storage,
  network,
  peerId: 'typyst-editor-' + Math.random().toString(36).slice(2),
})
```

### 3. Document Initialization
```typescript
import * as Automerge from '@automerge/automerge'
import { Text } from '@automerge/automerge'

// Create a new document with initial state
const doc = Automerge.init<VersionedDocument>()
const docWithContent = Automerge.change(doc, doc => {
  doc.content = new Text()
  doc.metadata = {
    title: 'New Document',
    createdAt: Date.now(),
    lastModified: Date.now(),
    currentBranch: 'main'
  }
})

// Or load an existing document
const loadedDoc = await repo.find<VersionedDocument>(documentId)
```

### 4. ProseMirror Integration
```typescript
import { prosemirrorPlugin } from '@automerge/automerge-prosemirror'

// Create ProseMirror plugin with Automerge
const plugin = prosemirrorPlugin({
  automergeDoc: doc,
  field: 'content',
})

// Initialize TipTap with the plugin
const editor = new Editor({
  extensions: [
    // ... other extensions
    Extension.create({
      name: 'automerge',
      addProseMirrorPlugins() {
        return [plugin]
      }
    })
  ]
})
```

### 5. React Integration
```typescript
import { useDocument } from '@automerge/automerge-repo-react-hooks'

function Editor({ documentId }) {
  const [doc, changeDoc] = useDocument(documentId)
  
  const handleChange = useCallback((content: string) => {
    changeDoc(doc => {
      doc.content.insertAt(0, content)
    })
  }, [changeDoc])
  
  return (
    // Editor implementation
  )
}
```

## Core Components

### 1. Storage Architecture

#### Directory Structure
```
.typyst/
├── versions/
│   └── [documentId]/
│       ├── automerge/           # Automerge state files
│       │   ├── main.changes     # Main branch changes
│       │   └── branches/        # Branch-specific changes
│       └── metadata.json        # Document metadata
└── documents/                   # Current document states
```

#### Document Model
```typescript
interface VersionedDocument {
  content: AutomergeText;        // Automerge Text object for real-time editing
  metadata: {
    title: string;
    createdAt: number;
    lastModified: number;
    currentBranch: string;
    branches: {
      [branchName: string]: {
        lastCommit: string;
        createdAt: number;
        lastModified: number;
      }
    }
  }
}
```

### 2. Implementation Details

#### A. Storage Layer (`electron/services/versioning/`)

1. **AutomergeStorage Class** (`automergeStorage.ts`)
```typescript
class AutomergeStorage {
  private adapter: NodeFSStorageAdapter;
  
  // Core operations
  initialize(docId: string): Promise<void>;
  saveChanges(docId: string, changes: Uint8Array): Promise<void>;
  loadDocument(docId: string): Promise<Doc<VersionedDocument>>;
  createBranch(docId: string, branchName: string): Promise<void>;
  mergeBranch(docId: string, source: string, target: string): Promise<void>;
}
```

2. **DocumentManager Class** (`documentManager.ts`)
```typescript
class DocumentManager {
  private storage: AutomergeStorage;
  
  // Document operations
  createDocument(title: string): Promise<string>;
  openDocument(docId: string): Promise<Doc<VersionedDocument>>;
  saveChange(docId: string, change: Change): Promise<void>;
  getBranchHistory(docId: string, branch: string): Promise<Change[]>;
}
```

#### B. Integration Points

1. **Editor Integration** (`src/features/editor/components/EditorContent.tsx`)
- Modify TipTap integration to use Automerge Text
- Implement character-level change tracking
- Add real-time save handlers

2. **RPC Layer** (`electron/rpc/versioningRpc.ts`)
```typescript
// New RPC methods
interface VersioningRPC {
  createDocument(title: string): Promise<string>;
  saveChange(docId: string, change: Change): Promise<void>;
  createBranch(docId: string, name: string): Promise<void>;
  mergeBranch(docId: string, source: string, target: string): Promise<void>;
  getHistory(docId: string, branch: string): Promise<Change[]>;
}
```

### 3. Character-Level Autosaving Implementation

#### A. Change Tracking
1. **Editor Event Handling**
```typescript
// In EditorContent.tsx
editor.on('update', ({ editor }) => {
  const change = captureChange(editor.state);
  saveChange(documentId, change);
});
```

2. **Change Batching**
- Implement debounced saving (100ms) for performance
- Maintain in-memory queue of pending changes
- Persist changes in order of occurrence

#### B. State Management
1. **Document State**
- Track current branch
- Maintain change history
- Handle pending changes

2. **Recovery Mechanism**
- Periodic state snapshots
- Change log persistence
- Automatic conflict resolution

### 4. Implementation Phases

#### Phase 1: Foundation (Week 1)
1. Set up Automerge storage adapter
2. Implement basic document model
3. Create RPC layer for version management
4. Modify editor to track changes

#### Phase 2: Real-time Saving (Week 1-2)
1. Implement character-level change tracking
2. Add change batching system
3. Create persistent storage system
4. Add recovery mechanisms

#### Phase 3: Branching (Week 2-3)
1. Implement branch management
2. Add branch switching UI
3. Create merge functionality
4. Handle conflicts

#### Phase 4: UI/UX (Week 3-4)
1. Add version history viewer
2. Create branch management UI
3. Implement diff viewer
4. Add restore points

### 5. Technical Considerations

#### Performance Optimizations
1. **Change Batching**
   - Debounce saves (100ms)
   - Batch similar changes
   - Compress change history

2. **Storage Efficiency**
   - Implement change pruning
   - Use incremental saves
   - Compress old changes

#### Error Handling
1. **Recovery Scenarios**
   - Network failures
   - Process crashes
   - Corrupt states

2. **Conflict Resolution**
   - Automatic merging
   - Manual conflict resolution
   - Branch protection

### 6. Migration Strategy

#### Existing Documents
1. Create migration script
2. Convert to versioned format
3. Maintain backwards compatibility

#### Data Validation
1. Verify document integrity
2. Validate version history
3. Check branch consistency

## Automerge Utilities

### Core Document Operations
```typescript
import * as automerge from "@automerge/automerge"

// Document initialization and loading
init<T>(): Doc<T>                    // Create new document with random actorId
from<T>(initialState: T): Doc<T>     // Create document with initial state
load(data: Uint8Array): Doc<T>       // Load document from binary
save(doc: Doc<T>): Uint8Array        // Save document to binary

// Change tracking and application
change<T>(doc: Doc<T>, changeFn: ChangeFn<T>): Doc<T>    // Make changes to document
getLastLocalChange(doc: Doc<T>): Change                   // Get last change made
applyChanges(doc: Doc<T>, changes: Change[]): [Doc<T>, PatchInfo[]]  // Apply changes

// Version management
getHeads(doc: Doc<T>): Heads         // Get current document heads
view(doc: Doc<T>, heads: Heads): T   // View document at specific version
clone(doc: Doc<T>): Doc<T>           // Create independent copy
merge(doc1: Doc<T>, doc2: Doc<T>): Doc<T>  // Merge two documents

// Incremental saving
saveIncremental(doc: Doc<T>): Uint8Array[]  // Save recent changes
loadIncremental(doc: Doc<T>, changes: Uint8Array[]): Doc<T>  // Load incremental changes
```

### Text Operations
```typescript
import { Text } from "@automerge/automerge"

// Text manipulation
new Text()                           // Create new text object
insertAt(pos: number, value: string) // Insert text at position
deleteAt(pos: number, count: number) // Delete text at position
```

### Storage Adapter Integration
```typescript
import { NodeFSStorageAdapter } from "@automerge/automerge-repo-storage-nodefs"

// Storage operations
adapter.save(key: string[], value: Uint8Array): Promise<void>
adapter.load(key: string[]): Promise<Uint8Array>
adapter.remove(key: string[]): Promise<void>
adapter.loadRange(keyPrefix: string[]): Promise<Chunk[]>
```

### Rich Text Operations

#### 1. Text Marks and Attributes
```typescript
interface TextMark {
  type: 'bold' | 'italic' | 'underline' | 'code';
  from: number;
  to: number;
}

interface VersionedDocument {
  content: AutomergeText;
  marks: TextMark[];
  // ... other metadata
}

// Applying marks
changeDoc(doc => {
  doc.marks.push({
    type: 'bold',
    from: 10,
    to: 20
  })
})
```

#### 2. Collaborative Text Editing
```typescript
// Handle concurrent edits
const handleTextChange = (change: string, position: number) => {
  changeDoc(doc => {
    doc.content.insertAt(position, change)
    // Automerge automatically handles conflict resolution
  })
}

// Track cursor positions
interface Cursor {
  userId: string;
  position: number;
  timestamp: number;
}

// Update cursor position
changeDoc(doc => {
  if (!doc.cursors) doc.cursors = []
  const cursor = doc.cursors.find(c => c.userId === currentUser)
  if (cursor) {
    cursor.position = newPosition
    cursor.timestamp = Date.now()
  } else {
    doc.cursors.push({
      userId: currentUser,
      position: newPosition,
      timestamp: Date.now()
    })
  }
})
```

#### 3. Storage Patterns

##### Document Storage
```typescript
// Save document state
const saveDocument = async (doc: Doc<VersionedDocument>) => {
  const binary = Automerge.save(doc)
  await storage.save(['documents', doc.id], binary)
  
  // Save incremental changes
  const changes = Automerge.getLastLocalChange(doc)
  if (changes) {
    await storage.save(
      ['changes', doc.id, Date.now().toString()],
      changes
    )
  }
}

// Load document with history
const loadDocumentWithHistory = async (docId: string) => {
  // Load base document
  const binary = await storage.load(['documents', docId])
  let doc = Automerge.load<VersionedDocument>(binary)
  
  // Load and apply changes
  const changes = await storage.loadRange(['changes', docId])
  changes.sort((a, b) => a.timestamp - b.timestamp)
  
  doc = changes.reduce((doc, change) => {
    return Automerge.applyChanges(doc, [change.value])[0]
  }, doc)
  
  return doc
}
```

##### Snapshot Management
```typescript
// Create periodic snapshots
const createSnapshot = async (doc: Doc<VersionedDocument>) => {
  const binary = Automerge.save(doc)
  const timestamp = Date.now()
  await storage.save(
    ['snapshots', doc.id, timestamp.toString()],
    binary
  )
  
  // Cleanup old changes
  const changes = await storage.loadRange(['changes', doc.id])
  const oldChanges = changes.filter(c => c.timestamp < timestamp)
  await Promise.all(
    oldChanges.map(c => 
      storage.remove(['changes', doc.id, c.timestamp.toString()])
    )
  )
}

// Restore from snapshot
const restoreSnapshot = async (docId: string, timestamp: string) => {
  const binary = await storage.load(['snapshots', docId, timestamp])
  return Automerge.load<VersionedDocument>(binary)
}
```

### Change Management
```typescript
// Change tracking
interface Change {
  hash: string
  deps: string[]
  bytes: Uint8Array
  actor: string
  seq: number
  startOp: number
  time: number
  message: string
  ops: Operation[]
}

// Patch information
interface PatchInfo {
  actor: string
  seq: number
  startOp: number
  time: number
  message: string
  deps: string[]
  patches: Patch[]
}
```

### Usage in Components

1. **Document Creation and Loading**
```typescript
// In DocumentManager
async createDocument(title: string): Promise<string> {
  const doc = automerge.init<VersionedDocument>()
  const docId = uuid()
  
  return automerge.change(doc, d => {
    d.content = new automerge.Text()
    d.metadata = {
      title,
      createdAt: Date.now(),
      lastModified: Date.now(),
      currentBranch: 'main',
      branches: {
        main: {
          lastCommit: '',
          createdAt: Date.now(),
          lastModified: Date.now()
        }
      }
    }
  })
}
```

2. **Real-time Change Tracking**
```typescript
// In EditorContent
const handleChange = useCallback((editor: Editor) => {
  const change = automerge.change(doc, d => {
    d.content = new automerge.Text(editor.getText())
  })
  
  const binaryChanges = automerge.getLastLocalChange(change)
  saveChange(documentId, binaryChanges)
}, [doc, documentId])
```

3. **Branch Management**
```typescript
// In DocumentManager
async createBranch(docId: string, branchName: string): Promise<void> {
  const doc = await this.loadDocument(docId)
  const heads = automerge.getHeads(doc)
  
  return automerge.change(doc, d => {
    d.metadata.branches[branchName] = {
      lastCommit: heads[0],
      createdAt: Date.now(),
      lastModified: Date.now()
    }
  })
}
```

4. **Version History**
```typescript
// In DocumentManager
async getHistory(docId: string, branch: string): Promise<Change[]> {
  const doc = await this.loadDocument(docId)
  const changes = automerge.getAllChanges(doc)
  return changes.filter(change => 
    doc.metadata.branches[branch].commits.includes(change.hash)
  )
}
```

### Performance Considerations

1. **Change Batching**
```typescript
// Debounced save implementation
const debouncedSave = debounce((changes: Change[]) => {
  const binaryChanges = changes.map(c => automerge.save(c))
  storage.saveChanges(docId, binaryChanges)
}, 100)
```

2. **Incremental Saves**
```typescript
// In AutomergeStorage
async saveChanges(docId: string, doc: Doc<T>): Promise<void> {
  const changes = automerge.saveIncremental(doc)
  await this.adapter.save([docId, 'incremental'], changes)
}
```

These utilities form the foundation of our versioning system, providing the necessary tools for document management, change tracking, and version control. The combination of Automerge's CRDT capabilities with our storage and UI layers will enable a robust, real-time document versioning system.

## Next Steps
1. Set up Automerge storage infrastructure
2. Modify editor for change tracking
3. Implement basic versioning
4. Add character-level autosaving
5. Create branch management system

## Testing Strategy
1. Unit tests for core operations
2. Integration tests for editor
3. Performance benchmarks
4. Recovery testing
5. Conflict resolution scenarios 