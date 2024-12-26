import {ipcRenderer, contextBridge} from "electron";
import type { ValeAPI } from "./types/vale";

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
    writeFile: (path: string, content: string) => {
        return ipcRenderer.invoke('write-file', path, content);
    },
    readFile: (path: string) => {
        return ipcRenderer.invoke('read-file', path);
    }
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
