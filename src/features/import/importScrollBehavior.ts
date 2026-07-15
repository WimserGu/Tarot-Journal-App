export function shouldScrollAfterImportPaste(previousText: string, nextText: string): boolean {
  const addedCharacterCount = nextText.length - previousText.length;

  return addedCharacterCount >= 40 && nextText.includes('[Reading]');
}
