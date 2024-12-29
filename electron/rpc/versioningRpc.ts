import { ipcMain, app } from 'electron';
import { DocumentEntry, VersionState } from '../types/versioning';
import { VersionControlStorage } from '../services/versioning/storage';

export interface VersioningRpcServer {
  createDocument(filePath: string): Promise<DocumentEntry>;
  getDocument(id: string): Promise<DocumentEntry | null>;
  getDocumentByPath(filePath: string): Promise<DocumentEntry | null>;
  updateDocument(id: string, updates: Partial<DocumentEntry>): Promise<DocumentEntry>;
  deleteDocument(id: string): Promise<void>;
  
  // Version control operations
  saveVersion(id: string, content: any): Promise<string>;
  getVersion(id: string, versionId: string): Promise<VersionState | null>;
  getCurrentVersion(id: string): Promise<VersionState | null>;
  getVersionHistory(id: string, branch?: string): Promise<VersionState[]>;
  
  // Branch operations
  createBranch(id: string, branchName: string): Promise<void>;
  switchBranch(id: string, branchName: string): Promise<void>;
}

class VersioningRpc implements VersioningRpcServer {
  private storage: VersionControlStorage;

  constructor() {
    this.storage = new VersionControlStorage();
  }

  async initialize(): Promise<void> {
    await this.storage.initialize();
  }

  async createDocument(filePath: string): Promise<DocumentEntry> {
    console.log('Main Process: Creating document:', filePath);
    return this.storage.createDocument(filePath);
  }

  async getDocument(id: string): Promise<DocumentEntry | null> {
    console.log('Main Process: Getting document:', id);
    return this.storage.getDocument(id);
  }

  async getDocumentByPath(filePath: string): Promise<DocumentEntry | null> {
    console.log('Main Process: Getting document by path:', filePath);
    return this.storage.getDocumentByPath(filePath);
  }

  async updateDocument(id: string, updates: Partial<DocumentEntry>): Promise<DocumentEntry> {
    console.log('Main Process: Updating document:', id);
    return this.storage.updateDocument(id, updates);
  }

  async deleteDocument(id: string): Promise<void> {
    console.log('Main Process: Deleting document:', id);
    return this.storage.deleteDocument(id);
  }

  // Version control operations
  async saveVersion(id: string, content: any): Promise<string> {
    console.log('Main Process: Saving version for document:', id);
    return this.storage.saveVersion(id, content);
  }

  async getVersion(id: string, versionId: string): Promise<VersionState | null> {
    console.log('Main Process: Getting version:', { id, versionId });
    return this.storage.getVersion(id, versionId);
  }

  async getCurrentVersion(id: string): Promise<VersionState | null> {
    console.log('Main Process: Getting current version for document:', id);
    return this.storage.getCurrentVersion(id);
  }

  async getVersionHistory(id: string, branch?: string): Promise<VersionState[]> {
    console.log('Main Process: Getting version history:', { id, branch });
    return this.storage.getVersionHistory(id, branch);
  }

  // Branch operations
  async createBranch(id: string, branchName: string): Promise<void> {
    console.log('Main Process: Creating branch:', { id, branchName });
    return this.storage.createBranch(id, branchName);
  }

  async switchBranch(id: string, branchName: string): Promise<void> {
    console.log('Main Process: Switching branch:', { id, branchName });
    return this.storage.switchBranch(id, branchName);
  }
}

export function registerVersioningRpc() {
  console.log('Main Process: Registering versioning RPC handlers');
  const versioningRpc = new VersioningRpc();
  
  // Initialize storage
  console.log('Main Process: Initializing version control storage...');
  versioningRpc.initialize()
    .then(() => {
      console.log('Main Process: Version control storage initialized successfully');
      
      // Register handlers
      ipcMain.handle('versioning', async (_event, method: string, ...args: any[]) => {
        console.log('Main Process: Handling versioning request:', { method, args });
        try {
          // @ts-ignore
          const result = await versioningRpc[method](...args);
          console.log('Main Process: Request completed successfully:', { method });
          return result;
        } catch (error) {
          console.error('Main Process: Error handling request:', { method, error });
          throw error;
        }
      });
      
      console.log('Main Process: Version control RPC handler registered');
    })
    .catch(err => {
      console.error('Main Process: Failed to initialize version control storage:', err);
      throw err;
    });
} 