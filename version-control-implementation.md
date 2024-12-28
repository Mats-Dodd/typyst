# Typyst Version Control Implementation

## Overview
Typyst implements document versioning using Git as the underlying version control system. The implementation focuses on single-document versioning with branch management capabilities.

## File Structure
When a document is first opened in Typyst, the following structure is created:

```
/user-document-directory/
  ├── original-document.md          # Original user document
  ├── .typyst/                      # Hidden version control directory
  │   ├── .git/                     # Git repository
  │   ├── content.json             # Current ProseMirror JSON state
  │   └── .typyst-config.json      # Config file with:
  │       ├── originalPath         # Path to original document
  │       ├── currentBranch       # Active branch name
  │       └── lastSaved           # Timestamp
```

## Core Operations

### First-Time Document Import
1. User selects document (e.g., example.md)
2. System:
   - Creates .typyst/ in same directory
   - Initializes git repository
   - Creates 'main' branch
   - Converts document to ProseMirror JSON
   - Saves initial content.json
   - Creates first commit

### Branch Management
1. Create Branch
   - Create git branch from current state
   - Switch to new branch
   - Update .typyst-config.json

2. Switch Branch
   - Save current content.json
   - Commit changes
   - Checkout target branch
   - Load branch's content.json
   - Update editor state

3. Save Changes
   - Write current ProseMirror JSON to content.json
   - Create git commit
   - Update original document file

## Technical Components

### Git Service (electron/services/git/)
```typescript
// gitService.ts
interface GitService {
  initRepository(docPath: string): Promise<void>;
  createBranch(branchName: string): Promise<void>;
  switchBranch(branchName: string): Promise<void>;
  commitChanges(content: any): Promise<void>;
  getBranches(): Promise<string[]>;
  getCurrentBranch(): Promise<string>;
}
```

### Document Service (electron/services/document/)
```typescript
// documentService.ts
interface DocumentService {
  initializeDocument(originalPath: string): Promise<void>;
  saveDocument(content: any): Promise<void>;
  loadDocument(branchName: string): Promise<any>;
  syncWithOriginal(): Promise<void>;
}
```

### IPC Handlers
New handlers needed:
- 'git:init-repo'
- 'git:create-branch'
- 'git:switch-branch'
- 'git:get-branches'
- 'git:save-changes'

## UI Implementation

### MenuBar Updates
1. Branch Selector Dropdown
   - Current branch name
   - List of available branches
   - "Create New Branch" option

2. Branch Creation Dialog
   - Branch name input
   - Create button
   - Cancel button

## Auto-save Strategy

### Commit Triggers
1. Manual save (Ctrl/Cmd + S)
2. Branch switch
3. Every 5 minutes if changes exist
4. Before closing document

### Commit Message Format
- Manual save: "Manual save: <timestamp>"
- Auto-save: "Auto save: <timestamp>"
- Branch creation: "Created branch: <branch-name>"

## Error Handling

### Scenarios to Handle
1. Git operations fail
2. File system errors
3. Corrupted content.json
4. Concurrent access
5. Invalid branch operations

## Migration Strategy

### For Existing Documents
1. Check if .typyst exists
2. If not, initialize new repository
3. If exists:
   - Validate structure
   - Repair if needed
   - Load existing branch state

## Performance Considerations

### Optimizations
1. Debounce auto-saves
2. Lazy load branch history
3. Cache current branch content
4. Compress old commits periodically

## Dependencies
- isomorphic-git: Pure JavaScript git implementation
- @types/isomorphic-git: TypeScript definitions
- fs-extra: Enhanced file system operations

## Implementation Phases

### Phase 1: Basic Version Control
- Set up Git service
- Implement document initialization
- Add basic save/load operations

### Phase 2: Branch Management
- Implement branch creation
- Add branch switching
- Update UI components

### Phase 3: Auto-save and Recovery
- Add auto-save functionality
- Implement error handling
- Add recovery mechanisms

### Phase 4: UI Polish
- Enhance branch selector UI
- Add progress indicators
- Implement error notifications 