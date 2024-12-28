import { ipcMain } from 'electron';
import { documentService } from '../services/document/documentService';
import { gitService } from '../services/git/gitService';

export interface VersionControlRpc {
  initializeDocument(path: string): Promise<void>;
  saveDocument(content: any): Promise<void>;
  loadDocument(branchName: string): Promise<any>;
  createBranch(branchName: string): Promise<void>;
  switchBranch(branchName: string): Promise<void>;
  deleteBranch(branchName: string): Promise<void>;
  getBranches(): Promise<string[]>;
  getCurrentBranch(): Promise<string>;
}

export const versionControlRpc: VersionControlRpc = {
  async initializeDocument(path: string) {
    await documentService.initializeDocument(path);
  },

  async saveDocument(content: any) {
    await documentService.saveDocument(content);
  },

  async loadDocument(branchName: string) {
    return documentService.loadDocument(branchName);
  },

  async createBranch(branchName: string) {
    await gitService.createBranch(branchName);
  },

  async switchBranch(branchName: string) {
    await gitService.switchBranch(branchName);
  },

  async deleteBranch(branchName: string) {
    await gitService.deleteBranch(branchName);
  },

  async getBranches() {
    return gitService.getBranches();
  },

  async getCurrentBranch() {
    return gitService.getCurrentBranch();
  }
};

export function registerVersionControlRpc() {
  ipcMain.handle('version-control:init', async (_, path: string) => {
    return versionControlRpc.initializeDocument(path);
  });

  ipcMain.handle('version-control:save', async (_, content: any) => {
    return versionControlRpc.saveDocument(content);
  });

  ipcMain.handle('version-control:load', async (_, branchName: string) => {
    return versionControlRpc.loadDocument(branchName);
  });

  ipcMain.handle('version-control:create-branch', async (_, branchName: string) => {
    return versionControlRpc.createBranch(branchName);
  });

  ipcMain.handle('version-control:switch-branch', async (_, branchName: string) => {
    return versionControlRpc.switchBranch(branchName);
  });

  ipcMain.handle('version-control:delete-branch', async (_, branchName: string) => {
    return versionControlRpc.deleteBranch(branchName);
  });

  ipcMain.handle('version-control:get-branches', async () => {
    return versionControlRpc.getBranches();
  });

  ipcMain.handle('version-control:get-current-branch', async () => {
    return versionControlRpc.getCurrentBranch();
  });
} 