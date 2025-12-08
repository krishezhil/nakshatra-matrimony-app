/**
 * Page Initialization Utility  
 * Handles initialization of Bootstrap components, AOS, and other page setup
 * Phase 2A: Extracted from find-matching.ejs
 */

export class PageInitializer {
    static debugLogger = window.debugLogger || { info: () => {}, error: (...args) => console.error(...args) };
    
    /**
     * Initialize Bootstrap tooltips
     */
    static initializeBootstrapTooltips() {
        try {
            const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
            const tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
                return new bootstrap.Tooltip(tooltipTriggerEl);
            });
            PageInitializer.debugLogger.info('PageInit', 'Bootstrap tooltips initialized', { count: tooltipList.length });
        } catch (error) {
            PageInitializer.debugLogger.error('PageInit', 'Error initializing Bootstrap tooltips', error);
        }
    }

    /**
     * Initialize AOS (Animate On Scroll) library
     */
    static initializeAOS() {
        try {
            if (typeof AOS !== 'undefined') {
                AOS.init({
                    duration: 1000,
                    easing: 'ease-in-out',
                    once: true,
                    offset: 50
                });
                PageInitializer.debugLogger.info('PageInit', 'AOS initialized successfully');
            } else {
                console.warn('AOS library not found');
            }
        } catch (error) {
            console.error('Error initializing AOS:', error);
        }
    }

    /**
     * Store original placeholders for visual feedback
     */
    static storeOriginalPlaceholders() {
        try {
            ['serial-no', 'nakshatraid', 'gender', 'seeker-age', 'seeker-rasi'].forEach(id => {
                const field = document.getElementById(id);
                if (field && field.placeholder) {
                    field.setAttribute('data-original-placeholder', field.placeholder);
                }
            });
            PageInitializer.debugLogger.info('PageInit', 'Original placeholders stored');
        } catch (error) {
            console.error('Error storing original placeholders:', error);
        }
    }

    /**
     * Auto-scroll to results section when page loads with results
     */
    static autoScrollToResults() {
        try {
            // Check if results section exists (means there are search results)
            const resultsSection = document.getElementById('results-section');
            if (resultsSection) {
                // Add a small delay to allow page to fully render
                setTimeout(function() {
                    resultsSection.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }, 500);
                PageInitializer.debugLogger.info('PageInit', 'Auto-scrolled to results section');
            }
        } catch (error) {
            console.error('Error auto-scrolling to results:', error);
        }
    }

    /**
     * Initialize all page components
     */
    static initialize() {
        PageInitializer.initializeBootstrapTooltips();
        PageInitializer.initializeAOS();
        PageInitializer.storeOriginalPlaceholders();
        PageInitializer.autoScrollToResults();
    }
}