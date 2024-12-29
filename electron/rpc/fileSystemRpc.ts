import { ipcMain, dialog, BrowserWindow } from 'electron';
import fs from 'fs/promises';
import path from 'path';

export function registerFileSystemRpc(win?: BrowserWindow) {
    ipcMain.handle('write-file', async (_event, filePath: string, content: string) => {
        console.log('Main Process: Writing file:', filePath);
        try {
            // Ensure the directory exists
            const dir = path.dirname(filePath);
            await fs.mkdir(dir, { recursive: true });
            
            // Write the file
            await fs.writeFile(filePath, content, 'utf-8');
            console.log('Main Process: File written successfully');
            return { success: true };
        } catch (error) {
            console.error('Main Process: Error writing file:', error);
            return { 
                success: false, 
                error: error instanceof Error ? error.message : String(error)
            };
        }
    });

    ipcMain.handle('write-buffer', async (_event, filePath: string, buffer: ArrayBuffer) => {
        try {
            // Ensure the directory exists
            const dir = path.dirname(filePath);
            await fs.mkdir(dir, { recursive: true });
            
            // Convert ArrayBuffer to Buffer and write to file
            const nodeBuffer = Buffer.from(buffer);
            await fs.writeFile(filePath, nodeBuffer);
            return { success: true };
        } catch (error) {
            console.error('Error writing buffer:', error);
            return { 
                success: false, 
                error: error instanceof Error ? error.message : String(error)
            };
        }
    });

    ipcMain.handle('read-file', async (_event, filePath: string) => {
        console.log('Main Process: Reading file:', filePath);
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            console.log('Main Process: File read successfully');
            return { content };
        } catch (error) {
            console.error('Main Process: Error reading file:', error);
            return { 
                content: '',
                error: error instanceof Error ? error.message : String(error)
            };
        }
    });

    ipcMain.handle('delete-file', async (_event, filePath: string) => {
        try {
            await fs.unlink(filePath);
            return { success: true };
        } catch (error) {
            console.error('Error deleting file:', error);
            return { 
                success: false, 
                error: error instanceof Error ? error.message : String(error)
            };
        }
    });

    ipcMain.handle('create-dir', async (_event, dirPath: string) => {
        console.log('Main Process: Creating directory:', dirPath);
        try {
            await fs.mkdir(dirPath, { recursive: true });
            console.log('Main Process: Directory created successfully');
            return { success: true };
        } catch (error) {
            console.error('Main Process: Error creating directory:', error);
            return { 
                success: false, 
                error: error instanceof Error ? error.message : String(error)
            };
        }
    });

    ipcMain.handle('exists', async (_event, filePath: string) => {
        console.log('Main Process: Checking if exists:', filePath);
        try {
            await fs.access(filePath);
            console.log('Main Process: Path exists');
            return { exists: true };
        } catch {
            console.log('Main Process: Path does not exist');
            return { exists: false };
        }
    });

    ipcMain.handle('remove-dir', async (_event, dirPath: string) => {
        console.log('Main Process: Removing directory:', dirPath);
        try {
            await fs.rm(dirPath, { recursive: true });
            console.log('Main Process: Directory removed successfully');
            return { success: true };
        } catch (error) {
            console.error('Main Process: Error removing directory:', error);
            return { 
                success: false, 
                error: error instanceof Error ? error.message : String(error)
            };
        }
    });

    ipcMain.handle('rename-file', async (_event, oldPath: string, newPath: string) => {
        console.log('Main Process: Renaming file:', { oldPath, newPath });
        try {
            await fs.rename(oldPath, newPath);
            console.log('Main Process: File renamed successfully');
            return { success: true };
        } catch (error) {
            console.error('Main Process: Error renaming file:', error);
            return { 
                success: false, 
                error: error instanceof Error ? error.message : String(error)
            };
        }
    });

    ipcMain.handle('show-open-dialog', async () => {
        console.log('Main Process: Handling show-open-dialog request');
        try {
            if (!win) {
                console.error('Main Process: No window available for dialog');
                throw new Error('No window available');
            }

            console.log('Main Process: Showing open dialog...');
            const result = await dialog.showOpenDialog(win, {
                properties: ['openFile'],
                filters: [
                    { name: 'Documents', extensions: ['md', 'docx'] }
                ]
            });
            console.log('Main Process: Dialog result:', result);

            if (result.canceled || result.filePaths.length === 0) {
                console.log('Main Process: Dialog canceled or no file selected');
                return { success: false };
            }

            const filePath = result.filePaths[0];
            if (!filePath) {
                console.log('Main Process: No file path returned');
                return { success: false };
            }

            console.log('Main Process: Reading file content:', filePath);
            const content = await fs.readFile(filePath, 'utf-8');
            console.log('Main Process: File read successfully');

            return {
                success: true,
                filePath,
                content
            };
        } catch (error) {
            console.error('Main Process: Error in show-open-dialog:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    });

    // Path operations
    ipcMain.handle('path:dirname', (_event, filePath: string) => {
        console.log('Main Process: Getting dirname for:', filePath);
        return path.dirname(filePath);
    });

    ipcMain.handle('path:join', (_event, ...paths: string[]) => {
        console.log('Main Process: Joining paths:', paths);
        return path.join(...paths);
    });

    ipcMain.handle('path:normalize', (_event, filePath: string) => {
        console.log('Main Process: Normalizing path:', filePath);
        return path.normalize(filePath);
    });

    // Process operations
    ipcMain.handle('process:cwd', () => {
        console.log('Main Process: Getting current working directory');
        const cwd = process.cwd();
        console.log('Main Process: CWD:', cwd);
        return cwd;
    });
} 