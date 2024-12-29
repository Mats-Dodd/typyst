import type { VersionedDocument, DocumentMetadata } from '../../src/features/versioning/types'
import { VersionStorage } from '../services/versioning/storage'
import { Automerge, initializeAutomerge } from '../services/versioning/automergeInit'
import type { Doc } from '@automerge/automerge'

export interface VersioningRPC {
    createDocument(title: string): Promise<string>
    saveDocument(docId: string, doc: Doc<VersionedDocument>): Promise<void>
    loadDocument(docId: string): Promise<Doc<VersionedDocument> | null>
    listDocuments(): Promise<DocumentMetadata[]>
    createBranch(docId: string, branchName: string): Promise<void>
    mergeBranch(docId: string, sourceBranch: string, targetBranch: string): Promise<void>
}

export class VersioningRPCImpl implements VersioningRPC {
    private storage: VersionStorage

    constructor() {
        this.storage = new VersionStorage()
    }

    async initialize(): Promise<void> {
        await initializeAutomerge()
        await this.storage.initialize()
    }

    async createDocument(title: string): Promise<string> {
        const docId = crypto.randomUUID()
        const doc = Automerge.init<VersionedDocument>()
        
        const docWithContent = Automerge.change(doc, (doc: VersionedDocument) => {
            doc.content = new Automerge.Text()
            doc.metadata = {
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

        await this.storage.saveDocument(docId, docWithContent)
        return docId
    }

    async saveDocument(docId: string, doc: Doc<VersionedDocument>): Promise<void> {
        await this.storage.saveDocument(docId, doc)
    }

    async loadDocument(docId: string): Promise<Doc<VersionedDocument> | null> {
        return await this.storage.loadDocument(docId)
    }

    async listDocuments(): Promise<DocumentMetadata[]> {
        const docIds = await this.storage.listDocuments()
        const docs = await Promise.all(
            docIds.map(async id => {
                const doc = await this.loadDocument(id)
                if (!doc) return null
                
                return {
                    id,
                    title: doc.metadata.title,
                    createdAt: doc.metadata.createdAt,
                    lastModified: doc.metadata.lastModified,
                    currentBranch: doc.metadata.currentBranch,
                    branches: Object.keys(doc.metadata.branches)
                }
            })
        )
        return docs.filter((doc): doc is DocumentMetadata => doc !== null)
    }

    async createBranch(docId: string, branchName: string): Promise<void> {
        const doc = await this.loadDocument(docId)
        if (!doc) throw new Error(`Document ${docId} not found`)
        if (!doc.metadata.currentBranch) throw new Error('No current branch set')

        const currentBranch = doc.metadata.branches[doc.metadata.currentBranch]
        if (!currentBranch) throw new Error(`Current branch ${doc.metadata.currentBranch} not found`)

        const docWithNewBranch = Automerge.change(doc, (doc: VersionedDocument) => {
            doc.metadata.branches[branchName] = {
                lastCommit: currentBranch.lastCommit,
                createdAt: Date.now(),
                lastModified: Date.now()
            }
        })

        await this.storage.saveDocument(docId, docWithNewBranch)
    }

    async mergeBranch(docId: string, sourceBranch: string, targetBranch: string): Promise<void> {
        const doc = await this.loadDocument(docId)
        if (!doc) throw new Error(`Document ${docId} not found`)

        const sourceBranchData = doc.metadata.branches[sourceBranch]
        const targetBranchData = doc.metadata.branches[targetBranch]

        if (!sourceBranchData) {
            throw new Error(`Source branch ${sourceBranch} not found`)
        }
        if (!targetBranchData) {
            throw new Error(`Target branch ${targetBranch} not found`)
        }

        const docWithMerge = Automerge.change(doc, (doc: VersionedDocument) => {
            const branch = doc.metadata.branches[targetBranch]
            if (!branch) throw new Error('Target branch not found during merge')
            
            branch.lastCommit = sourceBranchData.lastCommit
            branch.lastModified = Date.now()
        })

        await this.storage.saveDocument(docId, docWithMerge)
    }
} 