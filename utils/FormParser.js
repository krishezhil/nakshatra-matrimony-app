/**
 * Form Parser Utility
 * Extracted from matchingController.js - maintains exact same functionality
 */

// Create standardized form object
function createFormObject(req) {
  return {
    serial_no: req.body.serial_no || req.query.serial_no || '',
    includeMathimam: req.body.includeMathimam === 'true' || req.query.includeMathimam === 'true',
    includeRemarried: req.body.includeRemarried === 'true' || req.query.includeRemarried === 'true',
    qualification: req.body.qualification || req.query.qualification || '',
    exactQualification: req.body.exactQualification === 'true' || req.query.exactQualification === 'true',
    region: req.body.region || req.query.region || '', // Keep for backward compatibility
    regions: (() => {
      // Handle multi-region selection with backward compatibility
      const bodyRegions = req.body.regions;
      const queryRegions = req.query.regions;
      
      // Handle multiple formats: array, comma-separated string, single value
      if (Array.isArray(bodyRegions)) return bodyRegions.filter(r => r && r.trim());
      if (Array.isArray(queryRegions)) return queryRegions.filter(r => r && r.trim());
      
      // Handle comma-separated strings
      if (typeof bodyRegions === 'string' && bodyRegions.includes(',')) {
        return bodyRegions.split(',').map(r => r.trim()).filter(r => r);
      }
      if (typeof queryRegions === 'string' && queryRegions.includes(',')) {
        return queryRegions.split(',').map(r => r.trim()).filter(r => r);
      }
      
      // Handle single string values
      if (bodyRegions && typeof bodyRegions === 'string' && bodyRegions.trim()) {
        return [bodyRegions.trim()];
      }
      if (queryRegions && typeof queryRegions === 'string' && queryRegions.trim()) {
        return [queryRegions.trim()];
      }
      
      // Fallback to single region field for backward compatibility
      // Only use single region if no multi-region data was provided at all
      if (!bodyRegions && !queryRegions) {
        const singleRegion = req.body.region || req.query.region || '';
        if (singleRegion && singleRegion.trim()) {
          return [singleRegion.trim()];
        }
      }
      
      return []; // No regions selected
    })(),
    nakshatraPreferences: (() => {
      // Handle nakshatra preferences selection similar to regions
      const bodyPreferences = req.body.nakshatraPreferences;
      const queryPreferences = req.query.nakshatraPreferences;
      
      // Handle multiple formats: array, comma-separated string, single value
      if (Array.isArray(bodyPreferences)) return bodyPreferences.filter(p => p && p.toString().trim());
      if (Array.isArray(queryPreferences)) return queryPreferences.filter(p => p && p.toString().trim());
      
      // Handle comma-separated strings
      if (typeof bodyPreferences === 'string' && bodyPreferences.includes(',')) {
        return bodyPreferences.split(',').map(p => p.trim()).filter(p => p);
      }
      if (typeof queryPreferences === 'string' && queryPreferences.includes(',')) {
        return queryPreferences.split(',').map(p => p.trim()).filter(p => p);
      }
      
      // Handle single string values
      if (bodyPreferences && typeof bodyPreferences === 'string' && bodyPreferences.trim()) {
        return [bodyPreferences.trim()];
      }
      if (queryPreferences && typeof queryPreferences === 'string' && queryPreferences.trim()) {
        return [queryPreferences.trim()];
      }
      
      return []; // No preferences selected
    })(),
    nakshatraid: req.body.nakshatraid || req.query.nakshatraid || '',
    gender: req.body.gender || req.query.gender || '',
    seeker_age: req.body.seeker_age || req.query.seeker_age || '',
    seekerRasi: req.body.seekerRasi || req.query.seekerRasi || '',
    gothram: req.body.gothram || req.query.gothram || '',
    searchMode: req.body.searchMode || req.query.searchMode || 'serial',
    minIncome: req.body.minIncome || req.query.minIncome || '',
    maxIncome: req.body.maxIncome || req.query.maxIncome || '',
    agePreference: req.body.agePreference || req.query.agePreference || '',
    enableRasiCompatibility: req.body.enableRasiCompatibility === 'true' || req.query.enableRasiCompatibility === 'true'
  };
}

module.exports = {
  createFormObject
};