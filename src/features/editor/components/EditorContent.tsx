import React, { useState } from 'react'
import { EditorProvider as TiptapProvider } from '@tiptap/react'
import type { Editor as TiptapEditor } from '@tiptap/core'
import { extensions } from '../../../extensions/extensions'
import { MenuBar } from './MenuBar'
import { ErrorOverlay } from './ErrorOverlay'
import { RawContentPreview } from './RawContentPreview'
import { ValeSidebar } from './ValeSidebar'
import { FileSelector } from './FileSelector'
import { useEditorCore } from '../hooks/useEditorCore'
import { useValeState } from '../hooks/useValeState'
import { useEditorShortcuts } from '../hooks/useEditorShortcuts'
import { useEditorSpellcheck } from '../hooks/useEditorSpellcheck'

export function EditorContent(): JSX.Element {
  const [content, setContent] = useState<any>(null);
  const {
    rawContent,
    prediction,
    error,
    showRawOutput,
    editorRef,
    setPrediction,
    setError,
    setShowRawOutput,
    handleEditorContentUpdate
  } = useEditorCore()

  const {
    valeAlerts,
    showSidebar,
    ignoredWarnings,
    ignoredErrors,
    setShowSidebar: _setShowSidebar,
    setIgnoredWarnings,
    setIgnoredErrors,
    updateValeResults
  } = useValeState(editorRef.current)

  const setShowSidebar = (show: boolean | ((prev: boolean) => boolean)) => {
    if (typeof show === 'function') {
      _setShowSidebar(show(showSidebar))
    } else {
      _setShowSidebar(show)
    }
  }

  const { handleKeyDown } = useEditorShortcuts({
    editor: editorRef.current,
    prediction,
    setPrediction,
    setShowSidebar
  })

  useEditorSpellcheck(editorRef.current)

  const onUpdate = async ({ editor }: { editor: TiptapEditor }): Promise<void> => {
    await handleEditorContentUpdate(editor)
    await updateValeResults(editor)
  }

  if (!content) {
    return <FileSelector onFileSelect={setContent} />;
  }

  return (
    <div className="editor-container">
      <div className="editor-main">
        <TiptapProvider
          slotBefore={<MenuBar showRawOutput={showRawOutput} setShowRawOutput={setShowRawOutput} />}
          extensions={extensions}
          content={content}
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
            onClose={setShowSidebar} 
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