import React, { useState } from 'react'
import { EditorProvider as TiptapProvider } from '@tiptap/react'
import type { Editor } from '@tiptap/core'
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
import { convertJsonToMd, convertJsonToDocx, renameFile } from '../services/fileSystemService'

export function EditorContent(): JSX.Element {
  const [content, setContent] = useState<any>(null);
  const [currentFilePath, setCurrentFilePath] = useState<string | undefined>();
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

  const handleSave = async () => {
    if (!editorRef.current || !currentFilePath) return;
    
    try {
      const markdown = await convertJsonToMd(editorRef.current.getJSON())
      const result = await window.fs.writeFile(currentFilePath, markdown)
      
      if (!result.success) {
        console.error('Failed to save file:', result.error)
        alert('Failed to save file. Please try again.')
      }
    } catch (error) {
      console.error('Error saving file:', error)
      alert('Error saving file. Please try again.')
    }
  }

  const { handleKeyDown } = useEditorShortcuts({
    editor: editorRef.current,
    prediction,
    setPrediction,
    setShowSidebar,
    onSave: handleSave
  })

  useEditorSpellcheck(editorRef.current)

  const onUpdate = async ({ editor }: { editor: Editor }): Promise<void> => {
    await handleEditorContentUpdate(editor)
    await updateValeResults(editor)
  }

  const handleFileSelect = (selectedContent: any, filePath?: string) => {
    setContent(selectedContent);
    setCurrentFilePath(filePath);
  };

  const handleFileNameChange = (newPath: string) => {
    setCurrentFilePath(newPath)
  }

  if (!content) {
    return <FileSelector onFileSelect={handleFileSelect} />;
  }

  return (
    <div className="editor-container">
      <div className="editor-main">
        <TiptapProvider
          slotBefore={<MenuBar 
            showRawOutput={showRawOutput} 
            setShowRawOutput={setShowRawOutput} 
            currentFilePath={currentFilePath}
            onSave={handleSave}
            onFileNameChange={handleFileNameChange}
          />}
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