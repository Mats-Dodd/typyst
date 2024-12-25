import { Extension } from '@tiptap/core'
import { IndentProps, createIndentCommand } from './utils'

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    indent: {
      indent: () => ReturnType
      outdent: () => ReturnType
    }
  }
}

interface IndentOptions {
  types: string[]
  minIndent: number
  maxIndent: number
}

export const IndentExtension = Extension.create<IndentOptions>({
  name: 'indent',

  addOptions() {
    return {
      types: ['paragraph', 'heading', 'blockquote'],
      minIndent: IndentProps.min,
      maxIndent: IndentProps.max,
    }
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          indent: {
            default: 0,
            parseHTML: (element) => {
              const indentAttr = element.dataset.indent
              return (indentAttr ? Number.parseInt(indentAttr, 10) : 0) || 0
            },
            renderHTML: (attributes) => {
              if (!attributes.indent) return {}
              return { 'data-indent': attributes.indent }
            },
          },
        },
      },
    ]
  },

  addCommands() {
    return {
      indent: () => createIndentCommand({
        delta: IndentProps.more,
        types: this.options.types,
      }),
      outdent: () => createIndentCommand({
        delta: IndentProps.less,
        types: this.options.types,
      }),
    }
  },

  addKeyboardShortcuts() {
    return {
      Tab: () => this.editor.commands.indent(),
      'Shift-Tab': () => this.editor.commands.outdent(),
    }
  },
}) 