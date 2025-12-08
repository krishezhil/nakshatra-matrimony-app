
const express = require('express');
const router = express.Router();
const log = require('../utils/logger');

// Render search-profile with age column
// NOTE: This search-profile page is created for future use - advanced search functionality will be implemented here
router.get('/search-profile', async (req, res) => {
  try {
    const fetchFn = typeof fetch === 'function' ? fetch : require('node-fetch');
    const params = new URLSearchParams(req.query).toString();
    const apiUrl = `${req.protocol}://${req.get('host')}/api/profile${params ? '?' + params : ''}`;
    const response = await fetchFn(apiUrl);
    let profiles = await response.json();
    // Calculate age for each profile
    function calculateAge(birthdateStr) {
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
    }
    profiles = profiles.map(p => {
      const birthdate = p.birth_date;
      const age = calculateAge(birthdate);
      return { ...p, age };
    });
  log.info('Search profiles rendered successfully', { profileCount: profiles.length, source: 'ProfileEjsRoutes' });
  res.render('search-profile', { profiles });
  } catch (err) {
    log.error('Failed to load profiles for search', { error: err.message, source: 'ProfileEjsRoutes' });
    res.render('search-profile', { profiles: [], error: 'Failed to load profiles.' });
  }
});


// Render create profile form
router.get('/create', (req, res) => {
  res.render('create-profile', {
    error: null,
    fieldErrors: {},
    formData: {}
  });
});

// Handle create profile form submission
router.post('/create', async (req, res) => {
  log.debug('Profile creation form submitted', { 
    fieldsReceived: Object.keys(req.body).length,
    timestamp: new Date().toISOString(),
    source: 'ProfileEjsRoutes'
  });
  
  try {
    const fetchFn = typeof fetch === 'function' ? fetch : require('node-fetch');
    const apiUrl = `${req.protocol}://${req.get('host')}/api/profile`;
    const response = await fetchFn(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      
      // Debug: Log the raw error data received from API
      log.debug('Raw error data from API', {
        errorData: errorData,
        hasMessage: !!errorData.message,
        messageValue: errorData.message,
        hasDetails: !!errorData.details,
        detailsType: typeof errorData.details,
        detailsValue: errorData.details,
        source: 'ProfileEjsRoutes'
      });
      
      let errorDetails = {};
      
      // Handle both array format [{field, message}] and object format {field: message}
      if (errorData.details) {
        if (Array.isArray(errorData.details)) {
          errorData.details.forEach(detail => {
            errorDetails[detail.field] = detail.message;
          });
        } else if (typeof errorData.details === 'object') {
          errorDetails = errorData.details;
        }
      }
      
      log.warn('Profile creation validation failed', {
        errorMessage: errorData.message || 'Validation failed',
        fieldErrorsCount: Object.keys(errorDetails).length,
        fieldErrors: errorDetails,
        timestamp: new Date().toISOString(),
        source: 'ProfileEjsRoutes'
      });
      
      return res.render('create-profile', { 
        error: errorData.message || 'Validation failed. Please check the form.',
        fieldErrors: errorDetails,
        formData: req.body 
      });
    }
    
    // Get the created profile data from response
    const createdProfile = await response.json();
    
    // Build success redirect with query parameters
    const params = new URLSearchParams({
      created: 'true',
      sno: createdProfile.serial_no || '',
      pname: createdProfile.name || ''
    });
    
    log.info('Profile creation successful, redirecting with success params', {
      serialNo: createdProfile.serial_no,
      profileName: createdProfile.name,
      source: 'ProfileEjsRoutes'
    });
    
    res.redirect(`/profile/showall?${params.toString()}`);
  } catch (err) {
    log.error('Profile creation route error (catch block)', {
      errorMessage: err.message,
      errorStack: err.stack,
      hasResponse: !!err.response,
      source: 'ProfileEjsRoutes'
    });
    
    let errorDetails = {};
    let generalError = 'Failed to create profile.';
    
    if (err.response) {
      try {
        const errorData = await err.response.json();
        
        log.debug('Error response from API (catch block)', {
          errorData: errorData,
          source: 'ProfileEjsRoutes'
        });
        
        if (errorData.details) {
          if (Array.isArray(errorData.details)) {
            errorData.details.forEach(detail => {
              errorDetails[detail.field] = detail.message;
            });
          } else if (typeof errorData.details === 'object') {
            errorDetails = errorData.details;
          }
        }
        generalError = errorData.message || generalError;
      } catch (parseErr) {
        log.error('Failed to parse error response', {
          parseError: parseErr.message,
          source: 'ProfileEjsRoutes'
        });
      }
    }
    
    log.warn('Rendering create-profile with catch block errors', {
      generalError,
      fieldErrorsCount: Object.keys(errorDetails).length,
      source: 'ProfileEjsRoutes'
    });
    
    res.render('create-profile', { 
      error: generalError,
      fieldErrors: errorDetails,
      formData: req.body 
    });
  }
});

// Handle update profile form submission
router.post('/update/:id', async (req, res) => {
  try {
    const fetchFn = typeof fetch === 'function' ? fetch : require('node-fetch');
    const apiUrl = `${req.protocol}://${req.get('host')}/api/profile`;
    const response = await fetchFn(apiUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...req.body, id: req.params.id })
    });
    
    if (!response.ok) {
      // Handle different types of API errors
      let errorData = {};
      try {
        errorData = await response.json();
      } catch (parseError) {
        // If response is not JSON, use default error
        errorData = { message: 'Failed to update profile' };
      }
      
      // Check if it's a validation error (400 status with fieldErrors)
      if (response.status === 400 && errorData.fieldErrors) {
        // Log validation error for debugging (could use proper logger here)
        return res.render('update-profile', {
          profile: { ...req.body, id: req.params.id },
          fieldErrors: errorData.fieldErrors,
          formData: req.body,
          error: errorData.message || 'Please correct the highlighted fields and try again.'
        });
      }
      
      // Handle other API errors
      return res.render('update-profile', {
        profile: { ...req.body, id: req.params.id },
        fieldErrors: {},
        formData: req.body,
        error: errorData.message || 'Failed to update profile. Please try again.'
      });
    }
    
    // Success - redirect to show all profiles with success notification
    const params = new URLSearchParams({
      updated: 'true',
      sno: req.body.serial_no || '',
      pname: req.body.profile_name || ''
    });
    res.redirect(`/profile/showall?${params.toString()}`);
  } catch (err) {
    log.error('Update profile route error', { 
      error: err.message,
      profileId: req.params.id,
      timestamp: new Date().toISOString(),
      source: 'ProfileEjsRoutes'
    });
    res.render('update-profile', {
      profile: { ...req.body, id: req.params.id },
      fieldErrors: {},
      formData: req.body,
      error: 'An unexpected error occurred. Please try again.'
    });
  }
});

// Render all profiles in EJS view by calling the API filter endpoint
router.get('/showall', async (req, res) => {
  try {
    // ===== PHASE 1: PAGINATION PARAMETERS =====
    // Extract and validate pagination parameters
    let page = parseInt(req.query.page) || 1;
    let limit = parseInt(req.query.limit) || 10;
    
    // Validate page number (must be at least 1)
    if (page < 1) page = 1;
    
    // Validate limit (between 1 and 100)
    if (limit < 1 || limit > 100) limit = 10;
    
    log.debug('Pagination parameters (initial)', {
      source: 'ProfileEjsRoutes',
      page,
      limit
    });
    
    // ===== FETCH ALL PROFILES WITH FILTERS =====
    const fetchFn = typeof fetch === 'function' ? fetch : require('node-fetch');
    
    // Build query params for API call (exclude pagination params)
    const apiParams = new URLSearchParams();
    for (const [key, value] of Object.entries(req.query)) {
      if (key !== 'page' && key !== 'limit' && key !== 'created' && key !== 'updated' && key !== 'sno' && key !== 'pname') {
        apiParams.append(key, value);
      }
    }
    
    const apiUrl = `${req.protocol}://${req.get('host')}/api/profile/filter${apiParams.toString() ? '?' + apiParams.toString() : ''}`;
    const response = await fetchFn(apiUrl);
    let allProfiles = await response.json();
    
    // ===== CALCULATE TOTALS BEFORE PAGINATION =====
    const totalProfiles = allProfiles.length;
    const totalPages = Math.ceil(totalProfiles / limit);
    
    // Adjust page if it exceeds total pages
    if (page > totalPages && totalPages > 0) {
      page = totalPages;
    }
    
    // Calculate skip AFTER page adjustment
    const skip = (page - 1) * limit;
    
    log.info('Profiles loaded for pagination', {
      source: 'ProfileEjsRoutes',
      totalProfiles,
      totalPages,
      currentPage: page,
      limit,
      skip
    });
    
    // ===== APPLY PAGINATION =====
    const paginatedProfiles = allProfiles.slice(skip, skip + limit);
    
    // ===== CALCULATE AGE FOR PAGINATED PROFILES ONLY =====
    function calculateAge(birthdateStr) {
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
    }
    
    const profiles = paginatedProfiles.map(p => {
      const age = calculateAge(p.birth_date);
      return { ...p, age };
    });
    
    // ===== HELPER FUNCTION: CALCULATE PAGE RANGE =====
    function calculatePageRange(currentPage, totalPages) {
      // Return empty array if no pages
      if (totalPages === 0) return [];
      
      const maxVisible = 5; // Show max 5 page numbers at a time
      let start = Math.max(1, currentPage - 2);
      let end = Math.min(totalPages, start + maxVisible - 1);
      
      // Adjust start if we're near the end
      if (end - start < maxVisible - 1) {
        start = Math.max(1, end - maxVisible + 1);
      }
      
      const pages = [];
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      return pages;
    }
    
    // ===== BUILD PAGINATION METADATA =====
    const pagination = {
      currentPage: page,
      totalPages: totalPages,
      totalProfiles: totalProfiles,
      limit: limit,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      nextPage: page + 1,
      prevPage: page - 1,
      startIndex: totalProfiles > 0 ? skip + 1 : 0,
      endIndex: Math.min(skip + limit, totalProfiles),
      pageRange: calculatePageRange(page, totalPages)
    };
    
    log.debug('Pagination metadata', {
      source: 'ProfileEjsRoutes',
      pagination
    });
    
    // ===== CHECK FOR SUCCESS ALERTS =====
    const creationSuccess = req.query.created === 'true' ? {
      serialNumber: req.query.sno || '',
      profileName: req.query.pname || ''
    } : null;
    
    const updateSuccess = req.query.updated === 'true' ? {
      serialNumber: req.query.sno || '',
      profileName: req.query.pname || ''
    } : null;
    
    if (creationSuccess) {
      log.debug('Showing profile creation success banner', {
        serialNumber: creationSuccess.serialNumber,
        profileName: creationSuccess.profileName,
        source: 'ProfileEjsRoutes'
      });
    }
    
    if (updateSuccess) {
      log.debug('Showing profile update success banner', {
        serialNumber: updateSuccess.serialNumber,
        profileName: updateSuccess.profileName,
        source: 'ProfileEjsRoutes'
      });
    }
    
    // ===== RENDER WITH PAGINATION =====
    res.render('showallprofile', { 
      profiles, 
      pagination,
      query: req.query,
      creationSuccess,
      updateSuccess
    });
  } catch (err) {
    log.error('Failed to load profiles for showall', {
      source: 'ProfileEjsRoutes',
      errorMessage: err.message
    }, err);
    
    res.render('showallprofile', { 
      profiles: [], 
      pagination: {
        currentPage: 1,
        totalPages: 0,
        totalProfiles: 0,
        limit: 10,
        hasNextPage: false,
        hasPrevPage: false,
        nextPage: 1,
        prevPage: 1,
        startIndex: 0,
        endIndex: 0,
        pageRange: []
      },
      error: 'Failed to load profiles.', 
      query: req.query,
      creationSuccess: null,
      updateSuccess: null
    });
  }
});


// Render update profile form with pre-filled data
router.get('/update/:id', async (req, res) => {
  try {
    const fetchFn = typeof fetch === 'function' ? fetch : require('node-fetch');
    const apiUrl = `${req.protocol}://${req.get('host')}/api/profile/${req.params.id}`;
    const response = await fetchFn(apiUrl);
    if (!response.ok) throw new Error('Profile not found');
    const profile = await response.json();
    res.render('update-profile', { 
      profile,
      fieldErrors: {},
      formData: {}
    });
  } catch (err) {
    res.render('update-profile', { 
      profile: null, 
      fieldErrors: {},
      formData: {},
      error: 'Failed to load profile. Please try again.' 
    });
  }
});

module.exports = router;
