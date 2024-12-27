interface Window {
    fs: {
        writeFile: (path: string, content: string) => Promise<{ success: boolean; error?: string }>;
        writeBuffer: (path: string, buffer: ArrayBuffer) => Promise<{ success: boolean; error?: string }>;
        readFile: (path: string) => Promise<{ content: string; error?: string }>;
        deleteFile: (path: string) => Promise<{ success: boolean; error?: string }>;
    };
    vale: {
        lint: (htmlContent: string) => Promise<any>;
        getVersion: () => Promise<string>;
    };
} 