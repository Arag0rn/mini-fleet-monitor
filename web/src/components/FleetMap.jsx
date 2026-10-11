import { useEffect, useRef } from 'react'
import OlMap from 'ol/Map.js'
import View from 'ol/View.js'
import Feature from 'ol/Feature.js'
import Point from 'ol/geom/Point.js'
import TileLayer from 'ol/layer/Tile.js'
import VectorLayer from 'ol/layer/Vector.js'
import OSM from 'ol/source/OSM.js'
import VectorSource from 'ol/source/Vector.js'
import GeoJSON from 'ol/format/GeoJSON.js'
import { fromLonLat } from 'ol/proj.js'
import 'ol/ol.css'
import { PATROL_AREA_CENTER } from '../config.js'
import { networkStyle, readPalette, robotStyle, TRAIL_LENGTH } from '../map/robotStyle.js'
import './FleetMap.css'

const MOVE_DURATION_MS = 900

const easeOutCubic = (t) => 1 - (1 - t) ** 3
const prefersReducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches
const headingOf = ([x1, y1], [x2, y2]) => Math.atan2(x2 - x1, y2 - y1)

// Keeps only the newest part of the path, about TRAIL_LENGTH long
function trimTrail(points) {
  let length = 0
  for (let i = points.length - 1; i > 0; i--) {
    length += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1])
    if (length > TRAIL_LENGTH) return points.slice(i - 1)
  }
  return points
}

function cumulativeLengths(points) {
  const lengths = [0]
  for (let i = 1; i < points.length; i++) {
    lengths.push(lengths[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]))
  }
  return lengths
}

const LEGEND = [
  { key: 'moving', label: 'Moving' },
  { key: 'idle', label: 'Idle' },
  { key: 'trail', label: 'Recent path, ~100 m' },
  { key: 'network', label: 'Patrol paths' },
]

export default function FleetMap({ robots, network }) {
  const containerRef = useRef(null)
  const sourceRef = useRef(null)
  const networkSourceRef = useRef(null)
  const mapRef = useRef(null)
  const fittedRef = useRef(false)
  const motionsRef = useRef(new Map())
  const frameRef = useRef(0)

  useEffect(() => {
    let palette = readPalette()
    const source = new VectorSource()
    const robotLayer = new VectorLayer({ source, style: (feature) => robotStyle(feature, palette) })
    const networkSource = new VectorSource()
    const networkLayer = new VectorLayer({ source: networkSource, style: () => networkStyle(palette) })
    const map = new OlMap({
      target: containerRef.current,
      layers: [new TileLayer({ source: new OSM(), className: 'fleet-map__tiles' }), networkLayer, robotLayer],
      view: new View({ center: fromLonLat(PATROL_AREA_CENTER), zoom: 16 }),
    })
    for (const button of containerRef.current.querySelectorAll('.ol-zoom button')) {
      button.setAttribute('aria-label', button.title)
    }

    const restyle = () => {
      palette = readPalette()
      robotLayer.changed()
      networkLayer.changed()
    }
    const themeObserver = new MutationObserver(restyle)
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    document.fonts.ready.then(restyle)

    const motions = motionsRef.current
    sourceRef.current = source
    networkSourceRef.current = networkSource
    mapRef.current = map
    return () => {
      cancelAnimationFrame(frameRef.current)
      frameRef.current = 0
      motions.clear()
      themeObserver.disconnect()
      map.setTarget(undefined)
      sourceRef.current = null
      networkSourceRef.current = null
      mapRef.current = null
      fittedRef.current = false
    }
  }, [])

  useEffect(() => {
    const networkSource = networkSourceRef.current
    if (!networkSource || !network) return
    networkSource.clear()
    networkSource.addFeatures(new GeoJSON().readFeatures(network, { featureProjection: 'EPSG:3857' }))
  }, [network])

  useEffect(() => {
    const source = sourceRef.current
    if (!source) return
    const motions = motionsRef.current

    // Moves each robot along its points (start, junctions passed, target) at an eased pace
    function animate(now) {
      for (const [feature, motion] of motions) {
        const { points, lengths } = motion
        const progress = Math.min(1, (now - motion.start) / MOVE_DURATION_MS)
        const travelled = easeOutCubic(progress) * lengths[lengths.length - 1]
        let i = 0
        while (i < points.length - 2 && lengths[i + 1] < travelled) i++
        const share = (travelled - lengths[i]) / (lengths[i + 1] - lengths[i] || 1)
        const [x1, y1] = points[i]
        const [x2, y2] = points[i + 1]

        feature.set('heading', headingOf(points[i], points[i + 1]), true)
        feature.set('reached', motion.record ? points.slice(0, i + 1) : [], true)
        feature.getGeometry().setCoordinates([x1 + (x2 - x1) * share, y1 + (y2 - y1) * share])
        if (progress === 1) {
          motions.delete(feature)
          finish(feature, motion)
        }
      }
      frameRef.current = motions.size > 0 ? requestAnimationFrame(animate) : 0
    }

    function finish(feature, motion) {
      const trail = motion.record ? [...feature.get('trail'), ...motion.points.slice(0, -1)] : []
      feature.setProperties({ trail: trimTrail(trail), reached: [] })
    }

    // `via` comes with live moves; after a reconnect the path is unknown, so the trail starts afresh
    function moveTo(feature, target, via) {
      const previous = feature.get('target')
      if (previous[0] === target[0] && previous[1] === target[1]) return

      const interrupted = motions.has(feature)
      const trail = interrupted ? [...feature.get('trail'), ...feature.get('reached')] : feature.get('trail')
      const points = [feature.getGeometry().getCoordinates(), ...(via ?? []), target]
      const motion = { points, lengths: cumulativeLengths(points), start: performance.now(), record: Boolean(via) }
      feature.setProperties({ target, trail: trimTrail(trail), reached: [], heading: headingOf(points.at(-2), target) })

      if (prefersReducedMotion()) {
        motions.delete(feature)
        feature.getGeometry().setCoordinates(target)
        finish(feature, motion)
        return
      }
      motions.set(feature, motion)
      if (!frameRef.current) frameRef.current = requestAnimationFrame(animate)
    }

    const ids = new Set()
    for (const robot of robots) {
      ids.add(robot.id)
      const target = fromLonLat([robot.lon, robot.lat])
      const feature = source.getFeatureById(robot.id)
      if (feature) {
        feature.setProperties({ name: robot.name, status: robot.status })
        moveTo(feature, target, robot.via?.map(([lat, lon]) => fromLonLat([lon, lat])))
      } else {
        const created = new Feature({
          geometry: new Point(target),
          name: robot.name,
          status: robot.status,
          target,
          trail: [],
          reached: [],
        })
        created.setId(robot.id)
        source.addFeature(created)
      }
    }
    for (const feature of source.getFeatures()) {
      if (!ids.has(feature.getId())) {
        motions.delete(feature)
        source.removeFeature(feature)
      }
    }

    if (!fittedRef.current && robots.length > 0) {
      mapRef.current.getView().fit(source.getExtent(), { padding: [60, 60, 60, 60], maxZoom: 17 })
      fittedRef.current = true
    }
  }, [robots])

  return (
    <>
      <div
        ref={containerRef}
        className="fleet-map"
        role="region"
        tabIndex={0}
        aria-label="Map of the patrol area. Arrow keys pan, plus and minus keys zoom."
      />
      <ul className="fleet-map__legend" aria-label="Map legend">
        {LEGEND.map(({ key, label }) => (
          <li key={key}>
            <svg className={`fleet-map__symbol fleet-map__symbol--${key}`} viewBox="0 0 24 12" aria-hidden="true">
              {key === 'moving' && <path d="M12 1 18 11H6Z" />}
              {key === 'idle' && <circle cx="12" cy="6" r="4" />}
              {(key === 'trail' || key === 'network') && <line x1="1" y1="6" x2="23" y2="6" />}
            </svg>
            {label}
          </li>
        ))}
      </ul>
    </>
  )
}
