import { Editor } from '@tiptap/core'
import { ProcessedValeAlert, ValeAlert } from '../types/vale'

export async function loadValeResults(editor: Editor): Promise<ProcessedValeAlert[]> {
  try {
    const result = await window.fs.readFile('.tmp/editor/output.json')
    if (!result.error && result.content) {
      try {
        const valeData = JSON.parse(result.content)
        const alerts = valeData['initial-html.html'] || []
        return processValeAlerts(alerts, editor)
      } catch (parseError) {
        console.error('Error parsing Vale JSON:', parseError)
        return []
      }
    }
    return []
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