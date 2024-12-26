import { EditorContext } from '../types'

export function findSentenceContainingCursor(text: string, cursorPosition: number): [number, number] {
  const sentenceEndings = /[.!?]/;
  
  let sentenceStart = cursorPosition;
  let sentenceEnd = cursorPosition;
  
  while (sentenceStart > 0) {
    const char = text[sentenceStart - 1];
    if (char && sentenceEndings.test(char)) {
      sentenceStart++;
      break;
    }
    sentenceStart--;
  }
  
  while (sentenceEnd < text.length) {
    const char = text[sentenceEnd];
    if (char && sentenceEndings.test(char)) {
      sentenceEnd++;
      break;
    }
    sentenceEnd++;
  }

  return [sentenceStart, sentenceEnd];
}

export function extractContexts(text: string, cursorPosition: number): EditorContext {
  const textBeforeCursor = text.slice(0, cursorPosition).trim();
  
  return {
    textBeforeCursor
  };
} 