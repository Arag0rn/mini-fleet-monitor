import TopBar from '../components/TopBar.jsx'
import RobotRoster from '../components/RobotRoster.jsx'
import { useRobots } from '../robots/useRobots.js'
import './DashboardPage.css'

export default function DashboardPage() {
  const { robots, status, reload } = useRobots()

  return (
    <div className="dashboard">
      <TopBar />
      <main className="dashboard__body">
        <h1 className="dashboard__heading">Patrol Robots</h1>
        <section className="dashboard__map" aria-label="Map of the patrol area" />
        <RobotRoster robots={robots} status={status} onRetry={reload} />
      </main>
    </div>
  )
}
