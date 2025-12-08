// ExportController: Handles data export
const express = require('express');
const router = express.Router();
const { exportLimiter } = require('../utils/rateLimiting');

const exportController = require('../controllers/exportController');

// API endpoint with rate limiting
router.get('/api/export', exportLimiter, exportController.exportData);

// Export matching profiles endpoint (both GET and POST)
router.get('/matching-profiles', exportController.exportMatchingProfiles);
router.post('/matching-profiles', exportController.exportMatchingProfiles);

// Direct PDF export routes
router.get('/profiles/pdf', exportController.exportMatchingProfiles);
router.post('/profiles/pdf', exportController.exportMatchingProfiles);

// Direct Excel export routes  
router.get('/profiles/excel', exportController.exportMatchingProfiles);
router.post('/profiles/excel', exportController.exportMatchingProfiles);

// View endpoint (placeholder)
router.get('/export', (req, res) => res.send('Export functionality coming soon.'));

module.exports = router;
