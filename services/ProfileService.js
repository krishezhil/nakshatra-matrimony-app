const log = require('../utils/logger');
const { loadJsonFile } = require('./DataLoaderService');
const { profilesPath } = require('../utils/dataPaths');

/**
 * Profile Service
 * Extracted from matchingController.js - maintains exact same functionality
 * Handles profile data loading and management operations
 */

// Load matching data files with error handling
let profiles;

try {
  profiles = loadJsonFile(profilesPath, 'Profiles data');
  log.info('Profile service initialized', {
    source: 'ProfileService',
    profilesCount: profiles.length,
    profilesPath
  });
} catch (error) {
  log.error('Failed to load profiles data', {
    source: 'ProfileService',
    profilesPath,
    errorMessage: error.message
  }, error);
  profiles = [];
}

// Export a function to reload profiles from disk with error handling
function reloadProfiles() {
  try {
    profiles = loadJsonFile(profilesPath, 'Profiles data');
    log.info('Profiles reloaded from disk', { 
      source: 'ProfileService',
      profilesCount: profiles.length 
    });
  } catch (error) {
    log.error('Failed to reload profiles from disk', {
      source: 'ProfileService',
      profilesPath,
      errorMessage: error.message
    }, error);
    throw error;
  }
}

// Request-level cache to avoid multiple disk reads per request
let requestCache = {
  data: null,
  timestamp: 0,
  ttl: 1000 // 1 second TTL for request-level caching
};

// Export a getter function with intelligent caching
function getProfiles() {
  try {
    const now = Date.now();
    
    // Check if we have fresh data from current request (within TTL)
    if (requestCache.data && (now - requestCache.timestamp < requestCache.ttl)) {
      return requestCache.data;
    }
    
    // Load fresh data from disk
    const freshProfiles = loadJsonFile(profilesPath, 'Profiles data');
    
    // Update both caches
    profiles = freshProfiles;
    requestCache = {
      data: freshProfiles,
      timestamp: now,
      ttl: 1000
    };
    
    return freshProfiles;
  } catch (error) {
    log.error('Failed to load fresh profiles data, returning cached data', {
      source: 'ProfileService',
      profilesPath,
      errorMessage: error.message,
      cachedProfilesCount: profiles ? profiles.length : 0
    }, error);
    // Return cached data as fallback
    return profiles || [];
  }
}

module.exports = {
  profiles, // Keep for backward compatibility  
  getProfiles, // New getter function that always returns current data
  reloadProfiles
};