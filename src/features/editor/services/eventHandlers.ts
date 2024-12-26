import { Editor } from '@tiptap/core'
import { extractContexts } from './editorTextProcessingService'
import { isCursorAtEnd, hasWordsBetween, hasWordsAfter } from './cursorService'
import { MutableRefObject } from 'react'
import { LlmService } from '../../../services/LlmService'
import { cleanCompletion, cleanSpaces, cutToFirstSentence, handleSentenceCapitalization } from './predictionService'

export const handleSidebarShortcut = (
  e: KeyboardEvent,
  setShowSidebar: (show: boolean | ((prev: boolean) => boolean)) => void
): void => {
  // Check for Cmd+Shift+J (Mac) or Ctrl+Shift+J (Windows/Linux)
  if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'j') {
    e.preventDefault()
    setShowSidebar(prev => !prev)
  }
}

export const handleTabKey = (
  editor: Editor,
  prediction: string,
  setPrediction: (pred: string) => void
): boolean => {
  const { state } = editor
  const { tr } = state
  const { selection } = tr

  if (prediction) {
    tr.insertText(prediction, selection.from)
    editor.view.dispatch(tr)
    setPrediction("")
    ;(window as any).currentPrediction = ""
    return true
  }

  tr.insertText('\t', selection.from)
  editor.view.dispatch(tr)
  return true
}

export const handleEditorUpdate = async (
  editor: Editor,
  setPrediction: (prediction: string) => void,
  setError: (error: string | null) => void,
  timeoutRef: MutableRefObject<NodeJS.Timeout | null>
): Promise<void> => {
  const state = editor.state
  const { from } = state.selection

  if (timeoutRef.current) {
    clearTimeout(timeoutRef.current)
  }    

  if (editor.state.tr.docChanged) {
    clearPrediction(setPrediction)
    return
  }

  if (isCursorAtEnd(state)) {
    if (!hasWordsBetween(state)) {
      clearPrediction(setPrediction)
      return
    }
  }

  if (hasWordsAfter(state)) {
    clearPrediction(setPrediction)
    return
  }
  
  const docSize = state.doc.content.size
  const startPos = Math.max(0, from - 1000)
  const endPos = Math.min(docSize, from + 1000)
  const contextText = state.doc.textBetween(startPos, endPos, '\n', ' ')
  const cursorPosition = from - startPos

  if (!contextText || contextText.length < 5) {
    clearPrediction(setPrediction)
    return
  }

  timeoutRef.current = setTimeout(async () => {
    const contexts = extractContexts(contextText, cursorPosition)
    const response = await LlmService.getAutocompletion(contexts)

    
    if (!response.text) {
      clearPrediction(setPrediction)
      return
    }
    // console.log("response", response)

    const cleanedResponse = cleanCompletion(contextText, response.text)
    // console.log("cleanedResponse", cleanedResponse)

    const firstSentence = cutToFirstSentence(cleanedResponse)
    // console.log("firstSentence", firstSentence)

    const capitalizedResponse = handleSentenceCapitalization(contextText, firstSentence)
    // console.log("capitalizedResponse", capitalizedResponse)

    const cleanedResponseWithSpaces = cleanSpaces(cleanedResponse, capitalizedResponse)
    // console.log("cleanedResponseWithSpaces", cleanedResponseWithSpaces)

    if (response.error) {
      setError(response.error)
      clearPrediction(setPrediction)
      return
    }
    
    if (response.text) {
      setPrediction(capitalizedResponse)
      ;(window as any).currentPrediction = capitalizedResponse
      setError(null)
    }
  }, 500)
}

export const clearPrediction = (setPrediction: (pred: string) => void): void => {
  setPrediction('')
  ;(window as any).currentPrediction = ''
} 