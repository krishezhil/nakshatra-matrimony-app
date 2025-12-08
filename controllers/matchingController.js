const log = require('../utils/logger');
const { 
  AppError, 
  ERROR_MESSAGES, 
  ERROR_TYPES, 
  handleControllerError, 
  asyncHandler 
} = require('../utils/errorHandler');

// Phase 2: Import data access services
const { getProfiles, reloadProfiles } = require('../services/ProfileService');

// Phase 4: Import matching orchestrator services
const { findMatches, findMatchesByNakshatraGender } = require('../services/MatchingOrchestratorService');

// Phase 5.1: Import validation services
const { 
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
} = require('../services/ValidationService');

// Phase 5.2: Import matching filter services
const {
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
} = require('../services/MatchingFilterService');

// Phase 5.3: Import response formatting services
const {
  buildSearchCriteriaObject,
  handleResponseFormatting
} = require('../services/ResponseFormatterService');

// Import form parsing utilities
const { createFormObject } = require('../utils/FormParser');

// Export reloadProfiles function from ProfileService
exports.reloadProfiles = reloadProfiles;

// MatchingController: Handles nakshatra matching API logic with comprehensive error handling
exports.findMatching = asyncHandler(async (req, res) => {
  // Create feature-specific logger for Find Matching functionality
  const matchingLogger = log.findMatching();
  
  const startTime = Date.now();
  matchingLogger.featureStart('FIND_MATCHING', {
    source: 'MatchingController',
    method: req.method,
    endpoint: '/matching/find',
    requestId: req.headers['x-request-id'] || 'unknown',
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress
  });
  
  matchingLogger.methodEntry('findMatching', {
    source: 'MatchingController',
    body: log.maskSensitive(req.body),
    query: req.query,
    headers: req.headers
  });
  
  try {
    matchingLogger.trace('[TRACE] Processing matching request parameters', {
      phase: 'PARAMETER_EXTRACTION',
      requestMethod: req.method
    });
    
    // Get fresh profiles data
    const profiles = getProfiles();
    
    // Guard: Ensure profiles is loaded and is a non-empty array
    if (!Array.isArray(profiles)) {
      const errorMsg = 'Profiles data is not loaded or is corrupted.';
      matchingLogger.error('[ERROR] Profiles data validation failed', { 
        phase: 'DATA_VALIDATION',
        profilesType: typeof profiles,
        errorMessage: errorMsg
      });
      
      throw new AppError(
        ERROR_MESSAGES.DATA_CORRUPTION,
        500,
        ERROR_TYPES.FILE_SYSTEM,
        { issue: 'Profiles data is not an array', profilesType: typeof profiles }
      );
    }
    
    if (profiles.length === 0) {
      const errorMsg = 'No profiles are available for matching.';
      matchingLogger.error('[ERROR] No profiles available', { 
        phase: 'DATA_VALIDATION',
        profilesLength: profiles.length,
        errorMessage: errorMsg
      });
      
      throw new AppError(
        'No profiles are available for matching. Please add some profiles first.',
        404,
        ERROR_TYPES.VALIDATION,
        { profilesCount: 0 }
      );
    }
    
    matchingLogger.trace('[TRACE] Profiles validation passed', { 
      phase: 'DATA_VALIDATION',
      profilesCount: profiles.length,
      profilesLoadedFresh: true
    });

    // Extract and validate search parameters using FormParser for consistency
    const formData = createFormObject(req);
    const {
      gender,
      nakshatraid,
      serial_no: serialNo,
      seeker_age: seekerAge,
      seekerRasi,
      includeMathimam,
      includeRemarried,
      qualification,
      exactQualification,
      region,
      regions,
      nakshatraPreferences,
      minIncome,
      maxIncome,
      agePreference,
      enableRasiCompatibility,
      searchMode
    } = formData;
    
    let profileId = req.body.id || req.query.id;
    
    // Extract gothram for filtering (from profile in serial mode, from UI in nakshatra mode)
    let seekerGothram = null;
    if (searchMode === 'serial') {
      // Will be extracted from seeker profile later
      seekerGothram = null;
    } else if (searchMode === 'nakshatra') {
      // Extract from form data for unregistered users using consistent FormParser
      seekerGothram = formData.gothram;
    }
    
    matchingLogger.trace('[TRACE] Search parameters extracted', {
      phase: 'PARAMETER_EXTRACTION',
      searchCriteria: log.maskSensitive({
        gender,
        nakshatraid,
        serialNo,
        seekerAge,
        seekerRasi,
        includeMathimam,
        includeRemarried,
        qualification,
        exactQualification,
        region,
        regions,
        regionCount: regions ? regions.length : 0,
        nakshatraPreferences,
        nakshatraPreferenceCount: nakshatraPreferences ? nakshatraPreferences.length : 0,
        minIncome,
        maxIncome,
        enableRasiCompatibility,
        seekerGothram
      })
    });
    
    // Log find matching process start with seeker info
    matchingLogger.info('Find matching started', {
      source: 'MatchingController',
      phase: 'MATCHING_START',
      seekerSerialNo: serialNo
    });
    
    let matches = [];
    
    // Validate search mode
    validateSearchMode(searchMode, matchingLogger);
    
    if (searchMode === 'serial') {
      // --- Flow 1: serial_no (profile-based) ---
      matchingLogger.trace('[TRACE] Using serial number search mode', {
        phase: 'SEARCH_MODE_VALIDATION',
        searchMode,
        serialNo
      });
      
      validateSerialNumber(serialNo, searchMode, matchingLogger);
      
      // If profileId not provided, try to get it from serialNo
      if (!profileId) {
        const result = validateAndFindProfileBySerial(serialNo, searchMode, matchingLogger);
        profileId = result.profileId;
      }
      
      // Call findMatches with error handling
      try {
        matches = findMatches(profileId, includeMathimam, matchingLogger) || [];
        // Extract serial numbers safely
        const matchingSerialNos = matches.map(m => m.serial_no || 'N/A').join(', ');
        matchingLogger.trace('[TRACE] Found initial matches by profile', {
          phase: 'MATCHING_ALGORITHM',
          serialNo,
          initialMatches: matches.length,
          includeMathimam,
          matchingSerialNos
        });
      } catch (matchingError) {
        matchingLogger.error('[ERROR] Profile matching algorithm failed', {
          phase: 'MATCHING_ALGORITHM',
          serialNo,
          includeMathimam,
          errorMessage: matchingError.message
        }, matchingError);
        
        throw new AppError(
          ERROR_MESSAGES.MATCHING_ALGORITHM_ERROR,
          500,
          ERROR_TYPES.BUSINESS_LOGIC,
          { profileId, includeMathimam }
        );
      }
      
      // Optionally filter by gender/nakshatraid if provided
      if (gender && gender !== '') {
        const beforeCount = matches.length;
        matches = matches.filter(p => p.gender === gender);
        matchingLogger.trace('[TRACE] Applied additional gender filter', {
          phase: 'ADDITIONAL_FILTERING',
          filter: 'gender',
          beforeCount,
          afterCount: matches.length
        });
      }
      
      if (nakshatraid && nakshatraid !== '') {
        const beforeCount = matches.length;
        matches = matches.filter(p => p.nakshatraid && p.nakshatraid.toString() === nakshatraid.toString());
        matchingLogger.trace('[TRACE] Applied additional nakshatra filter', {
          phase: 'ADDITIONAL_FILTERING',
          filter: 'nakshatraid',
          beforeCount,
          afterCount: matches.length
        });
      }
      
    } else if (searchMode === 'nakshatra') {
      // --- Flow 2: nakshatraid + gender ---
      matchingLogger.trace('[TRACE] Using nakshatra search mode', {
        phase: 'SEARCH_MODE_VALIDATION',
        searchMode,
        nakshatraid,
        gender
      });
      
      validateNakshatraId(nakshatraid, searchMode, matchingLogger);
      validateGender(gender, searchMode, matchingLogger);
      validateSeekerRasi(enableRasiCompatibility, seekerRasi, searchMode, matchingLogger);
      
      try {
        matches = findMatchesByNakshatraGender(nakshatraid, gender, includeMathimam, seekerRasi, enableRasiCompatibility, matchingLogger) || [];
        // Extract serial numbers safely
        const matchingSerialNos = matches.map(m => m.serial_no || 'N/A').join(', ');
        matchingLogger.trace('[TRACE] Found matches by nakshatra and gender', {
          phase: 'MATCHING_ALGORITHM',
          nakshatraid,
          gender,
          initialMatches: matches.length,
          includeMathimam,
          matchingSerialNos
        });
      } catch (matchingError) {
        matchingLogger.error('[ERROR] Nakshatra matching algorithm failed', {
          phase: 'MATCHING_ALGORITHM',
          nakshatraid,
          gender,
          includeMathimam,
          errorMessage: matchingError.message
        }, matchingError);
        
        throw new AppError(
          ERROR_MESSAGES.MATCHING_ALGORITHM_ERROR,
          500,
          ERROR_TYPES.BUSINESS_LOGIC,
          { nakshatraid, gender, includeMathimam }
        );
      }
    }

    // If no matches found after initial search
    if (!matches || matches.length === 0) {
      const errorMsg = serialNo ? 
        'No matches found for the given Serial No.' : 
        'No matches found for the given Nakshatra and Gender.';
        
      matchingLogger.warn('[WARN] No initial matches found', {
        phase: 'MATCHING_RESULTS',
        searchMode,
        serialNo,
        nakshatraid,
        gender,
        matchesCount: 0
      });
      
      throw new AppError(
        ERROR_MESSAGES.NO_MATCHING_PROFILES,
        404,
        ERROR_TYPES.BUSINESS_LOGIC,
        { searchMode, serialNo, nakshatraid, gender }
      );
    }

    // Continue with advanced filtering logic with comprehensive error handling
    matchingLogger.trace('[TRACE] Starting advanced filtering', {
      phase: 'ADVANCED_FILTERING START',
      initialMatchesCount: matches.length
    });

    // Seeker profile lookup for filtering and final processing (moved earlier for gothram filtering)
    let seekerProfile = null;
    if (searchMode === 'serial' && (profileId || serialNo)) {
      matchingLogger.info('[DEBUG] Attempting seeker profile lookup', {
        phase: 'SEEKER_PROFILE_LOOKUP',
        searchMode,
        profileId,
        serialNo,
        totalProfiles: profiles.length
      });
      
      try {
        seekerProfile = profiles.find(p => 
          p.id === profileId || 
          p.id === parseInt(profileId) ||
          (serialNo && p.serial_no && p.serial_no.toString().trim().toLowerCase() === serialNo.toString().trim().toLowerCase())
        );
        
        if (seekerProfile) {
          matchingLogger.trace('[TRACE] Seeker profile found for filtering', {
            phase: 'SEEKER_LOOKUP',
            seekerProfileId: seekerProfile.id,
            seekerSerialNo: seekerProfile.serial_no,
            seekerName: seekerProfile.name
          });
          
          // Extract gothram from seeker profile for serial mode
          seekerGothram = seekerProfile.gothram;
          
          // Extract age and gender from seeker profile for serial mode age filtering
          // Store in variables that can be used later in age preference filtering
          let extractedSeekerAge = null;
          let extractedGender = null;
          
          if (!seekerAge || seekerAge.trim() === '') {
            // Calculate seeker age from birth_date if not provided in form
            try {
              const { calculateAge } = require('../utils/AgeCalculator');
              const calculatedAge = calculateAge(seekerProfile.birth_date, seekerProfile.id, 'Seeker');
              
              extractedSeekerAge = calculatedAge.toString();
              
              matchingLogger.info('[INFO] Extracted age from seeker profile', {
                phase: 'SEEKER_AGE_EXTRACTION',
                seekerProfileId: seekerProfile.id,
                calculatedAge: calculatedAge,
                birthDate: seekerProfile.birth_date,
                extractedAge: extractedSeekerAge
              });
              
            } catch (ageCalcError) {
              matchingLogger.warn('[WARN] Failed to calculate seeker age from profile', {
                phase: 'SEEKER_AGE_EXTRACTION',
                seekerProfileId: seekerProfile.id,
                birthDate: seekerProfile.birth_date,
                errorMessage: ageCalcError.message
              });
            }
          }
          
          // Store extracted values for use in age preference filtering
          if (extractedSeekerAge) {
            seekerProfile.extractedAge = extractedSeekerAge;
          }
          if (seekerProfile.gender) {
            seekerProfile.extractedGender = seekerProfile.gender;
          }
          
          // Extract gender from seeker profile if not provided in form
          if (!gender || gender.trim() === '') {
            const extractedGender = seekerProfile.gender;
            
            matchingLogger.info('[INFO] Extracted gender from seeker profile', {
              phase: 'SEEKER_GENDER_EXTRACTION',
              seekerProfileId: seekerProfile.id,
              extractedGender: extractedGender
            });
            
            // Note: Cannot reassign const gender here - will be handled in age preference filter section
          }
        } else {
          matchingLogger.warn('[WARN] Seeker profile not found', {
            phase: 'SEEKER_PROFILE_LOOKUP',
            profileId,
            serialNo,
            searchAttempted: true,
            totalProfilesSearched: profiles.length
          });
        }
      } catch (seekerError) {
        matchingLogger.warn('[WARN] Failed to lookup seeker profile', {
          phase: 'SEEKER_LOOKUP',
          profileId,
          serialNo,
          errorMessage: seekerError.message
        });
      }
    } else {
      matchingLogger.info('[DEBUG] Skipping seeker profile lookup', {
        phase: 'SEEKER_PROFILE_LOOKUP',
        searchMode,
        profileId: profileId || 'not provided',
        serialNo: serialNo || 'not provided',
        reason: searchMode !== 'serial' ? 'not serial mode' : 'no profileId or serialNo'
      });
    }

    // Gothram compatibility filtering (FIRST FILTER - mandatory when gothram is available)
    if (seekerGothram && seekerGothram.trim() !== '') {
      try {
        matchingLogger.info('[DEBUG] About to apply mandatory gothram filter', {
          phase: 'GOTHRAM_FILTERING',
          searchMode,
          seekerGothram: seekerGothram,
          beforeCount: matches.length,
          candidateGothrams: matches.slice(0, 3).map(p => ({
            id: p.id,
            name: p.name,
            gothram: p.gothram,
            gothramType: typeof p.gothram
          }))
        });
        
        matches = applyGothramCompatibilityFilter(matches, seekerGothram, matchingLogger);
        
        matchingLogger.info('[DEBUG] Mandatory gothram filtering completed', {
          phase: 'GOTHRAM_FILTERING',
          afterCount: matches.length,
          filteredOut: matches.length > 0 ? 'SOME_REMAINED' : 'ALL_FILTERED'
        });
      } catch (gothramError) {
        matchingLogger.error('[ERROR] Gothram compatibility filtering failed', {
          phase: 'GOTHRAM_FILTERING',
          searchMode,
          seekerGothram,
          errorMessage: gothramError.message
        }, gothramError);
        
        // Don't throw error for gothram compatibility - just log and continue
        matchingLogger.warn('[WARN] Continuing without gothram compatibility filter due to error', {
          phase: 'GOTHRAM_FILTERING'
        });
      }
    } else {
      matchingLogger.info('[INFO] No gothram provided - skipping gothram filtering', {
        phase: 'GOTHRAM_FILTERING',
        searchMode,
        seekerGothram: seekerGothram || 'null'
      });
    }

    // Apply nakshatra preference filter (if specified)
    try {
      if (nakshatraPreferences && Array.isArray(nakshatraPreferences) && nakshatraPreferences.length > 0) {
        matchingLogger.trace('[TRACE] Applying nakshatra preference filter', {
          phase: 'NAKSHATRA_PREFERENCE_FILTERING',
          searchMode,
          nakshatraPreferences,
          beforeCount: matches.length
        });
        
        validateNakshatraPreferences(nakshatraPreferences, matchingLogger);
        matches = applyNakshatraPreferenceFilter(matches, nakshatraPreferences, matchingLogger);
        
        matchingLogger.info('[DEBUG] Nakshatra preference filtering completed', {
          phase: 'NAKSHATRA_PREFERENCE_FILTERING',
          nakshatraPreferences,
          afterCount: matches.length,
          filteredOut: matches.length > 0 ? 'SOME_REMAINED' : 'ALL_FILTERED'
        });
      } else {
        matchingLogger.trace('[TRACE] No nakshatra preference filter applied', {
          phase: 'NAKSHATRA_PREFERENCE_FILTERING',
          reason: 'no_preferences_specified'
        });
      }
    } catch (nakshatraPreferenceError) {
      matchingLogger.error('[ERROR] Nakshatra preference filtering failed', {
        phase: 'NAKSHATRA_PREFERENCE_FILTERING',
        searchMode,
        nakshatraPreferences,
        errorMessage: nakshatraPreferenceError.message
      }, nakshatraPreferenceError);
      
      // Don't throw error for nakshatra preference filter - just log and continue
      matchingLogger.warn('[WARN] Continuing without nakshatra preference filter due to error', {
        phase: 'NAKSHATRA_PREFERENCE_FILTERING'
      });
    }

    // Calculate age for all matching profiles from birthdate with error handling
    const beforeAgeCalc = matches.length;
    matches = calculateAgeForMatches(matches, matchingLogger);
    const afterAgeCalc = matches.length;
    
    matchingLogger.info('Age calculation completed', {
      phase: 'AGE_CALCULATION',
      beforeCount: beforeAgeCalc,
      afterCount: afterAgeCalc,
      profilesWithValidAge: afterAgeCalc,
      profilesWithInvalidAge: beforeAgeCalc - afterAgeCalc
    });
    
    matchingLogger.info('[DEBUG] After age calculation', {
      phase: 'AGE_CALCULATION_DEBUG',
      matchesCount: matches.length,
      remainingProfiles: matches.map(p => ({
        id: p.id,
        name: p.name,
        age: p.age,
        gothram: p.gothram
      }))
    });

    // Extract seeker age and gender for age preference filtering
    let actualSeekerAge = seekerAge;
    let actualGender = gender;
    
    if (searchMode === 'serial') {
      // Serial mode: Use extracted values from seeker profile if available
      if (seekerProfile && seekerProfile.extractedAge) {
        actualSeekerAge = seekerProfile.extractedAge;
        matchingLogger.info('Using extracted seeker age from profile', {
          source: 'matchingController',
          operation: 'find-matching-serial',
          originalSeekerAge: seekerAge,
          extractedSeekerAge: actualSeekerAge,
          serialNo: serialNo
        });
      }
      
      if (seekerProfile && seekerProfile.extractedGender) {
        actualGender = seekerProfile.extractedGender;
        matchingLogger.info('Using extracted seeker gender from profile', {
          source: 'matchingController',
          operation: 'find-matching-serial',
          originalGender: gender,
          extractedGender: actualGender,
          serialNo: serialNo
        });
      }
    } else if (searchMode === 'nakshatra') {
      // Nakshatra mode: Use form inputs directly (mandatory fields validated earlier)
      actualSeekerAge = seekerAge;
      actualGender = gender;
      
      matchingLogger.info('Using form inputs for nakshatra mode age preference', {
        source: 'matchingController',
        operation: 'find-matching-nakshatra',
        seekerAge: actualSeekerAge,
        gender: actualGender,
        nakshatraid: nakshatraid,
        gothram: seekerGothram
      });
      
      // Log warning if age preference provided but required data missing (non-breaking)
      if (agePreference && agePreference.trim() !== '') {
        if (!actualSeekerAge || actualSeekerAge.trim() === '') {
          matchingLogger.warn('Age preference ignored - seeker age not provided in nakshatra mode', {
            source: 'matchingController',
            operation: 'find-matching-nakshatra',
            agePreference: agePreference,
            seekerAge: actualSeekerAge,
            reason: 'missing_seeker_age'
          });
        }
        if (!actualGender || actualGender.trim() === '') {
          matchingLogger.warn('Age preference ignored - gender not provided in nakshatra mode', {
            source: 'matchingController',
            operation: 'find-matching-nakshatra',
            agePreference: agePreference,
            gender: actualGender,
            reason: 'missing_gender'
          });
        }
      }
    }

    // Age filtering with error handling (works for both serial and nakshatra modes)
    if (actualSeekerAge && actualSeekerAge.trim() !== '') {
      try {
        const seekerAgeNum = validateSeekerAge(actualSeekerAge, matchingLogger);
        matches = applyAgeFilter(matches, seekerAgeNum, actualGender, matchingLogger);
        
        // Apply age preference filter (additional constraint on top of default age filtering)
        matchingLogger.info('[DEBUG] Age preference check', {
          phase: 'AGE_PREFERENCE_DEBUG',
          searchMode: searchMode,
          agePreference: agePreference,
          agePreferenceExists: !!agePreference,
          agePreferenceTrimmed: agePreference ? agePreference.trim() : 'N/A',
          seekerAge: actualSeekerAge,
          seekerAgeNum: seekerAgeNum,
          gender: actualGender
        });
        
        if (agePreference && agePreference.trim() !== '') {
          const agePreferenceNum = parseInt(agePreference, 10);
          matchingLogger.info('[DEBUG] Age preference parsing', {
            phase: 'AGE_PREFERENCE_PARSING',
            originalValue: agePreference,
            parsedValue: agePreferenceNum,
            isValid: !isNaN(agePreferenceNum)
          });
          
          if (!isNaN(agePreferenceNum)) {
            const beforeFilterCount = matches.length;
            matches = applyAgePreferenceFilter(matches, seekerAgeNum, actualGender, agePreferenceNum, matchingLogger);
            
            matchingLogger.info('[DEBUG] Age preference filter applied', {
              phase: 'AGE_PREFERENCE_APPLIED',
              beforeCount: beforeFilterCount,
              afterCount: matches.length,
              filtered: beforeFilterCount - matches.length,
              seekerAge: seekerAgeNum,
              agePreference: agePreferenceNum,
              gender: actualGender
            });
          } else {
            matchingLogger.warn('[WARN] Invalid age preference value, skipping preference filter', {
              phase: 'AGE_PREFERENCE_FILTERING',
              agePreference,
              reason: 'Not a valid number'
            });
          }
        } else {
          matchingLogger.info('[DEBUG] Age preference not provided or empty', {
            phase: 'AGE_PREFERENCE_SKIPPED',
            agePreference: agePreference,
            reason: 'Empty or undefined value'
          });
        }
      } catch (ageFilterError) {
        matchingLogger.error('[ERROR] Age filtering failed', {
          phase: 'AGE_FILTERING',
          seekerAge,
          errorMessage: ageFilterError.message
        }, ageFilterError);
        
        if (ageFilterError instanceof AppError) {
          throw ageFilterError;
        } else {
          throw new AppError(
            ERROR_MESSAGES.INVALID_SEARCH_CRITERIA,
            400,
            ERROR_TYPES.VALIDATION,
            { filter: 'age', value: seekerAge }
          );
        }
      }
    }

    // Qualification filtering with error handling
    if (qualification && qualification.trim() !== '') {
      const beforeQualFilter = matches.length;
      try {
        validateQualification(qualification, matchingLogger);
        matches = applyQualificationFilter(matches, qualification, exactQualification, matchingLogger);
        const afterQualFilter = matches.length;
        
        matchingLogger.info('Qualification filtering completed', {
          phase: 'QUALIFICATION_FILTERING',
          beforeCount: beforeQualFilter,
          afterCount: afterQualFilter,
          filteredOut: beforeQualFilter - afterQualFilter,
          qualification: qualification,
          exactMatch: exactQualification
        });
      } catch (qualificationError) {
        matchingLogger.error('[ERROR] Qualification filtering failed', {
          phase: 'QUALIFICATION_FILTERING',
          qualification,
          exactQualification,
          errorMessage: qualificationError.message
        }, qualificationError);
        
        if (qualificationError instanceof AppError) {
          throw qualificationError;
        } else {
          throw new AppError(
            ERROR_MESSAGES.INVALID_SEARCH_CRITERIA,
            400,
            ERROR_TYPES.VALIDATION,
            { filter: 'qualification', value: qualification }
          );
        }
      }
    }

    // Multi-region filtering with error handling (supports both single region and array)
    if (regions && Array.isArray(regions) && regions.length > 0) {
      const beforeRegionFilter = matches.length;
      try {
        validateRegions(regions, matchingLogger);
        matches = applyRegionFilter(matches, regions, matchingLogger);
        const afterRegionFilter = matches.length;
        
        matchingLogger.info('Multi-region filtering completed', {
          phase: 'REGION_FILTERING',
          beforeCount: beforeRegionFilter,
          afterCount: afterRegionFilter,
          filteredOut: beforeRegionFilter - afterRegionFilter,
          regions: regions,
          regionCount: regions.length
        });
      } catch (regionError) {
        matchingLogger.error('[ERROR] Multi-region filtering failed', {
          phase: 'REGION_FILTERING',
          regions,
          regionCount: regions?.length || 0,
          errorMessage: regionError.message
        }, regionError);
        
        if (regionError instanceof AppError) {
          throw regionError;
        } else {
          throw new AppError(
            ERROR_MESSAGES.INVALID_SEARCH_CRITERIA,
            400,
            ERROR_TYPES.VALIDATION,
            { filter: 'regions', values: regions }
          );
        }
      }
    } else if (region && region.trim() !== '') {
      // Backward compatibility: handle single region parameter
      const beforeSingleRegionFilter = matches.length;
      try {
        validateRegion(region, matchingLogger);
        matches = applyRegionFilter(matches, region, matchingLogger);
        const afterSingleRegionFilter = matches.length;
        
        matchingLogger.info('Single region filtering completed', {
          phase: 'REGION_FILTERING',
          beforeCount: beforeSingleRegionFilter,
          afterCount: afterSingleRegionFilter,
          filteredOut: beforeSingleRegionFilter - afterSingleRegionFilter,
          region: region
        });
      } catch (regionError) {
        matchingLogger.error('[ERROR] Single region filtering failed', {
          phase: 'REGION_FILTERING',
          region,
          errorMessage: regionError.message
        }, regionError);
        
        if (regionError instanceof AppError) {
          throw regionError;
        } else {
          throw new AppError(
            ERROR_MESSAGES.INVALID_SEARCH_CRITERIA,
            400,
            ERROR_TYPES.VALIDATION,
            { filter: 'region', value: region }
          );
        }
      }
    }

    // Income filtering with error handling
    if ((minIncome && minIncome.trim() !== '') || (maxIncome && maxIncome.trim() !== '')) {
      const beforeIncomeFilter = matches.length;
      try {
        const { minIncomeNum, maxIncomeNum } = validateIncomeRange(minIncome, maxIncome, matchingLogger);
        matches = applyIncomeFilter(matches, minIncomeNum, maxIncomeNum, matchingLogger);
        const afterIncomeFilter = matches.length;
        
        matchingLogger.info('Income filtering completed', {
          phase: 'INCOME_FILTERING',
          beforeCount: beforeIncomeFilter,
          afterCount: afterIncomeFilter,
          filteredOut: beforeIncomeFilter - afterIncomeFilter,
          incomeRange: `${minIncomeNum || 0}-${maxIncomeNum || 'unlimited'}`,
          minIncome: minIncomeNum,
          maxIncome: maxIncomeNum
        });
      } catch (incomeError) {
        matchingLogger.error('[ERROR] Income filtering failed', {
          phase: 'INCOME_FILTERING',
          minIncome,
          maxIncome,
          errorMessage: incomeError.message
        }, incomeError);
        
        if (incomeError instanceof AppError) {
          throw incomeError;
        } else {
          throw new AppError(
            ERROR_MESSAGES.INVALID_SEARCH_CRITERIA,
            400,
            ERROR_TYPES.VALIDATION,
            { filter: 'income', minIncome, maxIncome }
          );
        }
      }
    }

    // Remarried status filtering with error handling
    const beforeRemarriedFilter = matches.length;
    try {
      matches = applyRemarriedFilter(matches, includeRemarried, matchingLogger);
      const afterRemarriedFilter = matches.length;
      
      matchingLogger.info('Remarried filtering completed', {
        phase: 'REMARRIED_FILTERING',
        beforeCount: beforeRemarriedFilter,
        afterCount: afterRemarriedFilter,
        filteredOut: beforeRemarriedFilter - afterRemarriedFilter,
        includeRemarried: includeRemarried
      });
    } catch (remarriedError) {
      matchingLogger.error('[ERROR] Remarried filtering failed', {
        phase: 'REMARRIED_FILTERING',
        includeRemarried,
        errorMessage: remarriedError.message
      }, remarriedError);
      
      throw new AppError(
        'Error applying remarried status filter.',
        500,
        ERROR_TYPES.BUSINESS_LOGIC,
        { filter: 'remarried', includeRemarried }
      );
    }

    // Seeker profile already looked up earlier for gothram filtering - reuse the same profile

    // Rasi compatibility filtering with error handling
    try {
      matches = applyRasiCompatibilityFilter(matches, enableRasiCompatibility, seekerProfile, searchMode, matchingLogger);
    } catch (rasiError) {
      matchingLogger.error('[ERROR] Rasi compatibility filtering failed', {
        phase: 'RASI_FILTERING',
        profileId,
        serialNo,
        errorMessage: rasiError.message
      }, rasiError);
      
      // Don't throw error for rasi compatibility - just log and continue
      matchingLogger.warn('[WARN] Continuing without rasi compatibility filter due to error', {
        phase: 'RASI_FILTERING'
      });
    }
    
    // Sort matches by porutham score using MatchingFilterService
    matches = sortMatchesByPorutham(matches, matchingLogger);
    
    // Check if matches were filtered out completely
    if (!matches || matches.length === 0) {
      matchingLogger.warn('[WARN] No matches remaining after filtering', {
        phase: 'POST_FILTERING_CHECK',
        searchMode,
        serialNo,
        nakshatraid,
        gender,
        finalMatchesCount: 0,
        filtersApplied: {
          ageFilter: seekerAge && seekerAge.trim() !== '',
          qualificationFilter: qualification && qualification.trim() !== '',
          regionFilter: (regions && regions.length > 0) || (region && region.trim() !== ''),
          regionType: regions && regions.length > 0 ? 'multi-region' : 'single-region',
          regionCount: regions ? regions.length : (region ? 1 : 0),
          incomeFilter: (minIncome && minIncome.trim() !== '') || (maxIncome && maxIncome.trim() !== ''),
          nakshatraPreferenceFilter: nakshatraPreferences && nakshatraPreferences.length > 0,
          nakshatraPreferenceCount: nakshatraPreferences ? nakshatraPreferences.length : 0,
          rasiCompatibility: enableRasiCompatibility
        }
      });
      
      throw new AppError(
        'No matches found after applying your search filters. Try adjusting your criteria or removing some filters.',
        404,
        ERROR_TYPES.BUSINESS_LOGIC,
        { 
          searchMode, 
          serialNo, 
          nakshatraid, 
          gender,
          finalMatchesCount: 0,
          suggestion: 'Try adjusting age range, qualification level, or disable Rasi compatibility filter'
        }
      );
    }

    // Final success response
    matchingLogger.trace('[TRACE] Advanced filtering completed', {
      phase: 'ADVANCED_FILTERING_COMPLETED',
      finalMatchesCount: matches.length
    });

    matchingLogger.featureEnd('FIND_MATCHING', {
      success: true,
      matchesCount: matches.length,
      statusCode: 200
    }, Date.now() - startTime);

    matchingLogger.methodExit('findMatching', {
      success: true,
      matchesCount: matches.length,
      statusCode: 200
    });

    // Build search criteria object using ResponseFormatterService
    const searchCriteria = buildSearchCriteriaObject({
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
      seekerGothram,
      minIncome,
      maxIncome,
      agePreference,
      nakshatraPreferences
    });

    // Log find matching process completion
    matchingLogger.info('Find matching completed', {
      phase: 'MATCHING_COMPLETE',
      seekerSerialNo: serialNo,
      matchesFound: matches.length,
      processingTime: Date.now() - startTime
    });

    // Handle response formatting using ResponseFormatterService
    return handleResponseFormatting(matches, {
      template: 'find-matching',
      seekerProfile: seekerProfile || null,
      searchCriteria,
      enrichments: ['nakshatra']
    }, req, res, matchingLogger);

  } catch (error) {
    matchingLogger.featureEnd('FIND_MATCHING', {
      success: false,
      error: error.message,
      statusCode: error.statusCode || 500
    }, Date.now() - startTime);

    matchingLogger.methodExit('findMatching', {
      success: false,
      error: error.message,
      statusCode: error.statusCode || 500
    });

    return handleControllerError(error, 'FIND_MATCHING', 'findMatching', req, res, matchingLogger);
  }
});

