import React from 'react'
import { ValeAlert } from '../types/vale'
import { BiX } from 'react-icons/bi'

interface ValeSidebarProps {
  alerts: ValeAlert[]
  onClose?: () => void
}

export function ValeSidebar({ alerts, onClose }: ValeSidebarProps): JSX.Element {
  return (
    <div className="vale-sidebar">
      <div className="vale-sidebar-header-sticky">
        <div className="vale-sidebar-header">
          <h3>Writing Suggestions</h3>
          {onClose && (
            <button onClick={onClose} className="vale-close-button" title="Close Sidebar">
              <BiX />
            </button>
          )}
        </div>
      </div>
      <div className="vale-sidebar-content">
        {alerts.map((alert, index) => (
          <div
            key={index}
            className={`vale-alert vale-${alert.Severity.toLowerCase()}`}
            title={alert.Link ? `Click for more info` : undefined}
            onClick={() => alert.Link && window.open(alert.Link, '_blank')}
          >
            <div className="vale-header">
              <span className="vale-rule">{alert.Check.split('.')[1]}</span>
              <span className="vale-severity">{alert.Severity}</span>
            </div>
            <span className="vale-match">"{alert.Match}"</span>
            <span className="vale-message">{alert.Message}</span>
            {alert.Action.Name === 'replace' && (
              <span className="vale-suggestion">
                Suggestion: {alert.Action.Params?.[0]}
              </span>
            )}
          </div>
        ))}
        {alerts.length === 0 && (
          <div className="vale-empty">
            No writing suggestions
          </div>
        )}
      </div>
    </div>
  )
} 