import React, { createContext, useContext, useState, useRef } from 'react'

interface EditorContextType {
  prediction: string;
  setPrediction: (prediction: string) => void;
  error: string | null;
  setError: (error: string | null) => void;
  editorRef: React.MutableRefObject<any>;
  timeoutRef: React.MutableRefObject<NodeJS.Timeout | null>;
}

const EditorContext = createContext<EditorContextType | undefined>(undefined)

export function EditorProvider({ children }: { children: React.ReactNode }) {
  const [prediction, setPrediction] = useState('')
  const [error, setError] = useState<string | null>(null)
  const editorRef = useRef<any>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  return (
    <EditorContext.Provider
      value={{
        prediction,
        setPrediction,
        error,
        setError,
        editorRef,
        timeoutRef
      }}
    >
      {children}
    </EditorContext.Provider>
  )
}

export function useEditor() {
  const context = useContext(EditorContext)
  if (context === undefined) {
    throw new Error('useEditor must be used within an EditorProvider')
  }
  return context
} 