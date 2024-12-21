import {useCallback, useLayoutEffect, useRef} from "react";
import {llmState} from "../state/llmState.ts";
import {electronLlmRpc} from "../rpc/llmRpc.ts";
import {useExternalState} from "../hooks/useExternalState.ts";
import {Header} from "./components/Header/Header.tsx";
import {ChatHistory} from "./components/ChatHistory/ChatHistory.tsx";
import {InputRow} from "./components/InputRow/InputRow.tsx";

import "./App.css";


export function App() {
    const state = useExternalState(llmState);
    const {generatingResult} = state.chatSession;
    const isScrollAnchoredRef = useRef(false);

    const isScrolledToTheBottom = useCallback(() => {
        return document.documentElement.scrollHeight - document.documentElement.scrollTop === document.documentElement.clientHeight;
    }, []);

    const scrollToBottom = useCallback(() => {
        document.documentElement.scrollTop = document.documentElement.scrollHeight;
        isScrollAnchoredRef.current = isScrolledToTheBottom();
    }, []);

    useLayoutEffect(() => {

        function onScroll() {
            isScrollAnchoredRef.current = isScrolledToTheBottom();
        }

        const observer = new ResizeObserver(() => {
            if (isScrollAnchoredRef.current && !isScrolledToTheBottom())
                scrollToBottom();
        });

        window.addEventListener("scroll", onScroll, {passive: false});
        observer.observe(document.body, {
            box: "border-box"
        });
        scrollToBottom();

        return () => {
            observer.disconnect();
            window.removeEventListener("scroll", onScroll);
        };
    }, []);

    const stopActivePrompt = useCallback(() => {
        void electronLlmRpc.stopActivePrompt();
    }, []);

    const resetChatHistory = useCallback(() => {
        void electronLlmRpc.stopActivePrompt();
        void electronLlmRpc.resetChatHistory();
    }, []);

    const sendPrompt = useCallback((prompt: string) => {
        if (generatingResult)
            return;

        scrollToBottom();
        void electronLlmRpc.prompt(prompt);
    }, [generatingResult, scrollToBottom]);

    const onPromptInput = useCallback((currentText: string) => {
        void electronLlmRpc.setDraftPrompt(currentText);
    }, []);

    const error = state.llama.error ?? state.model.error ?? state.context.error ?? state.contextSequence.error;
    const loading = state.selectedModelFilePath != null && error == null && (
        !state.model.loaded || !state.llama.loaded || !state.context.loaded || !state.contextSequence.loaded || !state.chatSession.loaded
    );
    const showMessage = error != null || state.chatSession.simplifiedChat.length === 0;

    return <div className="app">
        <Header
            loadPercentage={state.model.loadProgress}
        />
        {
            showMessage &&
            <div className="message">
                {
                    error != null &&
                    <div className="error">
                        {String(error)}
                    </div>
                }
                {
                    loading &&
                    <div className="loading">
                        Loading...
                    </div>
                }
                {
                    (!loading && error == null && state.chatSession.simplifiedChat.length === 0) &&
                    <div className="typeMessage">
                        Type a message to start the conversation
                    </div>
                }
            </div>
        }
        {
            !showMessage &&
            <ChatHistory
                simplifiedChat={state.chatSession.simplifiedChat}
                generatingResult={generatingResult}
            />
        }
        <InputRow
            disabled={!state.model.loaded || !state.contextSequence.loaded}
            stopGeneration={
                generatingResult
                    ? stopActivePrompt
                    : undefined
            }
            onPromptInput={onPromptInput}
            sendPrompt={sendPrompt}
            generatingResult={generatingResult}
            autocompleteInputDraft={state.chatSession.draftPrompt.prompt}
            autocompleteCompletion={state.chatSession.draftPrompt.completion}
        />
    </div>;
}
