import path from "path";
import { getLlama, LlamaCompletion } from "node-llama-cpp";
import fs from 'fs/promises';
import { MODEL_NAME } from "../../constants/constants";
import { EditorContext } from "../../../src/features/editor/types";

export type PredictionResponse = {
    text?: string;
    error?: string;
};


export async function generateCompletion(editorContext: EditorContext): Promise<PredictionResponse> {
    const { textBeforeCursor } = editorContext;
    const llama = await getLlama();
    const modelPath = path.resolve(process.env.APP_ROOT || '', 'models', MODEL_NAME);
    
    try {
        await fs.access(modelPath);
    } catch (error) {
        return { error: `Model file not found at ${modelPath}` };
    }

    const model = await llama.loadModel({
        modelPath: modelPath
    });
    const context = await model.createContext();
    const completion = new LlamaCompletion({
        contextSequence: context.getSequence()
    });

    try {
        console.log('Input context:', textBeforeCursor);
        const output = await completion.generateCompletion(textBeforeCursor, {
            maxTokens: 8,
            temperature: 0.5,
            topP: 0.9,
        });
        console.log('Generated output:', output);
        return { text: output };
    } catch (error) {
        return { error: "Failed to generate completion" };
    }
}
