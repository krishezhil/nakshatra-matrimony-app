// CommonController: Handles fetching common data (e.g., nakshatra, gothram)
const express = require('express');
const router = express.Router();
const commonController = require('../controllers/commonController');
const { getVersionEndpoint } = require('../middleware/versionMiddleware');

// API endpoints (mounted at /common, so these become /common/api/*)
router.get('/api/nakshatra', commonController.getNakshatra);
router.get('/api/gothram', commonController.getGothram);
router.post('/api/gothram', commonController.createGothram);

// Version API endpoint
router.get('/api/version', getVersionEndpoint);

// View endpoints (if needed)
router.get('/nakshatra', (req, res) => res.json([]));
router.get('/gothram', (req, res) => res.json([]));

module.exports = router;
