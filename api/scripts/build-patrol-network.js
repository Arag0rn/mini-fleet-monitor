// Builds src/data/patrolNetwork.json from an OpenStreetMap extract (.osm XML), e.g.
// https://api.openstreetmap.org/api/0.6/map?bbox=12.4626,51.3344,12.4786,51.3444
// Usage: node scripts/build-patrol-network.js map.osm
const fs = require('node:fs');
const path = require('node:path');

const CENTER = { lat: 51.339374, lon: 12.470607 }; // Mühlweg 44, Leipzig
const RADIUS_M = 450;
const EXCLUDED = new Set(['platform', 'steps', 'construction', 'proposed', 'elevator', 'bus_stop']);

const xml = fs.readFileSync(process.argv[2], 'utf8');

const coords = new Map();
for (const m of xml.matchAll(/<node id="(\d+)"[^>]*?lat="([-\d.]+)" lon="([-\d.]+)"/g)) {
  coords.set(m[1], [Number(m[2]), Number(m[3])]);
}

const distanceFromCenter = ([lat, lon]) => {
  const north = (lat - CENTER.lat) * 111320;
  const east = (lon - CENTER.lon) * 111320 * Math.cos((lat * Math.PI) / 180);
  return Math.hypot(north, east);
};
const inside = (id) => coords.has(id) && distanceFromCenter(coords.get(id)) <= RADIUS_M;

// Undirected adjacency between consecutive way nodes that both lie inside the patrol area
const links = new Map();
const link = (a, b) => {
  if (!links.has(a)) links.set(a, new Set());
  links.get(a).add(b);
};
for (const m of xml.matchAll(/<way id="\d+"[^>]*>([\s\S]*?)<\/way>/g)) {
  const highway = m[1].match(/<tag k="highway" v="([^"]*)"/)?.[1];
  if (!highway || EXCLUDED.has(highway) || /<tag k="area" v="yes"/.test(m[1])) continue;
  const refs = [...m[1].matchAll(/<nd ref="(\d+)"/g)].map((r) => r[1]);
  for (let i = 1; i < refs.length; i++) {
    if (refs[i - 1] !== refs[i] && inside(refs[i - 1]) && inside(refs[i])) {
      link(refs[i - 1], refs[i]);
      link(refs[i], refs[i - 1]);
    }
  }
}

// Keep the largest connected part, so no robot can get trapped on an isolated path
let largest = [];
const seen = new Set();
for (const start of links.keys()) {
  if (seen.has(start)) continue;
  const part = [start];
  seen.add(start);
  for (let i = 0; i < part.length; i++) {
    for (const next of links.get(part[i])) {
      if (!seen.has(next)) {
        seen.add(next);
        part.push(next);
      }
    }
  }
  if (part.length > largest.length) largest = part;
}

const round = (value) => Math.round(value * 1e7) / 1e7;
const network = {};
for (const id of largest.sort()) {
  const [lat, lon] = coords.get(id);
  network[id] = [round(lat), round(lon), [...links.get(id)]];
}

const target = path.join(__dirname, '../src/data/patrolNetwork.json');
fs.writeFileSync(target, `${JSON.stringify(network)}\n`);
console.log(`${largest.length} nodes (of ${links.size}) written to ${target}`);
