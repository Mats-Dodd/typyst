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