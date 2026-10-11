const coordinate = new Intl.NumberFormat('en', { minimumFractionDigits: 5, maximumFractionDigits: 5 })
const relative = new Intl.RelativeTimeFormat('en', { numeric: 'auto', style: 'narrow' })
const NBSP = String.fromCharCode(0xa0)

export function formatPosition(lat, lon) {
  const ns = lat >= 0 ? 'N' : 'S'
  const ew = lon >= 0 ? 'E' : 'W'
  return `${coordinate.format(Math.abs(lat))}°${NBSP}${ns}, ${coordinate.format(Math.abs(lon))}°${NBSP}${ew}`
}

export function formatAge(timestamp, now) {
  const seconds = Math.max(0, Math.round((now - new Date(timestamp)) / 1000))
  if (seconds < 60) return relative.format(-seconds, 'second')
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return relative.format(-minutes, 'minute')
  return relative.format(-Math.round(minutes / 60), 'hour')
}
