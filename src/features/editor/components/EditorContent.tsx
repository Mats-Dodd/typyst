import React, { useState, useRef, useEffect } from 'react'
import { EditorProvider as TiptapProvider } from '@tiptap/react'
import type { Editor } from '@tiptap/core'
import { extensions } from '../../../extensions/extensions'
import { MenuBar } from './MenuBar'
import { ErrorOverlay } from './ErrorOverlay'
import { ValeSidebar } from './ValeSidebar'
import { FileSelector } from './FileSelector'
import { TableMenu } from './TableMenu'
import { useEditorCore } from '../hooks/useEditorCore'
import { useValeState } from '../hooks/useValeState'
import { useEditorShortcuts } from '../hooks/useEditorShortcuts'
import { useEditorSpellcheck } from '../hooks/useEditorSpellcheck'
import { useBranchOperations } from '../../versioning/hooks/useBranchOperations'
import { convertJsonToMd, convertJsonToDocx, renameFile } from '../services/fileSystemService'
import { versionControlService } from '../../versioning/services/versionControlService'

export function EditorContent(): JSX.Element {
  const [content, setContent] = useState<any>(null);
  const [currentFilePath, setCurrentFilePath] = useState<string | undefined>();
  const [tableMenuPosition, setTableMenuPosition] = useState<{ x: number; y: number } | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const {
    prediction,
    error,
    editorRef,
    setPrediction,
    setError,
    handleEditorContentUpdate
  } = useEditorCore(currentFilePath)

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
    handleBranchDelete,
    handleBranchRename,
    getDocumentId
  } = useBranchOperations(editorRef.current, currentFilePath)

  useEffect(() => {
    if (!editorRef.current) return;

    const updateTableMenu = () => {
      const editor = editorRef.current;
      if (!editor) return;

      // Check if we're in a table or have a CellSelection
      const isTableActive = editor.isActive('table');
      const isCellSelection = editor.view.state.selection.type === 'cell';
      
      if (isTableActive || isCellSelection) {
        const { view } = editor;
        const { selection } = view.state;
        const dom = view.domAtPos(selection.from);
        const table = dom.node?.parentElement?.closest('table');
        
        if (table) {
          const rect = table.getBoundingClientRect();
          const menuHeight = 150; // Approximate height of our menu with all groups
          const gap = 10; // Gap between menu and table
          setTableMenuPosition({
            x: rect.left + (rect.width / 2) - 100, // Center the menu above table
            y: Math.max(rect.top - menuHeight - gap, 80), // Ensure it's below the top menubar
          });
        }
      } else {
        setTableMenuPosition(null);
      }
    };

    const editor = editorRef.current;
    editor.on('selectionUpdate', updateTableMenu);
    editor.on('focus', updateTableMenu);

    return () => {
      editor.off('selectionUpdate', updateTableMenu);
      editor.off('focus', updateTableMenu);
    };
  }, [editorRef.current]);

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

    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set a new timeout for saving
    saveTimeoutRef.current = setTimeout(async () => {
      const documentId = getDocumentId();
      if (!documentId) {
        console.log('EditorContent: No document ID available, skipping version control save');
        return;
      }

      try {
        console.log('EditorContent: Saving to version control');
        const content = editor.getJSON();
        await versionControlService.saveContent(documentId, content);
        console.log('EditorContent: Saved to version control successfully');
      } catch (err) {
        console.error('EditorContent: Failed to save to version control:', err);
        setError('Failed to save changes');
      }
    }, 100);
  }

  const handleFileSelect = (selectedContent: any, filePath?: string) => {
    console.log('EditorContent: File selected', { filePath });
    console.log('EditorContent: Selected content:', selectedContent);
    setContent(selectedContent);
    setCurrentFilePath(filePath);
    console.log('EditorContent: State updated with new file');
  }

  const handleFileNameChange = async (newPath: string) => {
    console.log('EditorContent: Renaming file', { from: currentFilePath, to: newPath });
    if (!currentFilePath) {
      console.log('EditorContent: Missing current file path, skipping rename');
      return;
    }

    try {
      // Get the document ID before renaming
      const documentId = getDocumentId();
      if (!documentId) {
        console.error('EditorContent: No document ID found for file');
        setError('Failed to rename file: No version control document found');
        return;
      }

      // First rename the file in the filesystem
      await renameFile(currentFilePath, newPath, content);
      console.log('EditorContent: File renamed successfully in filesystem');

      // Then update the document path in version control
      await versionControlService.updateDocument(documentId, { path: newPath });
      console.log('EditorContent: Document path updated in version control');

      // Update local state
      setCurrentFilePath(newPath);
      setError(null);
    } catch (err) {
      console.error('EditorContent: Error renaming file:', err);
      setError('Failed to rename file');
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
            onClose={showSidebar ? setShowSidebar : undefined}
            ignoredWarnings={ignoredWarnings}
            setIgnoredWarnings={setIgnoredWarnings}
            ignoredErrors={ignoredErrors}
            setIgnoredErrors={setIgnoredErrors}
          />
          {editorRef.current && tableMenuPosition && (
            <div style={{ 
              position: 'fixed',
              left: `${tableMenuPosition.x}px`,
              top: `${tableMenuPosition.y}px`,
            }}>
              <TableMenu editor={editorRef.current} />
            </div>
          )}
        </TiptapProvider>
      )}
    </div>
  )
} 