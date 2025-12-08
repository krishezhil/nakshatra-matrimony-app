const { getAllGothrams, getGothramById, getGothramsByName, addGothram } = require('../services/GothramService');
const log = require('../utils/logger');
const { 
  AppError, 
  ERROR_MESSAGES, 
  ERROR_TYPES, 
  handleControllerError, 
  asyncHandler 
} = require('../utils/errorHandler');

// CommonController: Handles fetching common data API logic
exports.getNakshatra = (req, res) => {
  // TODO: Implement nakshatra list logic
  res.json([]);
};

exports.getGothram = asyncHandler(async (req, res) => {
  log.debug('Gothram API endpoint called', {
    source: 'CommonController',
    query: req.query,
    params: req.params
  });
  
  try {
    const { id, search } = req.query;
    
    let gothrams;
    
    if (id) {
      // Get specific gothram by ID
      log.debug('Fetching gothram by ID', { gothramId: id });
      const gothram = getGothramById(id);
      if (!gothram) {
        throw new AppError(
          `Gothram not found for ID: ${id}`,
          404,
          ERROR_TYPES.NOT_FOUND,
          { gothramId: id }
        );
      }
      gothrams = [gothram];
    } else if (search) {
      // Search gothrams by name
      log.debug('Searching gothrams by name', { searchTerm: search });
      gothrams = getGothramsByName(search);
    } else {
      // Get all gothrams
      log.debug('Fetching all gothrams');
      gothrams = getAllGothrams();
    }
    
    log.info('Gothram data retrieved successfully', {
      source: 'CommonController',
      gothramCount: gothrams.length,
      requestType: id ? 'byId' : search ? 'search' : 'all'
    });
    
    res.json({
      success: true,
      data: gothrams,
      count: gothrams.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return handleControllerError(error, 'COMMON', 'getGothram', req, res, log);
  }
});

exports.createGothram = asyncHandler(async (req, res) => {
  log.debug('Create gothram API endpoint called', {
    source: 'CommonController',
    body: req.body,
    headers: {
      'content-type': req.headers['content-type'],
      'user-agent': req.headers['user-agent']
    }
  });
  
  try {
    const { name } = req.body;
    
    // Validate input
    if (!name || typeof name !== 'string') {
      throw new AppError(
        'Gothram name is required',
        400,
        ERROR_TYPES.VALIDATION,
        { field: 'name', received: name }
      );
    }
    
    log.debug('Creating new gothram', { gothramName: name.trim() });
    
    // Attempt to add the gothram
    const result = addGothram(name);
    
    if (!result.success) {
      log.warn('Gothram creation failed due to validation errors', {
        gothramName: name.trim(),
        errors: result.errors
      });
      
      // Format validation errors for consistent API response
      const errorMessage = result.errors.map(err => err.message).join(', ');
      throw new AppError(
        errorMessage,
        400,
        ERROR_TYPES.VALIDATION,
        { validationErrors: result.errors }
      );
    }
    
    log.info('Gothram created successfully', {
      source: 'CommonController',
      gothramId: result.data.id,
      gothramName: result.data.name
    });
    
    // Return success response matching existing API format
    res.status(201).json({
      success: true,
      message: 'Gothram created successfully',
      data: result.data,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return handleControllerError(error, 'COMMON', 'createGothram', req, res, log);
  }
});
