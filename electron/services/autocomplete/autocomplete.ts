import { fileURLToPath } from "url";
import path from "path";
import { getLlama, LlamaChatSession } from "node-llama-cpp";
import fs from 'fs/promises';
import { EventEmitter } from 'events';

// Singleton to maintain chat session
let chatSession: LlamaChatSession | null = null;
let currentRequestId: string | null = null;
const requestEmitter = new EventEmitter();

type PredictionResponse = {
    text?: string;
    error?: string;
};

async function initializeChatSession() {
    if (chatSession) return chatSession;

    try {
        console.log("Initializing new chat session");
        const llama = await getLlama();
        
        const modelPath = path.join(process.env.APP_ROOT || '',
             'models',
             'hf_mradermacher_Llama-3.2-3B-Instruct.Q8_0.gguf');
        
        try {
            await fs.access(modelPath);
        } catch {
            throw new Error(`Model file not found at: ${modelPath}`);
        }
                
        const model = await llama.loadModel({
            modelPath,
        });
        
        
        const context = await model.createContext();
        chatSession = new LlamaChatSession({
            contextSequence: context.getSequence()
        });

        return chatSession;

    } catch (error) {
        console.error("Error in initializeChatSession:", {
            error,
            name: error instanceof Error ? error.name : 'Unknown',
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : 'No stack trace'
        });
        
        throw new Error(
            error instanceof Error 
                ? `Session Init Error: ${error.name} - ${error.message}` 
                : `Session Init Error: ${String(error)}`
        );
    }
}

export async function generateCompletion(context: EditorContext): Promise<PredictionResponse> {
    const { previousContext, currentSentence, followingContext } = context;
    console.log("Previous Context:", previousContext);
    console.log("Current Sentence:", currentSentence);
    console.log("Following Context:", followingContext);
    const requestId = Date.now().toString();
    
    if (currentRequestId) {
        requestEmitter.emit(`cancel-${currentRequestId}`);
    }
    
    currentRequestId = requestId;

    try {
        const session = await initializeChatSession();
        const initialChatHistory = session.getChatHistory();
        session.setChatHistory(initialChatHistory);

        if (!session) {
            return { error: "Failed to initialize chat session" };
        }

        const prompt = `
Previous context: ${previousContext}
Incomplete sentence: ${currentSentence}
Following context: ${followingContext}
<instructions>
<instruction>
Complete the current sentence naturally. Only provide the completion portion, nothing else. 
</instruction>
<instruction>
Do not include any other text or instructions in your response.
</instruction>
</instructions>
`;
        
        const repeatPenalty = {
                lastTokens: 24,
                penalty: 1.12,
                penalizeNewLine: true,
                frequencyPenalty: 0.02,
                presencePenalty: 0.02,
            }
        
        const completionPromise = session.prompt(prompt, {
            maxTokens: 50,
            temperature: 0.7,
            topP: 0.9,
            repeatPenalty,
        });


        const completion = await Promise.race([
            completionPromise,
            new Promise((_, reject) => {
                requestEmitter.once(`cancel-${requestId}`, () => {
                    reject(new Error('Request cancelled'));
                });
            })
        ]) as string;

        if (currentRequestId !== requestId) {
            return { text: '' };
        }

        const result = typeof completion === 'string' ? completion.trim() : completion;
        console.log("RESULT:", result);
        
        return { text: result };

    } catch (error) {
        if (error instanceof Error && error.message === 'Request cancelled') {
            return { text: '' };
        }

        console.error("Completion error:", {
            error,
            context,
            errorType: error instanceof Error ? error.name : 'Unknown'
        });
        
        return { 
            error: error instanceof Error 
                ? `LLM Error: ${error.name} - ${error.message}` 
                : `LLM Error: ${String(error)}`
        };
    } finally {
        if (currentRequestId === requestId) {
            currentRequestId = null;
        }
    }
}
