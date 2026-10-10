const { Router } = require('express');
const requireAuth = require('../middleware/requireAuth');
const robotController = require('../controllers/robotController');

const router = Router();

router.use(requireAuth);
router.get('/', robotController.list);
router.post('/:id/move', robotController.move);

module.exports = router;
