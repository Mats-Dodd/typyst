import * as fs from 'fs/promises'
import * as path from 'path'
import { app } from 'electron'
import type { VersionedDocument, VersionConfig } from '../../../src/features/versioning/types'
import type { Doc } from '@automerge/automerge'
import { Automerge } from './automergeInit'

export class VersionStorage {
    private basePath: string
    private config: VersionConfig = {
        version: '1.0.0',
        storage: {
            type: 'indexeddb',
            prefix: 'typyst_versions'
        },
        automerge: {
            syncInterval: 1000,
            maxChangesPerBatch: 100
        }
    }

    constructor() {
        this.basePath = path.join(app.getPath('userData'), '.typyst')
    }

    async initialize(): Promise<void> {
        // Ensure directories exist
        await fs.mkdir(path.join(this.basePath, 'versions'), { recursive: true })
        await fs.mkdir(path.join(this.basePath, 'documents'), { recursive: true })

        // Load or create config
        try {
            const configPath = path.join(this.basePath, 'config.json')
            const configData = await fs.readFile(configPath, 'utf-8')
            this.config = JSON.parse(configData)
        } catch (error) {
            // Create default config if not exists
            this.config = {
                version: '1.0.0',
                storage: {
                    type: 'indexeddb',
                    prefix: 'typyst_versions'
                },
                automerge: {
                    syncInterval: 1000,
                    maxChangesPerBatch: 100
                }
            }
            await this.saveConfig()
        }
    }

    private async saveConfig(): Promise<void> {
        const configPath = path.join(this.basePath, 'config.json')
        await fs.writeFile(configPath, JSON.stringify(this.config, null, 2))
    }

    async saveDocument(docId: string, doc: Doc<VersionedDocument>): Promise<void> {
        const docPath = path.join(this.basePath, 'versions', docId)
        await fs.mkdir(docPath, { recursive: true })

        const binary = Automerge.save(doc)
        await fs.writeFile(path.join(docPath, 'automerge', 'current.bin'), binary)

        // Save metadata separately for quick access
        const metadata = {
            id: docId,
            title: doc.metadata.title,
            createdAt: doc.metadata.createdAt,
            lastModified: doc.metadata.lastModified,
            currentBranch: doc.metadata.currentBranch,
            branches: Object.keys(doc.metadata.branches)
        }
        await fs.writeFile(
            path.join(docPath, 'metadata.json'),
            JSON.stringify(metadata, null, 2)
        )
    }

    async loadDocument(docId: string): Promise<Doc<VersionedDocument> | null> {
        try {
            const binary = await fs.readFile(
                path.join(this.basePath, 'versions', docId, 'automerge', 'current.bin')
            )
            return Automerge.load(binary)
        } catch (error) {
            return null
        }
    }

    async listDocuments(): Promise<string[]> {
        try {
            return await fs.readdir(path.join(this.basePath, 'versions'))
        } catch (error) {
            return []
        }
    }
} 