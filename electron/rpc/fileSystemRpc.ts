import { ipcMain } from 'electron';
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
} 