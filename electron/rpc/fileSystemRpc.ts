import { ipcMain, dialog } from 'electron';
import fs from 'fs/promises';
import path from 'path';

export function registerFileSystemRpc() {
    ipcMain.handle('write-file', async (_event, filePath: string, content: string) => {
        try {
            // Ensure the directory exists
            const dir = path.dirname(filePath);
            await fs.mkdir(dir, { recursive: true });
            
            // Write the file
            await fs.writeFile(filePath, content, 'utf-8');
            return { success: true };
        } catch (error) {
            console.error('Error writing file:', error);
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
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            return { content };
        } catch (error) {
            console.error('Error reading file:', error);
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
        try {
            await fs.mkdir(dirPath, { recursive: true });
            return { success: true };
        } catch (error) {
            console.error('Error creating directory:', error);
            return { 
                success: false, 
                error: error instanceof Error ? error.message : String(error)
            };
        }
    });

    ipcMain.handle('exists', async (_event, filePath: string) => {
        try {
            await fs.access(filePath);
            return { exists: true };
        } catch (error) {
            if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
                return { exists: false };
            }
            console.error('Error checking file existence:', error);
            return { 
                exists: false, 
                error: error instanceof Error ? error.message : String(error)
            };
        }
    });

    ipcMain.handle('path:dirname', (_event, filePath: string) => {
        return path.dirname(filePath);
    });

    ipcMain.handle('path:join', (_event, ...paths: string[]) => {
        return path.join(...paths);
    });

    ipcMain.handle('path:normalize', (_event, filePath: string) => {
        return path.normalize(filePath);
    });

    ipcMain.handle('process:cwd', () => {
        return process.cwd();
    });

    ipcMain.handle('show-open-dialog', async () => {
        const result = await dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [
                { name: 'Documents', extensions: ['md', 'docx'] }
            ]
        });
        
        if (result.canceled || !result.filePaths[0]) {
            return {
                success: false,
                error: 'No file selected'
            };
        }

        try {
            const filePath = result.filePaths[0];
            // Read file based on extension
            const isDocx = filePath.toLowerCase().endsWith('.docx');
            if (isDocx) {
                const buffer = await fs.readFile(filePath);
                return {
                    filePath,
                    content: buffer.toString('base64'), // Send as base64 string
                    isDocx: true,
                    success: true
                };
            } else {
                const content = await fs.readFile(filePath, 'utf-8');
                return {
                    filePath,
                    content,
                    success: true
                };
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    });
} 