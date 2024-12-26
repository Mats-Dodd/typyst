import React from 'react'
import { ValeAlert } from '../types/vale'
import { BiX } from 'react-icons/bi'

interface ValeSidebarProps {
  alerts: ValeAlert[]
  onClose?: (show: boolean | ((prev: boolean) => boolean)) => void
  ignoredWarnings: boolean
  setIgnoredWarnings: (ignored: boolean) => void
  ignoredErrors: boolean
  setIgnoredErrors: (ignored: boolean) => void
}

export function ValeSidebar({ 
  alerts, 
  onClose,
  ignoredWarnings,
  setIgnoredWarnings,
  ignoredErrors,
  setIgnoredErrors 
}: ValeSidebarProps): JSX.Element {
  const filteredAlerts = alerts.filter(alert => {
    const severity = alert.Severity.toLowerCase()
    if (severity === 'warning' && ignoredWarnings) return false
    if (severity === 'error' && ignoredErrors) return false
    return true
  })

  const warningCount = alerts.filter(alert => alert.Severity.toLowerCase() === 'warning').length
  const errorCount = alerts.filter(alert => alert.Severity.toLowerCase() === 'error').length

  return (
    <div className="vale-sidebar">
      <div className="vale-sidebar-header-sticky">
        <div className="vale-sidebar-header">
          <h3>Writing Suggestions</h3>
          {onClose && (
            <button onClick={() => onClose(false)} className="vale-close-button" title="Close Sidebar">
              <BiX />
            </button>
          )}
        </div>
        <div className="vale-ignore-buttons">
          {warningCount > 0 && (
            <button 
              onClick={() => setIgnoredWarnings(!ignoredWarnings)}
              className={`vale-ignore-button warning ${ignoredWarnings ? 'ignored' : ''}`}
            >
              {ignoredWarnings ? 'Show' : 'Ignore'} Warnings ({warningCount})
            </button>
          )}
          {errorCount > 0 && (
            <button 
              onClick={() => setIgnoredErrors(!ignoredErrors)}
              className={`vale-ignore-button error ${ignoredErrors ? 'ignored' : ''}`}
            >
              {ignoredErrors ? 'Show' : 'Ignore'} Errors ({errorCount})
            </button>
          )}
        </div>
      </div>
      <div className="vale-sidebar-content">
        {filteredAlerts.map((alert, index) => (
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
        {filteredAlerts.length === 0 && (
          <div className="vale-empty">
            {alerts.length === 0 ? 'No writing suggestions' : 'All alerts are ignored'}
          </div>
        )}
      </div>
    </div>
  )
}