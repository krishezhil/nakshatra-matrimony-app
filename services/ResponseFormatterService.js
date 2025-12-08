const { getNakshatraName, nakshatraData } = require('./NakshatraService');
const { calculateAge } = require('../utils/AgeCalculator');
const { createFormObject } = require('../utils/FormParser');
const { 
  AppError, 
  ERROR_MESSAGES, 
  ERROR_TYPES 
} = require('../utils/errorHandler');
const log = require('../utils/logger');

/**
 * Response Formatter Service
 * Generic service for formatting HTTP responses (JSON and EJS)
 * Handles profile enrichment, response structuring, and error handling
 */

/**
 * Enriches profiles with nakshatra names
 * @param {Array} profiles - Array of profile objects
 * @param {Object} logger - Logger instance for debugging and tracing
 * @returns {Array} Profiles with nakshatraName property added
 */
function enrichProfilesWithNakshatraNames(profiles, logger) {
  try {
    const enrichedProfiles = profiles.map(profile => ({
      ...profile,
      nakshatraName: getNakshatraName(profile.nakshatraid)
    }));
    
    logger.trace('[TRACE] Added nakshatra names to profiles', {
      phase: 'PROFILE_ENRICHMENT',
      profilesCount: enrichedProfiles.length,
      enrichmentType: 'nakshatra'
    });
    
    return enrichedProfiles;
  } catch (enrichmentError) {
    logger.warn('[WARN] Failed to add nakshatra names to profiles', {
      phase: 'PROFILE_ENRICHMENT',
      enrichmentType: 'nakshatra',
      errorMessage: enrichmentError.message
    });
    // Fallback to original profiles
    return profiles;
  }
}

/**
 * Enriches profiles with calculated ages
 * @param {Array} profiles - Array of profile objects
 * @param {Object} logger - Logger instance for debugging and tracing
 * @returns {Array} Profiles with age property added
 */
function enrichProfilesWithAge(profiles, logger) {
  let validProfilesCount = 0;
  let ageCalculationErrors = 0;
  
  try {
    const enrichedProfiles = profiles.map(profile => {
      try {
        const birthdate = profile.birth_date;
        const age = calculateAge(birthdate, profile.id || profile.serial_no, 'Profile');
        validProfilesCount++;
        return { ...profile, age };
      } catch (ageError) {
        ageCalculationErrors++;
        logger.warn('[WARN] Age calculation failed for profile', {
          phase: 'PROFILE_ENRICHMENT',
          enrichmentType: 'age',
          profileId: profile.id,
          birthDate: profile.birth_date,
          errorMessage: ageError.message
        });
        return { ...profile, age: undefined };
      }
    });
    
    logger.trace('[TRACE] Added age to profiles', {
      phase: 'PROFILE_ENRICHMENT',
      profilesCount: enrichedProfiles.length,
      enrichmentType: 'age',
      validProfiles: validProfilesCount,
      ageErrors: ageCalculationErrors
    });
    
    return enrichedProfiles;
  } catch (enrichmentError) {
    logger.warn('[WARN] Failed to add ages to profiles', {
      phase: 'PROFILE_ENRICHMENT',
      enrichmentType: 'age',
      errorMessage: enrichmentError.message
    });
    // Fallback to original profiles
    return profiles;
  }
}

/**
 * Formats data for JSON API response
 * @param {any} data - The main data to include in response
 * @param {Object} options - Response options
 * @param {boolean} options.success - Success status (default: true)
 * @param {number} options.totalCount - Total count of items
 * @param {Object} options.metadata - Additional metadata to include
 * @param {Array} options.enrichments - Array of enrichment types to apply ['nakshatra', 'age']
 * @param {Object} logger - Logger instance for debugging and tracing
 * @returns {Object} Formatted JSON response object
 */
function formatJsonResponse(data, options = {}, logger) {
  const {
    success = true,
    totalCount = null,
    metadata = {},
    enrichments = []
  } = options;
  
  let processedData = data;
  
  // Apply enrichments if requested and data is array of profiles
  if (Array.isArray(data) && enrichments.length > 0) {
    if (enrichments.includes('nakshatra')) {
      processedData = enrichProfilesWithNakshatraNames(processedData, logger);
    }
    if (enrichments.includes('age')) {
      processedData = enrichProfilesWithAge(processedData, logger);
    }
  }
  
  const response = {
    success,
    ...(Array.isArray(data) ? { 
      profiles: processedData,
      totalMatches: totalCount !== null ? totalCount : processedData.length 
    } : { 
      data: processedData 
    }),
    ...metadata
  };
  
  logger.trace('[TRACE] Formatted JSON response', {
    phase: 'RESPONSE_FORMATTING',
    responseType: 'JSON',
    dataType: Array.isArray(data) ? 'profiles' : 'data',
    itemCount: Array.isArray(processedData) ? processedData.length : 1,
    enrichments,
    success
  });
  
  return response;
}

/**
 * Formats and renders EJS template response
 * @param {string} template - Template name to render
 * @param {Object} data - Data to pass to template
 * @param {Object} res - Express response object
 * @param {Object} logger - Logger instance for debugging and tracing
 * @returns {Promise} Express render result
 * @throws {AppError} If template rendering fails
 */
function formatEjsResponse(template, data, res, logger) {
  try {
    logger.trace('[TRACE] Rendering EJS template', {
      phase: 'RESPONSE_FORMATTING',
      responseType: 'EJS',
      template,
      dataKeys: Object.keys(data)
    });
    
    return res.render(template, data);
  } catch (renderError) {
    logger.error('[ERROR] Failed to render EJS template', {
      phase: 'RESPONSE_RENDERING',
      template,
      errorMessage: renderError.message
    }, renderError);
    
    throw new AppError(
      `Failed to generate ${template} page.`,
      500,
      ERROR_TYPES.SYSTEM,
      { template, renderError: renderError.message }
    );
  }
}

/**
 * Builds search criteria object from parameters
 * @param {Object} searchParams - Object containing search parameters
 * @returns {Object} Structured search criteria object
 */
function buildSearchCriteriaObject(searchParams) {
  const {
    searchMode,
    serialNo,
    profileId,
    nakshatraid,
    gender,
    seekerAge,
    qualification,
    region,
    includeMathimam,
    includeRemarried,
    enableRasiCompatibility,
    minIncome,
    maxIncome,
    agePreference,
    nakshatraPreferences
  } = searchParams;
  
  return {
    searchMode,
    serialNo: serialNo || null,
    profileId: profileId || null,
    nakshatraid,
    gender,
    seekerAge,
    qualification,
    region,
    includeMathimam,
    includeRemarried,
    enableRasiCompatibility,
    ...(minIncome && { minIncome }),
    ...(maxIncome && { maxIncome }),
    ...(agePreference && { agePreference }),
    ...(nakshatraPreferences && nakshatraPreferences.length > 0 && { nakshatraPreferences })
  };
}

/**
 * Main response formatting orchestrator - handles both HTML and JSON responses
 * @param {Array} data - The data to format (typically profiles array)
 * @param {Object} formatOptions - Formatting options
 * @param {string} formatOptions.template - EJS template name for HTML responses
 * @param {Object} formatOptions.seekerProfile - Seeker profile data for HTML responses
 * @param {Object} formatOptions.searchCriteria - Search criteria for JSON responses
 * @param {Array} formatOptions.enrichments - Enrichments to apply ['nakshatra', 'age']
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Object} logger - Logger instance for debugging and tracing
 * @returns {Promise} Express response result
 */
function handleResponseFormatting(data, formatOptions, req, res, logger) {
  const {
    template = 'find-matching',
    seekerProfile = null,
    searchCriteria = {},
    enrichments = ['nakshatra']
  } = formatOptions;
  
  if (req.accepts('html')) {
    // HTML Response - EJS Template
    let enrichedData = data;
    
    // Apply enrichments for HTML response
    if (enrichments.includes('nakshatra')) {
      enrichedData = enrichProfilesWithNakshatraNames(enrichedData, logger);
    }
    if (enrichments.includes('age')) {
      enrichedData = enrichProfilesWithAge(enrichedData, logger);
    }
    
    const formObject = createFormObject(req);
    
    return formatEjsResponse(template, {
      profiles: enrichedData,
      seekerProfile,
      form: formObject,
      nakshatraData: nakshatraData
    }, res, logger);
    
  } else {
    // JSON Response - API
    const jsonResponse = formatJsonResponse(data, {
      success: true,
      enrichments,
      metadata: { searchCriteria }
    }, logger);
    
    return res.json(jsonResponse);
  }
}

// Initialize service
log.info('Response formatter service initialized', {
  source: 'ResponseFormatterService',
  availableFunctions: [
    'enrichProfilesWithNakshatraNames',
    'enrichProfilesWithAge', 
    'formatJsonResponse',
    'formatEjsResponse',
    'buildSearchCriteriaObject',
    'handleResponseFormatting'
  ],
  dependentServices: ['NakshatraService', 'AgeCalculator', 'FormParser']
});

module.exports = {
  enrichProfilesWithNakshatraNames,
  enrichProfilesWithAge,
  formatJsonResponse,
  formatEjsResponse,
  buildSearchCriteriaObject,
  handleResponseFormatting
};