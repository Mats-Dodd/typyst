declare global {
  interface Window {
    fs: {
      writeFile: (path: string, content: string) => Promise<{ success: boolean; error?: string }>;
      readFile: (path: string) => Promise<{ success: boolean; content?: string; error?: string }>;
    };
    vale: {
      lint(content: string): Promise<Record<string, any>>;
    };
    currentValeHighlights: string[];
    currentPrediction: string;
  }
}

export {} 