/**
 * Gothram Dropdown Handler
 * Handles dynamic loading and population of gothram options
 */
class GothramDropdownHandler {
    constructor() {
        this.isLoaded = false;
        this.isLoading = false;
        this.gothramSelect = null;
        this.abortController = null;
        this.select2Handler = null;
        this.cleanup = null;
        
        // Modal functionality properties
        this.modal = null;
        this.modalForm = null;
        this.modalInput = null;
        this.saveButton = null;
        this.errorDiv = null;
        this.isCreating = false;
        
        this.init();
    }
    
    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupEventListeners());
        } else {
            this.setupEventListeners();
        }
    }
    
    setupEventListeners() {
        this.gothramSelect = document.querySelector('select[name="gothram"]');
        
        if (!this.gothramSelect) {
            console.error('❌ Gothram select element not found in DOM');
            return;
        }
        
        console.log('✅ Gothram dropdown initializing...');
        
        // Check if this is the find-matching page (nakshatra-gothram field)
        const isFindMatchingPage = this.gothramSelect.id === 'nakshatra-gothram';
        
        // Only create Select2Handler for non-find-matching pages (e.g., update-profile)
        // This prevents layout shifting issues on find-matching page
        if (!isFindMatchingPage) {
            this.select2Handler = new Select2Handler(this.gothramSelect);
            console.log('✅ Select2 enhancement enabled for gothram dropdown');
        } else {
            console.log('ℹ️ Select2 disabled for find-matching gothram (using native dropdown to prevent layout shift)');
        }
        
        // Add cleanup listener to prevent memory leaks
        this.setupCleanupListeners();
        
        // Load options immediately when page loads (not just on focus)
        this.handleDropdownInteraction();
        
        // Add event listener for additional interactions if needed
        this.gothramSelect.addEventListener('focus', () => {
            if (!this.isLoaded) {
                this.handleDropdownInteraction();
            }
        }, { once: false });
        
        // Setup add button click handler for lazy modal initialization
        this.setupAddButtonHandler();
    }
    
    setupCleanupListeners() {
        // Cleanup Select2 instances on page unload to prevent memory leaks
        const cleanup = () => {
            if (this.select2Handler) {
                this.select2Handler.destroy();
            }
        };
        
        // Listen for various unload events
        window.addEventListener('beforeunload', cleanup);
        window.addEventListener('pagehide', cleanup);
        
        // Store cleanup function for potential manual cleanup
        this.cleanup = cleanup;
    }
    
    setupAddButtonHandler() {
        // Setup lazy initialization when the add button is clicked
        const addButton = document.querySelector('[data-bs-target="#addGothramModal"]');
        if (addButton) {
            addButton.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔘 Add New Gothram button clicked');
                
                // Check if modal exists in DOM
                const modalElement = document.getElementById('addGothramModal');
                console.log('Modal element in DOM:', !!modalElement);
                
                if (modalElement) {
                    console.log('Modal classes:', modalElement.className);
                    console.log('Modal display style:', window.getComputedStyle(modalElement).display);
                }
                
                // Initialize modal handlers if not already done
                if (!this.modal) {
                    console.log('🔄 Lazy initializing modal handlers...');
                    this.setupModalHandlers();
                }
                
                // Double-check if modal input is available and can be focused
                if (this.modalInput && typeof this.modalInput.focus === 'function') {
                    console.log('✅ Modal input found, will focus after delay');
                    // Small delay to ensure modal is visible before focusing
                    setTimeout(() => {
                        console.log('🎯 Focusing modal input');
                        this.modalInput.focus();
                    }, 500);
                } else {
                    console.warn('❌ Modal input not available for focus');
                }
            });
        }
    }
    
    setupModalHandlers() {
        // Get modal elements
        this.modal = document.getElementById('addGothramModal');
        this.modalForm = document.getElementById('addGothramForm');
        this.modalInput = document.getElementById('newGothramName');
        this.saveButton = document.getElementById('saveGothramBtn');
        this.errorDiv = document.getElementById('gothramErrorMsg');
        
        if (!this.modal || !this.modalForm || !this.modalInput || !this.saveButton) {
            console.warn('⚠️ Modal elements not found, gothram creation functionality disabled', {
                modal: !!this.modal,
                modalForm: !!this.modalForm,
                modalInput: !!this.modalInput,
                saveButton: !!this.saveButton,
                errorDiv: !!this.errorDiv
            });
            return;
        }
        
        console.log('✅ Modal handlers initializing...');
        
        // Setup event listeners
        this.saveButton.addEventListener('click', () => this.handleModalSubmit());
        
        // Handle form submission via Enter key
        this.modalForm.addEventListener('submit', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.handleModalSubmit();
        });
        
        // Clear form and errors when modal is shown
        this.modal.addEventListener('show.bs.modal', () => {
            this.clearModalForm();
        });
        
        // Prevent main form submission when modal is hidden
        this.modal.addEventListener('hidden.bs.modal', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('🔒 Modal hidden - preventing any form submission');
        });
        
        // Handle modal form validation on input
        this.modalInput.addEventListener('input', () => {
            this.clearModalErrors();
        });
    }
    
    async handleDropdownInteraction() {
        if (this.isLoaded || this.isLoading) {
            return;
        }
        
        this.isLoading = true;
        
        // Cancel any previous request
        if (this.abortController) {
            this.abortController.abort();
        }
        
        // Create new abort controller for this request
        this.abortController = new AbortController();
        
        try {
            await this.loadGothramOptions();
        } catch (error) {
            // Don't handle error if request was aborted
            if (error.name !== 'AbortError') {
                this.handleLoadError(error);
            }
        } finally {
            this.isLoading = false;
            this.abortController = null;
        }
    }
    
    async loadGothramOptions() {
        // Check for fetch API support
        if (!window.fetch) {
            throw new Error('Fetch API not supported. Please use a modern browser.');
        }
        
        try {
            const response = await fetch('/common/api/gothram', {
                signal: this.abortController.signal
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (!data.success || !Array.isArray(data.data)) {
                throw new Error('Invalid API response format');
            }
            
            this.populateOptions(data.data);
            
            // Handle preselection BEFORE initializing Select2
            // This way Select2 will pick up the already-selected value
            this.handlePreselection();
            
            this.initializeSelect2Enhancement();
            this.isLoaded = true;
            
        } catch (error) {
            console.error('Failed to load gothram options:', error);
            throw error;
        }
    }
    
    populateOptions(gothrams) {
        // Add options using appendChild (preserving placeholder)
        gothrams.forEach(gothram => {
            const option = document.createElement('option');
            option.value = gothram.name;
            option.textContent = gothram.name;
            
            this.gothramSelect.appendChild(option);
        });
    }
    
    initializeSelect2Enhancement() {
        // Initialize Select2 enhancement after options are loaded (only if handler exists)
        if (this.select2Handler) {
            const success = this.select2Handler.initialize();
            if (!success) {
                console.log('Continuing with regular dropdown (Select2 enhancement failed)');
                // Graceful degradation - dropdown still works without Select2
            }
        } else {
            console.log('ℹ️ Using native dropdown (Select2 disabled for this field)');
        }
    }
    
    handlePreselection() {
        // Try to detect saved value from the select element's context
        // Check if there's a data attribute or other indication of saved value
        const selectElement = this.gothramSelect;
        
        // Look for saved value in various ways
        const savedValue = this.detectSavedValue();
        
        if (savedValue) {
            // Normalize saved value for matching
            const normalizedSavedValue = savedValue.trim();
            
            // Method 1: Set selected attribute (with improved matching)
            let matchingOption = selectElement.querySelector(`option[value="${CSS.escape(normalizedSavedValue)}"]`);
            
            // Fallback: try case-insensitive search if exact match fails
            if (!matchingOption) {
                const availableOptions = Array.from(selectElement.querySelectorAll('option[value]:not([value=""])'));
                matchingOption = availableOptions.find(option => 
                    option.value.trim().toLowerCase() === normalizedSavedValue.toLowerCase()
                );
            }
            
            if (matchingOption) {
                // Method 1: Set selected attribute (for regular dropdown)
                matchingOption.selected = true;
                // Remove selected from placeholder
                const placeholder = selectElement.querySelector('option[value=""]');
                if (placeholder) {
                    placeholder.selected = false;
                }
                
                // Method 2: Set value property for compatibility
                selectElement.value = matchingOption.value;
                
                // Store the preselected value for later Select2 initialization
                this.preselectedValue = matchingOption.value;
                
                console.log('✅ Gothram preselected:', matchingOption.value);
            } else {
                console.warn('❌ No matching gothram found for saved value:', normalizedSavedValue);
            }
        } else {
            console.log('ℹ️ No saved value detected for preselection');
        }
    }
    
    detectSavedValue() {
        // Get saved value from data attribute (JSON parsed for security)
        const rawValue = this.gothramSelect.dataset.savedValue;
        if (!rawValue) return null;
        
        try {
            const parsedValue = JSON.parse(rawValue);
            console.log('� Detected saved gothram value:', parsedValue);
            return parsedValue && parsedValue.trim() !== '' ? parsedValue.trim() : null;
        } catch (error) {
            console.warn('Failed to parse saved gothram value:', error);
            return null;
        }
    }
    
    handleLoadError(error) {
        // Clear any existing error options first
        const existingErrorOptions = this.gothramSelect.querySelectorAll('option[data-error="true"]');
        existingErrorOptions.forEach(option => option.remove());
        
        // Show user-friendly error message in the dropdown
        const errorOption = document.createElement('option');
        errorOption.value = '';
        errorOption.textContent = 'Error loading gothrams. Please refresh the page.';
        errorOption.disabled = true;
        errorOption.style.color = '#dc3545'; // Bootstrap danger color
        errorOption.setAttribute('data-error', 'true'); // Mark as error option
        
        this.gothramSelect.appendChild(errorOption);
        
        // Also log for debugging
        console.error('Gothram dropdown error:', error);
    }
    
    // Modal form handling methods
    async handleModalSubmit() {
        if (this.isCreating) {
            return; // Prevent double submission
        }
        
        const gothramName = this.modalInput.value.trim();
        
        // Client-side validation
        if (!gothramName) {
            this.showModalError('Gothram name is required');
            return;
        }
        
        if (gothramName.length < 2) {
            this.showModalError('Gothram name must be at least 2 characters long');
            return;
        }
        
        if (gothramName.length > 50) {
            this.showModalError('Gothram name must not exceed 50 characters');
            return;
        }
        
        // Show loading state
        this.setModalLoading(true);
        
        try {
            await this.createGothram(gothramName);
        } catch (error) {
            this.handleModalError(error);
        } finally {
            this.setModalLoading(false);
        }
    }
    
    async createGothram(name) {
        try {
            const response = await fetch('/common/api/gothram', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: name })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                // Handle server validation errors
                if (response.status === 400) {
                    // Try multiple error response formats for compatibility
                    let errorMessage = 'Validation error';
                    
                    if (data.details?.validationErrors) {
                        errorMessage = data.details.validationErrors
                            .map(err => err.message)
                            .join(', ');
                    } else if (data.message) {
                        errorMessage = data.message;
                    }
                    
                    throw new Error(errorMessage);
                } else {
                    throw new Error(data.message || `Server error: ${response.status}`);
                }
            }
            
            if (!data.success || !data.data) {
                throw new Error('Invalid response from server');
            }
            
            // Success - add to dropdown and select it
            await this.handleGothramCreated(data.data);
            
        } catch (error) {
            console.error('Failed to create gothram:', error);
            throw error;
        }
    }
    
    async handleGothramCreated(newGothram) {
        try {
            // Add new option to select element
            const option = document.createElement('option');
            option.value = newGothram.name;
            option.textContent = newGothram.name;
            this.gothramSelect.appendChild(option);
            
            // Temporarily prevent form submission during value setting
            const mainForm = document.querySelector('form[action="/profile/create"]');
            let formSubmitHandler = null;
            
            if (mainForm) {
                // Temporarily disable form submission
                formSubmitHandler = (e) => {
                    console.log('🚫 Blocking form submission during gothram update');
                    e.preventDefault();
                    e.stopPropagation();
                    return false;
                };
                mainForm.addEventListener('submit', formSubmitHandler, true);
            }
            
            // Set the new gothram as selected
            this.gothramSelect.value = newGothram.name;
            
            // Update Select2 if it's initialized (only for update-profile page)
            if (this.select2Handler && this.select2Handler.isInitialized) {
                try {
                    // Refresh Select2 to recognize new option, then set value
                    this.select2Handler.refresh();
                    // Use requestAnimationFrame for better timing
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            this.select2Handler.setValue(newGothram.name);
                        });
                    });
                } catch (error) {
                    console.warn('Failed to update Select2, falling back to regular select:', error);
                    // Fallback to regular select
                    this.gothramSelect.value = newGothram.name;
                }
            } else {
                // Native dropdown - value already set above
                console.log('✅ Gothram selected in native dropdown:', newGothram.name);
            }
            
            // Re-enable form submission after a delay
            if (mainForm && formSubmitHandler) {
                setTimeout(() => {
                    mainForm.removeEventListener('submit', formSubmitHandler, true);
                    console.log('✅ Form submission re-enabled');
                }, 1000);
            }
            
            // Close modal
            this.closeModal();
            
            // Show brief success feedback
            this.showSuccessMessage(`Gothram "${newGothram.name}" added successfully`);
            
            console.log('✅ Gothram created and selected:', newGothram.name);
            
            // Add comprehensive form submission prevention
            this.preventFormSubmissionTemporarily();
            
        } catch (error) {
            console.error('Error handling gothram creation success:', error);
            // Still show success since gothram was created
            this.showModalError('Gothram created but there was an issue updating the dropdown. Please refresh the page.');
        }
    }
    
    setModalLoading(isLoading) {
        this.isCreating = isLoading;
        
        if (isLoading) {
            this.saveButton.disabled = true;
            this.saveButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Creating...';
            this.modalInput.disabled = true;
        } else {
            this.saveButton.disabled = false;
            this.saveButton.innerHTML = '<i class="fas fa-save me-2"></i>Save Gothram';
            this.modalInput.disabled = false;
        }
    }
    
    showModalError(message) {
        if (this.errorDiv) {
            this.errorDiv.textContent = message;
            this.errorDiv.style.display = 'block';
            this.modalInput.classList.add('is-invalid');
        }
    }
    
    clearModalErrors() {
        if (this.errorDiv) {
            this.errorDiv.textContent = '';
            this.errorDiv.style.display = 'none';
            this.modalInput.classList.remove('is-invalid');
        }
    }
    
    clearModalForm() {
        if (this.modalInput) {
            this.modalInput.value = '';
        }
        this.clearModalErrors();
        this.setModalLoading(false);
    }
    
    closeModal() {
        if (this.modal) {
            // Try Bootstrap 5 API first
            if (window.bootstrap && bootstrap.Modal) {
                const modalInstance = bootstrap.Modal.getInstance(this.modal);
                if (modalInstance) {
                    modalInstance.hide();
                    return;
                }
            }
            
            // Fallback: try jQuery/Bootstrap 4 API
            if (window.$ && $.fn.modal) {
                $(this.modal).modal('hide');
                return;
            }
            
            // Last resort: manually trigger close button
            const closeButton = this.modal.querySelector('[data-bs-dismiss="modal"]');
            if (closeButton) {
                closeButton.click();
            }
        }
    }
    
    handleModalError(error) {
        const message = error.message || 'An error occurred while creating the gothram';
        this.showModalError(message);
    }
    
    showSuccessMessage(message) {
        // Remove any existing success toasts first
        const existingToasts = document.querySelectorAll('.gothram-success-toast');
        existingToasts.forEach(toast => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        });
        
        // Create a simple toast-like notification
        const toast = document.createElement('div');
        toast.className = 'alert alert-success position-fixed gothram-success-toast';
        toast.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px; animation: fadeIn 0.3s ease-in;';
        toast.innerHTML = `
            <i class="fas fa-check-circle me-2"></i>
            ${this.escapeHtml(message)}
        `;
        
        document.body.appendChild(toast);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.animation = 'fadeOut 0.3s ease-out';
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.parentNode.removeChild(toast);
                    }
                }, 300);
            }
        }, 3000);
    }
    
    // Helper method to escape HTML to prevent XSS
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Comprehensive form submission prevention
    preventFormSubmissionTemporarily() {
        const mainForm = document.querySelector('form[action="/profile/create"]');
        if (!mainForm) return;
        
        console.log('🔒 Applying comprehensive form submission prevention');
        
        // Multiple prevention strategies
        const preventers = [];
        
        // 1. Submit event prevention
        const submitPreventer = (e) => {
            console.log('🚫 BLOCKED: Form submission attempt after gothram creation');
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            return false;
        };
        
        // 2. Click prevention on submit button
        const submitButton = mainForm.querySelector('button[type="submit"]');
        const clickPreventer = (e) => {
            console.log('🚫 BLOCKED: Submit button click after gothram creation');
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            return false;
        };
        
        // 3. Form reset prevention
        const resetPreventer = (e) => {
            console.log('🚫 BLOCKED: Form reset after gothram creation');
            e.preventDefault();
            return false;
        };
        
        // Apply all preventers
        mainForm.addEventListener('submit', submitPreventer, true);
        preventers.push(() => mainForm.removeEventListener('submit', submitPreventer, true));
        
        if (submitButton) {
            submitButton.addEventListener('click', clickPreventer, true);
            preventers.push(() => submitButton.removeEventListener('click', clickPreventer, true));
        }
        
        mainForm.addEventListener('reset', resetPreventer, true);
        preventers.push(() => mainForm.removeEventListener('reset', resetPreventer, true));
        
        // Add navigation change detection
        const originalLocation = window.location.href;
        const navigationWatcher = setInterval(() => {
            if (window.location.href !== originalLocation) {
                console.log('🚨 DETECTED: Unexpected navigation after gothram creation!');
                console.log('From:', originalLocation);
                console.log('To:', window.location.href);
                clearInterval(navigationWatcher);
            }
        }, 100);
        
        // Remove all preventers after 3 seconds
        setTimeout(() => {
            preventers.forEach(remove => remove());
            clearInterval(navigationWatcher);
            console.log('✅ Form submission prevention removed - form is now active');
        }, 3000);
    }
}

/**
 * Select2 Enhancement Handler
 * Provides searchable dropdown enhancement using Select2 library
 */
class Select2Handler {
    constructor(selectElement) {
        this.selectElement = selectElement;
        this.isInitialized = false;
        this.select2Instance = null;
    }
    
    /**
     * Initialize Select2 with Bootstrap theme and enhanced features
     */
    initialize() {
        // Check if Select2 is available
        if (typeof $ === 'undefined' || typeof $.fn.select2 === 'undefined') {
            console.warn('Select2 library not available, falling back to regular dropdown');
            return false;
        }
        
        try {
            // Select2 configuration with default theme and enhanced features
            const config = {
                // Using default theme for compatibility (bootstrap theme CSS not available)
                placeholder: {
                    id: '', // Empty value for placeholder
                    text: 'Search and select gothram...'
                },
                allowClear: false,
                minimumInputLength: 0,
                minimumResultsForSearch: 5, // Show search when more than 5 options
                width: '100%', // Use 100% width to match parent container
                dropdownAutoWidth: false, // Prevent auto-width to control dropdown size
                containerCssClass: 'gothram-select2-container', // Custom class for specific styling
                escapeMarkup: function(markup) {
                    return markup; // Allow our markup
                },
                language: {
                    noResults: function() {
                        return "No gothram found";
                    },
                    searching: function() {
                        return "Searching gothrams...";
                    }
                }
            };
            
            // Initialize Select2
            this.select2Instance = $(this.selectElement).select2(config);
            this.isInitialized = true;
            
            // If we have a preselected value, apply it now that Select2 is initialized
            if (this.selectElement.value && this.selectElement.value !== '') {
                console.log('🔄 Applying preselected value to Select2:', this.selectElement.value);
                $(this.selectElement).trigger('change');
            }
            
            console.log('✅ Select2 initialized successfully for gothram dropdown');
            return true;
            
        } catch (error) {
            console.error('Failed to initialize Select2:', error);
            return false;
        }
    }
    
    /**
     * Refresh Select2 after options change
     */
    refresh() {
        if (this.isInitialized && this.select2Instance) {
            try {
                this.select2Instance.trigger('change');
                return true;
            } catch (error) {
                console.warn('Failed to refresh Select2:', error);
                return false;
            }
        }
        return false;
    }
    
    /**
     * Set selected value in Select2
     */
    setValue(value) {
        if (this.isInitialized && this.select2Instance) {
            try {
                console.log('🔧 Select2: Attempting to set value:', value);
                // Ensure the value exists as an option before setting
                const option = this.selectElement.querySelector(`option[value="${CSS.escape(value)}"]`);
                if (option) {
                    $(this.selectElement).val(value).trigger('change');
                    console.log('✅ Select2: Value set successfully');
                    return true;
                } else {
                    console.warn(`❌ Select2: Option with value "${value}" not found`);
                    return false;
                }
            } catch (error) {
                console.warn('Failed to set Select2 value:', error);
                return false;
            }
        }
        console.log('ℹ️ Select2: Not initialized, cannot set value');
        return false;
    }
    
    /**
     * Destroy Select2 instance (cleanup)
     */
    destroy() {
        if (this.isInitialized && this.select2Instance) {
            try {
                this.select2Instance.select2('destroy');
                this.isInitialized = false;
                this.select2Instance = null;
                return true;
            } catch (error) {
                console.warn('Failed to destroy Select2:', error);
                return false;
            }
        }
        return false;
    }
}

// Initialize the handler when script loads
new GothramDropdownHandler();