import LineString from 'ol/geom/LineString.js'
import { Circle, Fill, RegularShape, Stroke, Style, Text } from 'ol/style.js'

// How much of the recent path is drawn, in map units (EPSG:3857); about 100 m on the ground in Leipzig
export const TRAIL_LENGTH = 160

export function readPalette() {
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

function withAlpha(hex, alpha) {
  const value = parseInt(hex.slice(1), 16)
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`
}

// The recent path as short segments that fade and thin out with distance behind the robot
function trailStyles(line, palette) {
  const styles = []
  let behind = 0
  for (let i = line.length - 1; i > 0; i--) {
    const [x1, y1] = line[i - 1]
    const [x2, y2] = line[i]
    const fade = Math.max(0, 1 - behind / TRAIL_LENGTH)
    behind += Math.hypot(x2 - x1, y2 - y1)
    const geometry = new LineString([line[i - 1], line[i]])
    const width = 2 + 3 * fade
    styles.push(
      new Style({ geometry, stroke: new Stroke({ color: withAlpha(palette.ink, 0.35 * fade), width: width + 2, lineCap: 'round' }) }),
      new Style({ geometry, stroke: new Stroke({ color: withAlpha(palette.signal, 0.2 + 0.8 * fade), width, lineCap: 'round' }) }),
    )
  }
  return styles
}

export function networkStyle(palette) {
  return new Style({ stroke: new Stroke({ color: withAlpha(palette.muted, 0.45), width: 1.5, lineDash: [4, 5] }) })
}

export function robotStyle(feature, palette) {
  const moving = feature.get('status') === 'moving'
  const outline = new Stroke({ color: moving ? palette.ink : palette.bg, width: 2 })
  const marker = moving
    ? new RegularShape({
        points: 3,
        radius: 11,
        rotation: feature.get('heading') ?? 0,
        rotateWithView: true,
        fill: new Fill({ color: palette.signal }),
        stroke: outline,
      })
    : new Circle({ radius: 6, fill: new Fill({ color: palette.muted }), stroke: outline })

  const robot = new Style({
    image: marker,
    text: new Text({
      text: feature.get('name').toUpperCase(),
      font: palette.labelFont,
      offsetY: -20,
      fill: new Fill({ color: palette.ink }),
      stroke: new Stroke({ color: palette.bg, width: 4 }),
    }),
  })

  const line = [...feature.get('trail'), ...feature.get('reached'), feature.getGeometry().getCoordinates()]
  return [...trailStyles(line, palette), robot]
}
