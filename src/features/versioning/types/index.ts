import { Text } from '@automerge/automerge'

export interface VersionedDocument {
    content: Text
    metadata: {
        title: string
        createdAt: number
        lastModified: number
        currentBranch: string
        branches: {
            [branchName: string]: {
                lastCommit: string
                createdAt: number
                lastModified: number
            }
        }
    }
}

export interface VersionConfig {
    version: string
    storage: {
        type: 'indexeddb'
        prefix: string
    }
    automerge: {
        syncInterval: number
        maxChangesPerBatch: number
    }
}

export interface DocumentMetadata {
    id: string
    title: string
    createdAt: number
    lastModified: number
    currentBranch: string
    branches: string[]
}

export interface DocumentIndex {
    version: string;
    documentPath: string;
    initializedAt: number;
    lastModified: number;
    currentBranch: string;
    branches: {
        [key: string]: {
            created: number;
            lastSync: number;
            head: string;
        };
    };
}

export interface BranchInfo {
    created: number;
    lastSync: number;
    head: string;
}

export interface BranchMetadata {
    name: string;
    parent: string;
    divergePoint: string;
    lastSyncWithMain: number;
    changesSinceSync: number;
    status: 'ahead' | 'behind' | 'diverged';
}

export interface BranchControlsProps {
    editor: any;
    currentFilePath?: string;
}

export interface BranchContextMenuProps {
    contextMenu: {
        branch: string;
        x: number;
        y: number;
    };
    currentBranch: string;
    onDelete: (branch: string) => void;
    onRename: (branch: string) => void;
    onClose: () => void;
}

export interface BranchRenameDialogProps {
    branch: string;
    onRename: (oldName: string, newName: string) => void;
    onClose: () => void;
}

// Window API extensions
declare global {
    interface Window {
        fs: {
            writeFile: (path: string, content: string) => Promise<{ success: boolean; error?: string }>;
            writeBuffer: (path: string, buffer: ArrayBuffer) => Promise<{ success: boolean; error?: string }>;
            readFile: (path: string) => Promise<{ content: string; error?: string }>;
            deleteFile: (path: string) => Promise<{ success: boolean; error?: string }>;
            createDir: (path: string) => Promise<{ success: boolean; error?: string }>;
            exists: (path: string) => Promise<{ exists: boolean; error?: string }>;
        };
    }
} 