import { Editor } from '@tiptap/core'
import { extractContexts } from './textProcessingService'
import { isCursorAtEnd, hasWordsBetween, hasWordsAfter } from './cursorService'
import { MutableRefObject } from 'react'
import { LlmService } from '../../../services/LlmService'

export const handleTabKey = (
  editor: Editor,
  prediction: string,
  setPrediction: (pred: string) => void
): boolean => {
  if (!prediction) return false

  const { state } = editor
  const { tr } = state
  const { selection } = tr
  
  tr.insertText(prediction, selection.from)
  editor.view.dispatch(tr)
  setPrediction("")
  ;(window as any).currentPrediction = ""
  
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
    
    if (response.error) {
      setError(response.error)
      clearPrediction(setPrediction)
      return
    }
    
    if (response.text) {
      setPrediction(response.text)
      ;(window as any).currentPrediction = response.text
      setError(null)
    }
  }, 500)
}

export const clearPrediction = (setPrediction: (pred: string) => void): void => {
  setPrediction('')
  ;(window as any).currentPrediction = ''
} 