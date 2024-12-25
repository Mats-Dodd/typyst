import React, { useEffect, useState } from 'react'
import { EditorProvider as TiptapProvider } from '@tiptap/react'
import { MenuBar } from './MenuBar'
import { ErrorOverlay } from './ErrorOverlay'
import { RawContentPreview } from './RawContentPreview'
import { extensions } from '../../extensions/extensions'
import { INITIAL_CONTENT } from '../../constants/constants'
import { useEditorEvents } from '../../hooks/useEditorEvents'
import { useEditor, EditorProvider } from '../../contexts/EditorContext'
import { LlmService } from '../../services/llmService'
import { extractContexts } from '../../utils/textProcessing'

import '../../styles/Editor.css'

function EditorContent() {
  const [rawContent, setRawContent] = useState('')
  const {
    prediction,
    setPrediction,
    error,
    setError,
    editorRef,
    timeoutRef
  } = useEditor()

  const clearPrediction = () => {
    setPrediction('')
    ;(window as any).currentPrediction = ''
  }

  const { handleKeyDown } = useEditorEvents(prediction, setPrediction, editorRef)

  useEffect(() => {
    window.addEventListener('clearPrediction', clearPrediction)
    return () => window.removeEventListener('clearPrediction', clearPrediction)
  }, [setPrediction])

  const isCursorAtEnd = (state: any): boolean => {
    const { from } = state.selection
    const docSize = state.doc.content.size
    // Check if cursor is at the end of the document
    // We subtract 2 from docSize because ProseMirror adds an extra position for the end
    return from >= docSize - 2
  }

  const hasWordsBetween = (state: any): boolean => {
    const { from } = state.selection
    const textContent = state.doc.textContent
    
    // Find the last sentence ending before the cursor
    let lastSentenceEnd = -1
    for (let i = from - 1; i >= 0; i--) {
      if ('.!?'.includes(textContent[i])) {
        lastSentenceEnd = i
        break
      }
    }
    
    // If no sentence ending found, consider the start of text
    if (lastSentenceEnd === -1) {
      lastSentenceEnd = 0
    } else {
      // Move past the punctuation mark
      lastSentenceEnd += 1
    }
    
    // Get the text between last sentence end and cursor
    const textBetween = textContent.slice(lastSentenceEnd, from).trim()
    
    return textBetween.length > 0
  }

  const hasWordsAfter = (state: any): boolean => {
    const { from } = state.selection
    const textContent = state.doc.textContent
    
    // Find the next sentence ending after the cursor
    let nextSentenceEnd = textContent.length
    for (let i = from; i < textContent.length; i++) {
      if ('.!?'.includes(textContent[i])) {
        nextSentenceEnd = i
        break
      }
    }
    
    const textAfter = textContent.slice(from, nextSentenceEnd).trim()
    
    return textAfter.length > 0
  }

  const handleUpdate = async ({ editor }: { editor: any }) => {
    editorRef.current = editor
    const state = editor.state
    const { from } = state.selection

    setRawContent(JSON.stringify(editor.getJSON(), null, 2))

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }    

    if (editor.state.tr.docChanged) {
      console.log('Document changed, clearing prediction')
      clearPrediction()
      return
    }

    if (isCursorAtEnd(state)) {
      if (!hasWordsBetween(state)) {
        
        console.log('Cursor at end, and now new sentence detected, not showing prediction')
        clearPrediction()
        return
      }
    }

    if (hasWordsAfter(state)) {
      console.log('Words after cursor detected, not showing prediction')
      clearPrediction()
      return
    }

    console.log('Proceeding with autocompletion...')

    const docSize = state.doc.content.size
    const startPos = Math.max(0, from - 1000)
    const endPos = Math.min(docSize, from + 1000)
    const contextText = state.doc.textBetween(startPos, endPos, '\n', ' ')
    const cursorPosition = from - startPos

    if (!contextText || contextText.length < 5) {
      clearPrediction()
      return
    }

    timeoutRef.current = setTimeout(async () => {
      const contexts = extractContexts(contextText, cursorPosition)
      const response = await LlmService.getAutocompletion(contexts)
      
      if (response.error) {
        setError(response.error)
        clearPrediction()
        return
      }
      
      if (response.text) {
        setPrediction(response.text)
        ;(window as any).currentPrediction = response.text
        setError(null)
      }
    }, 500)
  }

  return (
    <>
      <TiptapProvider
        slotBefore={<MenuBar />}
        extensions={extensions}
        content={INITIAL_CONTENT}
        onUpdate={handleUpdate}
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

export function Editor() {
  return (
    <EditorProvider>
      <div className="editor-wrapper">
        <EditorContent />
      </div>
    </EditorProvider>
  )
} 