const { Router } = require('express');
const requireAuth = require('../middleware/requireAuth');
const patrolNetworkController = require('../controllers/patrolNetworkController');

const router = Router();

router.get('/', requireAuth, patrolNetworkController.show);

module.exports = router;
