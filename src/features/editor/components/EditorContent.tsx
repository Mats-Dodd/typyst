import React, { useState } from 'react'
import { EditorProvider as TiptapProvider } from '@tiptap/react'
import type { Editor } from '@tiptap/core'
import { extensions } from '../../../extensions/extensions'
import { MenuBar } from './MenuBar'
import { ErrorOverlay } from './ErrorOverlay'
import { ValeSidebar } from './ValeSidebar'
import { FileSelector } from './FileSelector'
import { useEditorCore } from '../hooks/useEditorCore'
import { useValeState } from '../hooks/useValeState'
import { useEditorShortcuts } from '../hooks/useEditorShortcuts'
import { useEditorSpellcheck } from '../hooks/useEditorSpellcheck'
import { useBranchOperations } from '../../versioning/hooks/useBranchOperations'
import { convertJsonToMd, convertJsonToDocx, renameFile } from '../services/fileSystemService'

export function EditorContent(): JSX.Element {
  const [content, setContent] = useState<any>(null);
  const [currentFilePath, setCurrentFilePath] = useState<string | undefined>();
  const {
    prediction,
    error,
    editorRef,
    setPrediction,
    setError,
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

  const {
    currentBranch,
    branches,
    showBranchSelector,
    setShowBranchSelector,
    handleBranchSwitch,
    handleCreateBranch,
    handleBranchDelete
  } = useBranchOperations(editorRef.current, currentFilePath)

  const setShowSidebar = (show: boolean | ((prev: boolean) => boolean)) => {
    if (typeof show === 'function') {
      _setShowSidebar(show(showSidebar))
    } else {
      _setShowSidebar(show)
    }
  }

  const handleSave = async () => {
    console.log('EditorContent: Saving file', { currentFilePath });
    if (!editorRef.current || !currentFilePath) {
      console.log('EditorContent: Missing editor or file path, skipping save');
      return;
    }
    
    try {
      console.log('EditorContent: Converting content to markdown');
      const markdown = await convertJsonToMd(editorRef.current.getJSON());
      console.log('EditorContent: Writing file');
      await window.fs.writeFile(currentFilePath, markdown);
      console.log('EditorContent: File saved successfully');
      setError(null);
    } catch (err) {
      console.error('EditorContent: Failed to save file:', err);
      setError('Failed to save file');
    }
  }

  const onUpdate = async ({ editor }: { editor: Editor }): Promise<void> => {
    console.log('EditorContent: Content updated');
    handleEditorContentUpdate(editor);
    await updateValeResults(editor);
  }

  const handleFileSelect = (selectedContent: any, filePath?: string) => {
    console.log('EditorContent: File selected', { filePath });
    console.log('EditorContent: Selected content:', selectedContent);
    setContent(selectedContent);
    setCurrentFilePath(filePath);
    console.log('EditorContent: State updated with new file');
  }

  const handleFileNameChange = (newPath: string) => {
    console.log('EditorContent: Renaming file', { from: currentFilePath, to: newPath });
    if (!currentFilePath || !editorRef.current) {
      console.log('EditorContent: Missing current file path or editor, skipping rename');
      return;
    }

    const content = editorRef.current.getJSON();
    renameFile(currentFilePath, newPath, content)
      .then(() => {
        console.log('EditorContent: File renamed successfully');
        setCurrentFilePath(newPath);
      })
      .catch(err => {
        console.error('EditorContent: Failed to rename file:', err);
        setError('Failed to rename file');
      });
  }

  const { handleKeyDown } = useEditorShortcuts({
    editor: editorRef.current,
    prediction,
    setPrediction,
    setShowSidebar,
    onSave: handleSave
  })

  useEditorSpellcheck(editorRef.current)

  return (
    <div className="editor-content">
      {!content ? (
        <FileSelector onFileSelect={handleFileSelect} />
      ) : (
        <TiptapProvider
          slotBefore={
            <MenuBar
              currentFilePath={currentFilePath}
              onFileNameChange={handleFileNameChange}
              onSave={handleSave}
              showSidebar={showSidebar}
              setShowSidebar={setShowSidebar}
              currentBranch={currentBranch}
              branches={branches}
              showBranchSelector={showBranchSelector}
              setShowBranchSelector={setShowBranchSelector}
              onBranchSwitch={handleBranchSwitch}
              onBranchCreate={handleCreateBranch}
              onBranchDelete={handleBranchDelete}
            />
          }
          extensions={extensions}
          content={content}
          onUpdate={onUpdate}
          editorProps={{
            handleKeyDown,
            attributes: {
              class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none'
            }
          }}
        >
          <ErrorOverlay error={error} />
          <ValeSidebar
            alerts={valeAlerts}
            onClose={setShowSidebar}
            ignoredWarnings={ignoredWarnings}
            setIgnoredWarnings={setIgnoredWarnings}
            ignoredErrors={ignoredErrors}
            setIgnoredErrors={setIgnoredErrors}
          />
        </TiptapProvider>
      )}
    </div>
  )
} 