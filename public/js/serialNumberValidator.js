/**
 * Serial Number Validator
 * Real-time validation for serial number uniqueness during profile creation
 * Phase 2: Frontend validator with debouncing and visual feedback
 */

class SerialNumberValidator {
    constructor(inputElementId, options = {}) {
        // Configuration
        this.inputElementId = inputElementId;
        this.debounceDelay = options.debounceDelay || 500; // 500ms default
        this.apiEndpoint = options.apiEndpoint || '/api/profile/check-serial';
        this.showSuccessFeedback = options.showSuccessFeedback !== false; // Default true
        
        // State
        this.debounceTimer = null;
        this.lastCheckedValue = '';
        this.isValidating = false;
        
        // Elements
        this.inputElement = null;
        this.feedbackElement = null;
        this.spinnerElement = null;
        
        // Initialize
        this.init();
    }
    
    /**
     * Initialize validator and attach event listeners
     */
    init() {
        // Get input element
        this.inputElement = document.getElementById(this.inputElementId);
        if (!this.inputElement) {
            console.error(`SerialNumberValidator: Input element #${this.inputElementId} not found`);
            return;
        }
        
        // Create feedback elements
        this.createFeedbackElements();
        
        // Attach event listeners
        this.attachEventListeners();
        
        console.log('SerialNumberValidator initialized for', this.inputElementId);
    }
    
    /**
     * Create feedback elements for validation display
     */
    createFeedbackElements() {
        // Create feedback container
        this.feedbackElement = document.createElement('div');
        this.feedbackElement.className = 'serial-validation-feedback';
        this.feedbackElement.style.display = 'none';
        
        // Create spinner element
        this.spinnerElement = document.createElement('div');
        this.spinnerElement.className = 'serial-validation-spinner';
        this.spinnerElement.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Checking...';
        this.spinnerElement.style.display = 'none';
        
        // Insert after input element
        this.inputElement.parentNode.insertBefore(this.feedbackElement, this.inputElement.nextSibling);
        this.inputElement.parentNode.insertBefore(this.spinnerElement, this.feedbackElement);
    }
    
    /**
     * Attach blur and input event listeners
     */
    attachEventListeners() {
        // Blur event - trigger validation when user leaves field
        this.inputElement.addEventListener('blur', (e) => {
            this.handleBlur(e);
        });
        
        // Input event - reset validation state when user types
        this.inputElement.addEventListener('input', (e) => {
            this.handleInput(e);
        });
        
        // Focus event - hide feedback when user focuses back
        this.inputElement.addEventListener('focus', (e) => {
            this.hideFeedback();
        });
    }
    
    /**
     * Handle blur event with debouncing
     */
    handleBlur(event) {
        const value = this.inputElement.value.trim();
        
        // Don't validate if empty (required validation will handle this)
        if (value === '') {
            this.clearValidation();
            return;
        }
        
        // Don't validate if same as last checked value
        if (value === this.lastCheckedValue) {
            return;
        }
        
        // Clear any existing debounce timer
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        
        // Debounce validation
        this.debounceTimer = setTimeout(() => {
            this.validateSerialNumber(value);
        }, this.debounceDelay);
    }
    
    /**
     * Handle input event - reset validation state
     */
    handleInput(event) {
        // Clear validation state when user types
        if (this.inputElement.value.trim() !== this.lastCheckedValue) {
            this.clearValidation();
        }
    }
    
    /**
     * Validate serial number via API
     */
    async validateSerialNumber(serialNo) {
        try {
            // Show loading state
            this.showLoading();
            this.isValidating = true;
            
            // Make API call
            const response = await fetch(`${this.apiEndpoint}/${encodeURIComponent(serialNo)}`);
            const data = await response.json();
            
            // Update last checked value
            this.lastCheckedValue = serialNo;
            
            // Handle response
            if (data.exists) {
                // Serial number already exists - show error
                this.showError(data.message || 'Serial number already exists');
                this.showDuplicateModal(serialNo);
            } else if (this.showSuccessFeedback) {
                // Serial number is available - show success
                this.showSuccess(data.message || 'Serial number is available');
            }
            
            this.isValidating = false;
            
        } catch (error) {
            console.error('Error validating serial number:', error);
            this.showError('Unable to validate serial number. Please try again.');
            this.isValidating = false;
        } finally {
            this.hideLoading();
        }
    }
    
    /**
     * Show loading spinner
     */
    showLoading() {
        this.spinnerElement.style.display = 'block';
        this.feedbackElement.style.display = 'none';
        this.inputElement.classList.remove('is-valid', 'is-invalid');
    }
    
    /**
     * Hide loading spinner
     */
    hideLoading() {
        this.spinnerElement.style.display = 'none';
    }
    
    /**
     * Show success feedback
     */
    showSuccess(message) {
        this.feedbackElement.className = 'serial-validation-feedback text-success';
        this.feedbackElement.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
        this.feedbackElement.style.display = 'block';
        
        this.inputElement.classList.remove('is-invalid');
        this.inputElement.classList.add('is-valid');
    }
    
    /**
     * Show error feedback
     */
    showError(message) {
        this.feedbackElement.className = 'serial-validation-feedback text-danger';
        this.feedbackElement.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
        this.feedbackElement.style.display = 'block';
        
        this.inputElement.classList.remove('is-valid');
        this.inputElement.classList.add('is-invalid');
    }
    
    /**
     * Hide feedback
     */
    hideFeedback() {
        this.feedbackElement.style.display = 'none';
    }
    
    /**
     * Clear all validation state
     */
    clearValidation() {
        this.hideFeedback();
        this.hideLoading();
        this.inputElement.classList.remove('is-valid', 'is-invalid');
        
        // Clear debounce timer
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = null;
        }
    }
    
    /**
     * Show duplicate serial number modal
     */
    showDuplicateModal(serialNo) {
        // Check if modal already exists
        let modal = document.getElementById('duplicateSerialModal');
        
        if (!modal) {
            // Create modal
            modal = this.createDuplicateModal();
            document.body.appendChild(modal);
        }
        
        // Update modal content
        const serialNoSpan = modal.querySelector('#duplicateSerialNumber');
        if (serialNoSpan) {
            serialNoSpan.textContent = serialNo;
        }
        
        // Show modal using Bootstrap
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
        
        // Focus back to input when modal closes
        modal.addEventListener('hidden.bs.modal', () => {
            this.inputElement.focus();
            this.inputElement.select();
        }, { once: true });
    }
    
    /**
     * Create duplicate serial number modal
     */
    createDuplicateModal() {
        const modalHTML = `
            <div class="modal fade" id="duplicateSerialModal" tabindex="-1" aria-labelledby="duplicateSerialModalLabel" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header bg-danger text-white">
                            <h5 class="modal-title" id="duplicateSerialModalLabel">
                                <i class="fas fa-exclamation-triangle me-2"></i>Duplicate Serial Number
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            <div class="alert alert-danger d-flex align-items-center mb-0" role="alert">
                                <i class="fas fa-exclamation-circle fa-2x me-3"></i>
                                <div>
                                    <h6 class="alert-heading mb-2">Serial Number Already Exists</h6>
                                    <p class="mb-2">
                                        The serial number <strong id="duplicateSerialNumber"></strong> is already in use.
                                    </p>
                                    <p class="mb-0">
                                        Please choose a different serial number to continue.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-primary" data-bs-dismiss="modal">
                                <i class="fas fa-edit me-2"></i>Change Serial Number
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        const wrapper = document.createElement('div');
        wrapper.innerHTML = modalHTML;
        return wrapper.firstElementChild;
    }
    
    /**
     * Destroy validator and cleanup
     */
    destroy() {
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }
        
        // Remove feedback elements
        if (this.feedbackElement && this.feedbackElement.parentNode) {
            this.feedbackElement.parentNode.removeChild(this.feedbackElement);
        }
        if (this.spinnerElement && this.spinnerElement.parentNode) {
            this.spinnerElement.parentNode.removeChild(this.spinnerElement);
        }
        
        // Remove modal if exists
        const modal = document.getElementById('duplicateSerialModal');
        if (modal && modal.parentNode) {
            modal.parentNode.removeChild(modal);
        }
        
        console.log('SerialNumberValidator destroyed');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SerialNumberValidator;
}
