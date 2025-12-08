const log = require('../utils/logger');
const { ERROR_TYPES } = require('../utils/errorHandler');
const { loadJsonFile } = require('./DataLoaderService');
const { nakshatraPath } = require('../utils/dataPaths');

/**
 * Nakshatra Service
 * Extracted from matchingController.js - maintains exact same functionality
 * Handles nakshatra data loading and name mapping operations
 */

// Load nakshatra data for name mapping
let nakshatraData, nakshatraMap;

try {
  nakshatraData = loadJsonFile(nakshatraPath, 'Nakshatra data');
  
  // Create nakshatra ID to name mapping
  nakshatraMap = {};
  nakshatraData.forEach(nakshatra => {
    if (!nakshatra.id || !nakshatra.display_name) {
      log.warn('Invalid nakshatra record found', { 
        source: 'NakshatraService',
        nakshatra 
      });
      return;
    }
    nakshatraMap[nakshatra.id] = nakshatra.display_name;
  });
  
  log.info('Nakshatra data loaded successfully', {
    source: 'NakshatraService',
    nakshatraCount: nakshatraData.length,
    mappingSize: Object.keys(nakshatraMap).length
  });
  
} catch (error) {
  log.error('Failed to load nakshatra data', {
    source: 'NakshatraService',
    errorMessage: error.message,
    errorType: error.errorType || ERROR_TYPES.FILE_SYSTEM
  }, error);
  
  // Set fallback values
  nakshatraData = [];
  nakshatraMap = {};
}

// Helper function to get nakshatra name from ID with error handling
const getNakshatraName = (nakshatraId) => {
  try {
    if (!nakshatraId) return 'Unknown';
    
    const id = parseInt(nakshatraId);
    if (isNaN(id)) {
      log.warn('Invalid nakshatra ID provided', { 
        source: 'NakshatraService',
        nakshatraId 
      });
      return `Invalid ID: ${nakshatraId}`;
    }
    
    return nakshatraMap[id] || `ID: ${nakshatraId}`;
  } catch (error) {
    log.warn('Error getting nakshatra name', { 
      source: 'NakshatraService',
      nakshatraId, 
      error: error.message 
    });
    return `Error: ${nakshatraId}`;
  }
};

module.exports = {
  nakshatraData,
  nakshatraMap,
  getNakshatraName
};