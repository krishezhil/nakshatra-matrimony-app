const { getProfiles } = require('./ProfileService');
const { 
  maleUthamamData, 
  maleMathimamData, 
  femaleUthamamData, 
  femaleMathimamData 
} = require('./MatchingDataService');
const { checkSingleCompatibility } = require('./RasiCompatibilityService');
const log = require('../utils/logger');

/**
 * Matching Algorithm Service
 * Extracted from matchingController.js - maintains exact same functionality
 * Handles nakshatra-based matching algorithms with porutham calculations
 */

// Threshold constant for matching algorithms
const threshold = 3;

/**
 * Female → Male matching algorithm
 * @param {number} femaleNakshatraId - The nakshatra ID of the female seeker
 * @param {boolean} includeMathimam - Whether to include mathimam matches
 * @param {string|null} seekerRasi - Rasi/Lagnam of the seeker for compatibility check
 * @param {boolean} enableRasiCompatibility - Whether to apply rasi compatibility filtering
 * @param {Object} logger - Logger instance for debugging and tracing
 * @returns {Array} Array of matching male profiles with porutham scores
 */
function findMatchingMales(femaleNakshatraId, includeMathimam, seekerRasi = null, enableRasiCompatibility = false, logger) {
  const profiles = getProfiles(); // Get fresh profile data
  
  logger.debug('Finding matching males', { 
    femaleNakshatraId, 
    includeMathimam,
    seekerRasi,
    enableRasiCompatibility,
    totalProfiles: profiles.length 
  });
  
  // Build a map of nakshatraid to porutham value with source tracking
  const poruthamMap = {};
  const uthamamRow = maleUthamamData.find(
    (r) => r.female_nakshatra_id === femaleNakshatraId
  );
  if (uthamamRow) {
    uthamamRow.matching.forEach((m) => {
      if (m.value > threshold) poruthamMap[m.male_nakshatra_id] = { value: m.value, source: 'uthamam' };
    });
  }
  if (includeMathimam) {
    const mathimamRow = maleMathimamData.find(
      (r) => r.female_nakshatra_id === femaleNakshatraId
    );
    if (mathimamRow) {
      mathimamRow.matching.forEach((m) => {
        if (m.value > threshold && !poruthamMap[m.male_nakshatra_id]) {
          poruthamMap[m.male_nakshatra_id] = { value: m.value, source: 'mathimam' };
        }
      });
    }
  }
  
  // Find matching males and enrich with porutham and source
  let matchingMales = profiles
    .filter(
      (p) =>
        p.gender === "Male" &&
        poruthamMap[parseInt(p.nakshatraid, 10)] !== undefined
    )
    .map(p => {
      const matchInfo = poruthamMap[parseInt(p.nakshatraid, 10)];
      return { 
        ...p, 
        porutham: matchInfo.value,
        matchingSource: matchInfo.source
      };
    });
  
  // Apply Rasi compatibility filtering if enabled and seekerRasi is provided
  if (enableRasiCompatibility && seekerRasi && seekerRasi.trim() !== '') {
    const beforeCount = matchingMales.length;
    try {
      matchingMales = matchingMales.filter((p) => {
        try {
          return checkSingleCompatibility(p.rasi_lagnam, seekerRasi);
        } catch (compatibilityError) {
          logger.warn('Rasi compatibility check failed for male profile in nakshatra search', {
            profileId: p.id,
            matchRasi: p.rasi_lagnam,
            seekerRasi,
            errorMessage: compatibilityError.message
          });
          return false;
        }
      });
      
      logger.debug('Applied rasi compatibility filter in nakshatra search (males)', {
        femaleNakshatraId,
        seekerRasi,
        beforeCount,
        afterCount: matchingMales.length,
        filteredOut: beforeCount - matchingMales.length
      });
    } catch (rasiError) {
      logger.error('Rasi compatibility filtering failed in nakshatra search (males)', {
        femaleNakshatraId,
        seekerRasi,
        errorMessage: rasiError.message
      }, rasiError);
      // Don't throw error - just log and continue without rasi filtering
    }
  }
  
  logger.debug('Male matching process completed', {
    femaleNakshatraId,
    candidatesCount: profiles.filter(p => p.gender === 'Male').length,
    matchingMalesFound: matchingMales.length,
    poruthamMapSize: Object.keys(poruthamMap).length,
    rasiFilterApplied: enableRasiCompatibility && seekerRasi
  });

  return matchingMales;
}

/**
 * Male → Female matching algorithm
 * @param {number} maleNakshatraId - The nakshatra ID of the male seeker
 * @param {boolean} includeMathimam - Whether to include mathimam matches
 * @param {string|null} seekerRasi - Rasi/Lagnam of the seeker for compatibility check
 * @param {boolean} enableRasiCompatibility - Whether to apply rasi compatibility filtering
 * @param {Object} logger - Logger instance for debugging and tracing
 * @returns {Array} Array of matching female profiles with porutham scores
 */
function findMatchingFemales(maleNakshatraId, includeMathimam, seekerRasi = null, enableRasiCompatibility = false, logger) {
  const profiles = getProfiles(); // Get fresh profile data
  
  logger.debug('Finding matching females', { 
    maleNakshatraId, 
    includeMathimam,
    seekerRasi,
    enableRasiCompatibility,
    totalProfiles: profiles.length 
  });
  
  // Build a map of nakshatraid to porutham value with source tracking
  const poruthamMap = {};
  const uthamamRow = femaleUthamamData.find(
    (r) => r.male_nakshatra_id === maleNakshatraId
  );
  if (uthamamRow) {
    uthamamRow.matching.forEach((f) => {
      if (f.value > threshold) poruthamMap[f.female_nakshatra_id] = { value: f.value, source: 'uthamam' };
    });
  }
  if (includeMathimam) {
    const mathimamRow = femaleMathimamData.find(
      (r) => r.male_nakshatra_id === maleNakshatraId
    );
    if (mathimamRow) {
      mathimamRow.matching.forEach((f) => {
        if (f.value > threshold && !poruthamMap[f.female_nakshatra_id]) {
          poruthamMap[f.female_nakshatra_id] = { value: f.value, source: 'mathimam' };
        }
      });
    }
  }
  
  // Find matching females and enrich with porutham and source
  let matchingFemales = profiles
    .filter(
      (p) =>
        p.gender === "Female" &&
        poruthamMap[parseInt(p.nakshatraid, 10)] !== undefined
    )
    .map(p => {
      const matchInfo = poruthamMap[parseInt(p.nakshatraid, 10)];
      return { 
        ...p, 
        porutham: matchInfo.value,
        matchingSource: matchInfo.source
      };
    });
  
  // Apply Rasi compatibility filtering if enabled and seekerRasi is provided
  if (enableRasiCompatibility && seekerRasi && seekerRasi.trim() !== '') {
    const beforeCount = matchingFemales.length;
    try {
      matchingFemales = matchingFemales.filter((p) => {
        try {
          return checkSingleCompatibility(seekerRasi, p.rasi_lagnam);
        } catch (compatibilityError) {
          logger.warn('Rasi compatibility check failed for female profile in nakshatra search', {
            profileId: p.id,
            matchRasi: p.rasi_lagnam,
            seekerRasi,
            errorMessage: compatibilityError.message
          });
          return false;
        }
      });
      
      logger.debug('Applied rasi compatibility filter in nakshatra search (females)', {
        maleNakshatraId,
        seekerRasi,
        beforeCount,
        afterCount: matchingFemales.length,
        filteredOut: beforeCount - matchingFemales.length
      });
    } catch (rasiError) {
      logger.error('Rasi compatibility filtering failed in nakshatra search (females)', {
        maleNakshatraId,
        seekerRasi,
        errorMessage: rasiError.message
      }, rasiError);
      // Don't throw error - just log and continue without rasi filtering
    }
  }
  
  logger.debug('Female matching process completed', {
    maleNakshatraId,
    candidatesCount: profiles.filter(p => p.gender === 'Female').length,
    matchingFemalesFound: matchingFemales.length,
    poruthamMapSize: Object.keys(poruthamMap).length,
    rasiFilterApplied: enableRasiCompatibility && seekerRasi
  });
  
  return matchingFemales;
}

// Initialize service
log.info('Matching algorithm service initialized', {
  source: 'MatchingAlgorithmService',
  threshold,
  availableFunctions: ['findMatchingMales', 'findMatchingFemales'],
  dependentServices: ['ProfileService', 'MatchingDataService', 'RasiCompatibilityService']
});

module.exports = {
  findMatchingMales,
  findMatchingFemales
};