/**
 * Frontend Error Handling System
 * Provides comprehensive error handling for AJAX calls and user interactions
 */

// Error handler configuration
const ErrorHandler = {
    // Configuration options
    config: {
        showStackTrace: false, // Set to true for development
        autoHideDelay: 5000,   // Auto-hide success messages after 5 seconds
        maxRetries: 3,         // Maximum retry attempts for network errors
        retryDelay: 1000       // Delay between retries (milliseconds)
    },

    // Error types for classification
    errorTypes: {
        NETWORK: 'network',
        VALIDATION: 'validation',
        AUTHENTICATION: 'authentication',
        AUTHORIZATION: 'authorization',
        SERVER: 'server',
        CLIENT: 'client',
        TIMEOUT: 'timeout',
        FILE_SYSTEM: 'file_system',
        PARSE: 'parse',
        EXPORT: 'export'
    },

    // Track current auto-dismiss timeout to prevent race conditions
    currentTimeout: null,

    // Initialize error handler
    init: function() {
        console.log('Frontend Error Handler initialized');
        this.setupGlobalErrorHandlers();
        this.createErrorContainer();
    },

    // Setup global error handlers
    setupGlobalErrorHandlers: function() {
        // Global unhandled error handler
        window.addEventListener('error', (event) => {
            console.error('Global error caught:', event.error);
            this.showError('An unexpected error occurred. Please refresh the page and try again.', 'client');
        });

        // Global unhandled promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            this.showError('An unexpected error occurred during processing. Please try again.', 'client');
            event.preventDefault(); // Prevent default browser handling
        });

        // AJAX error handler for jQuery if available
        if (typeof $ !== 'undefined') {
            $(document).ajaxError((event, xhr, settings, error) => {
                console.error('AJAX error:', { url: settings.url, status: xhr.status, error });
                this.handleAjaxError(xhr, settings.url);
            });
        }
    },

    // Create error message container
    createErrorContainer: function() {
        if (document.getElementById('error-container')) return;

        const container = document.createElement('div');
        container.id = 'error-container';
        container.className = 'error-container';
        container.innerHTML = `
            <div id="error-message" class="alert alert-dismissible fade" role="alert">
                <span id="error-text"></span>
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;

        // Add CSS styles
        const style = document.createElement('style');
        style.textContent = `
            .error-container {
                position: fixed;
                top: 70px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 9999;
                width: 90%;
                max-width: 600px;
            }
            .error-message {
                margin-bottom: 0;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                border: none;
                border-radius: 8px;
            }
            .error-message.alert-danger {
                background-color: #f8d7da;
                border-left: 4px solid #dc3545;
                color: #721c24;
            }
            .error-message.alert-warning {
                background-color: #fff3cd;
                border-left: 4px solid #ffc107;
                color: #856404;
            }
            .error-message.alert-success {
                background-color: #d1e7dd;
                border-left: 4px solid #198754;
                color: #0f5132;
            }
            .error-message.alert-info {
                background-color: #d1ecf1;
                border-left: 4px solid #0dcaf0;
                color: #055160;
            }
            .error-details {
                margin-top: 10px;
                padding-top: 10px;
                border-top: 1px solid rgba(0,0,0,0.1);
                font-size: 0.9em;
                opacity: 0.8;
            }
            .retry-button {
                margin-top: 10px;
                padding: 5px 15px;
                font-size: 0.9em;
            }
        `;
        document.head.appendChild(style);

        // Insert container at the beginning of body
        document.body.insertBefore(container, document.body.firstChild);

        // Listen for Bootstrap alert close events to clean up timeouts
        const alertElement = document.getElementById('error-message');
        if (alertElement) {
            // Use 'close.bs.alert' (BEFORE closing) instead of 'closed.bs.alert' (AFTER closing)
            alertElement.addEventListener('close.bs.alert', (event) => {
                // Prevent Bootstrap from removing the alert
                event.preventDefault();
                
                // Clear timeout when alert is manually dismissed
                if (this.currentTimeout) {
                    clearTimeout(this.currentTimeout);
                    this.currentTimeout = null;
                }
                
                // Manually hide the alert instead
                this.hideError();
            });
        }
    },

    // Show error message
    showError: function(message, type = 'server', details = null, retryAction = null) {
        const container = document.getElementById('error-message');
        const textElement = document.getElementById('error-text');
        
        if (!container || !textElement) {
            console.error('Error container not found, falling back to alert');
            alert(`Error: ${message}`);
            return;
        }

        // Clear any existing timeout
        if (this.currentTimeout) {
            clearTimeout(this.currentTimeout);
            this.currentTimeout = null;
        }

        // Set classes immediately
        container.className = 'alert alert-dismissible fade show';
        
        switch (type) {
            case this.errorTypes.NETWORK:
            case this.errorTypes.TIMEOUT:
                container.classList.add('alert-warning');
                break;
            case this.errorTypes.VALIDATION:
                container.classList.add('alert-info');
                break;
            case this.errorTypes.AUTHENTICATION:
            case this.errorTypes.AUTHORIZATION:
                container.classList.add('alert-danger');
                break;
            default:
                container.classList.add('alert-danger');
        }

        // Set error message
        let errorHtml = `<strong>Error:</strong> ${message}`;
        
        // Add field-specific validation errors if provided
        if (details && typeof details === 'object' && !Array.isArray(details)) {
            // Details is an object with field errors like { name: "error message", ... }
            errorHtml += '<ul class="mt-2 mb-0">';
            Object.entries(details).forEach(([field, errorMsg]) => {
                errorHtml += `<li><strong>${field}:</strong> ${errorMsg}</li>`;
            });
            errorHtml += '</ul>';
        } else if (details && this.config.showStackTrace) {
            // Show other details in development mode
            errorHtml += `<div class="error-details">Details: ${details}</div>`;
        }

        // Add retry button if retry action provided
        if (retryAction && typeof retryAction === 'function') {
            errorHtml += `<div><button class="btn btn-sm btn-outline-secondary retry-button" onclick="ErrorHandler.retry()">Retry</button></div>`;
            this.currentRetryAction = retryAction;
        }

        textElement.innerHTML = errorHtml;

        // Auto-hide for non-critical errors
        if (type === this.errorTypes.VALIDATION) {
            this.currentTimeout = setTimeout(() => this.hideError(), this.config.autoHideDelay);
        }

        // Log error
        console.error(`[${type.toUpperCase()}] ${message}`, details);
    },

    // Show success message
    showSuccess: function(message) {
        const container = document.getElementById('error-message');
        const textElement = document.getElementById('error-text');
        
        if (!container || !textElement) {
            console.log('Success:', message);
            return;
        }

        // Clear any existing timeout
        if (this.currentTimeout) {
            clearTimeout(this.currentTimeout);
            this.currentTimeout = null;
        }

        // Set classes immediately
        container.className = 'alert alert-success alert-dismissible fade show';
        textElement.innerHTML = `<strong>Success:</strong> ${message}`;

        // Auto-hide success messages
        this.currentTimeout = setTimeout(() => this.hideError(), this.config.autoHideDelay);
    },

    // Show info message
    showInfo: function(message) {
        const container = document.getElementById('error-message');
        const textElement = document.getElementById('error-text');
        
        if (!container || !textElement) {
            console.log('Info:', message);
            return;
        }

        // Clear any existing timeout
        if (this.currentTimeout) {
            clearTimeout(this.currentTimeout);
            this.currentTimeout = null;
        }

        // Set classes immediately
        container.className = 'alert alert-info alert-dismissible fade show';
        textElement.innerHTML = `<strong>Info:</strong> ${message}`;

        // Auto-hide info messages
        this.currentTimeout = setTimeout(() => this.hideError(), this.config.autoHideDelay);
    },

    // Hide error message
    hideError: function() {
        // Clear timeout reference
        if (this.currentTimeout) {
            clearTimeout(this.currentTimeout);
            this.currentTimeout = null;
        }

        const container = document.getElementById('error-message');
        if (container) {
            container.classList.remove('show');
            setTimeout(() => {
                container.className = 'alert alert-dismissible fade';
            }, 150);
        }
    },

    // Handle AJAX errors
    handleAjaxError: function(xhr, url = '') {
        let message = 'An error occurred while processing your request.';
        let type = this.errorTypes.SERVER;
        let details = null;

        switch (xhr.status) {
            case 0:
                message = 'Unable to connect to the server. Please check your internet connection.';
                type = this.errorTypes.NETWORK;
                break;
            case 400:
                message = 'Invalid request. Please check your input and try again.';
                type = this.errorTypes.VALIDATION;
                try {
                    const response = JSON.parse(xhr.responseText);
                    if (response.message) message = response.message;
                    if (response.details) details = response.details;
                } catch (e) {
                    // Use default message
                }
                break;
            case 401:
                message = 'Authentication required. Please log in and try again.';
                type = this.errorTypes.AUTHENTICATION;
                break;
            case 403:
                message = 'You do not have permission to perform this action.';
                type = this.errorTypes.AUTHORIZATION;
                break;
            case 404:
                message = 'The requested resource was not found.';
                type = this.errorTypes.CLIENT;
                break;
            case 408:
                message = 'Request timeout. Please try again.';
                type = this.errorTypes.TIMEOUT;
                break;
            case 429:
                message = 'Too many requests. Please wait a moment and try again.';
                type = this.errorTypes.NETWORK;
                break;
            case 500:
                message = 'Internal server error. Please try again later.';
                type = this.errorTypes.SERVER;
                break;
            case 502:
            case 503:
            case 504:
                message = 'Server is temporarily unavailable. Please try again later.';
                type = this.errorTypes.NETWORK;
                break;
            default:
                message = `Request failed with status ${xhr.status}. Please try again.`;
                type = this.errorTypes.SERVER;
        }

        // Try to parse error message from response
        try {
            const response = JSON.parse(xhr.responseText);
            if (response.error) message = response.error;
            if (response.message) message = response.message;
            if (response.details && this.config.showStackTrace) details = response.details;
        } catch (e) {
            // Use default message
        }

        this.showError(message, type, details);
    },

    // Wrapper for AJAX calls with error handling
    ajaxCall: function(options) {
        const defaultOptions = {
            timeout: 30000, // 30 second timeout
            retries: 0,
            retryDelay: this.config.retryDelay
        };

        const finalOptions = Object.assign({}, defaultOptions, options);

        // Add retry logic
        const makeRequest = (retryCount = 0) => {
            return new Promise((resolve, reject) => {
                const ajaxOptions = Object.assign({}, finalOptions, {
                    success: (data, textStatus, xhr) => {
                        resolve({ data, textStatus, xhr });
                    },
                    error: (xhr, textStatus, errorThrown) => {
                        if (retryCount < finalOptions.retries && 
                            (xhr.status === 0 || xhr.status >= 500 || textStatus === 'timeout')) {
                            console.log(`Request failed, retrying... (${retryCount + 1}/${finalOptions.retries})`);
                            setTimeout(() => {
                                makeRequest(retryCount + 1).then(resolve).catch(reject);
                            }, finalOptions.retryDelay);
                        } else {
                            reject({ xhr, textStatus, errorThrown });
                        }
                    }
                });

                if (typeof $ !== 'undefined') {
                    $.ajax(ajaxOptions);
                } else {
                    reject({ xhr: { status: 0 }, textStatus: 'jQuery not available', errorThrown: 'No AJAX library' });
                }
            });
        };

        return makeRequest();
    },

    // Enhanced fetch wrapper with error handling
    fetchCall: async function(url, options = {}) {
        const defaultOptions = {
            timeout: 30000,
            retries: this.config.maxRetries,
            retryDelay: this.config.retryDelay
        };

        const finalOptions = Object.assign({}, defaultOptions, options);
        let retryCount = 0;

        const makeRequest = async () => {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), finalOptions.timeout);

                const fetchOptions = Object.assign({}, finalOptions, {
                    signal: controller.signal
                });
                delete fetchOptions.timeout;
                delete fetchOptions.retries;
                delete fetchOptions.retryDelay;

                const response = await fetch(url, fetchOptions);
                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                return response;

            } catch (error) {
                if (retryCount < finalOptions.retries && 
                    (error.name === 'AbortError' || error.message.includes('fetch') || error.message.includes('network'))) {
                    retryCount++;
                    console.log(`Request failed, retrying... (${retryCount}/${finalOptions.retries})`);
                    await new Promise(resolve => setTimeout(resolve, finalOptions.retryDelay));
                    return makeRequest();
                } else {
                    throw error;
                }
            }
        };

        return makeRequest();
    },

    // Retry current action
    retry: function() {
        if (this.currentRetryAction && typeof this.currentRetryAction === 'function') {
            this.hideError();
            this.currentRetryAction();
        }
    },

    // Form validation wrapper
    validateForm: function(formElement, validationRules) {
        const errors = [];
        
        for (const fieldName in validationRules) {
            const field = formElement.querySelector(`[name="${fieldName}"]`);
            const rules = validationRules[fieldName];
            
            if (!field) continue;
            
            const value = field.value.trim();
            
            // Required validation
            if (rules.required && !value) {
                errors.push(`${rules.label || fieldName} is required.`);
                field.classList.add('is-invalid');
                continue;
            }
            
            // Skip other validations if field is empty and not required
            if (!value) continue;
            
            // Min length validation
            if (rules.minLength && value.length < rules.minLength) {
                errors.push(`${rules.label || fieldName} must be at least ${rules.minLength} characters.`);
                field.classList.add('is-invalid');
            }
            
            // Max length validation
            if (rules.maxLength && value.length > rules.maxLength) {
                errors.push(`${rules.label || fieldName} must not exceed ${rules.maxLength} characters.`);
                field.classList.add('is-invalid');
            }
            
            // Pattern validation
            if (rules.pattern && !rules.pattern.test(value)) {
                errors.push(rules.patternMessage || `${rules.label || fieldName} format is invalid.`);
                field.classList.add('is-invalid');
            }
            
            // Custom validation
            if (rules.custom && typeof rules.custom === 'function') {
                const customResult = rules.custom(value);
                if (customResult !== true) {
                    errors.push(customResult || `${rules.label || fieldName} is invalid.`);
                    field.classList.add('is-invalid');
                }
            }
            
            // If no errors, mark as valid
            if (errors.length === 0) {
                field.classList.remove('is-invalid');
                field.classList.add('is-valid');
            }
        }
        
        if (errors.length > 0) {
            this.showError(errors.join(' '), this.errorTypes.VALIDATION);
            return false;
        }
        
        return true;
    },

    // Clear form validation states
    clearFormValidation: function(formElement) {
        const fields = formElement.querySelectorAll('.is-invalid, .is-valid');
        fields.forEach(field => {
            field.classList.remove('is-invalid', 'is-valid');
        });
    }
};

// Initialize error handler when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ErrorHandler.init());
} else {
    ErrorHandler.init();
}

// Export for module usage if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ErrorHandler;
}