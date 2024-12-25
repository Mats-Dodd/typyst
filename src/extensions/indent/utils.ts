import { Editor } from '@tiptap/core'
import { Transaction } from '@tiptap/pm/state'
import { TextSelection, AllSelection, EditorState } from '@tiptap/pm/state'
    
export const IndentProps = {
  max: 7,
  min: 0,
  more: 1,
  less: -1,
} as const

export function clamp(val: number, min: number, max: number): number {
  if (val < min) return min
  if (val > max) return max
  return val
}

function updateIndentLevel(
  tr: Transaction,
  delta: number,
  types: string[],
  editor: Editor,
): Transaction {
  const { doc, selection } = tr

  if (!doc || !selection) return tr
  if (!(selection instanceof TextSelection || selection instanceof AllSelection)) return tr

  const { from, to } = selection

  doc.nodesBetween(from, to, (node, pos) => {
    const nodeType = node.type

    if (types.includes(nodeType.name)) {
      tr = setNodeIndentMarkup(tr, pos, delta)
      return false
    }
    return true
  })

  return tr
}

function setNodeIndentMarkup(tr: Transaction, pos: number, delta: number): Transaction {
  if (!tr.doc) return tr

  const node = tr.doc.nodeAt(pos)
  if (!node) return tr

  const indent = clamp(
    (node.attrs.indent || 0) + delta,
    IndentProps.min,
    IndentProps.max
  )

  if (indent === node.attrs.indent) return tr

  const nodeAttrs = {
    ...node.attrs,
    indent,
  }

  return tr.setNodeMarkup(pos, node.type, nodeAttrs, node.marks)
}

export function createIndentCommand({ delta, types }: { delta: number, types: string[] }) {
  return ({ state, dispatch, editor }: { state: EditorState, dispatch: ((tr: Transaction) => void) | undefined, editor: Editor }) => {
    const { selection } = state
    let { tr } = state
    tr = tr.setSelection(selection)
    tr = updateIndentLevel(tr, delta, types, editor)

    if (tr.docChanged) {
      if (dispatch) dispatch(tr)
      return true
    }

    return false
  }
} 