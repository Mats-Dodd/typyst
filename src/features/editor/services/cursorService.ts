import { EditorState } from 'prosemirror-state'

export const isCursorAtEnd = (state: EditorState): boolean => {
  const { from } = state.selection
  const docSize = state.doc.content.size
  // Check if cursor is at the end of the document
  // We subtract 2 from docSize because ProseMirror adds an extra position for the end
  return from >= docSize - 2
}

export const hasWordsBetween = (state: EditorState): boolean => {
  const { from } = state.selection
  const textContent = state.doc.textContent || ''
  
  // Find the last sentence ending before the cursor
  let lastSentenceEnd = -1
  for (let i = from - 1; i >= 0; i--) {
    const char = textContent[i]
    if (char && '.!?'.includes(char)) {
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

export const hasWordsAfter = (state: EditorState): boolean => {
  const { from } = state.selection
  const textContent = state.doc.textContent || ''
  
  // Find the next sentence ending after the cursor
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