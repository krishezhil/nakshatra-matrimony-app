const { getProfiles } = require('./ProfileService');
const { findMatchingMales, findMatchingFemales } = require('./MatchingAlgorithmService');
const log = require('../utils/logger');

/**
 * Matching Orchestrator Service
 * Extracted from matchingController.js - maintains exact same functionality
 * Handles profile-based and nakshatra-based matching orchestration
 */

/**
 * Profile-based matching: looks up profile by ID and delegates to gender-specific matching
 * @param {string|number} profileId - The ID of the profile to find matches for
 * @param {boolean} includeMathimam - Whether to include mathimam matches
 * @param {Object} logger - Logger instance for debugging and tracing
 * @returns {Array} Array of matching profiles
 */
function findMatches(profileId, includeMathimam = false, logger) {
  const profiles = getProfiles(); // Get fresh profile data
  
  if (!Array.isArray(profiles)) {
    logger.error('Profiles data is not loaded or not an array');
    return [];
  }
  
  const profile = profiles.find((p) => p.id.toString() === profileId.toString());
  if (!profile) {
    logger.warn('Profile not found for matching', { profileId, totalProfiles: profiles.length });
    return [];
  }
  
  const nakshatraId = parseInt(profile.nakshatraid, 10);
  logger.info('Profile found for matching', {
    profileId,
    name: profile.name,
    gender: profile.gender,
    nakshatraId,
    includeMathimam
  });
  
  if (profile.gender === "Male") {
    return findMatchingFemales(nakshatraId, includeMathimam, null, false, logger);
  } else if (profile.gender === "Female") {
    return findMatchingMales(nakshatraId, includeMathimam, null, false, logger);
  } else {
    logger.warn('Unknown gender for profile matching', { profileId, gender: profile.gender });
    return [];
  }
}

/**
 * Direct nakshatra-based matching: matches by nakshatra ID and gender
 * @param {string|number} nakshatraId - The nakshatra ID to find matches for
 * @param {string} gender - Gender of the seeker (Male/Female)
 * @param {boolean} includeMathimam - Whether to include mathimam matches
 * @param {string|null} seekerRasi - Rasi/Lagnam of the seeker for compatibility check
 * @param {boolean} enableRasiCompatibility - Whether to apply rasi compatibility filtering
 * @param {Object} logger - Logger instance for debugging and tracing
 * @returns {Array} Array of matching profiles
 */
function findMatchesByNakshatraGender(nakshatraId, gender, includeMathimam = false, seekerRasi = null, enableRasiCompatibility = false, logger) {
  nakshatraId = parseInt(nakshatraId, 10);
  
  logger.info('Finding matches by nakshatra and gender', {
    nakshatraId,
    gender,
    includeMathimam,
    seekerRasi,
    enableRasiCompatibility
  });
  
  if (gender === "Male") {
    return findMatchingFemales(nakshatraId, includeMathimam, seekerRasi, enableRasiCompatibility, logger);
  } else if (gender === "Female") {
    return findMatchingMales(nakshatraId, includeMathimam, seekerRasi, enableRasiCompatibility, logger);
  } else {
    logger.warn('Unknown gender for nakshatra matching', { nakshatraId, gender });
    return [];
  }
}

// Initialize service
log.info('Matching orchestrator service initialized', {
  source: 'MatchingOrchestratorService',
  availableFunctions: ['findMatches', 'findMatchesByNakshatraGender'],
  dependentServices: ['ProfileService', 'MatchingAlgorithmService']
});

module.exports = {
  findMatches,
  findMatchesByNakshatraGender
};