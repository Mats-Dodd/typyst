import {ipcRenderer, contextBridge} from "electron";
import type { ValeAPI } from "./types/vale";
import type { VersioningAPI } from "./types/versioning";
import type { Doc } from '@automerge/automerge';
import type { VersionedDocument } from "../src/features/versioning/types";

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld("ipcRenderer", {
    on(...args: Parameters<typeof ipcRenderer.on>) {
        const [channel, listener] = args;
        return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args));
    },
    off(...args: Parameters<typeof ipcRenderer.off>) {
        const [channel, ...omit] = args;
        return ipcRenderer.off(channel, ...omit);
    },
    send(...args: Parameters<typeof ipcRenderer.send>) {
        const [channel, ...omit] = args;
        return ipcRenderer.send(channel, ...omit);
    },
    invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
        const [channel, ...omit] = args;
        return ipcRenderer.invoke(channel, ...omit);
    }
});

// Expose typed versions of common operations
contextBridge.exposeInMainWorld('fs', {
    writeFile: async (path: string, content: string) => {
        return await ipcRenderer.invoke('write-file', path, content);
    },
    writeBuffer: async (path: string, buffer: ArrayBuffer) => {
        return await ipcRenderer.invoke('write-buffer', path, buffer);
    },
    readFile: async (path: string) => {
        return await ipcRenderer.invoke('read-file', path);
    },
    deleteFile: async (path: string) => {
        return await ipcRenderer.invoke('delete-file', path);
    },
    createDir: async (path: string) => {
        return await ipcRenderer.invoke('create-dir', path);
    },
    exists: async (path: string) => {
        return await ipcRenderer.invoke('exists', path);
    },
    showOpenDialog: async () => {
        return await ipcRenderer.invoke('show-open-dialog');
    },
    removeDir: async (path: string) => {
        return await ipcRenderer.invoke('remove-dir', path);
    },
    rename: async (oldPath: string, newPath: string) => {
        return await ipcRenderer.invoke('rename-file', oldPath, newPath);
    },
});

// Expose Vale API
contextBridge.exposeInMainWorld('vale', {
    lint: (htmlContent: string) => {
        return ipcRenderer.invoke('vale:lint', htmlContent);
    },
    getVersion: () => {
        return ipcRenderer.invoke('vale:version');
    }
});

// Expose versioning API
contextBridge.exposeInMainWorld('versioning', {
    createDocument: (title: string) => {
        return ipcRenderer.invoke('versioning:create', title);
    },
    saveDocument: (docId: string, doc: Doc<VersionedDocument>) => {
        return ipcRenderer.invoke('versioning:save', docId, doc);
    },
    loadDocument: (docId: string) => {
        return ipcRenderer.invoke('versioning:load', docId);
    },
    listDocuments: () => {
        return ipcRenderer.invoke('versioning:list');
    },
    createBranch: (docId: string, branchName: string) => {
        return ipcRenderer.invoke('versioning:create-branch', docId, branchName);
    },
    mergeBranch: (docId: string, sourceBranch: string, targetBranch: string) => {
        return ipcRenderer.invoke('versioning:merge-branch', docId, sourceBranch, targetBranch);
    }
} as VersioningAPI);

// Expose path utilities
contextBridge.exposeInMainWorld('path', {
    dirname: async (filePath: string) => {
        return await ipcRenderer.invoke('path:dirname', filePath);
    },
    join: async (...paths: string[]) => {
        return await ipcRenderer.invoke('path:join', ...paths);
    },
    normalize: async (filePath: string) => {
        return await ipcRenderer.invoke('path:normalize', filePath);
    }
});

// Expose process utilities
contextBridge.exposeInMainWorld('process', {
    cwd: () => ipcRenderer.invoke('process:cwd')
});
