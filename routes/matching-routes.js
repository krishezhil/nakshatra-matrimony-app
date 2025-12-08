// MatchingController: Handles nakshatra matching
const express = require('express');
const router = express.Router();
const { searchValidationRules, handleValidationErrors } = require('../utils/sanitization');
const { searchLimiter } = require('../utils/rateLimiting');

const matchingController = require('../controllers/matchingController');
const { nakshatraData } = require('../services/NakshatraService');

// API endpoints with validation and rate limiting
router.get('/api/find', searchLimiter, searchValidationRules, handleValidationErrors, matchingController.findMatching);
// Boilerplate for POST find-matching
router.post('/api/find', searchLimiter, searchValidationRules, handleValidationErrors, matchingController.findMatching);

// Helper endpoint for UI: get id by serial_no

// View endpoints
router.get('/find', (req, res) => {
    res.render('find-matching', {
        profiles: [],
        seekerProfile: null,
        form: {},
        error: null,
        nakshatraData: nakshatraData
    });
});
// HTML form POST route (non-API)
router.post('/find', searchLimiter, searchValidationRules, handleValidationErrors, matchingController.findMatching);
router.get('/shortlisted', (req, res) => res.render('short-listed-profiles'));

module.exports = router;
