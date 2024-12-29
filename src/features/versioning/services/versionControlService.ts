import { DocumentEntry, VersionState } from '../../../../electron/types/versioning';

class VersionControlService {
  async getDocumentByPath(filePath: string): Promise<DocumentEntry | null> {
    try {
      console.log('VersionControlService: Getting document by path:', filePath);
      const result = await window.ipcRenderer.invoke('versioning', 'getDocumentByPath', filePath);
      console.log('VersionControlService: Got document:', result);
      return result;
    } catch (error) {
      console.error('VersionControlService: Error getting document:', error);
      return null;
    }
  }

  async createDocument(filePath: string): Promise<DocumentEntry> {
    try {
      console.log('VersionControlService: Creating document:', filePath);
      const result = await window.ipcRenderer.invoke('versioning', 'createDocument', filePath);
      console.log('VersionControlService: Document created:', result);
      return result;
    } catch (error) {
      console.error('VersionControlService: Error creating document:', error);
      throw error;
    }
  }

  async getDocument(id: string): Promise<DocumentEntry | null> {
    return window.ipcRenderer.invoke('versioning', 'getDocument', id);
  }

  async updateDocument(id: string, updates: Partial<DocumentEntry>): Promise<DocumentEntry> {
    return window.ipcRenderer.invoke('versioning', 'updateDocument', id, updates);
  }

  async deleteDocument(id: string): Promise<void> {
    return window.ipcRenderer.invoke('versioning', 'deleteDocument', id);
  }

  async saveVersion(id: string, content: any): Promise<string> {
    return window.ipcRenderer.invoke('versioning', 'saveVersion', id, content);
  }

  async getVersion(id: string, versionId: string): Promise<VersionState | null> {
    return window.ipcRenderer.invoke('versioning', 'getVersion', id, versionId);
  }

  async getCurrentVersion(id: string): Promise<VersionState | null> {
    return window.ipcRenderer.invoke('versioning', 'getCurrentVersion', id);
  }

  async getVersionHistory(id: string, branch?: string): Promise<VersionState[]> {
    return window.ipcRenderer.invoke('versioning', 'getVersionHistory', id, branch);
  }

  async createBranch(id: string, branchName: string): Promise<void> {
    return window.ipcRenderer.invoke('versioning', 'createBranch', id, branchName);
  }

  async switchBranch(id: string, branchName: string): Promise<void> {
    return window.ipcRenderer.invoke('versioning', 'switchBranch', id, branchName);
  }

  async saveContent(id: string, content: any): Promise<void> {
    try {
      await this.saveVersion(id, content);
    } catch (error) {
      console.error('Error saving content:', error);
      throw error;
    }
  }

  async loadContent(id: string): Promise<any> {
    try {
      const version = await this.getCurrentVersion(id);
      return version?.content || null;
    } catch (error) {
      console.error('Error loading content:', error);
      throw error;
    }
  }
}

export const versionControlService = new VersionControlService(); 