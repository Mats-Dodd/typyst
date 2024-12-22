import { Editor as TiptapEditor } from '@tiptap/core'

export const handleTabKey = (
  editor: TiptapEditor,
  prediction: string,
  setPrediction: (pred: string) => void
) => {
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