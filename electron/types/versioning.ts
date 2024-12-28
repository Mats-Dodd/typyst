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