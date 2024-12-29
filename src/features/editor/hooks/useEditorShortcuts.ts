import { useEffect } from 'react'
import { Editor } from '@tiptap/core'
import { EditorView } from 'prosemirror-view'
import { handleSidebarShortcut } from '../services/eventHandlers'

export interface EditorShortcutsConfig {
  editor: Editor | null
  prediction: string
  setPrediction: (prediction: string) => void
  setShowSidebar: (show: boolean | ((prev: boolean) => boolean)) => void
  onSave?: () => void
}

export function useEditorShortcuts({
  editor,
  prediction,
  setPrediction,
  setShowSidebar,
  onSave
}: EditorShortcutsConfig) {
  useEffect(() => {
    const keydownHandler = (e: KeyboardEvent) => {
      handleKeyDown(e);
      handleSidebarShortcut(e, setShowSidebar);
    }
    window.addEventListener('keydown', keydownHandler)
    return () => window.removeEventListener('keydown', keydownHandler)
  }, [setShowSidebar, onSave, editor, prediction, setPrediction])

  const handleKeyDown = (event: KeyboardEvent): boolean => {
    // Handle save shortcut (Cmd+S / Ctrl+S)
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
      console.log('Save shortcut triggered');
      event.preventDefault();
      if (onSave) {
        console.log('Calling onSave handler');
        onSave();
        return true;
      }
      console.log('No onSave handler available');
      return false;
    }

    // Handle sidebar toggle (Cmd+Shift+J / Ctrl+Shift+J)
    if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'j') {
      event.preventDefault();
      setShowSidebar(prev => !prev);
      return true;
    }

    // Handle tab key for predictions
    if (event.key === 'Tab') {
      event.preventDefault();
      if (prediction) {
        editor?.commands.insertContent(prediction);
        setPrediction('');
        return true;
      }
      editor?.commands.insertContent('\t');
      return true;
    }

    return false;
  };

  return { handleKeyDown }
} 