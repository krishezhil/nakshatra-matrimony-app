/**
 * Form Validator
 * Handles all form validation logic with rich UI feedback
 * Phase 2A: Extracted from find-matching.ejs
 */

export class FormValidator {
    /**
     * Show validation error with rich UI
     * @param {string} message - Error message to display
     * @param {HTMLElement} focusElement - Element to focus and highlight
     */
    static showValidationError(message, focusElement) {
        const errorDiv = document.getElementById('validation-error');
        const messageSpan = document.getElementById('validation-message');

        if (!errorDiv || !messageSpan) {
            console.error('Validation error elements not found');
            // Use ErrorHandler if available, otherwise fallback to alert
            if (typeof ErrorHandler !== 'undefined') {
                ErrorHandler.showError(message, ErrorHandler.errorTypes.VALIDATION);
            } else {
                alert(message);
            }
            return;
        }

        messageSpan.textContent = message;
        errorDiv.style.display = 'block';
        errorDiv.classList.add('show');

        // Add invalid styling to the problematic field
        if (focusElement) {
            focusElement.classList.add('is-invalid');
            focusElement.focus();

            // Remove invalid styling when user starts typing/selecting
            focusElement.addEventListener('input', function () {
                this.classList.remove('is-invalid');
                FormValidator.hideValidationError();
            }, { once: true });

            focusElement.addEventListener('change', function () {
                this.classList.remove('is-invalid');
                FormValidator.hideValidationError();
            }, { once: true });
        }

        // Scroll to top to show error message
        const form = document.getElementById('find-matching-form');
        if (form) {
            form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }

    /**
     * Hide validation error and clear all invalid styling
     */
    static hideValidationError() {
        const errorDiv = document.getElementById('validation-error');
        if (errorDiv) {
            errorDiv.style.display = 'none';
            errorDiv.classList.remove('show');
        }

        // Remove all invalid styling
        document.querySelectorAll('.is-invalid').forEach(function (element) {
            element.classList.remove('is-invalid');
        });
    }

    /**
     * Validate form before submission
     * @param {Event} event - Form submission event
     * @returns {boolean} - True if validation passes, false otherwise
     */
    static validateForm(event) {
        // Clear previous validation errors
        FormValidator.hideValidationError();

        const modeElement = document.querySelector('input[name="searchMode"]:checked');
        if (!modeElement) {
            console.error('Search mode not found');
            return false;
        }

        const mode = modeElement.value;

        if (mode === 'serial') {
            return FormValidator.validateSerialMode(event);
        } else if (mode === 'nakshatra') {
            return FormValidator.validateNakshatraMode(event);
        }

        return true;
    }

    /**
     * Validate serial number mode
     * @param {Event} event - Form submission event
     * @returns {boolean} - True if validation passes, false otherwise
     */
    static validateSerialMode(event) {
        const serialNoField = document.getElementById('serial-no');
        if (!serialNoField) {
            console.error('Serial number field not found');
            return false;
        }

        const serialNo = serialNoField.value.trim();
        if (!serialNo) {
            event.preventDefault();
            FormValidator.showValidationError(
                'Please enter a Serial No to search for matching profiles.', 
                serialNoField
            );
            return false;
        }

        return true;
    }

    /**
     * Validate nakshatra mode
     * @param {Event} event - Form submission event
     * @returns {boolean} - True if validation passes, false otherwise
     */
    static validateNakshatraMode(event) {
        const nakshatraidField = document.getElementById('nakshatraid');
        const genderField = document.getElementById('gender');
        const seekerAgeField = document.getElementById('seeker-age');

        // Check if required elements exist
        if (!nakshatraidField || !genderField || !seekerAgeField) {
            console.error('Required form fields not found');
            return false;
        }

        const nakshatraid = nakshatraidField.value;
        const gender = genderField.value;
        const seekerAge = seekerAgeField.value.trim();

        // Validate Nakshatra ID
        if (!nakshatraid) {
            event.preventDefault();
            FormValidator.showValidationError(
                'Please select a Nakshatra ID from the dropdown to proceed with the search.', 
                nakshatraidField
            );
            return false;
        }

        // Validate Gender
        if (!gender) {
            event.preventDefault();
            FormValidator.showValidationError(
                'Please select your Gender (Male/Female) to find compatible matches.', 
                genderField
            );
            return false;
        }

        // Validate Age
        if (!seekerAge) {
            event.preventDefault();
            FormValidator.showValidationError(
                'Please enter your Age to find age-appropriate matches.', 
                seekerAgeField
            );
            return false;
        }

        // Validate age is a valid number within range
        const ageNum = parseInt(seekerAge, 10);
        if (isNaN(ageNum) || ageNum < 18 || ageNum > 100) {
            event.preventDefault();
            FormValidator.showValidationError(
                'Please enter a valid age between 18 and 100 years.', 
                seekerAgeField
            );
            return false;
        }

        // Validate Gothram (required for nakshatra mode)
        const gothramField = document.getElementById('nakshatra-gothram');
        if (gothramField) {
            const gothramValue = gothramField.value.trim();
            if (!gothramValue) {
                event.preventDefault();
                FormValidator.showValidationError(
                    'Please select your Gothram. This is required for matrimonial compatibility matching.', 
                    gothramField
                );
                return false;
            }
        }

        // Validate Rasi/Lagnam when compatibility is enabled (nakshatra mode only)
        const enableRasiCheckbox = document.getElementById('enableRasiCompatibility');
        if (enableRasiCheckbox && enableRasiCheckbox.checked) {
            const rasiField = document.getElementById('seeker-rasi');
            if (rasiField) {
                const rasiValue = rasiField.value.trim();
                if (!rasiValue) {
                    event.preventDefault();
                    FormValidator.showValidationError(
                        'Please select your Rasi/Lagnam when Rasi Compatibility is enabled.', 
                        rasiField
                    );
                    return false;
                }
            }
        }

        return true;
    }
}