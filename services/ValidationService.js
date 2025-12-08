const { getProfiles } = require('./ProfileService');
const { 
  AppError, 
  ERROR_MESSAGES, 
  ERROR_TYPES 
} = require('../utils/errorHandler');
const log = require('../utils/logger');

/**
 * Validation Service
 * Extracted from matchingController.js - maintains exact same functionality
 * Handles all parameter validation and business rule validation
 */

// Constants for validation
const VALID_REGIONS = [
  'Chennai', 'Chengalpattu', 'Thiruvallur', 'Kancheepuram', 
  'Vellore', 'Other Districts in TN', 'Pondicherry', 
  'Andhra Pradesh', 'Other States in India', 'Overseas', 
  'Others(TN)', 'Others(IND)'
];

/**
 * Validates search mode parameter
 * @param {string} searchMode - The search mode to validate
 * @param {Object} logger - Logger instance for debugging and tracing
 * @throws {AppError} If search mode is invalid
 */
function validateSearchMode(searchMode, logger) {
  logger.trace('[TRACE] Validating search mode', {
    phase: 'SEARCH_MODE_VALIDATION',
    searchMode
  });
  
  if (!['serial', 'nakshatra'].includes(searchMode)) {
    throw new AppError(
      ERROR_MESSAGES.INVALID_SEARCH_CRITERIA,
      400,
      ERROR_TYPES.VALIDATION,
      { searchMode, validModes: ['serial', 'nakshatra'] }
    );
  }
}

/**
 * Validates serial number for serial search mode
 * @param {string} serialNo - The serial number to validate
 * @param {string} searchMode - The current search mode
 * @param {Object} logger - Logger instance for debugging and tracing
 * @throws {AppError} If serial number is invalid or missing
 */
function validateSerialNumber(serialNo, searchMode, logger) {
  if (!serialNo || serialNo.trim() === '') {
    const errorMsg = 'Please enter a Serial No.';
    logger.warn('[WARN] Serial number missing for serial search mode', {
      phase: 'PARAMETER_VALIDATION',
      searchMode,
      serialNo
    });
    
    throw new AppError(
      errorMsg,
      400,
      ERROR_TYPES.VALIDATION,
      { field: 'serial_no', searchMode }
    );
  }
}

/**
 * Finds profile by serial number and validates existence
 * @param {string} serialNo - The serial number to lookup
 * @param {string} searchMode - The current search mode
 * @param {Object} logger - Logger instance for debugging and tracing
 * @returns {Object} The found profile with profileId set
 * @throws {AppError} If profile not found for serial number
 */
function validateAndFindProfileBySerial(serialNo, searchMode, logger) {
  const profiles = getProfiles(); // Get fresh profile data
  const serialNoNorm = serialNo.toString().trim().toLowerCase();
  const profile = profiles.find(p => 
    p.serial_no && 
    p.serial_no.toString().trim().toLowerCase() === serialNoNorm
  );
  
  if (profile) {
    logger.trace('[TRACE] Found profile by serial number', {
      phase: 'PROFILE_LOOKUP',
      serialNo,
      profileId: profile.id,
      profileName: profile.name
    });
    return { profileId: profile.id, profile };
  }
  
  const errorMsg = 'Please enter a valid Serial No.';
  logger.warn('[WARN] Profile not found for serial number', {
    phase: 'PROFILE_LOOKUP',
    serialNo,
    totalProfiles: profiles.length
  });
  
  throw new AppError(
    errorMsg,
    404,
    ERROR_TYPES.VALIDATION,
    { serialNo, searchMode }
  );
}

/**
 * Validates nakshatra ID for nakshatra search mode
 * @param {string} nakshatraid - The nakshatra ID to validate
 * @param {string} searchMode - The current search mode
 * @param {Object} logger - Logger instance for debugging and tracing
 * @throws {AppError} If nakshatra ID is invalid or missing
 */
function validateNakshatraId(nakshatraid, searchMode, logger) {
  if (!nakshatraid || nakshatraid.trim() === '') {
    throw new AppError(
      'Please select a Nakshatra ID.',
      400,
      ERROR_TYPES.VALIDATION,
      { field: 'nakshatraid', searchMode }
    );
  }
  
  const nakshatraIdNum = parseInt(nakshatraid);
  if (isNaN(nakshatraIdNum) || nakshatraIdNum < 1 || nakshatraIdNum > 36) {
    throw new AppError(
      'Invalid Nakshatra ID. Must be between 1 and 36.',
      400,
      ERROR_TYPES.VALIDATION,
      { field: 'nakshatraid', value: nakshatraid }
    );
  }
}

/**
 * Validates gender parameter for nakshatra search mode
 * @param {string} gender - The gender to validate
 * @param {string} searchMode - The current search mode
 * @param {Object} logger - Logger instance for debugging and tracing
 * @throws {AppError} If gender is invalid or missing
 */
function validateGender(gender, searchMode, logger) {
  if (!gender || !['Male', 'Female'].includes(gender)) {
    throw new AppError(
      'Please select a valid Gender (Male/Female).',
      400,
      ERROR_TYPES.VALIDATION,
      { field: 'gender', searchMode, providedGender: gender }
    );
  }
}

/**
 * Validates seeker Rasi/Lagnam when compatibility is enabled
 * @param {boolean} enableRasiCompatibility - Whether rasi compatibility is enabled
 * @param {string} seekerRasi - The seeker's rasi to validate
 * @param {string} searchMode - The current search mode
 * @param {Object} logger - Logger instance for debugging and tracing
 * @throws {AppError} If rasi is required but missing
 */
function validateSeekerRasi(enableRasiCompatibility, seekerRasi, searchMode, logger) {
  if (enableRasiCompatibility && searchMode === 'nakshatra') {
    if (!seekerRasi || seekerRasi.trim() === '') {
      throw new AppError(
        'Please select your Rasi/Lagnam when Rasi Compatibility is enabled.',
        400,
        ERROR_TYPES.VALIDATION,
        { field: 'seekerRasi', searchMode, enableRasiCompatibility: true }
      );
    }
  }
}

/**
 * Validates seeker age for filtering
 * @param {string} seekerAge - The seeker age to validate
 * @param {Object} logger - Logger instance for debugging and tracing
 * @throws {AppError} If age is invalid or out of range
 */
function validateSeekerAge(seekerAge, logger) {
  const seekerAgeNum = parseInt(seekerAge);
  if (isNaN(seekerAgeNum) || seekerAgeNum < 18 || seekerAgeNum > 100) {
    throw new AppError(
      'Invalid seeker age. Age must be between 18 and 100.',
      400,
      ERROR_TYPES.VALIDATION,
      { seekerAge, validRange: '18-100' }
    );
  }
  return seekerAgeNum;
}

/**
 * Validates qualification filter
 * @param {string} qualification - The qualification to validate
 * @param {Object} logger - Logger instance for debugging and tracing
 * @throws {AppError} If qualification is invalid
 */
function validateQualification(qualification, logger) {
  const validQualifications = ['School', 'Diploma', 'UG', 'PG', 'PHD', 'Doctor'];
  if (!validQualifications.includes(qualification)) {
    throw new AppError(
      'Invalid qualification filter.',
      400,
      ERROR_TYPES.VALIDATION,
      { qualification, validOptions: validQualifications }
    );
  }
}

/**
 * Validates region filter
 * @param {string} region - The region to validate
 * @param {Object} logger - Logger instance for debugging and tracing
 * @throws {AppError} If region is invalid
 */
function validateRegion(region, logger) {
  if (!VALID_REGIONS.includes(region)) {
    throw new AppError(
      'Invalid region filter.',
      400,
      ERROR_TYPES.VALIDATION,
      { region, validOptions: VALID_REGIONS }
    );
  }
}

/**
 * Validates multi-region filter (array of regions)
 * @param {Array} regions - The array of regions to validate
 * @param {Object} logger - Logger instance for debugging and tracing
 * @throws {AppError} If regions array is invalid or contains invalid regions
 */
function validateRegions(regions, logger) {
  if (!Array.isArray(regions)) {
    throw new AppError(
      'Regions must be provided as an array.',
      400,
      ERROR_TYPES.VALIDATION,
      { regions, expectedType: 'array', actualType: typeof regions }
    );
  }
  
  if (regions.length === 0) {
    // Allow empty array (no region filter)
    logger.trace('[TRACE] Empty regions array - no region filter applied', {
      phase: 'REGION_VALIDATION',
      regions: []
    });
    return;
  }
  
  const invalidRegions = regions.filter(region => !VALID_REGIONS.includes(region));
  
  if (invalidRegions.length > 0) {
    throw new AppError(
      `Invalid region(s) provided: ${invalidRegions.join(', ')}.`,
      400,
      ERROR_TYPES.VALIDATION,
      { 
        invalidRegions, 
        validOptions: VALID_REGIONS,
        providedRegions: regions,
        invalidCount: invalidRegions.length
      }
    );
  }
  
  logger.trace('[TRACE] Multi-region validation passed', {
    phase: 'REGION_VALIDATION',
    regions,
    regionCount: regions.length,
    allValid: true
  });
}

/**
 * Validates income range filters
 * @param {string} minIncome - The minimum income to validate
 * @param {string} maxIncome - The maximum income to validate
 * @param {Object} logger - Logger instance for debugging and tracing
 * @returns {Object} Parsed income values {minIncomeNum, maxIncomeNum}
 * @throws {AppError} If income values are invalid
 */
function validateIncomeRange(minIncome, maxIncome, logger) {
  let minIncomeNum = null;
  let maxIncomeNum = null;
  
  if (minIncome && minIncome.trim() !== '') {
    minIncomeNum = parseFloat(minIncome);
    if (isNaN(minIncomeNum) || minIncomeNum < 0) {
      throw new AppError(
        'Invalid minimum income value.',
        400,
        ERROR_TYPES.VALIDATION,
        { minIncome }
      );
    }
  }
  
  if (maxIncome && maxIncome.trim() !== '') {
    maxIncomeNum = parseFloat(maxIncome);
    if (isNaN(maxIncomeNum) || maxIncomeNum < 0) {
      throw new AppError(
        'Invalid maximum income value.',
        400,
        ERROR_TYPES.VALIDATION,
        { maxIncome }
      );
    }
  }
  
  return { minIncomeNum, maxIncomeNum };
}

/**
 * Validates nakshatra preferences filter parameters
 * @param {Array} nakshatraPreferences - Array of nakshatra IDs to filter by
 * @param {Object} logger - Logger instance for debugging and tracing
 * @throws {AppError} If nakshatra preferences are invalid
 */
function validateNakshatraPreferences(nakshatraPreferences, logger) {
  logger.trace('[TRACE] Validating nakshatra preferences', {
    phase: 'NAKSHATRA_PREFERENCES_VALIDATION',
    nakshatraPreferences,
    type: typeof nakshatraPreferences,
    isArray: Array.isArray(nakshatraPreferences)
  });
  
  // Allow null/undefined (no filter)
  if (!nakshatraPreferences) {
    return;
  }
  
  // Must be an array
  if (!Array.isArray(nakshatraPreferences)) {
    throw new AppError(
      'Invalid nakshatra preferences format. Must be an array.',
      400,
      ERROR_TYPES.VALIDATION,
      { nakshatraPreferences, type: typeof nakshatraPreferences }
    );
  }
  
  // Allow empty array (no filter)
  if (nakshatraPreferences.length === 0) {
    return;
  }
  
  // Validate each nakshatra ID
  const invalidIds = [];
  const validRange = { min: 1, max: 36 };
  
  nakshatraPreferences.forEach((id, index) => {
    const nakshatraId = parseInt(id, 10);
    
    if (isNaN(nakshatraId) || nakshatraId < validRange.min || nakshatraId > validRange.max) {
      invalidIds.push({ index, value: id, parsed: nakshatraId });
    }
  });
  
  if (invalidIds.length > 0) {
    throw new AppError(
      'Invalid nakshatra IDs found in preferences. Valid range is 1-36.',
      400,
      ERROR_TYPES.VALIDATION,
      { 
        invalidIds, 
        validRange,
        totalPreferences: nakshatraPreferences.length 
      }
    );
  }
  
  // Check for duplicates (warn but don't fail)
  const uniqueIds = [...new Set(nakshatraPreferences.map(id => parseInt(id, 10)))];
  if (uniqueIds.length !== nakshatraPreferences.length) {
    logger.warn('[WARN] Duplicate nakshatra IDs found in preferences', {
      phase: 'NAKSHATRA_PREFERENCES_VALIDATION',
      originalCount: nakshatraPreferences.length,
      uniqueCount: uniqueIds.length,
      preferences: nakshatraPreferences
    });
  }
}

// Initialize service
log.info('Validation service initialized', {
  source: 'ValidationService',
  availableFunctions: [
    'validateSearchMode',
    'validateSerialNumber', 
    'validateAndFindProfileBySerial',
    'validateNakshatraId',
    'validateGender',
    'validateSeekerRasi',
    'validateSeekerAge',
    'validateQualification',
    'validateRegion',
    'validateRegions',
    'validateIncomeRange',
    'validateNakshatraPreferences'
  ],
  dependentServices: ['ProfileService']
});

module.exports = {
  validateSearchMode,
  validateSerialNumber,
  validateAndFindProfileBySerial,
  validateNakshatraId,
  validateGender,
  validateSeekerRasi,
  validateSeekerAge,
  validateQualification,
  validateRegion,
  validateRegions,
  validateIncomeRange,
  validateNakshatraPreferences
};