const log = require('./logger');

/**
 * Age Calculator Utility
 * Extracted from matchingController.js - maintains exact same functionality
 */

// Calculate age from birthdate - centralized function
function calculateAge(birthdateStr, profileId = 'Unknown', profileType = 'Profile') {
  if (!birthdateStr) {
    log.trace('Age calculation skipped - no birthdate provided', { profileType, profileId, source: 'AgeCalculator' });
    return undefined;
  }
  
  const birthdate = new Date(birthdateStr);
  if (isNaN(birthdate.getTime())) {
    log.warn('Age calculation failed - invalid birthdate format', { 
      profileType, 
      profileId, 
      birthdateInput: birthdateStr,
      source: 'AgeCalculator'
    });
    return undefined;
  }
  
  const today = new Date();
  let age = today.getFullYear() - birthdate.getFullYear();
  const m = today.getMonth() - birthdate.getMonth();
  
  if (m < 0 || (m === 0 && today.getDate() < birthdate.getDate())) {
    age--;
  }
  
  // Only log if there's an issue or for trace-level debugging
  if (age < 0 || age > 120) {
    log.warn('Age calculation resulted in unusual age', { 
      profileType, 
      profileId, 
      finalAge: age,
      birthdate: birthdate.toISOString().split('T')[0],
      source: 'AgeCalculator'
    });
  }
  
  return age;
}

module.exports = {
  calculateAge
};