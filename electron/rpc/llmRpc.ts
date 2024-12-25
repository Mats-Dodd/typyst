import {BrowserWindow} from "electron";
import {createElectronSideBirpc} from "../utils/createElectronSideBirpc.ts";
import type {RenderedFunctions} from "../../src/rpc/llmRpc.ts";
import {generateCompletion} from "../services/autocomplete/autocomplete.ts";

export class ElectronLlmRpc {
    public readonly rendererLlmRpc: ReturnType<typeof createElectronSideBirpc<RenderedFunctions, typeof this.functions>>;

    public readonly functions = {
        async autocomplete(context: EditorContext): Promise<PredictionResponse> {
            try {
                console.log("RPC: Starting autocomplete with context:", context);
                const response = await generateCompletion(context);
                console.log("RPC: Completion response:", response);
                return response;
            } catch (error) {
                console.error("RPC: Error in autocomplete:", error);
                return { 
                    error: error instanceof Error 
                        ? `Autocomplete failed: ${error.name} - ${error.message}` 
                        : `Autocomplete failed: ${String(error)}`
                };
            }
        }
    } as const;

    public constructor(window: BrowserWindow) {
        this.rendererLlmRpc = createElectronSideBirpc<RenderedFunctions, typeof this.functions>(
            "llmRpc", 
            "llmRpc", 
            window, 
            this.functions
        );
    }
}

export type ElectronFunctions = typeof ElectronLlmRpc.prototype.functions;

export function registerLlmRpc(window: BrowserWindow) {
    new ElectronLlmRpc(window);
}
