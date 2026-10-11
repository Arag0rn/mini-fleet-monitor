import { useEffect, useRef } from 'react'
import Map from 'ol/Map.js'
import View from 'ol/View.js'
import Feature from 'ol/Feature.js'
import Point from 'ol/geom/Point.js'
import TileLayer from 'ol/layer/Tile.js'
import VectorLayer from 'ol/layer/Vector.js'
import OSM from 'ol/source/OSM.js'
import VectorSource from 'ol/source/Vector.js'
import { Circle, Fill, RegularShape, Stroke, Style, Text } from 'ol/style.js'
import { fromLonLat } from 'ol/proj.js'
import 'ol/ol.css'
import { PATROL_AREA_CENTER } from '../config.js'
import './FleetMap.css'

function readPalette() {
  const css = getComputedStyle(document.documentElement)
  const token = (name) => css.getPropertyValue(name).trim()
  return {
    signal: token('--signal'),
    ink: token('--ink'),
    muted: token('--muted'),
    bg: token('--bg'),
    labelFont: `700 14px ${token('--font-display')}`,
  }
}

function robotStyle(feature, palette) {
  const moving = feature.get('status') === 'moving'
  const outline = new Stroke({ color: moving ? palette.ink : palette.bg, width: 2 })
  const marker = moving
    ? new RegularShape({ points: 3, radius: 11, fill: new Fill({ color: palette.signal }), stroke: outline })
    : new Circle({ radius: 6, fill: new Fill({ color: palette.muted }), stroke: outline })

  return new Style({
    image: marker,
    text: new Text({
      text: feature.get('name').toUpperCase(),
      font: palette.labelFont,
      offsetY: -20,
      fill: new Fill({ color: palette.ink }),
      stroke: new Stroke({ color: palette.bg, width: 4 }),
    }),
  })
}

export default function FleetMap({ robots }) {
  const containerRef = useRef(null)
  const sourceRef = useRef(null)
  const mapRef = useRef(null)
  const fittedRef = useRef(false)

  useEffect(() => {
    let palette = readPalette()
    const source = new VectorSource()
    const robotLayer = new VectorLayer({ source, style: (feature) => robotStyle(feature, palette) })
    const map = new Map({
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

    sourceRef.current = source
    mapRef.current = map
    return () => {
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

    const ids = new Set()
    for (const robot of robots) {
      ids.add(robot.id)
      const coordinates = fromLonLat([robot.lon, robot.lat])
      const feature = source.getFeatureById(robot.id)
      if (feature) {
        feature.getGeometry().setCoordinates(coordinates)
        feature.setProperties({ name: robot.name, status: robot.status })
      } else {
        const created = new Feature({ geometry: new Point(coordinates), name: robot.name, status: robot.status })
        created.setId(robot.id)
        source.addFeature(created)
      }
    }
    for (const feature of source.getFeatures()) {
      if (!ids.has(feature.getId())) source.removeFeature(feature)
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
