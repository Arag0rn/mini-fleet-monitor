import { useEffect, useRef } from 'react'
import Map from 'ol/Map.js'
import View from 'ol/View.js'
import TileLayer from 'ol/layer/Tile.js'
import OSM from 'ol/source/OSM.js'
import { fromLonLat } from 'ol/proj.js'
import { defaults as defaultControls } from 'ol/control/defaults.js'
import 'ol/ol.css'
import { PATROL_AREA_CENTER } from '../config.js'
import './PatrolAreaBackdrop.css'

export default function PatrolAreaBackdrop() {
  const containerRef = useRef(null)

  useEffect(() => {
    const map = new Map({
      target: containerRef.current,
      layers: [new TileLayer({ source: new OSM() })],
      view: new View({ center: fromLonLat(PATROL_AREA_CENTER), zoom: 16 }),
      controls: defaultControls({ zoom: false, rotate: false }),
      interactions: [],
    })
    return () => map.setTarget(undefined)
  }, [])

  return <div ref={containerRef} className="patrol-backdrop" />
}
