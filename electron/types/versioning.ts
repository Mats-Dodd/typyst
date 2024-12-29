import type { VersionedDocument, DocumentMetadata } from '../../src/features/versioning/types'
import type { Doc } from '@automerge/automerge'

export interface VersioningAPI {
    createDocument(title: string): Promise<string>
    saveDocument(docId: string, doc: Doc<VersionedDocument>): Promise<void>
    loadDocument(docId: string): Promise<Doc<VersionedDocument> | null>
    listDocuments(): Promise<DocumentMetadata[]>
    createBranch(docId: string, branchName: string): Promise<void>
    mergeBranch(docId: string, sourceBranch: string, targetBranch: string): Promise<void>
}

export interface Registry {
  documents: {
    [documentId: string]: DocumentEntry;
  };
}

export interface DocumentEntry {
  id: string;
  path: string;
  created: number;
  lastModified: number;
  currentBranch: string;
  branches: {
    [branchName: string]: BranchInfo;
  };
}

export interface BranchInfo {
  lastModified: number;
  head: string;
}

export interface VersionState {
  content: any;
  timestamp: number;
  branch: string;
  parent?: string;
}

export interface VersionControlConfig {
  rootDir: string;
  documentsDir: string;
} 