import { useEffect, useRef } from 'react'
import OlMap from 'ol/Map.js'
import View from 'ol/View.js'
import Feature from 'ol/Feature.js'
import Point from 'ol/geom/Point.js'
import TileLayer from 'ol/layer/Tile.js'
import VectorLayer from 'ol/layer/Vector.js'
import OSM from 'ol/source/OSM.js'
import VectorSource from 'ol/source/Vector.js'
import { fromLonLat } from 'ol/proj.js'
import 'ol/ol.css'
import { PATROL_AREA_CENTER } from '../config.js'
import { readPalette, robotStyle } from '../map/robotStyle.js'
import './FleetMap.css'

const MOVE_DURATION_MS = 600
const TRAIL_LENGTH = 5

const easeOutCubic = (t) => 1 - (1 - t) ** 3
const prefersReducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches

export default function FleetMap({ robots }) {
  const containerRef = useRef(null)
  const sourceRef = useRef(null)
  const mapRef = useRef(null)
  const fittedRef = useRef(false)
  const motionsRef = useRef(new Map())
  const frameRef = useRef(0)

  useEffect(() => {
    let palette = readPalette()
    const source = new VectorSource()
    const robotLayer = new VectorLayer({ source, style: (feature) => robotStyle(feature, palette) })
    const map = new OlMap({
      target: containerRef.current,
      layers: [new TileLayer({ source: new OSM(), className: 'fleet-map__tiles' }), robotLayer],
      view: new View({ center: fromLonLat(PATROL_AREA_CENTER), zoom: 16 }),
    })
    for (const button of containerRef.current.querySelectorAll('.ol-zoom button')) {
      button.setAttribute('aria-label', button.title)
    }

    const restyle = () => {
      palette = readPalette()
      robotLayer.changed()
    }
    const themeObserver = new MutationObserver(restyle)
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    document.fonts.ready.then(restyle)

    const motions = motionsRef.current
    sourceRef.current = source
    mapRef.current = map
    return () => {
      cancelAnimationFrame(frameRef.current)
      frameRef.current = 0
      motions.clear()
      themeObserver.disconnect()
      map.setTarget(undefined)
      sourceRef.current = null
      mapRef.current = null
      fittedRef.current = false
    }
  }, [])

  useEffect(() => {
    const source = sourceRef.current
    if (!source) return
    const motions = motionsRef.current

    function animate(now) {
      for (const [feature, motion] of motions) {
        const progress = Math.min(1, (now - motion.start) / MOVE_DURATION_MS)
        const eased = easeOutCubic(progress)
        feature
          .getGeometry()
          .setCoordinates([
            motion.from[0] + (motion.to[0] - motion.from[0]) * eased,
            motion.from[1] + (motion.to[1] - motion.from[1]) * eased,
          ])
        if (progress === 1) motions.delete(feature)
      }
      frameRef.current = motions.size > 0 ? requestAnimationFrame(animate) : 0
    }

    function moveTo(feature, target) {
      const previous = feature.get('target')
      if (previous[0] === target[0] && previous[1] === target[1]) return

      feature.setProperties({
        target,
        heading: Math.atan2(target[0] - previous[0], target[1] - previous[1]),
        trail: [...feature.get('trail'), previous].slice(-TRAIL_LENGTH),
      })

      if (prefersReducedMotion()) {
        motions.delete(feature)
        feature.getGeometry().setCoordinates(target)
        return
      }
      motions.set(feature, { from: feature.getGeometry().getCoordinates(), to: target, start: performance.now() })
      if (!frameRef.current) frameRef.current = requestAnimationFrame(animate)
    }

    const ids = new Set()
    for (const robot of robots) {
      ids.add(robot.id)
      const target = fromLonLat([robot.lon, robot.lat])
      const feature = source.getFeatureById(robot.id)
      if (feature) {
        feature.setProperties({ name: robot.name, status: robot.status })
        moveTo(feature, target)
      } else {
        const created = new Feature({
          geometry: new Point(target),
          name: robot.name,
          status: robot.status,
          target,
          trail: [],
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
    <div
      ref={containerRef}
      className="fleet-map"
      role="region"
      tabIndex={0}
      aria-label="Map of the patrol area. Arrow keys pan, plus and minus keys zoom."
    />
  )
}
