import React, { useState, useEffect } from 'react'
import { EditorProvider as TiptapProvider } from '@tiptap/react'
import type { Editor as TiptapEditor } from '@tiptap/core'
import { extensions } from '../../../extensions/extensions'
import { INITIAL_CONTENT } from '../constants/constants'
import { useEditorState, EditorProvider } from '../state/editorState'
import { handleEditorUpdate, handleTabKey, clearPrediction, handleSidebarShortcut } from '../services/eventHandlers'
import { MenuBar } from '../components/MenuBar'
import { ErrorOverlay } from '../components/ErrorOverlay'
import { RawContentPreview } from '../components/RawContentPreview'
import { EditorView } from 'prosemirror-view'
import { ThemeProvider } from '../../theme/themeContext'
import { ValeSidebar } from './ValeSidebar'
import { loadValeResults, getHighlightedText } from '../services/valeService'
import { ProcessedValeAlert } from '../types/vale'

import '../../../styles/Editor.css'
import '../../../styles/CodeBlock.css'

declare global {
  interface Window {
    fs: {
      writeFile(path: string, content: string): Promise<{ success: boolean; error?: string }>;
      readFile(path: string): Promise<{ content: string; error?: string }>;
    }
  }
}

function EditorContent(): JSX.Element {
  const [rawContent, setRawContent] = useState('')
  const [isFirstRender, setIsFirstRender] = useState(true)
  const [valeAlerts, setValeAlerts] = useState<ProcessedValeAlert[]>([])
  const [showSidebar, setShowSidebar] = useState(true)
  const [ignoredWarnings, setIgnoredWarnings] = useState(false)
  const [ignoredErrors, setIgnoredErrors] = useState(false)
  const {
    prediction,
    setPrediction,
    error,
    setError,
    editorRef,
    timeoutRef,
    showRawOutput
  } = useEditorState()

  useEffect(() => {
    window.addEventListener('clearPrediction', () => clearPrediction(setPrediction))
    return () => window.removeEventListener('clearPrediction', () => clearPrediction(setPrediction))
  }, [setPrediction])

  useEffect(() => {
    const keydownHandler = (e: KeyboardEvent) => handleSidebarShortcut(e, setShowSidebar)
    window.addEventListener('keydown', keydownHandler)
    return () => window.removeEventListener('keydown', keydownHandler)
  }, [])

  useEffect(() => {
    // Disable spellcheck when editor is available
    if (editorRef.current) {
      editorRef.current.view.dom.setAttribute("spellcheck", "false")
      editorRef.current.view.dom.setAttribute("autocomplete", "off")
      editorRef.current.view.dom.setAttribute("autocapitalize", "off")
    }
  }, [editorRef.current])

  // Add effect to update decorations when ignore states change
  useEffect(() => {
    if (editorRef.current && valeAlerts.length > 0) {
      const highlightedText = getHighlightedText(valeAlerts, ignoredWarnings, ignoredErrors)
      ;(window as any).currentValeHighlights = highlightedText
      editorRef.current.view.dispatch(editorRef.current.state.tr)  // Force a re-render to update decorations
    }
  }, [ignoredWarnings, ignoredErrors, valeAlerts])

  const handleKeyDown = (view: EditorView, event: KeyboardEvent): boolean => {
    if (event.key === "Tab") {
      event.preventDefault()
      if (prediction && editorRef.current) {
        return handleTabKey(editorRef.current, prediction, setPrediction)
      }
      return false
    }
    return false
  }

  const onUpdate = async ({ editor }: { editor: TiptapEditor }): Promise<void> => {
    editorRef.current = editor
    const html = editor.getHTML()
    
    if (isFirstRender) {
      const result = await window.fs.writeFile('.tmp/editor/initial-html.html', html)
      if (!result.success) {
        console.error('Failed to save initial HTML:', result.error)
      }
      setIsFirstRender(false)
    }
    
    setRawContent(JSON.stringify(editor.getJSON(), null, 2))
    await handleEditorUpdate(editor, setPrediction, setError, timeoutRef)
    
    if (editorRef.current) {
      const alerts = await loadValeResults(editorRef.current)
      setValeAlerts(alerts)
      const highlightedText = getHighlightedText(alerts, ignoredWarnings, ignoredErrors)
      ;(window as any).currentValeHighlights = highlightedText
      editor.view.dispatch(editor.state.tr)  // Force a re-render to update decorations
    }
  }

  return (
    <div className="editor-container">
      <div className="editor-main">
        <TiptapProvider
          slotBefore={<MenuBar />}
          extensions={extensions}
          content={INITIAL_CONTENT}
          onUpdate={onUpdate}
          editorProps={{
            handleKeyDown
          }}
        >
          <ErrorOverlay error={error} />
        </TiptapProvider>
        {showRawOutput && <RawContentPreview content={rawContent} />}
      </div>
      {showSidebar && (
        <div className="editor-sidebar">
          <ValeSidebar 
            alerts={valeAlerts} 
            onClose={() => setShowSidebar(false)} 
            ignoredWarnings={ignoredWarnings}
            setIgnoredWarnings={setIgnoredWarnings}
            ignoredErrors={ignoredErrors}
            setIgnoredErrors={setIgnoredErrors}
          />
        </div>
      )}
    </div>
  )
}

export function Editor(): JSX.Element {
  return (
    <ThemeProvider>
      <EditorProvider>
        <div className="editor-wrapper">
          <EditorContent />
        </div>
      </EditorProvider>
    </ThemeProvider>
  )
} 