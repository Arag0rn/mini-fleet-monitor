const { Router } = require('express');
const requireAuth = require('../middleware/requireAuth');
const simulationController = require('../controllers/simulationController');

const router = Router();

router.use(requireAuth);
router.get('/', simulationController.state);
router.post('/start', simulationController.start);
router.post('/stop', simulationController.stop);

module.exports = router;
