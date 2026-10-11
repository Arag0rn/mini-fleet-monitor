import Point from 'ol/geom/Point.js'
import { Circle, Fill, RegularShape, Stroke, Style, Text } from 'ol/style.js'

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

function trailStyles(trail, palette) {
  return trail.map((coordinates, index) => {
    const opacity = 0.3 + ((index + 1) / trail.length) * 0.6
    return new Style({
      geometry: new Point(coordinates),
      image: new Circle({
        radius: 2.5 + index * 0.7,
        fill: new Fill({ color: withAlpha(palette.signal, opacity) }),
        stroke: new Stroke({ color: withAlpha(palette.ink, opacity * 0.6), width: 1 }),
      }),
    })
  })
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

  return moving ? [...trailStyles(feature.get('trail') ?? [], palette), robot] : robot
}
