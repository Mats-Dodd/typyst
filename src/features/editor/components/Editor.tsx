import React, { useState, useEffect } from 'react'
import { EditorProvider as TiptapProvider } from '@tiptap/react'
import type { Editor as TiptapEditor } from '@tiptap/core'
import { extensions } from '../../../extensions/extensions'
import { INITIAL_CONTENT } from '../constants/constants'
import { useEditorState, EditorProvider } from '../state/editorState'
import { handleEditorUpdate, handleTabKey, clearPrediction } from '../services/eventHandlers'
import { MenuBar } from '../components/MenuBar'
import { ErrorOverlay } from '../components/ErrorOverlay'
import { RawContentPreview } from '../components/RawContentPreview'
import { EditorView } from 'prosemirror-view'

import '../../../styles/Editor.css'

function EditorContent(): JSX.Element {
  const [rawContent, setRawContent] = useState('')
  const {
    prediction,
    setPrediction,
    error,
    setError,
    editorRef,
    timeoutRef
  } = useEditorState()

  useEffect(() => {
    window.addEventListener('clearPrediction', () => clearPrediction(setPrediction))
    return () => window.removeEventListener('clearPrediction', () => clearPrediction(setPrediction))
  }, [setPrediction])

  const handleKeyDown = (view: EditorView, event: KeyboardEvent): boolean => {
    if (event.key === "Tab" && prediction && editorRef.current) {
      event.preventDefault()
      return handleTabKey(editorRef.current, prediction, setPrediction)
    }
    return false
  }

  const onUpdate = async ({ editor }: { editor: TiptapEditor }): Promise<void> => {
    editorRef.current = editor
    setRawContent(JSON.stringify(editor.getJSON(), null, 2))
    await handleEditorUpdate(editor, setPrediction, setError, timeoutRef)
  }

  return (
    <>
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
      <RawContentPreview content={rawContent} />
    </>
  )
}

export function Editor(): JSX.Element {
  return (
    <EditorProvider>
      <div className="editor-wrapper">
        <EditorContent />
      </div>
    </EditorProvider>
  )
} 