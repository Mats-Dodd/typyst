import { useState, useRef, useEffect } from 'react'
import { Editor } from '@tiptap/core'
import { handleEditorUpdate, clearPrediction } from '../services/eventHandlers'

export interface EditorCoreState {
  rawContent: string
  isFirstRender: boolean
  prediction: string
  error: string | null
  editorRef: React.MutableRefObject<Editor | null>
  timeoutRef: React.MutableRefObject<NodeJS.Timeout | null>
  setPrediction: (prediction: string) => void
  setError: (error: string | null) => void
  handleEditorContentUpdate: (editor: Editor) => Promise<void>
}

export function useEditorCore(currentFilePath?: string): EditorCoreState {
  const [rawContent, setRawContent] = useState('')
  const [isFirstRender, setIsFirstRender] = useState(true)
  const [prediction, setPrediction] = useState('')
  const [error, setError] = useState<string | null>(null)
  const editorRef = useRef<Editor | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    window.addEventListener('clearPrediction', () => clearPrediction(setPrediction))
    return () => window.removeEventListener('clearPrediction', () => clearPrediction(setPrediction))
  }, [])

  const handleEditorContentUpdate = async (editor: Editor): Promise<void> => {
    editorRef.current = editor
    const html = editor.getHTML()
    
    if (isFirstRender) {
      setIsFirstRender(false)
    }
    
    setRawContent(JSON.stringify(editor.getJSON(), null, 2))
    await handleEditorUpdate(editor, setPrediction, setError, timeoutRef, currentFilePath)
  }

  return {
    rawContent,
    isFirstRender,
    prediction,
    error,
    editorRef,
    timeoutRef,
    setPrediction,
    setError,
    handleEditorContentUpdate
  }
} 