import React, { useState } from 'react'
import { EditorProvider as TiptapProvider } from '@tiptap/react'
import type { Editor as TiptapEditor } from '@tiptap/core'
import { extensions } from '../../../extensions/extensions'
import { ThemeProvider } from '../../theme/themeContext'
import { MenuBar } from './MenuBar'
import { ErrorOverlay } from './ErrorOverlay'
import { RawContentPreview } from './RawContentPreview'
import { ValeSidebar } from './ValeSidebar'
import { useEditorCore } from '../hooks/useEditorCore'
import { useValeState } from '../hooks/useValeState'
import { useEditorShortcuts } from '../hooks/useEditorShortcuts'
import { useEditorSpellcheck } from '../hooks/useEditorSpellcheck'
import { convertMdToJson } from '../services/fileSystemService'

import '../../../styles/Editor.css'
import '../../../styles/CodeBlock.css'

interface FileSelectorProps {
  onFileSelect: (content: any) => void;
}

function FileSelector({ onFileSelect }: FileSelectorProps): JSX.Element {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (!file.name.endsWith('.md')) {
      alert('Please select a Markdown (.md) file');
      return;
    }

    try {
      const text = await file.text();
      const jsonContent = convertMdToJson(text);
      const parsedContent = JSON.parse(jsonContent);
      onFileSelect(parsedContent);
    } catch (error) {
      console.error('Error processing file:', error);
      alert('Error processing the markdown file. Please try again.');
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="file-selector">
      <p>Select a file to begin editing</p>
      <div className="file-input-wrapper">
        <button onClick={handleClick} className="file-input-button">
          Choose File
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".md"
          onChange={handleFileChange}
          className="file-input-hidden"
        />
      </div>
    </div>
  );
}

function EditorContent(): JSX.Element {
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

export function Editor(): JSX.Element {
  return (
    <ThemeProvider>
      <div className="editor-wrapper">
        <EditorContent />
      </div>
    </ThemeProvider>
  )
} 