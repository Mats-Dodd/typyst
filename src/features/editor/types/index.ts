import { Editor } from '@tiptap/core'
import { MutableRefObject } from 'react'

export interface EditorContext {
  textBeforeCursor: string
}

export interface EditorState {
  prediction: string
  setPrediction: (prediction: string) => void
  error: string | null
  setError: (error: string | null) => void
  editorRef: MutableRefObject<Editor | null>
  timeoutRef: MutableRefObject<NodeJS.Timeout | null>
  showRawOutput: boolean
  setShowRawOutput: (show: boolean) => void
}

export interface AutocompleteResponse {
  text?: string
  error?: string
} 