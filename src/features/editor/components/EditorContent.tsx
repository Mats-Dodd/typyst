import React, { useState, useEffect, useCallback } from 'react'
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
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
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

  const handleAutoSave = async () => {
    if (!editorRef.current || !currentFilePath || isAutoSaving) return;

    try {
      setIsAutoSaving(true);
      
      // Save to version control
      await window.versionControl.saveDocument(editorRef.current.getJSON());
      
      setLastSaveTime(new Date());
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setIsAutoSaving(false);
    }
  };

  useEffect(() => {
    if (!currentFilePath || !editorRef.current) return;

    // Add blur handler to the editor
    const editor = editorRef.current;
    const handleBlur = () => {
      handleAutoSave();
    };

    editor.on('blur', handleBlur);

    return () => {
      editor.off('blur', handleBlur);
    };
  }, [currentFilePath, editorRef.current]);

  const handleSave = async () => {
    if (!editorRef.current || !currentFilePath) return;
    
    try {
      // Save to version control first
      await window.versionControl.saveDocument(editorRef.current.getJSON());
      
      // Then save to the original file
      const markdown = await convertJsonToMd(editorRef.current.getJSON());
      const result = await window.fs.writeFile(currentFilePath, markdown);
      
      if (!result.success) {
        console.error('Failed to save file:', result.error);
        alert('Failed to save file. Please try again.');
        return;
      }

      setLastSaveTime(new Date());
    } catch (error) {
      console.error('Error saving file:', error);
      alert('Error saving file. Please try again.');
    }
  };

  // Debounced content update handler
  const debouncedUpdate = useCallback(
    async (editor: Editor) => {
      await handleEditorContentUpdate(editor);
      await updateValeResults(editor);
      
      // Update last save time to track changes
      setLastSaveTime(new Date());
    },
    [handleEditorContentUpdate, updateValeResults]
  );

  const onUpdate = async ({ editor }: { editor: Editor }): Promise<void> => {
    await debouncedUpdate(editor);
  };

  const { handleKeyDown } = useEditorShortcuts({
    editor: editorRef.current,
    prediction,
    setPrediction,
    setShowSidebar,
    onSave: handleSave
  });

  useEditorSpellcheck(editorRef.current);

  const handleFileSelect = async (selectedContent: any, filePath?: string) => {
    if (!filePath) {
      setContent(selectedContent);
      return;
    }

    try {
      // Initialize the document first
      await window.versionControl.initializeDocument(filePath);
      
      // Explicitly load content from main branch
      const mainContent = await window.versionControl.loadDocument('main');
      
      // Set the content and file path
      setContent(mainContent);
      setCurrentFilePath(filePath);
    } catch (error) {
      console.error('Error loading document:', error);
      alert('Error loading document. Please try again.');
    }
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
            handleKeyDown,
            handleDOMEvents: {
              blur: () => {
                handleAutoSave();
                return true;
              }
            }
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