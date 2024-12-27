import React from 'react'
import { ThemeProvider } from '../../theme/themeContext'
import { EditorContent } from './EditorContent'
import '../../../styles/Editor.css'
import '../../../styles/CodeBlock.css'

export function Editor(): JSX.Element {
  return (
    <ThemeProvider>
      <div className="editor-wrapper">
        <EditorContent />
      </div>
    </ThemeProvider>
  )
} 