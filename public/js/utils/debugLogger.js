/**
 * Enhanced Debug Logging Utility for Frontend
 * Provides conditional logging with advanced features for development
 * Version 2.0 - Enhanced with performance monitoring and better controls
 */

class DebugLogger {
    constructor() {
        this.isDebugMode = this.detectDebugMode();
        this.features = new Set();
        this.performanceMetrics = new Map();
        this.logHistory = [];
        this.maxHistorySize = 1000;
        this.initializeDebugControls();
        this.initializePerformanceMonitoring();
    }

    /**
     * Detect if we're in debug mode
     * @returns {boolean} True if debug mode is enabled
     */
    detectDebugMode() {
        // Check multiple debug indicators
        return (
            // Development environment (localhost)
            window.location.hostname === 'localhost' ||
            window.location.hostname === '127.0.0.1' ||
            window.location.hostname.includes('dev') ||
            window.location.hostname.includes('staging') ||
            // Debug flag in localStorage
            localStorage.getItem('debug') === 'true' ||
            localStorage.getItem('debugLogger') === 'true' ||
            // URL parameter
            new URLSearchParams(window.location.search).get('debug') === 'true' ||
            // Console debug flag
            window.DEBUG_MODE === true ||
            // Developer tools detection
            this.isDevToolsOpen()
        );
    }

    /**
     * Detect if developer tools are open
     * @returns {boolean} True if dev tools are likely open
     */
    isDevToolsOpen() {
        try {
            const threshold = 160;
            return (
                window.outerHeight - window.innerHeight > threshold ||
                window.outerWidth - window.innerWidth > threshold
            );
        } catch (e) {
            return false;
        }
    }

    /**
     * Initialize debug controls for development
     */
    initializeDebugControls() {
        if (this.isDebugMode) {
            // Add global debug control
            window.debugLogger = this;
            
            // Enhanced control functions
            window.enableDebug = (features = []) => {
                localStorage.setItem('debug', 'true');
                this.isDebugMode = true;
                if (features.length > 0) {
                    features.forEach(feature => this.enableFeature(feature));
                }
                console.log('🔧 Debug logging enabled', features.length > 0 ? `for features: ${features.join(', ')}` : '');
            };
            
            window.disableDebug = () => {
                localStorage.removeItem('debug');
                localStorage.removeItem('debugLogger');
                this.isDebugMode = false;
                this.features.clear();
                console.log('🔇 Debug logging disabled');
            };

            // Feature-specific controls
            window.debugFeatures = () => {
                console.group('🎯 Available Debug Features');
                const availableFeatures = ['WhatsApp', 'Download', 'FindMatching', 'PageInit', 'CreateProfile', 'UpdateProfile', 'ProfileErrorHandler'];
                availableFeatures.forEach(feature => {
                    const enabled = this.features.has(feature);
                    console.log(`${enabled ? '✅' : '❌'} ${feature}`);
                });
                console.groupEnd();
                console.log('Use enableFeature("FeatureName") or disableFeature("FeatureName")');
            };

            // Performance monitoring controls
            window.debugPerf = () => this.showPerformanceMetrics();
            window.debugHistory = (limit = 50) => this.showLogHistory(limit);
            window.clearDebugHistory = () => {
                this.logHistory = [];
                this.performanceMetrics.clear();
                console.log('🧹 Debug history cleared');
            };

            // Initial welcome message
            if (localStorage.getItem('debugWelcomeShown') !== 'true') {
                setTimeout(() => {
                    console.group('🚀 Debug Logger v2.0 Enhanced');
                    console.log('Available commands: enableDebug(), disableDebug(), debugFeatures(), debugPerf(), debugHistory()');
                    console.log('Feature-specific: enableFeature("FeatureName"), disableFeature("FeatureName")');
                    console.log('URL parameter: ?debug=true');
                    console.groupEnd();
                    localStorage.setItem('debugWelcomeShown', 'true');
                }, 1000);
            }
        }
    }

    /**
     * Initialize performance monitoring
     */
    initializePerformanceMonitoring() {
        if (this.isDebugMode && window.performance) {
            // Monitor page load performance
            window.addEventListener('load', () => {
                const perfData = window.performance.timing;
                const loadTime = perfData.loadEventEnd - perfData.navigationStart;
                this.recordPerformance('PageLoad', loadTime);
            });
        }
    }

    /**
     * Enable debug logging for specific feature
     * @param {string} feature - Feature name to enable
     */
    enableFeature(feature) {
        this.features.add(feature);
        localStorage.setItem(`debug_${feature}`, 'true');
        this.info('DebugLogger', `Feature '${feature}' debugging enabled`);
    }

    /**
     * Disable debug logging for specific feature
     * @param {string} feature - Feature name to disable
     */
    disableFeature(feature) {
        this.features.delete(feature);
        localStorage.removeItem(`debug_${feature}`);
        this.info('DebugLogger', `Feature '${feature}' debugging disabled`);
    }

    /**
     * Check if feature debugging is enabled
     * @param {string} feature - Feature name to check
     * @returns {boolean} True if feature debugging is enabled
     */
    isFeatureEnabled(feature) {
        if (!this.isDebugMode) return false;
        
        // If no specific features are enabled, show all
        if (this.features.size === 0) return true;
        
        return this.features.has(feature) || localStorage.getItem(`debug_${feature}`) === 'true';
    }

    /**
     * Record performance metric
     * @param {string} operation - Operation name
     * @param {number} duration - Duration in milliseconds
     * @param {object} metadata - Additional metadata
     */
    recordPerformance(operation, duration, metadata = {}) {
        if (!this.isDebugMode) return;

        const metric = {
            operation,
            duration,
            timestamp: Date.now(),
            ...metadata
        };

        if (!this.performanceMetrics.has(operation)) {
            this.performanceMetrics.set(operation, []);
        }

        const metrics = this.performanceMetrics.get(operation);
        metrics.push(metric);

        // Keep only last 100 metrics per operation
        if (metrics.length > 100) {
            metrics.shift();
        }
    }

    /**
     * Show performance metrics
     */
    showPerformanceMetrics() {
        if (!this.isDebugMode) return;

        console.group('📊 Performance Metrics');
        
        for (const [operation, metrics] of this.performanceMetrics) {
            if (metrics.length === 0) continue;

            const durations = metrics.map(m => m.duration);
            const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
            const min = Math.min(...durations);
            const max = Math.max(...durations);

            console.group(`⏱️ ${operation} (${metrics.length} samples)`);
            console.log(`Average: ${avg.toFixed(2)}ms`);
            console.log(`Min: ${min}ms, Max: ${max}ms`);
            console.log(`Latest: ${durations[durations.length - 1]}ms`);
            console.groupEnd();
        }
        
        console.groupEnd();
    }

    /**
     * Add log entry to history
     * @param {string} type - Log type
     * @param {string} feature - Feature name
     * @param {string} message - Log message
     * @param {object} data - Log data
     */
    addToHistory(type, feature, message, data) {
        if (!this.isDebugMode) return;

        const entry = {
            type,
            feature,
            message,
            data,
            timestamp: new Date().toISOString(),
            url: window.location.pathname
        };

        this.logHistory.push(entry);

        // Maintain history size limit
        if (this.logHistory.length > this.maxHistorySize) {
            this.logHistory.shift();
        }
    }

    /**
     * Show recent log history
     * @param {number} limit - Number of recent logs to show
     */
    showLogHistory(limit = 50) {
        if (!this.isDebugMode) return;

        const recentLogs = this.logHistory.slice(-limit);
        
        console.group(`📜 Debug History (last ${recentLogs.length} entries)`);
        recentLogs.forEach(entry => {
            const timestamp = new Date(entry.timestamp).toLocaleTimeString();
            console.log(`[${timestamp}] [${entry.feature}] ${entry.type}: ${entry.message}`, entry.data || '');
        });
        console.groupEnd();
    }

    /**
     * Debug log with feature grouping and enhanced formatting
     * @param {string} feature - Feature name
     * @param {string} message - Log message
     * @param {object} data - Optional data object
     */
    log(feature, message, data = null) {
        if (!this.isDebugMode || !this.isFeatureEnabled(feature)) return;

        const timestamp = new Date().toLocaleTimeString();
        
        console.group(`🔍 [${feature}] ${message} (${timestamp})`);
        if (data) {
            if (typeof data === 'object') {
                console.table(data);
            } else {
                console.log(data);
            }
        }
        console.groupEnd();

        this.addToHistory('log', feature, message, data);
    }

    /**
     * Simple debug log without grouping
     * @param {string} feature - Feature name
     * @param {string} message - Log message
     * @param {object} data - Optional data object
     */
    info(feature, message, data = null) {
        if (!this.isDebugMode || !this.isFeatureEnabled(feature)) return;

        const timestamp = new Date().toLocaleTimeString();
        const emoji = this.getFeatureEmoji(feature);
        
        if (data) {
            console.log(`${emoji} [${feature}] ${message} (${timestamp})`, data);
        } else {
            console.log(`${emoji} [${feature}] ${message} (${timestamp})`);
        }

        this.addToHistory('info', feature, message, data);
    }

    /**
     * Get emoji for feature
     * @param {string} feature - Feature name
     * @returns {string} Emoji for the feature
     */
    getFeatureEmoji(feature) {
        const emojiMap = {
            'WhatsApp': '💬',
            'Download': '📥',
            'FindMatching': '🔍',
            'PageInit': '🚀',
            'CreateProfile': '👤',
            'UpdateProfile': '✏️',
            'ProfileErrorHandler': '⚠️',
            'WhatsAppModal': '💬',
            'DebugLogger': '🔧'
        };
        return emojiMap[feature] || '📋';
    }

    /**
     * Error logging (always shown regardless of debug mode)
     * @param {string} feature - Feature name
     * @param {string} message - Error message
     * @param {object} error - Error object
     */
    error(feature, message, error = null) {
        const timestamp = new Date().toLocaleTimeString();
        const emoji = this.getFeatureEmoji(feature);
        
        console.error(`${emoji} [${feature}] ERROR: ${message} (${timestamp})`, error);
        this.addToHistory('error', feature, message, error);
    }

    /**
     * Warning logging (always shown regardless of debug mode)
     * @param {string} feature - Feature name
     * @param {string} message - Warning message
     * @param {object} data - Optional data object
     */
    warn(feature, message, data = null) {
        const timestamp = new Date().toLocaleTimeString();
        const emoji = this.getFeatureEmoji(feature);
        
        if (data) {
            console.warn(`${emoji} [${feature}] WARNING: ${message} (${timestamp})`, data);
        } else {
            console.warn(`${emoji} [${feature}] WARNING: ${message} (${timestamp})`);
        }
        this.addToHistory('warn', feature, message, data);
    }

    /**
     * Enhanced step tracking for complex processes
     * @param {string} feature - Feature name
     * @param {number} step - Step number
     * @param {string} description - Step description
     * @param {object} data - Optional step data
     */
    step(feature, step, description, data = null) {
        if (!this.isDebugMode || !this.isFeatureEnabled(feature)) return;

        const timestamp = new Date().toLocaleTimeString();
        const emoji = this.getFeatureEmoji(feature);
        const stepEmoji = this.getStepEmoji(step);
        
        const stepMessage = `${stepEmoji} Step ${step}: ${description}`;
        
        console.group(`${emoji} [${feature}] ${stepMessage} (${timestamp})`);
        if (data) {
            if (typeof data === 'object') {
                console.table(data);
            } else {
                console.log(data);
            }
        }
        console.groupEnd();

        this.addToHistory('step', feature, stepMessage, data);
    }

    /**
     * Get emoji for step number
     * @param {number} step - Step number
     * @returns {string} Step emoji
     */
    getStepEmoji(step) {
        const stepEmojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
        return stepEmojis[step - 1] || '▶️';
    }

    /**
     * Time a function execution
     * @param {string} feature - Feature name
     * @param {string} operation - Operation name
     * @param {Function} fn - Function to time
     * @returns {*} Function result
     */
    async time(feature, operation, fn) {
        if (!this.isDebugMode || !this.isFeatureEnabled(feature)) {
            return await fn();
        }

        const start = performance.now();
        this.info(feature, `⏱️ Starting ${operation}`);
        
        try {
            const result = await fn();
            const duration = performance.now() - start;
            
            this.recordPerformance(operation, duration, { feature });
            this.info(feature, `✅ Completed ${operation}`, { duration: `${duration.toFixed(2)}ms` });
            
            return result;
        } catch (error) {
            const duration = performance.now() - start;
            this.error(feature, `❌ Failed ${operation}`, { error, duration: `${duration.toFixed(2)}ms` });
            throw error;
        }
    }
}

// Create global debug logger instance
window.debugLogger = new DebugLogger();

// Add global convenience functions
window.enableFeature = (feature) => window.debugLogger.enableFeature(feature);
window.disableFeature = (feature) => window.debugLogger.disableFeature(feature);

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DebugLogger;
}