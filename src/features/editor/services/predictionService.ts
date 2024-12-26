export function cleanCompletion(current: string, prediction: string): string {
  if (current.includes(prediction)) {
    return '';
  }

  let maxOverlap = 0;
  const maxPossibleOverlap = Math.min(current.length, prediction.length);
  
  for (let i = 1; i <= maxPossibleOverlap; i++) {
    const suffixOfCurrent = current.slice(-i);
    const prefixOfPrediction = prediction.slice(0, i);
    if (suffixOfCurrent === prefixOfPrediction) {
      maxOverlap = i;
    }
  }
  return prediction.slice(maxOverlap);
  }

export function cleanSpaces(current: string, prediction: string): string {
  if (!current) {
    return prediction;
  }
  const endsWithSpace = current[current.length - 1] === ' ';
  if (!endsWithSpace && prediction) {
    return ' ' + prediction;
  }
  return prediction;
  }

export function handleSentenceCapitalization(current: string, prediction: string | undefined): string {
  if (!current || !prediction) {
    return '';
  }

  const sentenceDelimiters = ['!', '?', '.'];
  const lastChar = current[current.length - 1];
  const isEndOfSentence = sentenceDelimiters.includes(lastChar as string);

  if (isEndOfSentence) {
    // Capitalize first letter if it's end of sentence
    return prediction.charAt(0).toUpperCase() + prediction.slice(1);
  } else {
    // Ensure first letter is lowercase if not end of sentence
    return prediction.charAt(0).toLowerCase() + prediction.slice(1);
  }
}

export function cutToFirstSentence(prediction: string): string {
  if (!prediction) {
    return '';
  }

  const sentenceDelimiters = ['!', '?', '.'];
  const firstDelimiterIndex = Math.min(
    ...sentenceDelimiters
      .map(delimiter => prediction.indexOf(delimiter))
      .filter(index => index !== -1)
  );

  return firstDelimiterIndex === Infinity 
    ? prediction 
    : prediction.slice(0, firstDelimiterIndex + 1);
}
