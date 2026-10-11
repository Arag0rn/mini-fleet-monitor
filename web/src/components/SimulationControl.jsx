import './SimulationControl.css'

export default function SimulationControl({ running, action, failed, toggle, refresh }) {
  if (running === null) {
    if (failed !== 'load') return null
    return (
      <div className="simulation">
        <p className="simulation__error" role="alert">
          Could not load the simulation state.
        </p>
        <button type="button" className="simulation__toggle" onClick={refresh}>
          Try Again
        </button>
      </div>
    )
  }

  const label = running ? 'Stop Simulation' : 'Start Simulation'
  const pendingLabel = action === 'stop' ? 'Stopping…' : 'Starting…'

  return (
    <div className="simulation" data-running={running}>
      <p className="simulation__state" role="status">
        <span aria-hidden="true">{running ? '▲' : '■'}</span> Simulation · {running ? 'Running' : 'Stopped'}
      </p>
      <button
        type="button"
        className="simulation__toggle"
        onClick={action ? undefined : toggle}
        aria-disabled={action !== null}
      >
        {action ? pendingLabel : label}
      </button>
      {(failed === 'start' || failed === 'stop') && (
        <p className="simulation__error" role="alert">
          Could not {failed} the simulation. Check that the API is running and try again.
        </p>
      )}
    </div>
  )
}
