# Unified Version Control System Plan

## Overview
This document outlines the implementation plan for moving to a unified version control directory structure in Typyst. The goal is to centralize all version control operations into a single `.typyst` directory at the application root.

## Directory Structure
```
.typyst/
├── registry.json        # Maps document paths to IDs and metadata
├── config.json         # Global configuration
└── documents/          # All versioned documents
    └── [doc-id]/       # UUID-based document directories
        ├── metadata.json
        └── versions/
            ├── main/
            └── branches/
```

## Implementation Phases

### Phase 1: Core Directory Structure & Document Registry
**Goal**: Establish the centralized version control system foundation

1. **Registry System**
```typescript
interface Registry {
  documents: {
    [documentId: string]: {
      path: string;          // Absolute path to document
      created: number;       // Timestamp
      lastModified: number;
      currentBranch: string;
      branches: string[];    // List of branch names
    }
  }
}
```

2. **Core Components**
- Registry Management
  * Create/update document entries
  * Track document metadata
  * Handle document removal
- Directory Structure
  * Initialize app directory
  * Create document subdirectories
  * Set up version directories

### Phase 2: Core Version Control Operations
**Goal**: Implement essential version control functionality with new structure

1. **Document Management**
- Document registration
- Content initialization
- Metadata management

2. **Version Control**
- Main branch setup
- Content saving/loading
- Branch operations
  * Creation
  * Switching
  * Content tracking

### Phase 3: RPC & Communication
**Goal**: Update communication layer for new structure

1. **RPC Updates**
- Document operations
  * Registration
  * Content management
  * Branch operations
- Path resolution
- Error handling

2. **IPC Handlers**
- Version control operations
- File system operations
- Registry management

### Phase 4: File System Operations
**Goal**: Implement unified file handling

1. **Path Management**
- Document ID resolution
- Version path resolution
- Branch path resolution

2. **File Operations**
- Content reading/writing
- Directory management
- State persistence

## Core Data Structures

### Document Entry
```typescript
interface DocumentEntry {
  id: string;
  path: string;
  currentBranch: string;
  branches: {
    [branchName: string]: {
      lastModified: number;
      head: string;
    }
  }
}
```

### Version State
```typescript
interface VersionState {
  content: any;
  timestamp: number;
  branch: string;
  parent?: string;
}
```

## Key Workflows

### Document Registration
```
1. Generate document ID
2. Create document directory
3. Initialize version control
4. Update registry
```

### Content Saving
```
1. Resolve document ID
2. Get current branch
3. Save content to version directory
4. Update metadata
5. Update registry
```

### Branch Operations
```
1. Resolve document ID
2. Create branch directory
3. Copy current state
4. Update metadata
5. Update registry
```

## Success Criteria

### Phase 1
- Registry successfully tracks all documents
- Directory structure is properly maintained
- Document IDs are properly managed

### Phase 2
- Version control operations work correctly
- Content is properly versioned
- Branches are properly managed

### Phase 3
- Communication is reliable
- Operations are properly synchronized
- Errors are handled correctly

### Phase 4
- File operations are atomic
- Paths are properly resolved
- Content is properly stored/retrieved 