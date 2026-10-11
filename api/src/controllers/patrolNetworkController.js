const patrolNetwork = require('../services/patrolNetwork');

const geoJson = patrolNetwork.toGeoJson();

function show(req, res) {
  res.set('Cache-Control', 'private, max-age=3600').json(geoJson);
}

module.exports = { show };
