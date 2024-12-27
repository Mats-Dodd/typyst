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