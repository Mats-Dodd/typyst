import { Editor } from '@tiptap/core'
import { ProcessedValeAlert, ValeAlert } from '../types/vale'

export function getHighlightedText(
  alerts: ProcessedValeAlert[], 
  ignoredWarnings: boolean = false,
  ignoredErrors: boolean = false
): string[] {
  
  const highlightedText = alerts
    .filter(alert => {
      const severity = alert.Severity.toLowerCase()
      if (severity === 'warning' && ignoredWarnings) return false
      if (severity === 'error' && ignoredErrors) return false
      return ['warning', 'error'].includes(severity)
    })
    .map(alert => alert.Match)

  return highlightedText
}

export async function loadValeResults(editor: Editor): Promise<ProcessedValeAlert[]> {
  try {
    const html = editor.getHTML()
    const valeResponse = await window.vale.lint(html)
    
    // Vale returns results with the filename as the key, but we only care about the alerts
    const alerts = Object.values(valeResponse)[0] || []
    const processedAlerts = processValeAlerts(alerts, editor)
    
    return processedAlerts
  } catch (err) {
    console.error('Failed to load Vale results:', err)
    return []
  }
}

function processValeAlerts(alerts: ValeAlert[], editor: Editor): ProcessedValeAlert[] {
  return alerts.map((alert) => ({
    ...alert,
    domPosition: findTextPositionInEditor(alert.Match, alert.Span[0], alert.Span[1], editor)
  }))
}

function findTextPositionInEditor(
  text: string,
  startSpan: number,
  endSpan: number,
  editor: Editor
): { top: number; left: number } | null {
  const view = editor.view
  const domNode = view.dom as HTMLElement
  
  // Find all text nodes in the editor
  const textNodes: Node[] = []
  const walker = document.createTreeWalker(domNode, NodeFilter.SHOW_TEXT)
  let node: Node | null
  while (node = walker.nextNode()) {
    textNodes.push(node)
  }

  // Find the text node containing our match
  for (const node of textNodes) {
    const nodeText = node.textContent || ''
    if (nodeText.includes(text)) {
      const range = document.createRange()
      range.setStart(node, 0)
      range.setEnd(node, nodeText.length)
      const rect = range.getBoundingClientRect()
      const editorRect = domNode.getBoundingClientRect()
      
      return {
        top: rect.top - editorRect.top,
        left: rect.right - editorRect.left
      }
    }
  }

  return null
} 