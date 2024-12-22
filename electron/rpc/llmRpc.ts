import {BrowserWindow} from "electron";
import {createElectronSideBirpc} from "../utils/createElectronSideBirpc.ts";
import type {RenderedFunctions} from "../../src/rpc/llmRpc.ts";

export class ElectronLlmRpc {
    public readonly rendererLlmRpc: ReturnType<typeof createElectronSideBirpc<RenderedFunctions, typeof this.functions>>;

    public readonly functions = {
        autocomplete() {
            return "my name is";
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
