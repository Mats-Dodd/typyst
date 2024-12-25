import React from 'react'
import "../../../styles/Editor.css"

interface RawContentPreviewProps {
  content: string
}

export function RawContentPreview({ content }: RawContentPreviewProps) {
  return (
    <div className="raw-content">
      <h3>Raw Content</h3>
      <pre>{content}</pre>
    </div>
  )
} 