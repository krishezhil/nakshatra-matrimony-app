const path = require('path');
const fs = require('fs');
const Profile = require('../models/profile');
const log = require('../utils/logger');
const { 
  AppError, 
  ERROR_MESSAGES, 
  ERROR_TYPES, 
  handleControllerError, 
  asyncHandler,
  handleValidationError,
  handleFileSystemError  
} = require('../utils/errorHandler');
const { VALIDATION_CONFIG } = require('../utils/validationConfig');
const { FieldValidator } = require('../utils/validationHelpers');
const { getDataFilePath, ensureDirectoryExists, getDataPath } = require('../utils/appData');

// Create feature-specific logger for Profile functionality
const profileLogger = log.profile();

// Return all profiles as a JS array (for internal use)
exports.listProfilesRaw = function() {
  return readProfiles();
};

// GET /api/profile - List all profiles
exports.listProfiles = asyncHandler(async (req, res) => {
  // Create feature-specific logger for Search Profile functionality
  const searchLogger = log.profile();
  
  const startTime = Date.now();
  searchLogger.featureStart('LIST_PROFILES', {
    source: 'ProfileController',
    operation: 'LIST_PROFILES',
    method: req.method,
    endpoint: '/api/profile',
    requestId: req.headers['x-request-id'] || 'unknown',
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress
  });
  
  searchLogger.methodEntry('listProfiles', {
    query: req.query,
    headers: req.headers
  });
  
  try {
    searchLogger.trace('[TRACE] Loading all profiles', {
      phase: 'DATA_LOADING'
    });
    
    const profiles = readProfiles();
    
    if (!Array.isArray(profiles)) {
      throw new AppError(
        ERROR_MESSAGES.DATA_CORRUPTION,
        500,
        ERROR_TYPES.FILE_SYSTEM,
        { issue: 'Profiles data is not an array' }
      );
    }
    
    searchLogger.trace('[TRACE] Profiles loaded, calculating ages', {
      phase: 'DATA_PROCESSING',
      profilesCount: profiles.length
    });
    
    // Calculate age for each profile
    function calculateAge(birthdateStr) {
      try {
        if (!birthdateStr) return undefined;
        const birthdate = new Date(birthdateStr);
        if (isNaN(birthdate.getTime())) return undefined;
        const today = new Date();
        let age = today.getFullYear() - birthdate.getFullYear();
        const m = today.getMonth() - birthdate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthdate.getDate())) {
          age--;
        }
        return age;
      } catch (error) {
        searchLogger.warn('[WARN] Age calculation failed for profile', {
          phase: 'DATA_PROCESSING',
          birthdateStr,
          errorMessage: error.message
        });
        return undefined;
      }
    }
    
    let ageCalculationsCount = 0;
    const processedProfiles = profiles.map(p => {
      try {
        if (typeof p.age === 'undefined' && p.birth_date) {
          p.age = calculateAge(p.birth_date);
          ageCalculationsCount++;
        }
        return p;
      } catch (error) {
        searchLogger.warn('[WARN] Profile processing failed', {
          phase: 'DATA_PROCESSING',
          profileId: p.id,
          errorMessage: error.message
        });
        return p; // Return profile as-is if processing fails
      }
    });
    
    searchLogger.trace('[TRACE] Age calculations completed', {
      phase: 'DATA_PROCESSING',
      ageCalculationsPerformed: ageCalculationsCount,
      totalProfiles: processedProfiles.length
    });
    
    searchLogger.featureEnd('LIST_PROFILES', {
      success: true,
      profilesCount: processedProfiles.length,
      statusCode: 200
    }, Date.now() - startTime);
    
    searchLogger.methodExit('listProfiles', {
      success: true,
      profilesCount: processedProfiles.length,
      statusCode: 200
    });
    
    res.json(processedProfiles);
    
  } catch (error) {
    searchLogger.featureEnd('LIST_PROFILES', {
      success: false,
      error: error.message,
      statusCode: error.statusCode || 500
    }, Date.now() - startTime);
    
    searchLogger.methodExit('listProfiles', {
      success: false,
      error: error.message,
      statusCode: error.statusCode || 500
    });
    
    return handleControllerError(error, 'SEARCH_PROFILE', 'listProfiles', req, res, searchLogger);
  }
});
// GET /api/profile/:id - Retrieve a profile by id
exports.getProfile = asyncHandler(async (req, res) => {
  const profileLogger = log.profile();
  
  const startTime = Date.now();
  profileLogger.featureStart('GET_PROFILE', {
    source: 'ProfileController',
    operation: 'GET_PROFILE',
    method: req.method,
    endpoint: `/api/profile/${req.params.id}`,
    requestId: req.headers['x-request-id'] || 'unknown'
  });
  
  profileLogger.methodEntry('getProfile', {
    params: req.params,
    headers: req.headers,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress
  });
  
  try {
    const profileId = req.params.id;
    
    if (!profileId || profileId.trim() === '') {
      throw new AppError(
        'Profile ID is required',
        400,
        ERROR_TYPES.VALIDATION,
        { field: 'id' }
      );
    }
    
    profileLogger.trace('[TRACE] Loading profiles to find specific profile', {
      phase: 'DATA_LOADING',
      requestedId: profileId
    });
    
    const profiles = readProfiles();
    const profile = profiles.find(p => p.id == profileId);
    
    if (!profile) {
      profileLogger.warn('[WARN] Profile not found', {
        phase: 'DATA_SEARCH',
        requestedId: profileId,
        totalProfiles: profiles.length
      });
      
      throw new AppError(
        ERROR_MESSAGES.PROFILE_NOT_FOUND,
        404,
        ERROR_TYPES.VALIDATION,
        { profileId }
      );
    }
    
    profileLogger.featureEnd('GET_PROFILE', {
      success: true,
      profileId: profile.id,
      statusCode: 200
    }, Date.now() - startTime);
    
    profileLogger.methodExit('getProfile', {
      success: true,
      profileId: profile.id,
      statusCode: 200
    });
    
    res.json(profile);
    
  } catch (error) {
    profileLogger.featureEnd('GET_PROFILE', {
      success: false,
      error: error.message,
      statusCode: error.statusCode || 500
    }, Date.now() - startTime);
    
    profileLogger.methodExit('getProfile', {
      success: false,
      error: error.message,
      statusCode: error.statusCode || 500
    });
    
    return handleControllerError(error, 'GET_PROFILE', 'getProfile', req, res, profileLogger);
  }
});

// PUT /api/profile - Update a profile by id in body
exports.updateProfile = asyncHandler(async (req, res) => {
  const profileLogger = log.profile();
  
  const startTime = Date.now();
  profileLogger.featureStart('UPDATE_PROFILE', {
    source: 'ProfileController',
    operation: 'UPDATE_PROFILE',
    method: req.method,
    endpoint: '/api/profile',
    requestId: req.headers['x-request-id'] || 'unknown'
  });
  
  profileLogger.methodEntry('updateProfile', {
    body: log.maskSensitive(req.body),
    headers: req.headers,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress
  });
  
  try {
    const { id } = req.body;
    
    if (!id) {
      throw new AppError(
        'Profile id is required in request body',
        400,
        ERROR_TYPES.VALIDATION,
        { field: 'id' }
      );
    }
    
    profileLogger.trace('[TRACE] Loading profiles for update', {
      phase: 'DATA_LOADING',
      profileId: id
    });
    
    const profiles = readProfiles();
    const idx = profiles.findIndex(p => p.id == id);
    
    if (idx === -1) {
      throw new AppError(
        ERROR_MESSAGES.PROFILE_NOT_FOUND,
        404,
        ERROR_TYPES.VALIDATION,
        { profileId: id }
      );
    }
    
    // Extract update data (exclude id, timestamps, and serial_no for security)
    const updateData = { ...req.body };
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.updatedAt;
    delete updateData.serial_no; // Prevent serial_no updates for security
    
    profileLogger.debug('[DEBUG] Starting validation for profile update', {
      phase: 'VALIDATION_START',
      profileId: id,
      updateFields: Object.keys(updateData),
      excludedFields: ['id', 'createdAt', 'updatedAt', 'serial_no'],
      formData: log.maskSensitive(updateData)
    });
    
    // Merge existing profile with update data for validation
    const mergedProfileData = { ...profiles[idx], ...updateData };
    
    // Validate the complete merged profile using existing validation logic
    profileLogger.trace('[TRACE] Validating merged profile data', {
      phase: 'VALIDATION_PROCESSING',
      profileId: id
    });
    
    const validationErrors = validateProfileData(mergedProfileData, {
      operation: 'UPDATE',
      profileId: id
    });
    
    if (validationErrors.length > 0) {
      profileLogger.error('[ERROR] Profile update validation failed', {
        phase: 'VALIDATION_FAILED',
        profileId: id,
        validationErrors,
        updateData: log.maskSensitive(updateData)
      });
      
      throw handleValidationError(validationErrors, 'UPDATE_PROFILE', profileLogger);
    }
    
    profileLogger.debug('[DEBUG] Profile update validation passed', {
      phase: 'VALIDATION_SUCCESS',
      profileId: id,
      validatedFields: Object.keys(updateData)
    });
    
    const now = new Date();
    
    // Always normalize is_remarried
    let updateBody = { ...updateData };
    let isRemarried = updateBody.is_remarried;
    
    profileLogger.debug('Profile update - remarried status handling', {
      profileId: id,
      incomingRemarried: isRemarried,
      incomingType: typeof isRemarried
    });
    
    if (
      isRemarried === undefined || isRemarried === null || isRemarried === '' ||
      isRemarried === false || isRemarried === 0 ||
      isRemarried === 'No' || isRemarried === 'no'
    ) {
      isRemarried = 'false';
    } else if (
      isRemarried === true || isRemarried === 1 ||
      isRemarried === 'Yes' || isRemarried === 'yes' ||
      isRemarried === 'true' || isRemarried === 'on'
    ) {
      isRemarried = 'true';
    } else {
      isRemarried = 'false';
    }
    
    updateBody.is_remarried = isRemarried;
    
    profileLogger.debug('Profile update - normalized remarried status', {
      profileId: id,
      normalizedRemarried: isRemarried,
      finalType: typeof isRemarried
    });
    
    // Apply validated update data to profile
    const updated = { ...profiles[idx], ...updateBody, updatedAt: now };
    profiles[idx] = updated;
    
    profileLogger.trace('[TRACE] Profile data updated successfully', {
      phase: 'DATA_UPDATE',
      profileId: updated.id,
      modifiedFields: Object.keys(updateBody)
    });
    
    profileLogger.trace('[TRACE] Writing updated profiles to file system', {
      phase: 'FILE_WRITE',
      profileId: id
    });
    
    writeProfiles(profiles);
    
    // Refresh in-memory profiles in matchingController
    try {
      require('./matchingController').reloadProfiles();
      profileLogger.trace('[TRACE] Successfully reloaded profiles in matching controller', {
        phase: 'CACHE_REFRESH_SUCCESS'
      });
    } catch (e) {
      profileLogger.warn('[WARN] Failed to reload profiles in matching controller after update', {
        phase: 'CACHE_REFRESH_ERROR',
        errorMessage: e.message
      }, e);
    }
    
    profileLogger.featureEnd('UPDATE_PROFILE', {
      success: true,
      profileId: updated.id,
      statusCode: 200
    }, Date.now() - startTime);
    
    profileLogger.methodExit('updateProfile', {
      success: true,
      profileId: updated.id,
      statusCode: 200
    });
    
    res.json(updated);
    
  } catch (error) {
    profileLogger.featureEnd('UPDATE_PROFILE', {
      success: false,
      error: error.message,
      statusCode: error.statusCode || 500
    }, Date.now() - startTime);
    
    profileLogger.methodExit('updateProfile', {
      success: false,
      error: error.message,
      statusCode: error.statusCode || 500
    });
    
    return handleControllerError(error, 'UPDATE_PROFILE', 'updateProfile', req, res, profileLogger);
  }
});

/**
 * Profile Controller with comprehensive trace logging
 * Handles profile creation with detailed logging of form validation, file operations, and error handling
 */

// Get profile file path from AppData/data directory
const profileFile = getDataFilePath('profile.json');

function ensureDataDir() {
  try {
    const dir = getDataPath();
    ensureDirectoryExists(dir);
    log.debug('Ensured data directory exists', { 
      source: 'ProfileController',
      directory: dir 
    });
  } catch (error) {
    throw handleFileSystemError(error, 'ensureDataDir', getDataPath(), 'CREATE_PROFILE');
  }
}

/**
 * Enhanced readProfiles function with comprehensive error handling
 */
function readProfiles() {
  try {
    ensureDataDir();
    if (!fs.existsSync(profileFile)) {
      log.debug('Profile file does not exist, returning empty array', { 
        source: 'ProfileController',
        profileFile 
      });
      return [];
    }
    
    const fileContent = fs.readFileSync(profileFile, 'utf8');
    
    if (!fileContent.trim()) {
      log.warn('Profile file is empty, returning empty array', { 
        source: 'ProfileController',
        profileFile 
      });
      return [];
    }
    
    const profiles = JSON.parse(fileContent);
    
    if (!Array.isArray(profiles)) {
      log.error('Profile file does not contain a valid array', { 
        source: 'ProfileController',
        profileFile, 
        contentType: typeof profiles 
      });
      throw new AppError(
        ERROR_MESSAGES.DATA_CORRUPTION,
        500,
        ERROR_TYPES.FILE_SYSTEM,
        { profileFile, issue: 'Not an array' }
      );
    }
    
    log.debug('Successfully read profiles', { 
      source: 'ProfileController',
      profileFile, 
      profilesCount: profiles.length 
    });
    
    return profiles;
    
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    if (error instanceof SyntaxError) {
      log.error('Profile file contains invalid JSON', {
        source: 'ProfileController',
        profileFile,
        errorMessage: error.message
      }, error);
      
      throw new AppError(
        ERROR_MESSAGES.DATA_CORRUPTION,
        500,
        ERROR_TYPES.FILE_SYSTEM,
        { profileFile, issue: 'Invalid JSON' }
      );
    }
    
    throw handleFileSystemError(error, 'readProfiles', profileFile, 'PROFILE_MANAGEMENT');
  }
}

function writeProfiles(profiles) {
  try {
    ensureDataDir();
    
    if (!Array.isArray(profiles)) {
      throw new AppError(
        'Profiles data must be an array',
        400,
        ERROR_TYPES.VALIDATION,
        { profilesType: typeof profiles }
      );
    }
    
    const jsonContent = JSON.stringify(profiles, null, 2);
    fs.writeFileSync(profileFile, jsonContent, 'utf8');
    
    log.debug('Successfully wrote profiles', { 
      source: 'ProfileController',
      profileFile, 
      profilesCount: profiles.length,
      fileSize: jsonContent.length
    });
    
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    
    throw handleFileSystemError(error, 'writeProfiles', profileFile, 'PROFILE_MANAGEMENT');
  }
}

// Helper function to validate profile data using validation helpers
function validateProfileData(data, context = {}) {
  const errors = [];
  
  // Enhanced logging for debugging validation issues
  profileLogger.debug('[DEBUG] Starting validation for profile data', {
    phase: 'VALIDATION_START',
    operation: context.operation || 'CREATE',
    profileId: context.profileId || 'NEW',
    receivedFields: Object.keys(data || {}),
    emptyFields: Object.keys(data || {}).filter(key => !data[key] || (typeof data[key] === 'string' && data[key].trim() === '')),
    providedFields: Object.keys(data || {}).filter(key => data[key] && (typeof data[key] !== 'string' || data[key].trim() !== '')),
    dataSnapshot: {
      name: data?.name || 'NOT_PROVIDED',
      serial_no: data?.serial_no || 'NOT_PROVIDED',
      gender: data?.gender || 'NOT_PROVIDED',
      birth_date: data?.birth_date || 'NOT_PROVIDED',
      contact_no: data?.contact_no || 'NOT_PROVIDED',
      nakshatraid: data?.nakshatraid || 'NOT_PROVIDED'
    }
  });
  
  // Check if data object exists
  if (!data || typeof data !== 'object') {
    errors.push({ field: 'form', message: 'No form data received' });
    profileLogger.error('[ERROR] No form data received for validation', {
      phase: 'VALIDATION_DATA_CHECK',
      dataType: typeof data,
      dataValue: data
    });
    return errors;
  }
  
  // Required field validators using helper functions
  const requiredFieldValidators = {
    name: (value) => FieldValidator.validatePersonName(value, 'name'),
    serial_no: (value) => FieldValidator.validateSerialNumber(value, 'serial_no'),
    gender: (value) => [
      ...FieldValidator.validateRequired(value, 'gender'),
      ...FieldValidator.validateEnum(value, 'gender', VALIDATION_CONFIG.ENUMS.gender)
    ],
    birth_date: (value) => FieldValidator.validateBirthDate(value, 'birth_date'),
    contact_no: (value) => FieldValidator.validatePhone(value, 'contact_no', true),
    nakshatraid: (value) => FieldValidator.validateNakshatraId(value, 'nakshatraid'),
    gothram: (value) => FieldValidator.validateGothram(value, 'gothram'),
    father_name: (value) => FieldValidator.validatePersonName(value, 'father_name'),
    mother_name: (value) => FieldValidator.validatePersonName(value, 'mother_name'),
    birth_time: (value) => FieldValidator.validateBirthTime(value, 'birth_time'),
    birth_place: (value) => FieldValidator.validateBirthPlace(value, 'birth_place')
  };
  
  // Validate all required fields
  const requiredFields = VALIDATION_CONFIG.REQUIRED_FIELDS;
  const missingFields = [];
  
  // Process required fields with detailed validation
  requiredFields.forEach(field => {
    if (requiredFieldValidators[field]) {
      const fieldErrors = requiredFieldValidators[field](data[field]);
      errors.push(...fieldErrors);
      
      // Track missing fields for logging
      if (!data[field] || (typeof data[field] === 'string' && data[field].trim() === '')) {
        missingFields.push(field);
      }
    }
  });
  
  // Log missing fields information
  if (missingFields.length > 0) {
    profileLogger.error('[ERROR] Missing required fields detected', {
      phase: 'REQUIRED_FIELD_CHECK',
      missingFields: missingFields,
      totalMissing: missingFields.length,
      requiredFields: requiredFields,
      providedFields: Object.keys(data).filter(key => data[key] && (typeof data[key] !== 'string' || data[key].trim() !== ''))
    });
  }
  
  // Check for duplicate serial numbers (only for CREATE operations)
  // Note: UPDATE operations exclude serial_no, so no duplicate check needed
  if (context.operation === 'CREATE' && data.serial_no && data.serial_no.trim() !== '') {
    try {
      const profiles = readProfiles();
      const existingProfile = profiles.find(p => 
        p.serial_no && 
        p.serial_no.toString().trim().toLowerCase() === data.serial_no.toString().trim().toLowerCase()
      );
      
      profileLogger.debug('[DEBUG] Duplicate serial check for CREATE', {
        phase: 'DUPLICATE_CHECK_CREATE',
        serialNo: data.serial_no,
        foundConflict: !!existingProfile,
        conflictProfileId: existingProfile?.id
      });
      
      if (existingProfile) {
        errors.push({
          field: 'serial_no',
          message: 'Serial number already exists. Please choose a different serial number.'
        });
        
        profileLogger.error('[ERROR] Duplicate serial number detected', {
          phase: 'DUPLICATE_VALIDATION',
          operation: 'CREATE',
          duplicateSerialNo: data.serial_no,
          existingProfileId: existingProfile.id
        });
      }
    } catch (err) {
      // If we can't read profiles for duplicate check, log warning but don't fail validation
      profileLogger.warn('[WARN] Unable to check for duplicate serial numbers', {
        phase: 'DUPLICATE_CHECK_ERROR',
        error: err.message,
        serialNo: data.serial_no
      });
    }
  } else if (context.operation === 'UPDATE') {
    profileLogger.debug('[DEBUG] Skipping duplicate serial check for UPDATE operation', {
      phase: 'DUPLICATE_CHECK_SKIPPED',
      reason: 'Serial number is read-only in updates'
    });
  }
  
  // Optional field validations using helper functions
  const optionalFieldValidators = {
    monthly_income: (value) => FieldValidator.validateMonthlyIncome(value, 'monthly_income'),
    qualification: (value) => FieldValidator.validateEnum(value, 'qualification', VALIDATION_CONFIG.ENUMS.qualification),
    region: (value) => FieldValidator.validateEnum(value, 'region', VALIDATION_CONFIG.ENUMS.region),
    birth_time: (value) => FieldValidator.validateBirthTime(value, 'birth_time'),
    is_active: (value) => FieldValidator.validateBoolean(value, 'is_active'),
    is_remarried: (value) => FieldValidator.validateBoolean(value, 'is_remarried')
  };
  
  // Process optional fields
  Object.keys(optionalFieldValidators).forEach(field => {
    if (data[field] !== undefined) {
      const fieldErrors = optionalFieldValidators[field](data[field]);
      errors.push(...fieldErrors);
    }
  });
  
  // Length constraint validations for text fields
  const lengthConstraintFields = [
    'address', 'qualification_details', 'job_details', 'siblings', 'birth_place'
  ];
  
  lengthConstraintFields.forEach(field => {
    if (data[field]) {
      const maxLength = VALIDATION_CONFIG.FIELD_LENGTHS[field];
      if (maxLength) {
        const lengthErrors = FieldValidator.validateLength(data[field], field, null, maxLength);
        errors.push(...lengthErrors);
      }
    }
  });
  
  // Enhanced logging for validation results
  profileLogger.debug('[DEBUG] Validation completed', {
    phase: 'VALIDATION_COMPLETE',
    totalErrors: errors.length,
    hasErrors: errors.length > 0,
    errorsByField: errors.reduce((acc, error) => {
      acc[error.field] = error.message;
      return acc;
    }, {}),
    validationSummary: {
      requiredFieldsChecked: requiredFields,
      optionalFieldsValidated: Object.keys(optionalFieldValidators),
      booleanFieldsValidated: ['is_active', 'is_remarried'],
      lengthConstraintsChecked: lengthConstraintFields,
      helperFunctionsUsed: Object.keys(requiredFieldValidators).concat(Object.keys(optionalFieldValidators))
    }
  });
  
  return errors;
}

exports.createProfile = asyncHandler(async (req, res) => {
  // Create feature-specific logger for Create Profile functionality
  const profileLogger = log.profile();
  
  const startTime = Date.now();
  profileLogger.featureStart('CREATE_PROFILE', { 
    source: 'ProfileController',
    operation: 'CREATE_PROFILE',
    method: 'POST',
    endpoint: '/profile/create',
    requestId: req.headers['x-request-id'] || 'unknown'
  });
  
  profileLogger.methodEntry('createProfile', {
    body: log.maskSensitive(req.body),
    headers: req.headers,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress
  });

  // Debug: Log all form fields received
  profileLogger.debug('[DEBUG] Form data received for validation', {
    phase: 'DATA_RECEIVED',
    formFields: {
      serial_no: req.body.serial_no || 'NOT_PROVIDED',
      name: req.body.name || 'NOT_PROVIDED', 
      gender: req.body.gender || 'NOT_PROVIDED',
      birth_date: req.body.birth_date || 'NOT_PROVIDED',
      contact_no: req.body.contact_no || 'NOT_PROVIDED',
      nakshatraid: req.body.nakshatraid || 'NOT_PROVIDED',
      qualification: req.body.qualification || 'NOT_PROVIDED',
      region: req.body.region || 'NOT_PROVIDED',
      rasi_lagnam: req.body.rasi_lagnam || 'NOT_PROVIDED',
      is_active: req.body.is_active || 'NOT_PROVIDED',
      is_remarried: req.body.is_remarried || 'NOT_PROVIDED'
    },
    allFieldsCount: Object.keys(req.body).length,
    emptyFields: Object.keys(req.body).filter(key => !req.body[key] || req.body[key].trim() === ''),
    providedFields: Object.keys(req.body).filter(key => req.body[key] && req.body[key].trim() !== '')
  });

  try {
    // Input validation
    profileLogger.trace('[TRACE] Starting input validation', {
      phase: 'VALIDATION'
    });
    
    const validationErrors = validateProfileData(req.body, {
      operation: 'CREATE'
    });
    
    profileLogger.debug('[DEBUG] Validation completed', {
      phase: 'VALIDATION_COMPLETE',
      totalErrors: validationErrors.length,
      hasErrors: validationErrors.length > 0
    });
    
    // Log each validation error individually for easy debugging
    if (validationErrors.length > 0) {
      validationErrors.forEach((error, index) => {
        profileLogger.error(`[ERROR] Validation Error #${index + 1}`, {
          phase: 'VALIDATION_ERROR_DETAIL',
          errorNumber: index + 1,
          field: error.field,
          message: error.message,
          submittedValue: req.body[error.field] !== undefined ? req.body[error.field] : 'NOT_PROVIDED',
          valueType: typeof req.body[error.field],
          isEmpty: !req.body[error.field] || (typeof req.body[error.field] === 'string' && req.body[error.field].trim() === '')
        });
      });
    }
    
    profileLogger.debug('[DEBUG] Validation details', {
      phase: 'VALIDATION',
      submittedData: log.maskSensitive(req.body),
      validationErrors: validationErrors,
      validationRules: {
        nakshatraRange: '1-36 (dynamic)',
        phoneFormat: 'Indian 10-digit',
        requiredFields: ['name', 'gender', 'birth_date', 'contact_no', 'nakshatraid', 'birth_time', 'birth_place'],
        optionalFields: ['qualification', 'region', 'monthly_income']
      }
    });
    
    // Debug: Log specific validation failures with detailed analysis
    if (validationErrors.length > 0) {
      const fieldErrorMap = validationErrors.reduce((acc, error) => {
        acc[error.field] = error.message;
        return acc;
      }, {});
      
      profileLogger.error('[ERROR] Specific validation failures detected', {
        phase: 'VALIDATION_DETAILS',
        totalErrors: validationErrors.length,
        errorsByField: fieldErrorMap,
        failedFields: validationErrors.map(error => error.field),
        allValidationErrors: validationErrors,
        // Enhanced error analysis
        criticalFieldFailures: validationErrors.filter(e => ['name', 'gender', 'birth_date', 'contact_no', 'nakshatraid', 'serial_no', 'gothram', 'father_name', 'mother_name', 'birth_time', 'birth_place'].includes(e.field)),
        optionalFieldFailures: validationErrors.filter(e => !['name', 'gender', 'birth_date', 'contact_no', 'nakshatraid', 'serial_no', 'gothram', 'father_name', 'mother_name', 'birth_time', 'birth_place'].includes(e.field)),
        emptyRequiredFields: Object.keys(req.body).filter(key => 
          ['name', 'gender', 'birth_date', 'contact_no', 'nakshatraid', 'serial_no', 'gothram', 'father_name', 'mother_name', 'birth_time', 'birth_place'].includes(key) && 
          (!req.body[key] || req.body[key].trim() === '')
        ),
        invalidFormatFields: validationErrors.filter(e => e.message.includes('format') || e.message.includes('invalid')).map(e => e.field),
        userFriendlyErrorSummary: `${validationErrors.length} validation error(s): ${validationErrors.map(e => `${e.field} - ${e.message}`).join('; ')}`
      });
      
      // Log user-friendly error message for debugging UI issues
      profileLogger.info('[INFO] User will see these validation errors', {
        phase: 'USER_FEEDBACK',
        generalMessage: ERROR_MESSAGES.INVALID_INPUT,
        specificErrors: fieldErrorMap,
        fieldErrorsWillHighlight: Object.keys(fieldErrorMap),
        formDataPreserved: Object.keys(req.body)
      });
    }
    
    if (validationErrors.length > 0) {
      profileLogger.error('[ERROR] Profile validation failed', {
        phase: 'VALIDATION',
        validationErrors,
        requestBody: log.maskSensitive(req.body)
      });
      
      throw handleValidationError(validationErrors, 'CREATE_PROFILE', profileLogger);
    }
    
    profileLogger.trace('[TRACE] Input validation passed', {
      phase: 'VALIDATION'
    });
    
    // Start profile data processing
    profileLogger.trace('[TRACE] Reading existing profiles for ID generation', {
      phase: 'DATA_LOADING'
    });
    
    const profiles = readProfiles();
    
    const newId = profiles.length > 0 ? Math.max(...profiles.map(p => p.id || 0)) + 1 : 1;
    const now = new Date();
    
    profileLogger.trace('[TRACE] Generated new profile ID', {
      phase: 'ID_GENERATION',
      newId,
      existingProfilesCount: profiles.length
    });

    // Robust normalization for is_remarried with detailed logging
    profileLogger.trace('[TRACE] Processing remarried status normalization', {
      phase: 'DATA_VALIDATION',
      originalValue: req.body.is_remarried,
      valueType: typeof req.body.is_remarried
    });
    
    let isRemarried = req.body.is_remarried;
    if (
      isRemarried === undefined || isRemarried === null || isRemarried === '' ||
      isRemarried === false || isRemarried === 0 ||
      isRemarried === 'No' || isRemarried === 'no'
    ) {
      isRemarried = 'false';
    } else if (
      isRemarried === true || isRemarried === 1 ||
      isRemarried === 'Yes' || isRemarried === 'yes' ||
      isRemarried === 'true' || isRemarried === 'on'
    ) {
      isRemarried = 'true';
    } else {
      isRemarried = 'false';
    }
    
    profileLogger.trace('[TRACE] Completed remarried status normalization', {
      phase: 'DATA_VALIDATION',
      normalizedValue: isRemarried
    });

    // Profile data construction with masked logging
    profileLogger.trace('[TRACE] Constructing profile data object', {
      phase: 'DATA_CONSTRUCTION',
      profileId: newId
    });
    
    const data = {
      id: String(newId),
      serial_no: req.body.serial_no.trim(),
      name: req.body.name.trim(),
      father_name: req.body.father_name || '',
      mother_name: req.body.mother_name || '',
      siblings: req.body.siblings || '',
      gothram: req.body.gothram || '',
      birth_date: req.body.birth_date,
      birth_time: req.body.birth_time || '',
      birth_place: req.body.birth_place || '',
      qualification: req.body.qualification || '',
      job_details: req.body.job_details || '',
      monthly_income: req.body.monthly_income || '',
      address: req.body.address || '',
      contact_no: req.body.contact_no.replace(/\D/g, ''), // Store only digits
      gender: req.body.gender,
      region: req.body.region || 'Chennai',
      additional_contact_no: req.body.additional_contact_no || '', // Keep original format for flexibility
      qualification_details: req.body.qualification_details || '',
      is_active: req.body.is_active !== undefined ? req.body.is_active : true,
      nakshatraid: parseInt(req.body.nakshatraid),
      is_remarried: isRemarried,
      rasi_lagnam: req.body.rasi_lagnam || 'Suth',
      navamsam_lagnam: req.body.navamsam_lagnam || '',
      createdAt: now,
      updatedAt: now
    };
    
    profileLogger.trace('[TRACE] Profile data object constructed', {
      phase: 'DATA_CONSTRUCTION',
      profileData: log.maskSensitive(data),
      fieldsCount: Object.keys(data).length
    });

    // Create profile instance
    profileLogger.trace('[TRACE] Creating Profile model instance', {
      phase: 'MODEL_CREATION',
      profileId: data.id
    });
    
    const profile = new Profile(data);
    profiles.push(profile);
    
    profileLogger.trace('[TRACE] Profile added to collection', {
      phase: 'COLLECTION_UPDATE',
      totalProfiles: profiles.length,
      newProfileId: profile.id
    });

    // File system write operation with retry logic
    profileLogger.trace('[TRACE] Writing profiles to file system', {
      phase: 'FILE_WRITE',
      profilesCount: profiles.length
    });
    
    let writeAttempts = 0;
    const maxWriteAttempts = 3;
    
    while (writeAttempts < maxWriteAttempts) {
      try {
        writeProfiles(profiles);
        break;
      } catch (writeError) {
        writeAttempts++;
        profileLogger.warn(`[WARN] File write attempt ${writeAttempts} failed`, {
          phase: 'FILE_WRITE_RETRY',
          attempt: writeAttempts,
          maxAttempts: maxWriteAttempts,
          errorMessage: writeError.message
        });
        
        if (writeAttempts >= maxWriteAttempts) {
          throw writeError;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 100 * writeAttempts));
      }
    }
    
    profileLogger.trace('[TRACE] Profiles written to file system successfully', {
      phase: 'FILE_WRITE_SUCCESS',
      writeAttempts
    });

    // Refresh in-memory profiles in matchingController
    profileLogger.trace('[TRACE] Refreshing in-memory profiles cache', {
      phase: 'CACHE_REFRESH'
    });
    
    try {
      require('./matchingController').reloadProfiles();
      profileLogger.trace('[TRACE] Successfully reloaded profiles in matching controller', {
        phase: 'CACHE_REFRESH_SUCCESS'
      });
    } catch (e) {
      profileLogger.warn('[WARN] Failed to reload profiles in matching controller after creation', {
        phase: 'CACHE_REFRESH_ERROR',
        errorMessage: e.message
      }, e);
      // Don't throw here as profile creation was successful
    }
    
    // Return successful response
    profileLogger.trace('[TRACE] Sending successful response', {
      phase: 'RESPONSE_SUCCESS',
      responseProfile: log.maskSensitive(profile)
    });
    
    profileLogger.featureEnd('CREATE_PROFILE', {
      success: true,
      profileId: profile.id,
      statusCode: 201
    }, Date.now() - startTime);
    
    profileLogger.methodExit('createProfile', {
      success: true,
      profileId: profile.id,
      statusCode: 201
    });
    
    res.status(201).json(profile);
    
  } catch (error) {
    profileLogger.featureEnd('CREATE_PROFILE', {
      success: false,
      error: error.message,
      statusCode: error.statusCode || 500
    }, Date.now() - startTime);
    
    profileLogger.methodExit('createProfile', {
      success: false,
      error: error.message,
      statusCode: error.statusCode || 500
    });
    
    return handleControllerError(error, 'CREATE_PROFILE', 'createProfile', req, res, profileLogger);
  }
});

/**
 * Check if a serial number already exists in the database
 * Used for real-time validation during profile creation
 * GET /api/profile/check-serial/:serialNo
 */
exports.checkSerialNumberExists = asyncHandler(async (req, res) => {
  const profileLogger = log.profile();
  
  try {
    const { serialNo } = req.params;
    
    profileLogger.methodEntry('checkSerialNumberExists', {
      source: 'ProfileController',
      serialNo: serialNo
    });
    
    // Validate serial number parameter
    if (!serialNo || serialNo.trim() === '') {
      profileLogger.warn('[WARN] Empty serial number provided', {
        source: 'ProfileController',
        operation: 'CHECK_SERIAL_EXISTS'
      });
      
      return res.status(400).json({
        exists: false,
        message: 'Serial number is required',
        valid: false
      });
    }
    
    // Load profiles and check for duplicate
    const profiles = readProfiles();
    const serialNoLower = serialNo.toString().trim().toLowerCase();
    
    const existingProfile = profiles.find(p => 
      p.serial_no && 
      p.serial_no.toString().trim().toLowerCase() === serialNoLower
    );
    
    const exists = !!existingProfile;
    
    profileLogger.debug('[DEBUG] Serial number existence check completed', {
      source: 'ProfileController',
      operation: 'CHECK_SERIAL_EXISTS',
      serialNo: serialNo,
      exists: exists,
      existingProfileId: existingProfile?.id
    });
    
    profileLogger.methodExit('checkSerialNumberExists', {
      source: 'ProfileController',
      success: true,
      exists: exists
    });
    
    return res.json({
      exists: exists,
      message: exists 
        ? 'Serial number already exists. Please choose a different serial number.' 
        : 'Serial number is available',
      valid: !exists
    });
    
  } catch (error) {
    profileLogger.error('[ERROR] Error checking serial number existence', {
      source: 'ProfileController',
      operation: 'CHECK_SERIAL_EXISTS',
      errorMessage: error.message
    }, error);
    
    profileLogger.methodExit('checkSerialNumberExists', {
      source: 'ProfileController',
      success: false,
      error: error.message
    });
    
    return res.status(500).json({
      exists: false,
      message: 'Error checking serial number availability',
      valid: false,
      error: error.message
    });
  }
});
