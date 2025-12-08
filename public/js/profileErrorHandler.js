/**
 * Profile-specific error handling and AJAX calls
 * Integrates with the main ErrorHandler for consistent error management
 */

const ProfileErrorHandler = {
    debugLogger: window.debugLogger || { info: () => {}, error: (...args) => console.error(...args) },
    
    // Initialize profile-specific error handling
    init: function() {
        this.debugLogger.info('ProfileErrorHandler', 'Profile Error Handler initialized');
        this.setupFormValidation();
        this.setupAjaxErrorHandling();
    },

    // Setup form validation for profile forms
    setupFormValidation: function() {
        // Create Profile form validation
        const createProfileForm = document.getElementById('createProfileForm');
        if (createProfileForm) {
            createProfileForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleCreateProfile(e.target);
            });
        }

        // Update Profile form validation
        const updateProfileForm = document.getElementById('updateProfileForm');
        if (updateProfileForm) {
            updateProfileForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleUpdateProfile(e.target);
            });
        }

        // Search Profile form validation
        const searchProfileForm = document.getElementById('searchProfileForm');
        if (searchProfileForm) {
            searchProfileForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSearchProfile(e.target);
            });
        }

        // Find Matching form validation
        const findMatchingForm = document.getElementById('findMatchingForm');
        if (findMatchingForm) {
            findMatchingForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleFindMatching(e.target);
            });
        }
    },

    // Setup AJAX error handling for profile operations
    setupAjaxErrorHandling: function() {
        // Override default AJAX error handler for profile-specific messages
        if (typeof $ !== 'undefined') {
            $(document).on('ajaxError', '.profile-ajax', function(event, xhr, settings) {
                ProfileErrorHandler.handleProfileAjaxError(xhr, settings);
            });
        }
    },

    // Validation rules for profile creation
    getProfileValidationRules: function() {
        return {
            name: {
                required: true,
                minLength: 2,
                maxLength: 50,
                label: 'Name',
                pattern: /^[a-zA-Z\s]+$/,
                patternMessage: 'Name should only contain letters and spaces.'
            },
            email: {
                required: true,
                label: 'Email',
                pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                patternMessage: 'Please enter a valid email address.'
            },
            phone: {
                required: true,
                label: 'Phone Number',
                pattern: /^\+?[\d\s\-\(\)]{10,15}$/,
                patternMessage: 'Please enter a valid phone number.'
            },
            age: {
                required: true,
                label: 'Age',
                custom: function(value) {
                    const age = parseInt(value);
                    if (isNaN(age) || age < 18 || age > 100) {
                        return 'Age must be between 18 and 100 years.';
                    }
                    return true;
                }
            },
            gender: {
                required: true,
                label: 'Gender'
            },
            nakshatra: {
                required: true,
                label: 'Nakshatra'
            },
            education: {
                required: true,
                minLength: 2,
                maxLength: 100,
                label: 'Education'
            },
            occupation: {
                required: true,
                minLength: 2,
                maxLength: 100,
                label: 'Occupation'
            },
            location: {
                required: true,
                minLength: 2,
                maxLength: 100,
                label: 'Location'
            }
        };
    },

    // Handle Create Profile form submission
    handleCreateProfile: function(form) {
        try {
            ErrorHandler.clearFormValidation(form);

            // Validate form
            if (!ErrorHandler.validateForm(form, this.getProfileValidationRules())) {
                return;
            }

            // Show loading state
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Creating Profile...';

            // Prepare form data
            const formData = new FormData(form);
            const profileData = {};
            for (let [key, value] of formData.entries()) {
                profileData[key] = value.trim();
            }

            // Make AJAX call with error handling
            this.createProfileAjax(profileData)
                .then(response => {
                    ErrorHandler.showSuccess('Profile created successfully!');
                    form.reset();
                    ErrorHandler.clearFormValidation(form);
                    
                    // Redirect after success if needed
                    setTimeout(() => {
                        if (response.redirectUrl) {
                            window.location.href = response.redirectUrl;
                        } else {
                            window.location.href = '/profiles';
                        }
                    }, 1500);
                })
                .catch(error => {
                    console.error('Create profile error:', error);
                    ErrorHandler.showError(
                        error.message || 'Failed to create profile. Please try again.',
                        ErrorHandler.errorTypes.SERVER,
                        error.details,
                        () => this.handleCreateProfile(form)
                    );
                })
                .finally(() => {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                });

        } catch (error) {
            console.error('Create profile form error:', error);
            ErrorHandler.showError('An unexpected error occurred. Please try again.', ErrorHandler.errorTypes.CLIENT);
        }
    },

    // AJAX call for creating profile
    createProfileAjax: function(profileData) {
        return new Promise((resolve, reject) => {
            if (typeof $ !== 'undefined') {
                $.ajax({
                    url: '/api/profiles',
                    method: 'POST',
                    data: JSON.stringify(profileData),
                    contentType: 'application/json',
                    timeout: 30000,
                    success: function(response) {
                        resolve(response);
                    },
                    error: function(xhr, textStatus, errorThrown) {
                        reject(ProfileErrorHandler.parseAjaxError(xhr));
                    }
                });
            } else {
                // Fallback to fetch API
                ErrorHandler.fetchCall('/api/profiles', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(profileData)
                })
                .then(response => response.json())
                .then(resolve)
                .catch(reject);
            }
        });
    },

    // Handle Update Profile form submission
    handleUpdateProfile: function(form) {
        try {
            ErrorHandler.clearFormValidation(form);

            // Get profile ID
            const profileId = form.querySelector('[name="profileId"]')?.value;
            if (!profileId) {
                ErrorHandler.showError('Profile ID is missing. Please refresh the page and try again.', ErrorHandler.errorTypes.VALIDATION);
                return;
            }

            // Validate form
            if (!ErrorHandler.validateForm(form, this.getProfileValidationRules())) {
                return;
            }

            // Show loading state
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Updating Profile...';

            // Prepare form data
            const formData = new FormData(form);
            const profileData = {};
            for (let [key, value] of formData.entries()) {
                profileData[key] = value.trim();
            }

            // Make AJAX call
            this.updateProfileAjax(profileId, profileData)
                .then(response => {
                    ErrorHandler.showSuccess('Profile updated successfully!');
                    
                    // Optionally redirect
                    setTimeout(() => {
                        if (response.redirectUrl) {
                            window.location.href = response.redirectUrl;
                        }
                    }, 1500);
                })
                .catch(error => {
                    console.error('Update profile error:', error);
                    ErrorHandler.showError(
                        error.message || 'Failed to update profile. Please try again.',
                        ErrorHandler.errorTypes.SERVER,
                        error.details,
                        () => this.handleUpdateProfile(form)
                    );
                })
                .finally(() => {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                });

        } catch (error) {
            console.error('Update profile form error:', error);
            ErrorHandler.showError('An unexpected error occurred. Please try again.', ErrorHandler.errorTypes.CLIENT);
        }
    },

    // AJAX call for updating profile
    updateProfileAjax: function(profileId, profileData) {
        return new Promise((resolve, reject) => {
            if (typeof $ !== 'undefined') {
                $.ajax({
                    url: `/api/profiles/${profileId}`,
                    method: 'PUT',
                    data: JSON.stringify(profileData),
                    contentType: 'application/json',
                    timeout: 30000,
                    success: function(response) {
                        resolve(response);
                    },
                    error: function(xhr, textStatus, errorThrown) {
                        reject(ProfileErrorHandler.parseAjaxError(xhr));
                    }
                });
            } else {
                // Fallback to fetch API
                ErrorHandler.fetchCall(`/api/profiles/${profileId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(profileData)
                })
                .then(response => response.json())
                .then(resolve)
                .catch(reject);
            }
        });
    },

    // Handle Search Profile form submission
    handleSearchProfile: function(form) {
        try {
            ErrorHandler.clearFormValidation(form);

            // Show loading state
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Searching...';

            // Prepare search criteria
            const formData = new FormData(form);
            const searchCriteria = {};
            for (let [key, value] of formData.entries()) {
                if (value.trim()) {
                    searchCriteria[key] = value.trim();
                }
            }

            // Make AJAX call
            this.searchProfilesAjax(searchCriteria)
                .then(response => {
                    this.displaySearchResults(response.profiles || []);
                    
                    if (response.profiles && response.profiles.length > 0) {
                        ErrorHandler.showSuccess(`Found ${response.profiles.length} matching profile(s).`);
                    } else {
                        ErrorHandler.showInfo('No profiles found matching your criteria. Try adjusting your search filters.');
                    }
                })
                .catch(error => {
                    console.error('Search profiles error:', error);
                    ErrorHandler.showError(
                        error.message || 'Failed to search profiles. Please try again.',
                        ErrorHandler.errorTypes.SERVER,
                        error.details,
                        () => this.handleSearchProfile(form)
                    );
                })
                .finally(() => {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                });

        } catch (error) {
            console.error('Search profile form error:', error);
            ErrorHandler.showError('An unexpected error occurred during search. Please try again.', ErrorHandler.errorTypes.CLIENT);
        }
    },

    // AJAX call for searching profiles
    searchProfilesAjax: function(searchCriteria) {
        return new Promise((resolve, reject) => {
            const queryString = new URLSearchParams(searchCriteria).toString();
            const url = `/api/profiles/filter?${queryString}`;

            if (typeof $ !== 'undefined') {
                $.ajax({
                    url: url,
                    method: 'GET',
                    timeout: 30000,
                    success: function(response) {
                        resolve(response);
                    },
                    error: function(xhr, textStatus, errorThrown) {
                        reject(ProfileErrorHandler.parseAjaxError(xhr));
                    }
                });
            } else {
                // Fallback to fetch API
                ErrorHandler.fetchCall(url, {
                    method: 'GET'
                })
                .then(response => response.json())
                .then(resolve)
                .catch(reject);
            }
        });
    },

    // Handle Find Matching form submission
    handleFindMatching: function(form) {
        try {
            ErrorHandler.clearFormValidation(form);

            // Get profile ID
            const profileId = form.querySelector('[name="profileId"]')?.value;
            if (!profileId) {
                ErrorHandler.showError('Profile ID is missing. Please select a profile and try again.', ErrorHandler.errorTypes.VALIDATION);
                return;
            }

            // Show loading state
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Finding Matches...';

            // Make AJAX call
            this.findMatchingProfilesAjax(profileId)
                .then(response => {
                    this.displayMatchingResults(response.matches || []);
                    
                    if (response.matches && response.matches.length > 0) {
                        ErrorHandler.showSuccess(`Found ${response.matches.length} compatible match(es)!`);
                    } else {
                        ErrorHandler.showInfo('No compatible matches found. You may want to expand your search criteria.');
                    }
                })
                .catch(error => {
                    console.error('Find matching error:', error);
                    ErrorHandler.showError(
                        error.message || 'Failed to find matching profiles. Please try again.',
                        ErrorHandler.errorTypes.SERVER,
                        error.details,
                        () => this.handleFindMatching(form)
                    );
                })
                .finally(() => {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalText;
                });

        } catch (error) {
            console.error('Find matching form error:', error);
            ErrorHandler.showError('An unexpected error occurred during matching. Please try again.', ErrorHandler.errorTypes.CLIENT);
        }
    },

    // AJAX call for finding matching profiles
    findMatchingProfilesAjax: function(profileId) {
        return new Promise((resolve, reject) => {
            if (typeof $ !== 'undefined') {
                $.ajax({
                    url: `/api/matching/${profileId}`,
                    method: 'GET',
                    timeout: 45000, // Longer timeout for matching algorithm
                    success: function(response) {
                        resolve(response);
                    },
                    error: function(xhr, textStatus, errorThrown) {
                        reject(ProfileErrorHandler.parseAjaxError(xhr));
                    }
                });
            } else {
                // Fallback to fetch API
                ErrorHandler.fetchCall(`/api/matching/${profileId}`, {
                    method: 'GET',
                    timeout: 45000
                })
                .then(response => response.json())
                .then(resolve)
                .catch(reject);
            }
        });
    },

    // Parse AJAX error responses
    parseAjaxError: function(xhr) {
        let message = 'An error occurred while processing your request.';
        let details = null;

        try {
            const response = JSON.parse(xhr.responseText);
            if (response.error) message = response.error;
            if (response.message) message = response.message;
            if (response.details) details = response.details;
        } catch (e) {
            // Use default message
        }

        return {
            message: message,
            details: details,
            status: xhr.status,
            statusText: xhr.statusText
        };
    },

    // Handle profile-specific AJAX errors
    handleProfileAjaxError: function(xhr, settings) {
        const url = settings.url || '';
        let message = 'Request failed. Please try again.';

        if (url.includes('/profiles')) {
            if (settings.type === 'POST') {
                message = 'Failed to create profile. Please check your information and try again.';
            } else if (settings.type === 'PUT') {
                message = 'Failed to update profile. Please try again.';
            } else if (settings.type === 'GET') {
                message = 'Failed to load profile data. Please refresh the page.';
            }
        } else if (url.includes('/matching')) {
            message = 'Failed to find matching profiles. The matching service may be temporarily unavailable.';
        }

        const error = this.parseAjaxError(xhr);
        ErrorHandler.showError(error.message || message, ErrorHandler.errorTypes.SERVER, error.details);
    },

    // Display search results
    displaySearchResults: function(profiles) {
        const resultsContainer = document.getElementById('searchResults');
        if (!resultsContainer) return;

        if (profiles.length === 0) {
            resultsContainer.innerHTML = '<div class="alert alert-info">No profiles found matching your criteria.</div>';
            return;
        }

        let html = '<div class="row">';
        profiles.forEach(profile => {
            html += `
                <div class="col-md-6 col-lg-4 mb-3">
                    <div class="card">
                        <div class="card-body">
                            <h5 class="card-title">${profile.name || 'N/A'}</h5>
                            <p class="card-text">
                                <strong>Age:</strong> ${profile.age || 'N/A'}<br>
                                <strong>Education:</strong> ${profile.education || 'N/A'}<br>
                                <strong>Occupation:</strong> ${profile.occupation || 'N/A'}<br>
                                <strong>Location:</strong> ${profile.location || 'N/A'}
                            </p>
                            <a href="/profiles/${profile.id}" class="btn btn-primary btn-sm">View Details</a>
                        </div>
                    </div>
                </div>
            `;
        });
        html += '</div>';

        resultsContainer.innerHTML = html;
    },

    // Display matching results
    displayMatchingResults: function(matches) {
        const resultsContainer = document.getElementById('matchingResults');
        if (!resultsContainer) return;

        if (matches.length === 0) {
            resultsContainer.innerHTML = '<div class="alert alert-info">No compatible matches found at this time.</div>';
            return;
        }

        let html = '<div class="row">';
        matches.forEach(match => {
            const compatibilityScore = match.compatibilityScore || 'N/A';
            html += `
                <div class="col-md-6 col-lg-4 mb-3">
                    <div class="card">
                        <div class="card-body">
                            <h5 class="card-title">${match.name || 'N/A'}</h5>
                            <div class="badge bg-success mb-2">Compatibility: ${compatibilityScore}%</div>
                            <p class="card-text">
                                <strong>Age:</strong> ${match.age || 'N/A'}<br>
                                <strong>Education:</strong> ${match.education || 'N/A'}<br>
                                <strong>Occupation:</strong> ${match.occupation || 'N/A'}<br>
                                <strong>Location:</strong> ${match.location || 'N/A'}
                            </p>
                            <a href="/profiles/${match.id}" class="btn btn-primary btn-sm">View Details</a>
                        </div>
                    </div>
                </div>
            `;
        });
        html += '</div>';

        resultsContainer.innerHTML = html;
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ProfileErrorHandler.init());
} else {
    ProfileErrorHandler.init();
}