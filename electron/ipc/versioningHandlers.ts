import { ipcMain } from 'electron'
import { VersioningRPCImpl } from '../rpc/versioningRpc'

export function setupVersioningHandlers() {
    const versioningRPC = new VersioningRPCImpl()
    
    // Initialize versioning service
    versioningRPC.initialize().catch(console.error)

    // Set up IPC handlers
    ipcMain.handle('versioning:create', async (_, title: string) => {
        return await versioningRPC.createDocument(title)
    })

    ipcMain.handle('versioning:save', async (_, docId: string, doc: any) => {
        await versioningRPC.saveDocument(docId, doc)
    })

    ipcMain.handle('versioning:load', async (_, docId: string) => {
        return await versioningRPC.loadDocument(docId)
    })

    ipcMain.handle('versioning:list', async () => {
        return await versioningRPC.listDocuments()
    })

    ipcMain.handle('versioning:create-branch', async (_, docId: string, branchName: string) => {
        await versioningRPC.createBranch(docId, branchName)
    })

    ipcMain.handle('versioning:merge-branch', async (_, docId: string, sourceBranch: string, targetBranch: string) => {
        await versioningRPC.mergeBranch(docId, sourceBranch, targetBranch)
    })
} 