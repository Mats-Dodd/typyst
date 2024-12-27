import { useEffect } from 'react'
import { Editor } from '@tiptap/core'

export function useEditorSpellcheck(editor: Editor | null) {
  useEffect(() => {
    if (editor) {
      const dom = editor.view.dom as HTMLElement
      dom.setAttribute("spellcheck", "false")
      dom.setAttribute("autocomplete", "off")
      dom.setAttribute("autocapitalize", "off")
    }
  }, [editor])
} 