const { checkSingleCompatibility } = require('./RasiCompatibilityService');
const { calculateAge } = require('../utils/AgeCalculator');
const { 
  validateQualification,
  validateRegion,
  validateRegions,
  validateIncomeRange
} = require('./ValidationService');
const { 
  AppError, 
  ERROR_MESSAGES, 
  ERROR_TYPES 
} = require('../utils/errorHandler');
const log = require('../utils/logger');

/**
 * Matching Filter Service
 * Extracted from matchingController.js - maintains exact same functionality
 * Handles all advanced filtering operations on match results
 */

/**
 * Calculates age for all matching profiles with error handling
 * @param {Array} matches - The matches array to process
 * @param {Object} logger - Logger instance for debugging and tracing
 * @returns {Array} Matches array with age calculated for each profile
 */
function calculateAgeForMatches(matches, logger) {
  let validProfilesCount = 0;
  let ageCalculationErrors = 0;
  
  const processedMatches = matches.map(p => {
    try {
      const birthdate = p.birth_date;
      const age = calculateAge(birthdate, p.id || p.serial_no, 'Match');
      validProfilesCount++;
      return { ...p, age };
    } catch (ageError) {
      ageCalculationErrors++;
      logger.warn('[WARN] Age calculation failed for profile', {
        phase: 'AGE_CALCULATION',
        profileId: p.id,
        birthDate: p.birth_date,
        errorMessage: ageError.message
      });
      return { ...p, age: undefined };
    }
  });

  logger.trace('[TRACE] Age calculation completed', {
    phase: 'AGE_CALCULATION',
    validProfiles: validProfilesCount,
    ageErrors: ageCalculationErrors,
    totalProfiles: matches.length
  });
  
  return processedMatches;
}

/**
 * Applies gothram compatibility filtering - removes profiles with same gothram
 * @param {Array} matches - The matches array to filter
 * @param {Object} seekerProfile - The seeker profile object containing gothram
 * @param {Object} logger - Logger instance for debugging and tracing
 * @returns {Array} Filtered matches array with same gothram profiles removed
 */
function applyGothramCompatibilityFilter(matches, seekerGothram, logger) {
  const beforeCount = matches.length;
  
  // If seeker gothram is missing/null, consider all profiles as non-compatible (return empty array)
  if (!seekerGothram || seekerGothram.trim() === '') {
    logger.warn('[WARN] Seeker gothram missing - filtering out all matches', {
      phase: 'GOTHRAM_FILTERING',
      seekerGothram: seekerGothram || 'null',
      beforeCount,
      afterCount: 0,
      reason: 'Missing seeker gothram makes all profiles incompatible'
    });
    
    return []; // Return empty array - no compatible matches when seeker gothram is missing
  }
  
  const normalizedSeekerGothram = seekerGothram.trim().toLowerCase();
  
  // Filter out profiles with same gothram (same gothram = not compatible for marriage)
  const filteredMatches = matches.filter(profile => {
    try {
      // If candidate gothram is missing/null, assume compatible (include in results)
      if (!profile.gothram || profile.gothram.trim() === '') {
        return true;
      }
      
      const candidateGothram = profile.gothram.trim().toLowerCase();
      const isCompatible = candidateGothram !== normalizedSeekerGothram;
      
      if (!isCompatible) {
        logger.warn('Profile filtered due to same gothram', {
          phase: 'GOTHRAM_FILTERING',
          candidateId: profile.id,
          candidateName: profile.name,
          gothram: profile.gothram
        });
      }
      
      return isCompatible;
    } catch (error) {
      logger.error('Error during gothram compatibility check', {
        phase: 'GOTHRAM_FILTERING',
        candidateId: profile.id,
        candidateName: profile.name,
        error: error.message
      });
      // Include profile in case of error to avoid losing matches
      return true;
    }
  });
  
  const filteredCount = beforeCount - filteredMatches.length;
  if (filteredCount > 0) {
    logger.info('Gothram filtering completed', {
      phase: 'GOTHRAM_FILTERING',
      seekerGothram: seekerGothram,
      profilesFiltered: filteredCount,
      remainingProfiles: filteredMatches.length
    });
  }
  
  return filteredMatches;
}

/**
 * Applies age filtering based on Indian matrimonial standards
 * Male seeker: Female candidates should be ≤ male's age (younger or same age)
 * Female seeker: Male candidates should be ≥ female's age (older or same age)
 * @param {Array} matches - The matches array to filter
 * @param {number} seekerAgeNum - The validated seeker age number
 * @param {string} seekerGender - The gender of the seeker ('Male' or 'Female')
 * @param {Object} logger - Logger instance for debugging and tracing
 * @returns {Array} Filtered matches array
 */
function applyAgeFilter(matches, seekerAgeNum, seekerGender, logger) {
  const beforeCount = matches.length;
  
  let minAge, maxAge, filterLogic;
  
  if (seekerGender === 'Male') {
    // Male seeker: Female candidates should be ≤ male's age
    minAge = 18; // Minimum matrimonial age
    maxAge = seekerAgeNum;
    filterLogic = 'Female candidates ≤ Male age (Indian standard)';
  } else if (seekerGender === 'Female') {
    // Female seeker: Male candidates should be ≥ female's age  
    minAge = seekerAgeNum;
    maxAge = 75; // Maximum matrimonial age
    filterLogic = 'Male candidates ≥ Female age (Indian standard)';
  } else {
    // Fallback to current logic for edge cases
    minAge = seekerAgeNum - 5;
    maxAge = seekerAgeNum + 5;
    filterLogic = 'Gender-neutral ±5 years (fallback)';
  }
  
  const filteredMatches = matches.filter(p => {
    if (p.age === undefined || p.age === null) return false;
    return p.age >= minAge && p.age <= maxAge;
  });
  
  logger.trace('[TRACE] Applied Indian standard age filter', {
    phase: 'AGE_FILTERING',
    seekerAge: seekerAgeNum,
    seekerGender: seekerGender,
    ageRange: `${minAge}-${maxAge}`,
    filterLogic: filterLogic,
    beforeCount,
    afterCount: filteredMatches.length,
    filteredOut: beforeCount - filteredMatches.length
  });
  
  return filteredMatches;
}

/**
 * Applies user age preference filtering (additional constraint on top of default age filtering)
 * Male seeker: Sets minimum age for female candidates (agePreference to seekerAge)
 * Female seeker: Sets maximum age for male candidates (seekerAge to agePreference)
 * @param {Array} matches - The matches array to filter (already age-filtered by default logic)
 * @param {number} seekerAge - The seeker's age
 * @param {string} seekerGender - The seeker's gender ('Male' or 'Female')
 * @param {number|null} agePreference - User's age preference (optional)
 * @param {Object} logger - Logger instance for debugging and tracing
 * @returns {Array} Further filtered matches array
 */
function applyAgePreferenceFilter(matches, seekerAge, seekerGender, agePreference, logger) {
  logger.info('[DEBUG] Age preference filter called', {
    phase: 'AGE_PREFERENCE_FILTER_START',
    seekerAge,
    seekerGender,
    agePreference,
    inputMatchesCount: matches.length
  });
  
  if (!agePreference) {
    logger.trace('[TRACE] No age preference provided, skipping preference filter', {
      phase: 'AGE_PREFERENCE_FILTERING',
      matchesCount: matches.length
    });
    return matches;
  }
  
  const beforeCount = matches.length;
  let filteredMatches;
  let filterLogic;
  
  if (seekerGender === 'Male') {
    // Male seeker: Show females from agePreference to seekerAge
    // Default was: 18 to seekerAge
    // Now: agePreference to seekerAge
    filteredMatches = matches.filter(p => {
      if (p.age === undefined || p.age === null) return false;
      return p.age >= agePreference && p.age <= seekerAge;
    });
    filterLogic = `Female candidates ${agePreference}-${seekerAge} (user preference)`;
  } else if (seekerGender === 'Female') {
    // Female seeker: Show males from seekerAge to agePreference  
    // Default was: seekerAge to 75
    // Now: seekerAge to agePreference
    filteredMatches = matches.filter(p => {
      if (p.age === undefined || p.age === null) return false;
      return p.age >= seekerAge && p.age <= agePreference;
    });
    filterLogic = `Male candidates ${seekerAge}-${agePreference} (user preference)`;
  } else {
    // Fallback - no additional filtering
    filteredMatches = matches;
    filterLogic = 'No gender-specific preference filtering';
  }
  
  logger.info('[INFO] Applied age preference filter', {
    phase: 'AGE_PREFERENCE_FILTERING',
    seekerAge,
    seekerGender,
    agePreference,
    filterLogic,
    beforeCount,
    afterCount: filteredMatches.length,
    restrictedOut: beforeCount - filteredMatches.length
  });
  
  return filteredMatches;
}

/**
 * Applies qualification filtering with hierarchical matching option
 * When exactQualification=false: "School" finds School+Diploma+UG+PG+PHD+Doctor+Others
 * When exactQualification=true: "School" finds only exact School matches
 * @param {Array} matches - The matches array to filter
 * @param {string} qualification - The qualification to filter by
 * @param {boolean} exactQualification - Whether to use exact matching or hierarchical
 * @param {Object} logger - Logger instance for debugging and tracing
 * @returns {Array} Filtered matches array
 */
function applyQualificationFilter(matches, qualification, exactQualification, logger) {
  const beforeCount = matches.length;
  
  // Use ValidationService for validation
  validateQualification(qualification, logger);
  
  let filteredMatches;
  
  if (exactQualification) {
    filteredMatches = matches.filter(p => p.qualification === qualification);
  } else {
    // Hierarchical matching: "X or higher" means X and all higher qualifications
    const qualificationHierarchy = {
      'School': ['School', 'Diploma', 'UG', 'PG', 'PHD', 'Doctor'],  // School or higher
      'Diploma': ['Diploma', 'UG', 'PG', 'PHD', 'Doctor'],           // Diploma or higher  
      'UG': ['UG', 'PG', 'PHD', 'Doctor'],                          // UG or higher
      'PG': ['PG', 'PHD', 'Doctor'],                                // PG or higher
      'PHD': ['PHD'],                                               // PHD only (exact match)
      'Doctor': ['Doctor']                                          // Doctor only (exact match)
    };
    
    const acceptableQualifications = qualificationHierarchy[qualification] || [qualification];
    filteredMatches = matches.filter(p => 
      p.qualification && acceptableQualifications.includes(p.qualification)
    );
  }
  
  logger.trace('[TRACE] Applied qualification filter', {
    phase: 'QUALIFICATION_FILTERING',
    qualification,
    exactMatch: exactQualification,
    beforeCount,
    afterCount: filteredMatches.length,
    filteredOut: beforeCount - filteredMatches.length
  });
  
  return filteredMatches;
}

/**
 * Applies region filtering with exact matching (supports both single region and multi-region arrays)
 * @param {Array} matches - The matches array to filter
 * @param {string|Array} regions - The region(s) to filter by
 * @param {Object} logger - Logger instance for debugging and tracing
 * @returns {Array} Filtered matches array
 */
function applyRegionFilter(matches, regions, logger) {
  const beforeCount = matches.length;
  
  // Handle null/undefined input
  if (!regions) {
    logger.trace('[TRACE] No region filter applied (null/undefined input)', {
      phase: 'REGION_FILTERING',
      regions: 'none',
      beforeCount,
      afterCount: beforeCount
    });
    return matches;
  }
  
  // Normalize input to array format without mutating original parameter
  let regionsArray;
  if (typeof regions === 'string') {
    if (!regions.trim()) {
      // Empty string - no region filter
      logger.trace('[TRACE] No region filter applied (empty string)', {
        phase: 'REGION_FILTERING',
        regions: 'none',
        beforeCount,
        afterCount: beforeCount
      });
      return matches;
    }
    regionsArray = [regions.trim()];
  } else if (Array.isArray(regions)) {
    regionsArray = regions;
  } else {
    // Invalid input type
    logger.trace('[TRACE] No region filter applied (invalid input type)', {
      phase: 'REGION_FILTERING',
      regions: 'invalid_type',
      inputType: typeof regions,
      beforeCount,
      afterCount: beforeCount
    });
    return matches;
  }
  
  // If empty array, return all matches
  if (regionsArray.length === 0) {
    logger.trace('[TRACE] No region filter applied (empty array)', {
      phase: 'REGION_FILTERING',
      regions: 'none',
      beforeCount,
      afterCount: beforeCount
    });
    return matches;
  }
  
  // Validate regions array using new validation function
  validateRegions(regionsArray, logger);
  
  // Filter matches where profile region is in the selected regions array
  const filteredMatches = matches.filter(profile => 
    regionsArray.includes(profile.region)
  );
  
  logger.trace('[TRACE] Applied multi-region filter', {
    phase: 'REGION_FILTERING',
    selectedRegions: regionsArray,
    regionCount: regionsArray.length,
    matchingLogic: 'profile.region IN selectedRegions',
    beforeCount,
    afterCount: filteredMatches.length,
    filteredOut: beforeCount - filteredMatches.length
  });
  
  return filteredMatches;
}

/**
 * Applies income range filtering
 * @param {Array} matches - The matches array to filter
 * @param {number|null} minIncomeNum - Minimum income (null if not specified)
 * @param {number|null} maxIncomeNum - Maximum income (null if not specified)
 * @param {Object} logger - Logger instance for debugging and tracing
 * @returns {Array} Filtered matches array
 * @throws {AppError} If minimum income is greater than maximum income
 */
function applyIncomeFilter(matches, minIncomeNum, maxIncomeNum, logger) {
  const beforeCount = matches.length;
  
  if (minIncomeNum !== null && maxIncomeNum !== null && minIncomeNum > maxIncomeNum) {
    throw new AppError(
      'Minimum income cannot be greater than maximum income.',
      400,
      ERROR_TYPES.VALIDATION,
      { minIncome: minIncomeNum, maxIncome: maxIncomeNum }
    );
  }
  
  let nullIncomeCount = 0;
  let validIncomeCount = 0;
  let inRangeCount = 0;
  let outOfRangeCount = 0;
  
  const filteredMatches = matches.filter(p => {
    const profileIncome = parseFloat(p.monthly_income);
    
    // Include profiles with null/missing income (inclusive approach)
    if (isNaN(profileIncome)) {
      nullIncomeCount++;
      logger.trace('[TRACE] Including profile with null/missing income', {
        phase: 'INCOME_FILTERING',
        profileId: p.id || 'unknown',
        monthly_income: p.monthly_income,
        reason: 'inclusive_null_handling'
      });
      return true;
    }
    
    validIncomeCount++;
    
    if (minIncomeNum !== null && profileIncome < minIncomeNum) {
      outOfRangeCount++;
      return false;
    }
    if (maxIncomeNum !== null && profileIncome > maxIncomeNum) {
      outOfRangeCount++;
      return false;
    }
    
    inRangeCount++;
    return true;
  });
  
  logger.info('[INFO] Applied income filter with inclusive approach', {
    phase: 'INCOME_FILTERING',
    minIncome: minIncomeNum,
    maxIncome: maxIncomeNum,
    beforeCount,
    afterCount: filteredMatches.length,
    nullIncomeIncluded: nullIncomeCount,
    validIncomeProcessed: validIncomeCount,
    inRangeMatches: inRangeCount,
    outOfRangeExcluded: outOfRangeCount,
    inclusionRate: `${Math.round((filteredMatches.length / beforeCount) * 100)}%`,
    filterApproach: 'inclusive'
  });
  
  return filteredMatches;
}

/**
 * Applies remarried status filtering
 * @param {Array} matches - The matches array to filter
 * @param {boolean} includeRemarried - Whether to include remarried profiles
 * @param {Object} logger - Logger instance for debugging and tracing
 * @returns {Array} Filtered matches array
 */
function applyRemarriedFilter(matches, includeRemarried, logger) {
  if (includeRemarried) {
    return matches; // No filtering needed
  }
  
  const beforeCount = matches.length;
  
  const filteredMatches = matches.filter(p => 
    p.is_remarried !== 'true' && 
    p.is_remarried !== true
  );
  
  logger.trace('[TRACE] Applied remarried filter', {
    phase: 'REMARRIED_FILTERING',
    includeRemarried: false,
    beforeCount,
    afterCount: filteredMatches.length,
    filteredOut: beforeCount - filteredMatches.length
  });
  
  return filteredMatches;
}

/**
 * Applies Rasi compatibility filtering for serial search mode with valid seeker profile
 * @param {Array} matches - The matches array to filter
 * @param {boolean} enableRasiCompatibility - Whether rasi compatibility is enabled
 * @param {Object|null} seekerProfile - The seeker's profile object with rasi_lagnam, or null
 * @param {string} searchMode - The current search mode (only applies to 'serial' mode)
 * @param {Object} logger - Logger instance for debugging and tracing
 * @returns {Array} Filtered matches array (unfiltered if not serial mode or seekerProfile is null)
 */
function applyRasiCompatibilityFilter(matches, enableRasiCompatibility, seekerProfile, searchMode, logger) {
  // Restore original business rule: only apply in serial mode with valid seeker profile
  if (!enableRasiCompatibility || searchMode !== 'serial' || !seekerProfile) {
    return matches; // No filtering needed
  }
  
  const beforeCount = matches.length;
  
  if (!seekerProfile.rasi_lagnam) {
    logger.warn('[WARN] Seeker profile missing rasi_lagnam for compatibility check', {
      phase: 'RASI_FILTERING',
      profileId: seekerProfile.id || 'unknown',
      serialNo: seekerProfile.serial_no || 'unknown'
    });
    return matches; // Return unfiltered if seeker rasi missing
  }
  
  const filteredMatches = matches.filter(p => {
    if (!p.rasi_lagnam) return false;
    
    try {
      return checkSingleCompatibility(seekerProfile.rasi_lagnam, p.rasi_lagnam);
    } catch (compatibilityError) {
      logger.warn('[WARN] Rasi compatibility check failed for profile', {
        phase: 'RASI_FILTERING',
        profileId: p.id,
        seekerRasi: seekerProfile.rasi_lagnam,
        matchRasi: p.rasi_lagnam,
        errorMessage: compatibilityError.message
      });
      return false;
    }
  });
  
  logger.trace('[TRACE] Applied rasi compatibility filter', {
    phase: 'RASI_FILTERING',
    seekerProfileId: seekerProfile.id || 'unknown',
    seekerRasi: seekerProfile.rasi_lagnam || 'unknown',
    beforeCount,
    afterCount: filteredMatches.length,
    filteredOut: beforeCount - filteredMatches.length
  });
  
  return filteredMatches;
}

/**
 * Sorts matches by three-level hierarchy: Match Type → Porutham → Nakshatra
 * Level 1: Match Type (Uthamam first, then Mathimam)
 * Level 2: Porutham Score (highest first)
 * Level 3: Nakshatra ID (lowest first as tiebreaker)
 * @param {Array} matches - The matches array to sort
 * @param {Object} logger - Logger instance for debugging and tracing
 * @returns {Array} Sorted matches array
 */
function sortMatchesByPorutham(matches, logger) {
  try {
    matches.sort((a, b) => {
      // Level 1: Match Type (Uthamam → Mathimam)
      const getTypeOrder = (matchingSource) => {
        if (matchingSource === 'uthamam') return 1;
        if (matchingSource === 'mathimam') return 2;
        return 3;
      };
      const typeA = getTypeOrder(a.matchingSource);
      const typeB = getTypeOrder(b.matchingSource);
      
      if (typeA !== typeB) return typeA - typeB;
      
      // Level 2: Porutham Score (highest first)
      const scoreA = parseFloat(a.porutham) || 0;
      const scoreB = parseFloat(b.porutham) || 0;
      
      if (scoreA !== scoreB) return scoreB - scoreA;
      
      // Level 3: Nakshatra ID (lowest first as tiebreaker)
      const nakshatraA = parseInt(a.nakshatraid) || 0;
      const nakshatraB = parseInt(b.nakshatraid) || 0;
      return nakshatraA - nakshatraB;
    });
    
    logger.trace('[TRACE] Matches sorted by hierarchy: Match Type → Porutham → Nakshatra', {
      phase: 'SORTING',
      matchesCount: matches.length,
      sortingLevels: {
        level1: 'Match Type (Uthamam → Mathimam)',
        level2: 'Porutham Score (highest first)',
        level3: 'Nakshatra ID (lowest first)'
      },
      topScore: matches.length > 0 ? matches[0].porutham : 'N/A',
      topType: matches.length > 0 ? matches[0].matchingSource : 'N/A'
    });
    
    return matches;
  } catch (sortError) {
    logger.warn('[WARN] Failed to sort matches by hierarchy', {
      phase: 'SORTING',
      errorMessage: sortError.message,
      fallback: 'Returning original array'
    });
    // Return original array if sorting fails
    return matches;
  }
}

/**
 * Applies nakshatra preferences filtering to match results
 * @param {Array} matches - The matches array to filter
 * @param {Array} nakshatraPreferences - Array of preferred nakshatra IDs
 * @param {Object} logger - Logger instance for debugging and tracing
 * @returns {Array} Filtered matches array
 */
function applyNakshatraPreferenceFilter(matches, nakshatraPreferences, logger) {
  const beforeCount = matches.length;
  
  // Handle null/undefined/empty input - no filtering
  if (!nakshatraPreferences || !Array.isArray(nakshatraPreferences) || nakshatraPreferences.length === 0) {
    logger.trace('[TRACE] No nakshatra preference filter applied', {
      phase: 'NAKSHATRA_PREFERENCE_FILTERING',
      reason: 'no_preferences_specified',
      beforeCount,
      afterCount: beforeCount
    });
    return matches;
  }
  
  // Convert preferences to integers and remove duplicates
  const preferenceIds = [...new Set(nakshatraPreferences.map(id => parseInt(id, 10)))].filter(id => !isNaN(id));
  
  if (preferenceIds.length === 0) {
    logger.trace('[TRACE] No nakshatra preference filter applied', {
      phase: 'NAKSHATRA_PREFERENCE_FILTERING',
      reason: 'no_valid_preferences',
      originalPreferences: nakshatraPreferences,
      beforeCount,
      afterCount: beforeCount
    });
    return matches;
  }
  
  logger.trace('[TRACE] Applying nakshatra preference filter', {
    phase: 'NAKSHATRA_PREFERENCE_FILTERING',
    preferenceIds,
    preferenceCount: preferenceIds.length,
    beforeCount
  });
  
  // Filter matches by nakshatra preferences
  const filteredMatches = matches.filter(profile => {
    const profileNakshatraId = parseInt(profile.nakshatraid, 10);
    
    if (isNaN(profileNakshatraId)) {
      logger.warn('[WARN] Profile has invalid nakshatra ID', {
        phase: 'NAKSHATRA_PREFERENCE_FILTERING',
        profileId: profile.id || profile.serial_no,
        nakshatraid: profile.nakshatraid
      });
      return false; // Exclude profiles with invalid nakshatra IDs
    }
    
    return preferenceIds.includes(profileNakshatraId);
  });
  
  const afterCount = filteredMatches.length;
  const filteredCount = beforeCount - afterCount;
  
  logger.trace('[TRACE] Nakshatra preference filtering completed', {
    phase: 'NAKSHATRA_PREFERENCE_FILTERING',
    preferenceIds,
    beforeCount,
    afterCount,
    filteredCount,
    filteringEffectiveness: beforeCount > 0 ? ((filteredCount / beforeCount) * 100).toFixed(1) + '%' : '0%'
  });
  
  if (afterCount === 0 && beforeCount > 0) {
    logger.warn('[WARN] Nakshatra preference filter eliminated all matches', {
      phase: 'NAKSHATRA_PREFERENCE_FILTERING',
      preferenceIds,
      originalMatchCount: beforeCount,
      suggestion: 'Consider broadening nakshatra preferences or checking data quality'
    });
  }
  
  return filteredMatches;
}

// Initialize service
log.info('Matching filter service initialized', {
  source: 'MatchingFilterService',
  availableFunctions: [
    'calculateAgeForMatches',
    'applyGothramCompatibilityFilter',
    'applyAgeFilter',
    'applyQualificationFilter',
    'applyRegionFilter',
    'applyIncomeFilter',
    'applyRemarriedFilter',
    'applyRasiCompatibilityFilter',
    'applyNakshatraPreferenceFilter',
    'sortMatchesByPorutham'
  ],
  sortingHierarchy: {
    description: 'Three-level hierarchical sorting applied to all match results',
    level1: 'Match Type (Uthamam=1, Mathimam=2, Others=3)',
    level2: 'Porutham Score (highest to lowest: 10 → 0)',
    level3: 'Nakshatra ID (lowest to highest: 1 → 36, used as tiebreaker)',
    appliedTo: ['Web UI', 'PDF Export', 'Excel Export'],
    consistency: 'All three formats show identical ordering'
  },
  dependentServices: ['RasiCompatibilityService', 'AgeCalculator']
});

module.exports = {
  calculateAgeForMatches,
  applyGothramCompatibilityFilter,
  applyAgeFilter,
  applyAgePreferenceFilter,
  applyQualificationFilter,
  applyRegionFilter,
  applyIncomeFilter,
  applyRemarriedFilter,
  applyRasiCompatibilityFilter,
  applyNakshatraPreferenceFilter,
  sortMatchesByPorutham
};