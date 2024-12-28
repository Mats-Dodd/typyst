declare global {
  interface Window {
    fs: {
      writeFile: (path: string, content: string) => Promise<{ success: boolean; error?: string }>;
      writeBuffer: (path: string, buffer: ArrayBuffer) => Promise<{ success: boolean; error?: string }>;
      readFile: (path: string) => Promise<{ success: boolean; content?: string; error?: string }>;
    };
    vale: {
      lint(content: string): Promise<Record<string, any>>;
    };
    currentValeHighlights: string[];
    currentPrediction: string;
    versionControl: {
      initializeDocument: (path: string) => Promise<void>;
      saveDocument: (content: any) => Promise<void>;
      loadDocument: (branchName: string) => Promise<any>;
      createBranch: (branchName: string) => Promise<void>;
      switchBranch: (branchName: string) => Promise<void>;
      deleteBranch: (branchName: string) => Promise<void>;
      getBranches: () => Promise<string[]>;
      getCurrentBranch: () => Promise<string>;
      updateDocumentPath: (newPath: string) => Promise<void>;
    };
  }
}

declare module 'mammoth' {
  interface ConversionResult {
    value: string;
    messages: any[];
  }

  type Input = ArrayBuffer | { arrayBuffer: ArrayBuffer } | { path: string };

  function convertToHtml(input: Input): Promise<ConversionResult>;
  export { convertToHtml, ConversionResult };
}

export {} 