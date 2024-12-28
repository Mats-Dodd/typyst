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