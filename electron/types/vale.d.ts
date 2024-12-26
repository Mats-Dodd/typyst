export interface ValeAlert {
    Action: {
        Name: string;
        Params: string[] | null;
    };
    Span: [number, number];
    Check: string;
    Description: string;
    Link: string;
    Message: string;
    Severity: string;
    Match: string;
    Line: number;
}

export interface ValeResponse {
    [filePath: string]: ValeAlert[];
}

export interface ValeAPI {
    lint: (htmlContent: string) => Promise<ValeResponse>;
    getVersion: () => Promise<string>;
}

declare global {
    interface Window {
        vale: ValeAPI;
    }
} 