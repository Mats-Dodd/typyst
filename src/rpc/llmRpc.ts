import {ElectronFunctions} from "../../electron/rpc/llmRpc.ts";
import {createRendererSideBirpc} from "./createRendererSideBirpc.ts";

const renderedFunctions = {} as const;

export type RenderedFunctions = typeof renderedFunctions;

export const electronLlmRpc = createRendererSideBirpc<ElectronFunctions, RenderedFunctions>(
    "llmRpc", 
    "llmRpc", 
    renderedFunctions
);
