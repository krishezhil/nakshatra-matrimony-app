const log = require('../utils/logger');
const { getVersionInfo, VERSION, APP_NAME, DISPLAY_NAME, RELEASE_DATE } = require('../utils/version');

// Load version information from centralized configuration
const VERSION_INFO = getVersionInfo();

/**
 * Middleware to inject version information into all views
 * Makes version data available via res.locals
 */
function versionMiddleware(req, res, next) {
  try {
    // Inject version info into res.locals for all views
    res.locals.appVersion = VERSION_INFO.versionString || VERSION || 'X.X.X';
    res.locals.appName = VERSION_INFO.displayName || VERSION_INFO.name || APP_NAME;
    res.locals.description = VERSION_INFO.description;
    res.locals.nodeVersion = VERSION_INFO.nodeVersion;
    res.locals.releaseDate = VERSION_INFO.releaseDate;
    res.locals.buildNumber = VERSION_INFO.buildNumber;
    
    next();
  } catch (error) {
    log.error('Version middleware error', {
      source: 'versionMiddleware',
      error: error.message
    });
    
    // Continue even if version info fails - use defaults
    res.locals.appVersion = VERSION;
    res.locals.nodeVersion = process.version;
    res.locals.releaseDate = RELEASE_DATE;
    res.locals.buildNumber = 'Production';
    
    next();
  }
}

/**
 * API endpoint to get version information as JSON
 */
function getVersionEndpoint(req, res) {
  try {
    res.json({
      success: true,
      version: VERSION_INFO
    });
  } catch (error) {
    log.error('Failed to retrieve version information', {
      source: 'versionMiddleware',
      error: error.message
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve version information'
    });
  }
}

module.exports = {
  versionMiddleware,
  getVersionEndpoint
};
