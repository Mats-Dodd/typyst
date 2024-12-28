import {fileURLToPath} from "node:url";
import path from "node:path";
import {app, shell, BrowserWindow, ipcMain} from "electron";
import {registerLlmRpc} from "./rpc/llmRpc.ts";
import {registerFileSystemRpc} from "./rpc/fileSystemRpc";
import {registerValeIpcHandlers} from "./services/vale/valeIpc.js";
import {setupVersioningHandlers} from "./ipc/versioningHandlers";
import * as fs from 'fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── index.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, "..");

export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
    ? path.join(process.env.APP_ROOT, "public")
    : RENDERER_DIST;

let win: BrowserWindow | null;

function createWindow() {
    win = new BrowserWindow({
        icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
        webPreferences: {
            preload: path.join(__dirname, "preload.mjs")
        },
        width: 1400,
        height: 700,
        frame: false,
        titleBarStyle: 'hiddenInset',
        backgroundColor: '#ffffff',
        minWidth: 800,
        minHeight: 600
    });
    registerLlmRpc(win);
    registerFileSystemRpc();
    registerValeIpcHandlers();
    setupVersioningHandlers();

    // Test active push message to Renderer-process.
    win.webContents.on("did-finish-load", () => {
        win?.webContents.send("main-process-message", (new Date()).toLocaleString());
        
        // Open DevTools docked to the right side during development
        if (VITE_DEV_SERVER_URL && win) {
            win.webContents.openDevTools({ mode: 'right' });
        }
    });

    // open external links in the default browser
    win.webContents.setWindowOpenHandler(({url}) => {
        if (url.startsWith("file://"))
            return {action: "allow"};

        void shell.openExternal(url);
        return {action: "deny"};
    });

    if (VITE_DEV_SERVER_URL)
        void win.loadURL(VITE_DEV_SERVER_URL);
    else
        void win.loadFile(path.join(RENDERER_DIST, "index.html"));
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
        win = null;
    }
});

app.on("activate", () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

app.whenReady().then(createWindow);

// File system operations
ipcMain.handle('remove-dir', async (_, dirPath: string) => {
    try {
        await fs.rm(dirPath, { recursive: true });
        return { success: true };
    } catch (error) {
        console.error('Error removing directory:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
});

ipcMain.handle('rename-file', async (_, oldPath: string, newPath: string) => {
    try {
        await fs.rename(oldPath, newPath);
        return { success: true };
    } catch (error) {
        console.error('Error renaming file/directory:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
});
