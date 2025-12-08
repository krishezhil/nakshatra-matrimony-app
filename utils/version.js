/**
 * Application Version Configuration
 * Version is read from package.json as single source of truth
 * Update package.json version when releasing new versions
 */

// Read version from package.json
const packageJson = require('../package.json');

/**
 * Parse semantic version string into components
 * @param {string} versionString - Version string like "1.0.3"
 * @returns {object} Object with major, minor, patch numbers
 */
function parseSemanticVersion(versionString) {
  try {
    const [major, minor, patch] = versionString.split('.').map(Number);
    return { major: major || 0, minor: minor || 0, patch: patch || 0 };
  } catch (error) {
    console.warn('Could not parse semantic version, using defaults');
    return { major: 1, minor: 0, patch: 0 };
  }
}

/**
 * Get current date with proper ordinal suffix
 * @returns {string} Formatted date like "27th November 2025"
 */
function getCurrentDateWithOrdinal() {
  const now = new Date();
  const day = now.getDate();
  
  // Get ordinal suffix
  let suffix = 'th';
  if (day % 10 === 1 && day !== 11) suffix = 'st';
  else if (day % 10 === 2 && day !== 12) suffix = 'nd';
  else if (day % 10 === 3 && day !== 13) suffix = 'rd';
  
  const month = now.toLocaleDateString('en-GB', { month: 'long' });
  const year = now.getFullYear();
  
  return `${day}${suffix} ${month} ${year}`;
}

const VERSION_CONFIG = {
  // Main version information (read from package.json)
  version: packageJson.version,
  name: 'Nakshatra Matrimony Platform',
  displayName: 'கந்த கோட்டம் சேவா சங்கம் - திருமண இணையதளம்',
  
  // Release information
  releaseDate: getCurrentDateWithOrdinal(), // Dynamic current date with ordinal suffix
  buildDate: new Date().toISOString(),
  buildNumber: process.env.BUILD_NUMBER || 'Production',
  
  // Technical information
  nodeVersion: process.version,
  platform: process.platform,
  
  // Semantic versioning components (auto-calculated from package.json)
  ...parseSemanticVersion(packageJson.version),
  
  // Additional metadata
  description: 'Hindu Matrimony Desktop Application with Nakshatra-based compatibility matching system',
  author: 'Matrimony Development Team',
  license: 'ISC'
};

/**
 * Get formatted version string
 * @param {string} format - Format type: 'simple', 'full', 'semantic'
 * @returns {string} Formatted version string
 */
function getVersionString(format = 'simple') {
  switch (format) {
    case 'full':
      return `${VERSION_CONFIG.name} v${VERSION_CONFIG.version} (${VERSION_CONFIG.releaseDate})`;
    case 'semantic':
      return `${VERSION_CONFIG.major}.${VERSION_CONFIG.minor}.${VERSION_CONFIG.patch}`;
    case 'display':
      return `v${VERSION_CONFIG.version}`;
    case 'simple':
    default:
      return VERSION_CONFIG.version;
  }
}

/**
 * Get complete version information object
 * @returns {object} Complete version information
 */
function getVersionInfo() {
  return {
    ...VERSION_CONFIG,
    versionString: getVersionString('simple'),
    displayVersion: getVersionString('display'),
    fullVersion: getVersionString('full'),
    semanticVersion: getVersionString('semantic')
  };
}

/**
 * Check if this is a development build
 * @returns {boolean} True if development build
 */
function isDevelopment() {
  return process.env.NODE_ENV === 'development';
}

/**
 * Check if this is a production build
 * @returns {boolean} True if production build
 */
function isProduction() {
  return process.env.NODE_ENV === 'production';
}

/**
 * Get build environment string
 * @returns {string} Environment string
 */
function getBuildEnvironment() {
  return process.env.NODE_ENV || 'development';
}

module.exports = {
  VERSION_CONFIG,
  getVersionString,
  getVersionInfo,
  isDevelopment,
  isProduction,
  getBuildEnvironment,
  
  // Export individual properties for convenience
  VERSION: VERSION_CONFIG.version,
  APP_NAME: VERSION_CONFIG.name,
  DISPLAY_NAME: VERSION_CONFIG.displayName,
  RELEASE_DATE: VERSION_CONFIG.releaseDate
};