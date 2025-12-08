/**
 * Find Matching Page - Main Application Module
 * Combines core functionality and integrations for clarity and simplicity
 * 
 * This module coordinates all extracted modules while maintaining backward compatibility.
 * It handles form validation, search modes, field management, downloads, and WhatsApp features.
 */

// Core functionality imports
import { DataManager } from './utils/data-manager.js';
import { PageInitializer } from './utils/page-initializer.js';
import { FormValidator } from './core/form-validator.js';
import { SearchModeHandler } from './core/search-mode-handler.js';
import { FieldManager } from './core/field-manager.js';
import { AgePreferenceManager } from './core/age-preference-manager.js';

// Integration imports
import { DownloadManager } from '/js/modules/DownloadManager.js';
import { WhatsAppManager } from '/js/modules/WhatsAppManager.js';

// Debug logger reference
const debugLogger = window.debugLogger || { info: () => {} };

/**
 * Main application class for Find Matching page
 */
class FindMatchingApp {
    constructor() {
        this.initializeCore();
        this.initializeIntegrations();
    }

    /**
     * Initialize core application functionality
     */
    initializeCore() {
        // Initialize data first
        DataManager.initialize();
        
        // Initialize page components
        PageInitializer.initialize();
        
        // Initialize search mode handler
        SearchModeHandler.initialize();
        
        // Initialize age preference manager
        AgePreferenceManager.initialize();
        
        // Set up form validation
        this.setupFormValidation();
        
        // Expose core functions to global scope for backward compatibility
        this.setupCoreGlobalCompatibility();
        
        debugLogger.info('FindMatching', 'Core functionality initialized successfully');
    }

    /**
     * Initialize integration features (downloads, WhatsApp)
     */
    initializeIntegrations() {
        // Initialize managers
        this.downloadManager = new DownloadManager();
        this.whatsAppManager = new WhatsAppManager(this.downloadManager);

        // Expose integration functions to global scope
        this.setupIntegrationGlobalCompatibility();
        
        debugLogger.info('FindMatching', 'Integration features initialized successfully');
    }

    /**
     * Set up form validation event listeners
     */
    setupFormValidation() {
        const form = document.getElementById('find-matching-form');
        if (form) {
            form.addEventListener('submit', FormValidator.validateForm);
        }
    }

    /**
     * Expose core functions to global scope for backward compatibility
     * This ensures existing HTML onclick handlers and other references continue to work
     */
    setupCoreGlobalCompatibility() {
        // Validation functions
        window.validateForm = FormValidator.validateForm;
        window.showValidationError = FormValidator.showValidationError;
        window.hideValidationError = FormValidator.hideValidationError;
        
        // Field management functions
        window.clearFieldWithFeedback = FieldManager.clearFieldWithFeedback;
        window.clearNakshatraFields = FieldManager.clearNakshatraFields;
        window.clearSerialFields = FieldManager.clearSerialFields;
        
        // Search mode functions
        window.toggleSearchMode = SearchModeHandler.toggleSearchMode;
        window.updateRasiFieldState = SearchModeHandler.updateRasiFieldState;
        
        debugLogger.info('FindMatching', 'Core global compatibility functions exposed');
    }

    /**
     * Expose integration functions to global scope for backward compatibility
     */
    setupIntegrationGlobalCompatibility() {
        // Expose managers to global scope for debugging and module access
        window.downloadManager = this.downloadManager;
        window.whatsAppManager = this.whatsAppManager;

        // Expose functions to global scope for onclick handlers (backward compatibility)
        window.downloadProfiles = (format, event) => this.downloadManager.downloadProfiles(format, event);
        window.showWhatsAppModal = () => this.whatsAppManager.showWhatsAppModal();
        window.sendWhatsAppPDF = () => this.whatsAppManager.sendWhatsAppPDF();

        // CRITICAL: Expose missing functions for dynamically generated modal onclick handlers
        window.proceedToWhatsApp = (phoneNumber) => this.whatsAppManager.proceedToWhatsApp(phoneNumber);
        window.focusWhatsApp = () => this.whatsAppManager.focusWhatsApp();

        // Helper function exposure (for modal buttons that need to access these)
        window.openDownloadsFolder = () => DownloadManager.openDownloadsFolder();

        debugLogger.info('FindMatching', 'Integration global compatibility functions exposed');
    }
}

// Initialize when DOM is loaded with error handling
document.addEventListener('DOMContentLoaded', function() {
    try {
        new FindMatchingApp();
        debugLogger.info('FindMatching', '✅ Find Matching App loaded successfully');
        // debugLogger.info('FindMatching', '📦 Available functions: validateForm, downloadProfiles, showWhatsAppModal, sendWhatsAppPDF');
        // debugLogger.info('FindMatching', '🔧 Debug access: window.downloadManager, window.whatsAppManager');
    } catch (error) {
        console.error('Find Matching App loading failed:', error);
        console.warn('Falling back to original inline functions');
        
        // If modules fail, show error using ErrorHandler if available, otherwise use alert
        if (typeof ErrorHandler !== 'undefined') {
            ErrorHandler.showError(
                'JavaScript modules failed to load. Please refresh the page or contact support if the issue persists.',
                ErrorHandler.errorTypes.CLIENT
            );
        } else {
            alert('JavaScript modules failed to load. Please refresh the page or contact support if the issue persists.');
        }
    }
});