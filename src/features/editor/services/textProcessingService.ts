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
  const [sentenceStart, sentenceEnd] = findSentenceContainingCursor(text, cursorPosition);

  let currentSentence = text.slice(sentenceStart, sentenceEnd);
  currentSentence = currentSentence.replace(/\s+/g, " ").trim();

  const textBeforeSentence = text.slice(0, sentenceStart);
  const wordsBefore = textBeforeSentence.split(/\s+/);
  const previousWords = wordsBefore.length > 500
    ? wordsBefore.slice(wordsBefore.length - 500)
    : wordsBefore;
  const previousContext = previousWords.join(" ").trim();

  const textAfterSentence = text.slice(sentenceEnd);
  const followingContext = textAfterSentence.slice(0, 500).trim();

  return {
    previousContext,
    currentSentence,
    followingContext
  };
} 