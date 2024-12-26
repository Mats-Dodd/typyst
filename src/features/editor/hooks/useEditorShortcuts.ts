import { useEffect } from 'react'
import { Editor } from '@tiptap/core'
import { EditorView } from 'prosemirror-view'
import { handleTabKey, handleSidebarShortcut } from '../services/eventHandlers'

export interface EditorShortcutsConfig {
  editor: Editor | null
  prediction: string
  setPrediction: (prediction: string) => void
  setShowSidebar: (show: boolean | ((prev: boolean) => boolean)) => void
}

export function useEditorShortcuts({
  editor,
  prediction,
  setPrediction,
  setShowSidebar
}: EditorShortcutsConfig) {
  useEffect(() => {
    const keydownHandler = (e: KeyboardEvent) => handleSidebarShortcut(e, setShowSidebar)
    window.addEventListener('keydown', keydownHandler)
    return () => window.removeEventListener('keydown', keydownHandler)
  }, [setShowSidebar])

  const handleKeyDown = (view: EditorView, event: KeyboardEvent): boolean => {
    if (event.key === "Tab") {
      event.preventDefault()
      if (prediction && editor) {
        return handleTabKey(editor, prediction, setPrediction)
      }
      return false
    }
    return false
  }

  return { handleKeyDown }
} 