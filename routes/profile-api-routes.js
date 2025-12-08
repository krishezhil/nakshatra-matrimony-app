const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { profileValidationRules, handleValidationErrors } = require('../utils/sanitization');
const { createProfileLimiter, searchLimiter } = require('../utils/rateLimiting');
const log = require('../utils/logger');
const { 
  AppError, 
  ERROR_MESSAGES, 
  ERROR_TYPES, 
  handleControllerError, 
  asyncHandler 
} = require('../utils/errorHandler');

// Filter profiles by criteria (GET with query params)
router.get('/filter', asyncHandler(async (req, res) => {
	// Create unified logger for Profile functionality
	const searchLogger = log.profile();
	
	const startTime = Date.now();
	searchLogger.featureStart('FILTER_PROFILES', {
		source: 'ProfileApiRoutes',
		operation: 'FILTER_PROFILES',
		method: req.method,
		endpoint: '/profile/filter',
		requestId: req.headers['x-request-id'] || 'unknown',
		userAgent: req.get('User-Agent'),
		ip: req.ip || req.connection.remoteAddress
	});
	
	searchLogger.methodEntry('profileFilter', {
		query: log.maskSensitive(req.query),
		headers: req.headers,
		source: 'ProfileApiRoutes'
	});
	
	try {
		const { serial_no, name, gender, birth_date, contact_no } = req.query;
		
		// Validate search criteria
		const hasValidCriteria = serial_no || name || gender || birth_date || contact_no;
		if (!hasValidCriteria) {
			searchLogger.warn('[WARN] No search criteria provided', {
				phase: 'PARAMETER_VALIDATION',
				query: req.query,
				source: 'ProfileApiRoutes'
			});
			// Return all profiles if no criteria provided (for backward compatibility)
		}
		
		searchLogger.trace('[TRACE] Search criteria extracted', {
			phase: 'PARAMETER_EXTRACTION',
			criteria: log.maskSensitive({
				serial_no,
				name,
				gender,
				birth_date,
				contact_no
			}),
			source: 'ProfileApiRoutes'
		});
		
		searchLogger.trace('[TRACE] Loading profiles for filtering', {
			phase: 'DATA_LOADING',
			source: 'ProfileApiRoutes'
		});
		
		const profiles = require('../controllers/profileController').listProfilesRaw();
		
		if (!Array.isArray(profiles)) {
			throw new AppError(
				ERROR_MESSAGES.DATA_CORRUPTION,
				500,
				ERROR_TYPES.FILE_SYSTEM,
				{ issue: 'Profiles data is not an array' }
			);
		}
		
		let filtered = profiles;
		
		searchLogger.trace('[TRACE] Initial profiles loaded', {
			phase: 'DATA_LOADING',
			totalProfiles: profiles.length,
			source: 'ProfileApiRoutes'
		});
		
		// Apply filters with detailed logging and error handling
		if (serial_no && serial_no.trim() !== '') {
			const beforeCount = filtered.length;
			try {
				const serialNoLower = String(serial_no).trim().toLowerCase();
				filtered = filtered.filter(p => {
					const profileSerialNo = String(p.serial_no || '').trim().toLowerCase();
					return profileSerialNo.includes(serialNoLower);
				});
				
				searchLogger.trace('[TRACE] Applied serial number filter', {
					phase: 'FILTERING',
					filter: 'serial_no',
					beforeCount,
					afterCount: filtered.length,
					filteredOut: beforeCount - filtered.length,
					source: 'ProfileApiRoutes'
				});
			} catch (filterError) {
				searchLogger.error('[ERROR] Serial number filter failed', {
					phase: 'FILTERING',
					filter: 'serial_no',
					value: serial_no,
					errorMessage: filterError.message,
					source: 'ProfileApiRoutes'
				}, filterError);
				// Continue with other filters
			}
		}
		
		if (name && name.trim() !== '') {
			const beforeCount = filtered.length;
			try {
				const nameLower = name.toLowerCase();
				filtered = filtered.filter(p => {
					return p.name && p.name.toLowerCase().includes(nameLower);
				});
				
				searchLogger.trace('[TRACE] Applied name filter', {
					phase: 'FILTERING',
					filter: 'name',
					beforeCount,
					afterCount: filtered.length,
					filteredOut: beforeCount - filtered.length,
					source: 'ProfileApiRoutes'
				});
			} catch (filterError) {
				searchLogger.error('[ERROR] Name filter failed', {
					phase: 'FILTERING',
					filter: 'name',
					value: name,
					errorMessage: filterError.message,
					source: 'ProfileApiRoutes'
				}, filterError);
			}
		}
		
		if (gender && gender.trim() !== '') {
			const beforeCount = filtered.length;
			try {
				if (!['Male', 'Female'].includes(gender)) {
					searchLogger.warn('[WARN] Invalid gender value provided', {
						phase: 'FILTERING',
						filter: 'gender',
						value: gender,
						source: 'ProfileApiRoutes'
					});
				} else {
					filtered = filtered.filter(p => p.gender === gender);
					
					searchLogger.trace('[TRACE] Applied gender filter', {
						phase: 'FILTERING',
						filter: 'gender',
						beforeCount,
						afterCount: filtered.length,
						filteredOut: beforeCount - filtered.length,
						source: 'ProfileApiRoutes'
					});
				}
			} catch (filterError) {
				searchLogger.error('[ERROR] Gender filter failed', {
					phase: 'FILTERING',
					filter: 'gender',
					value: gender,
					errorMessage: filterError.message,
					source: 'ProfileApiRoutes'
				}, filterError);
			}
		}
		
		if (birth_date && birth_date.trim() !== '') {
			const beforeCount = filtered.length;
			try {
				// Validate date format
				const testDate = new Date(birth_date);
				if (isNaN(testDate.getTime())) {
					searchLogger.warn('[WARN] Invalid birth date format provided', {
						phase: 'FILTERING',
						filter: 'birth_date',
						value: birth_date,
						source: 'ProfileApiRoutes'
					});
				} else {
					filtered = filtered.filter(p => p.birth_date === birth_date);
					
					searchLogger.trace('[TRACE] Applied birth date filter', {
						phase: 'FILTERING',
						filter: 'birth_date',
						beforeCount,
						afterCount: filtered.length,
						filteredOut: beforeCount - filtered.length,
						source: 'ProfileApiRoutes'
					});
				}
			} catch (filterError) {
				searchLogger.error('[ERROR] Birth date filter failed', {
					phase: 'FILTERING',
					filter: 'birth_date',
					value: birth_date,
					errorMessage: filterError.message,
					source: 'ProfileApiRoutes'
				}, filterError);
			}
		}
		
		if (contact_no && contact_no.trim() !== '') {
			const beforeCount = filtered.length;
			try {
				const contactNoClean = contact_no.replace(/\D/g, ''); // Remove non-digits
				filtered = filtered.filter(p => {
					const profileContact = String(p.contact_no || '').replace(/\D/g, '');
					return profileContact.includes(contactNoClean);
				});
				
				searchLogger.trace('[TRACE] Applied contact number filter', {
					phase: 'FILTERING',
					filter: 'contact_no',
					beforeCount,
					afterCount: filtered.length,
					filteredOut: beforeCount - filtered.length,
					source: 'ProfileApiRoutes'
				});
			} catch (filterError) {
				searchLogger.error('[ERROR] Contact number filter failed', {
					phase: 'FILTERING',
					filter: 'contact_no',
					value: contact_no,
					errorMessage: filterError.message,
					source: 'ProfileApiRoutes'
				}, filterError);
			}
		}
		
		searchLogger.trace('[TRACE] Search filtering completed', {
			phase: 'FILTERING_COMPLETE',
			initialCount: profiles.length,
			finalCount: filtered.length,
			filtersApplied: Object.keys(req.query).length,
			source: 'ProfileApiRoutes'
		});
		
		searchLogger.featureEnd('FILTER_PROFILES', {
			success: true,
			resultsCount: filtered.length,
			statusCode: 200,
			source: 'ProfileApiRoutes'
		}, Date.now() - startTime);
		
		searchLogger.methodExit('profileFilter', {
			success: true,
			resultsCount: filtered.length,
			statusCode: 200,
			source: 'ProfileApiRoutes'
		});
		
		res.json(filtered);
		
	} catch (error) {
		searchLogger.featureEnd('FILTER_PROFILES', {
			success: false,
			error: error.message,
			statusCode: error.statusCode || 500,
			source: 'ProfileApiRoutes'
		}, Date.now() - startTime);
		
		searchLogger.methodExit('profileFilter', {
			success: false,
			error: error.message,
			statusCode: error.statusCode || 500,
			source: 'ProfileApiRoutes'
		});
		
		return handleControllerError(error, 'FILTER_PROFILES', 'profileFilter', req, res, searchLogger);
	}
}));

// API endpoints with enhanced error handling
router.get('/check-serial/:serialNo', profileController.checkSerialNumberExists);
router.get('/', profileController.listProfiles);
router.get('/:id', profileController.getProfile);
router.put('/', profileController.updateProfile);
router.post('/', profileController.createProfile);



module.exports = router;