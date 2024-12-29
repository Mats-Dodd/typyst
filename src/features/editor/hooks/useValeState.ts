import { useState, useEffect } from 'react'
import { Editor } from '@tiptap/core'
import { ProcessedValeAlert } from '../types/vale'
import { loadValeResults, getHighlightedText } from '../services/valeService'

export interface ValeState {
  valeAlerts: ProcessedValeAlert[]
  ignoredWarnings: boolean
  ignoredErrors: boolean
  showSidebar: boolean
  setShowSidebar: (show: boolean | ((prev: boolean) => boolean)) => void
  setIgnoredWarnings: (ignored: boolean) => void
  setIgnoredErrors: (ignored: boolean) => void
  updateValeResults: (editor: Editor) => Promise<void>
}

export function useValeState(editor: Editor | null): ValeState {
  const [valeAlerts, setValeAlerts] = useState<ProcessedValeAlert[]>([])
  const [showSidebar, _setShowSidebar] = useState(false)
  const [ignoredWarnings, setIgnoredWarnings] = useState(false)
  const [ignoredErrors, setIgnoredErrors] = useState(false)

  const setShowSidebar = (show: boolean | ((prev: boolean) => boolean)) => {
    if (typeof show === 'function') {
      _setShowSidebar(show(showSidebar))
    } else {
      _setShowSidebar(show)
    }
  }

  useEffect(() => {
    if (editor && valeAlerts.length > 0) {
      const highlightedText = getHighlightedText(valeAlerts, ignoredWarnings, ignoredErrors)
      ;(window as any).currentValeHighlights = highlightedText
      editor.view.dispatch(editor.state.tr)  // Force a re-render to update decorations
    }
  }, [ignoredWarnings, ignoredErrors, valeAlerts, editor])

  useEffect(() => {
    if (editor) {
      updateValeResults(editor)
    }
  }, [editor])

  const updateValeResults = async (editor: Editor) => {
    const alerts = await loadValeResults(editor)
    setValeAlerts(alerts)
    const highlightedText = getHighlightedText(alerts, ignoredWarnings, ignoredErrors)
    ;(window as any).currentValeHighlights = highlightedText
    editor.view.dispatch(editor.state.tr)
  }

  return {
    valeAlerts,
    ignoredWarnings,
    ignoredErrors,
    showSidebar,
    setShowSidebar,
    setIgnoredWarnings,
    setIgnoredErrors,
    updateValeResults
  }
} 