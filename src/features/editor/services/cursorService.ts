import { EditorState } from 'prosemirror-state'

export const isCursorAtEnd = (state: EditorState): boolean => {
  const { from } = state.selection
  const docSize = state.doc.content.size
  return from >= docSize - 2
}

export const hasWordsBetween = (state: EditorState): boolean => {
  const { from } = state.selection
  const textContent = state.doc.textContent || ''
  
  let lastSentenceEnd = -1
  for (let i = from - 1; i >= 0; i--) {
    const char = textContent[i]
    if (char && '.!?'.includes(char)) {
      lastSentenceEnd = i
      break
    }
  }
  
  if (lastSentenceEnd === -1) {
    lastSentenceEnd = 0
  } else {
    lastSentenceEnd += 1
  }
  
  const textBetween = textContent.slice(lastSentenceEnd, from).trim()
  
  return textBetween.length > 0
}

export const hasWordsAfter = (state: EditorState): boolean => {
  const { from } = state.selection
  const textContent = state.doc.textContent || ''
  
  let nextSentenceEnd = textContent.length
  for (let i = from; i < textContent.length; i++) {
    const char = textContent[i]
    if (char && '.!?'.includes(char)) {
      nextSentenceEnd = i
      break
    }
  }
  
  const textAfter = textContent.slice(from, nextSentenceEnd).trim()
  
  return textAfter.length > 0
} 