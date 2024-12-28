# Document Versioning Strategy

## Overview
This document outlines the implementation strategy for real-time document versioning in Typyst using Automerge. The goal is to provide a robust, local-first versioning system with branching capabilities and character-by-character autosaving.

## Document Format
Typyst versions the ProseMirror JSON representation of documents rather than their raw content. When a document (markdown or docx) is imported, it's first converted to ProseMirror JSON format, which is then:
1. Used by the TipTap editor for rendering and editing
2. Stored in the version control system using Automerge
3. Used as the source of truth for all version control operations

This approach provides several benefits:
- Consistent document representation across different file formats
- Rich text structure preservation
- Better conflict resolution through structured data
- Direct integration with the editor's internal state

### Document Conversion Flow
```
Import                     Edit                      Export
.md/.docx → ProseMirror JSON ←→ TipTap Editor → .md/.docx
             ↓
        Version Control
        (.typyst/versions)
```

## Local Version Control Structure

### Directory Structure
```
📁 User's Document Directory
├── 📄 document.md                    # User's markdown file
└── 📁 .typyst/                       # Version control directory
    ├── 📄 index.json                 # Document metadata and version mapping
    ├── 📁 versions/                  # Version storage
    │   ├── 📁 main/                  # Main branch
    │   │   ├── 📄 current.bin        # Current Automerge state
    │   │   ├── 📄 metadata.json      # Branch metadata
    │   │   └── 📁 history/           # Change history
    │   └── 📁 branches/              # Feature branches
    │       └── 📁 [branch-name]/     # Individual branch data
    ├── 📁 temp/                      # Temporary states (crash recovery)
    └── 📄 config.json                # Version control configuration
```

### Core Data Structures

#### Document Index
```typescript
interface DocumentIndex {
  version: string;
  documentPath: string;
  initializedAt: number;
  lastModified: number;
  currentBranch: string;
  branches: {
    main: {
      created: number;
      lastSync: number;
      head: string;
    };
    [branchName: string]: BranchInfo;
  };
}
```

#### Branch Metadata
```typescript
interface BranchMetadata {
  name: string;
  parent: string;
  divergePoint: string;
  lastSyncWithMain: number;
  changesSinceSync: number;
  status: 'ahead' | 'behind' | 'diverged';
}
```

## Implementation Phases

### Phase 1: Foundation (Week 1)
1. **Document Initialization**
   - Create `.typyst` directory structure
   - Initialize Automerge document
   - Set up main branch
   - Create initial metadata

2. **Basic File Operations**
   - Document loading
   - State persistence
   - Change tracking
   - Basic error handling

### Phase 2: Real-time Saving (Week 1-2)
1. **Change Tracking**
   - Character-level changes
   - Debounced saving (100ms)
   - Change batching
   - State persistence

2. **Synchronization**
   - Main branch to file sync
   - Version control state updates
   - Change history recording
   - Crash recovery

### Phase 3: Branch Management (Week 2-3)
1. **Branch Operations**
   - Branch creation
   - Branch switching
   - State isolation
   - Change tracking per branch

2. **Branch State Management**
   ```
   Branch Operations Flow
   ├── Create Branch
   │   ├── Copy current state
   │   ├── Initialize branch directory
   │   └── Update metadata
   ├── Switch Branch
   │   ├── Save current state
   │   ├── Load target branch
   │   └── Update editor
   └── Track Changes
       ├── Record divergence
       ├── Track sync status
       └── Manage history
   ```

### Phase 4: Merge Operations (Week 3-4)
1. **Merge Handling**
   - Branch merging
   - Conflict detection
   - Resolution strategies
   - History preservation

2. **State Updates**
   ```
   Merge Flow
   ├── Merge to Main
   │   ├── Update version control
   │   ├── Update local file
   │   └── Record merge
   └── Conflict Resolution
       ├── Detect conflicts
       ├── Show diff
       └── Apply resolution
   ```

## Technical Details

### 1. File System Integration
- Monitor file changes
- Handle external modifications
- Maintain file integrity
- Manage concurrent access

### 2. Version Control Operations
```typescript
interface FileState {
  path: string;
  hash: string;
  lastModified: number;
  size: number;
  version: string;
}
```

### 3. Configuration
```json
{
  "version": "1.0.0",
  "autosave": {
    "enabled": true,
    "interval": 1000
  },
  "backup": {
    "enabled": true,
    "maxBackups": 5
  },
  "merge": {
    "strategy": "auto",
    "conflictResolution": "manual"
  }
}
```

### 4. Error Handling
1. **Recovery Scenarios**
   - Missing `.typyst` directory
   - Corrupt version control state
   - External modifications
   - Concurrent access conflicts

2. **Recovery Actions**
   - Rebuild version control
   - Restore from backup
   - Reconcile changes
   - Resolve conflicts

## UI/UX Integration

### 1. Editor Integration
- Branch indicator
- Save status
- Change tracking
- Conflict markers

### 2. Version Control UI
- Branch management
- History viewer
- Diff display
- Merge interface

## Testing Strategy

### 1. Unit Tests
- File operations
- State management
- Branch operations
- Merge handling

### 2. Integration Tests
- Editor integration
- File system operations
- Recovery scenarios
- Concurrent access

### 3. Performance Tests
- Large document handling
- Multiple branch operations
- Merge performance
- Storage efficiency

## Migration Strategy

### 1. Existing Documents
- Detection of unversioned documents
- Version control initialization
- State preservation
- Metadata creation

### 2. Version Updates
- Schema migration
- Config updates
- Storage format changes
- Backward compatibility

## Next Steps
1. Implement document initialization
2. Set up change tracking
3. Add branch management
4. Create merge handling
5. Build UI components 