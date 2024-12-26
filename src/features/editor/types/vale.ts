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

export interface ProcessedValeAlert extends ValeAlert {
  domPosition: {
    top: number;
    left: number;
  } | null;
} 