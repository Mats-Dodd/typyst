import { Editor } from '@tiptap/core'
import React, { createContext, useContext, useState, useRef, ReactNode } from 'react'
import { EditorState } from '../types'

const EditorContext = createContext<EditorState | undefined>(undefined)
EditorContext.displayName = 'EditorContext'

export function useEditorState(): EditorState {
  const context = useContext(EditorContext)
  if (context === undefined) {
    throw new Error('useEditorState must be used within an EditorProvider')
  }
  return context
}

interface EditorProviderProps {
  children: ReactNode
}

export function EditorProvider({ children }: EditorProviderProps) {
  const [prediction, setPrediction] = useState('')
  const [error, setError] = useState<string | null>(null)
  const editorRef = useRef<Editor | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  return React.createElement(EditorContext.Provider, {
    value: {
      prediction,
      setPrediction,
      error,
      setError,
      editorRef,
      timeoutRef
    },
    children
  })
} 