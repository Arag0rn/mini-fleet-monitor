// Ground robots walk the real paths and roads around the site (OpenStreetMap, built by
// scripts/build-patrol-network.js). Format: { nodeId: [lat, lon, [neighbourIds]] }.
const network = require('../data/patrolNetwork.json');

const METERS_PER_DEGREE = 111320;
const nodeIds = Object.keys(network);

function toMeters(fromId, toId) {
  const [lat1, lon1] = network[fromId];
  const [lat2, lon2] = network[toId];
  const north = (lat2 - lat1) * METERS_PER_DEGREE;
  const east = (lon2 - lon1) * METERS_PER_DEGREE * Math.cos((lat1 * Math.PI) / 180);
  return Math.hypot(north, east);
}

const pickRandom = (items) => items[Math.floor(Math.random() * items.length)];

// At a junction take any road except the one we came from; turn back only at a dead end
function nextNode(atId, cameFromId) {
  const options = network[atId][2].filter((id) => id !== cameFromId);
  return pickRandom(options.length > 0 ? options : network[atId][2]);
}

function nearestNode(lat, lon) {
  let best = nodeIds[0];
  let bestDistance = Infinity;
  for (const id of nodeIds) {
    const distance = Math.hypot(network[id][0] - lat, (network[id][1] - lon) * Math.cos((lat * Math.PI) / 180));
    if (distance < bestDistance) {
      best = id;
      bestDistance = distance;
    }
  }
  return best;
}

// Robots without a valid place on the network (fresh seed, regenerated network) start at the nearest node
function placeOnNetwork(robot) {
  if (network[robot.edge_from]?.[2].includes(robot.edge_to)) {
    return { from: robot.edge_from, to: robot.edge_to, offset: robot.edge_offset_m };
  }
  const from = nearestNode(robot.lat, robot.lon);
  return { from, to: nextNode(from, null), offset: 0 };
}

// Walks `distance` metres along the network. Returns the new place, its coordinates and the
// junctions passed on the way ([lat, lon] each), so the map can draw the move along the road.
function advance(robot, distance) {
  let { from, to, offset } = placeOnNetwork(robot);
  let remaining = distance;
  let length = toMeters(from, to);
  const via = [];
  while (offset + remaining > length) {
    remaining -= length - offset;
    via.push(network[to].slice(0, 2));
    [from, to] = [to, nextNode(to, from)];
    offset = 0;
    length = toMeters(from, to);
  }
  offset += remaining;

  const share = length > 0 ? offset / length : 0;
  const [lat1, lon1] = network[from];
  const [lat2, lon2] = network[to];
  return { from, to, offset, via, lat: lat1 + (lat2 - lat1) * share, lon: lon1 + (lon2 - lon1) * share };
}

// All paths as one GeoJSON MultiLineString (GeoJSON order is [lon, lat]) for drawing on the map
function toGeoJson() {
  const lines = [];
  for (const id of nodeIds) {
    for (const neighbour of network[id][2]) {
      if (id < neighbour) lines.push([network[id], network[neighbour]].map(([lat, lon]) => [lon, lat]));
    }
  }
  return { type: 'Feature', properties: {}, geometry: { type: 'MultiLineString', coordinates: lines } };
}

module.exports = { advance, toGeoJson };
