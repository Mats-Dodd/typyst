import type { VersioningAPI } from '../../electron/types/versioning'

declare global {
    interface Window {
        fs: {
            writeFile: (path: string, content: string) => Promise<{ success: boolean; error?: string }>;
            writeBuffer: (path: string, buffer: ArrayBuffer) => Promise<{ success: boolean; error?: string }>;
            readFile: (path: string) => Promise<{ content: string; error?: string }>;
            deleteFile: (path: string) => Promise<{ success: boolean; error?: string }>;
            createDir: (path: string) => Promise<{ success: boolean; error?: string }>;
            exists: (path: string) => Promise<{ exists: boolean; error?: string }>;
            showOpenDialog: () => Promise<{ success: boolean; filePath?: string; content?: string; error?: string; isDocx?: boolean }>;
        };
        path: {
            dirname: (path: string) => Promise<string>;
            join: (...paths: string[]) => Promise<string>;
            normalize: (path: string) => Promise<string>;
        };
        process: {
            cwd: () => Promise<string>;
        };
        vale: {
            lint: (htmlContent: string) => Promise<any>;
            getVersion: () => Promise<string>;
        };
        versioning: VersioningAPI;
    }
}

export {}; 