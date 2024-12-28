import { ipcMain } from 'electron';
import { documentService } from '../services/document/documentService';
import { gitService } from '../services/git/gitService';

export interface VersionControlRPC {
  initializeDocument: (path: string) => Promise<void>;
  saveDocument: (content: any) => Promise<void>;
  loadDocument: (branchName: string) => Promise<any>;
  createBranch: (branchName: string) => Promise<void>;
  switchBranch: (branchName: string) => Promise<void>;
  getBranches: () => Promise<string[]>;
  getCurrentBranch: () => Promise<string>;
  deleteBranch: (branchName: string) => Promise<void>;
  updateDocumentPath: (newPath: string) => Promise<void>;
}

export const versionControlRPC: VersionControlRPC = {
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

  async getBranches() {
    return gitService.getBranches();
  },

  async getCurrentBranch() {
    return gitService.getCurrentBranch();
  },

  async deleteBranch(branchName: string) {
    await gitService.deleteBranch(branchName);
  },

  async updateDocumentPath(newPath: string) {
    await documentService.updateDocumentPath(newPath);
  }
};

export function registerVersionControlRpc() {
  ipcMain.handle('version-control:init', async (_, path: string) => {
    return versionControlRPC.initializeDocument(path);
  });

  ipcMain.handle('version-control:save', async (_, content: any) => {
    return versionControlRPC.saveDocument(content);
  });

  ipcMain.handle('version-control:load', async (_, branchName: string) => {
    return versionControlRPC.loadDocument(branchName);
  });

  ipcMain.handle('version-control:create-branch', async (_, branchName: string) => {
    return versionControlRPC.createBranch(branchName);
  });

  ipcMain.handle('version-control:switch-branch', async (_, branchName: string) => {
    return versionControlRPC.switchBranch(branchName);
  });

  ipcMain.handle('version-control:delete-branch', async (_, branchName: string) => {
    return versionControlRPC.deleteBranch(branchName);
  });

  ipcMain.handle('version-control:get-branches', async () => {
    return versionControlRPC.getBranches();
  });

  ipcMain.handle('version-control:get-current-branch', async () => {
    return versionControlRPC.getCurrentBranch();
  });

  ipcMain.handle('version-control:update-path', async (_, newPath: string) => {
    return versionControlRPC.updateDocumentPath(newPath);
  });
} 