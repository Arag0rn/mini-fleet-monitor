import { useEffect, useState } from 'react'
import { formatAge, formatPosition } from '../robots/format.js'
import SimulationControl from './SimulationControl.jsx'
import './RobotRoster.css'

function useNow(intervalMs) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

function RosterBody({ robots, status, onRetry, now }) {
  if (status === 'loading' && robots.length === 0) {
    return <p className="roster__note">Loading robots…</p>
  }
  if (status === 'error' && robots.length === 0) {
    return (
      <div className="roster__note">
        <p>Could not load the robots. Check that the API is running.</p>
        <button type="button" className="roster__retry" onClick={onRetry}>
          Try Again
        </button>
      </div>
    )
  }
  if (robots.length === 0) {
    return <p className="roster__note">No robots on site yet.</p>
  }
  return (
    <ul className="roster__list">
      {robots.map((robot) => (
        <li key={robot.id} className="roster__item" data-status={robot.status}>
          <span className="roster__name" translate="no">
            {robot.name}
          </span>
          <span className="roster__status">
            <span aria-hidden="true">{robot.status === 'moving' ? '▲' : '●'}</span> {robot.status}
          </span>
          <span className="roster__position">{formatPosition(robot.lat, robot.lon)}</span>
          <time className="roster__age" dateTime={robot.updated_at}>
            {formatAge(robot.updated_at, now)}
          </time>
        </li>
      ))}
    </ul>
  )
}

export default function RobotRoster({ robots, status, onRetry, simulation }) {
  const now = useNow(1000)
  const moving = robots.filter((robot) => robot.status === 'moving').length

  return (
    <aside className="roster" aria-labelledby="roster-title">
      <div className="roster__header">
        <h2 id="roster-title" className="roster__title">
          Fleet
        </h2>
        {status === 'ready' && (
          <p className="roster__summary">
            {robots.length} {robots.length === 1 ? 'robot' : 'robots'} · {moving} moving
          </p>
        )}
      </div>
      <SimulationControl {...simulation} />
      <RosterBody robots={robots} status={status} onRetry={onRetry} now={now} />
    </aside>
  )
}
