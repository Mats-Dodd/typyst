import React, { useEffect, useState } from 'react'
import { EditorProvider } from '@tiptap/react'
import { MenuBar } from './MenuBar'
import { ErrorOverlay } from './ErrorOverlay'
import { extensions } from '../../extensions/extensions'
import { INITIAL_CONTENT } from '../../constants/constants'
import { useEditorState } from '../../hooks/useEditorState'
import { useEditorEvents } from '../../hooks/useEditorEvents'
import { electronLlmRpc } from '../../../rpc/llmRpc'
import { extractContexts } from '../../utils/textProcessing'

import '../../styles/Editor.css'

export function Editor() {
  const [rawContent, setRawContent] = useState('')
  const {
    prediction,
    setPrediction,
    error,
    setError,
    editorRef,
    timeoutRef
  } = useEditorState()

  const { handleKeyDown } = useEditorEvents(prediction, setPrediction, editorRef)

  useEffect(() => {
    const clearPrediction = () => {
      setPrediction('')
      ;(window as any).currentPrediction = ''
    }

    window.addEventListener('clearPrediction', clearPrediction)
    return () => window.removeEventListener('clearPrediction', clearPrediction)
  }, [setPrediction])

  const handleUpdate = ({ editor }: { editor: any }) => {
    editorRef.current = editor
    const state = editor.state
    const { from } = state.selection

    // Update raw content
    setRawContent(JSON.stringify(editor.getJSON(), null, 2))

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    if (editor.state.tr.docChanged) {
      setPrediction('')
      ;(window as any).currentPrediction = ''
      return
    }

    const docSize = state.doc.content.size
    const startPos = Math.max(0, from - 1000)
    const endPos = Math.min(docSize, from + 1000)
    const contextText = state.doc.textBetween(startPos, endPos, '\n', ' ')
    const cursorPosition = from - startPos

    if (!contextText || contextText.length < 5) {
      setPrediction('')
      ;(window as any).currentPrediction = ''
      return
    }

    timeoutRef.current = setTimeout(async () => {
      const { previousContext, currentSentence, followingContext } = extractContexts(contextText, cursorPosition)
      // console.log("Previous Context:", previousContext)
      // console.log("Current Sentence:", currentSentence)
      // console.log("Following Context:", followingContext)
  
      try {
        const response = await electronLlmRpc.autocomplete({ previousContext, currentSentence, followingContext })
        
        if (response.error) {
          setError(response.error);
          setPrediction('');
          (window as any).currentPrediction = '';
          return;
        }
        
        if (response.text) {
          setPrediction(response.text);
          (window as any).currentPrediction = response.text;
          setError(null);
        }
      } catch (err) {
        console.error("Autocomplete error:", err);
        setError("Failed to communicate with autocomplete service");
        setPrediction('');
        (window as any).currentPrediction = '';
      }
    }, 500)
  }

  return (
    <div className="editor-wrapper">
      <EditorProvider
        slotBefore={<MenuBar />}
        extensions={extensions}
        content={INITIAL_CONTENT}
        onUpdate={handleUpdate}
        editorProps={{
          handleKeyDown
        }}
      >
        <ErrorOverlay error={error} />
      </EditorProvider>
      <div className="raw-content">
        <h3>Raw Content</h3>
        <pre>{rawContent}</pre>
      </div>
    </div>
  )
} 