/**
 * Search Mode Handler
 * Manages search mode switching between serial and nakshatra modes
 * Phase 2A: Extracted from find-matching.ejs
 */

import { FieldManager } from './field-manager.js';

export class SearchModeHandler {
    /**
     * Initialize search mode handler with event listeners
     */
    static initialize() {
        document.querySelectorAll('input[name="searchMode"]').forEach(function (radio) {
            radio.addEventListener('change', SearchModeHandler.toggleSearchMode);
        });

        // Set initial state
        SearchModeHandler.toggleSearchMode();

        // Initialize Rasi field state handler
        const enableRasiCheckbox = document.getElementById('enableRasiCompatibility');
        if (enableRasiCheckbox) {
            enableRasiCheckbox.addEventListener('change', SearchModeHandler.updateRasiFieldState);
        }
    }

    /**
     * Toggle fields based on search mode with selective field clearing
     */
    static toggleSearchMode() {
        const modeElement = document.querySelector('input[name="searchMode"]:checked');
        if (!modeElement) {
            console.error('No search mode selected');
            return;
        }

        const mode = modeElement.value;
        
        if (mode === 'serial') {
            // Show/Hide sections
            const serialRow = document.getElementById('serial-row');
            const nakshatraRow = document.getElementById('nakshatra-gender-row');
            
            if (serialRow) serialRow.style.display = '';
            if (nakshatraRow) nakshatraRow.style.display = 'none';
            
            // Clear ONLY nakshatra-specific hidden fields
            FieldManager.clearNakshatraFields();
            
        } else if (mode === 'nakshatra') {
            // Show/Hide sections  
            const serialRow = document.getElementById('serial-row');
            const nakshatraRow = document.getElementById('nakshatra-gender-row');
            
            if (serialRow) serialRow.style.display = 'none';
            if (nakshatraRow) nakshatraRow.style.display = '';
            
            // Clear ONLY serial-specific hidden fields
            FieldManager.clearSerialFields();
        }
        
        // Update gothram field visibility based on mode
        SearchModeHandler.updateGothramFieldVisibility(mode);
        
        // Update Rasi field state for both modes
        SearchModeHandler.updateRasiFieldState();
        
        // Keep additional filters visible for both modes
        const additionalFiltersRow = document.getElementById('additional-filters-row');
        if (additionalFiltersRow) {
            additionalFiltersRow.style.display = '';
        }
        
        // Hide validation error when switching modes
        if (window.hideValidationError && typeof window.hideValidationError === 'function') {
            window.hideValidationError();
        }
    }

    /**
     * Update Rasi/Lagnam field state based on compatibility setting and search mode
     */
    static updateRasiFieldState() {
        const enableRasiCheckbox = document.getElementById('enableRasiCompatibility');
        const rasiField = document.getElementById('seeker-rasi');
        const rasiLabel = rasiField ? rasiField.closest('.col-md-6')?.querySelector('.form-label') : null;
        
        if (!enableRasiCheckbox || !rasiField || !rasiLabel) {
            return;
        }
        
        // Check if we're in nakshatra mode
        const currentModeElement = document.querySelector('input[name="searchMode"]:checked');
        const currentMode = currentModeElement ? currentModeElement.value : '';
        const isNakshatraMode = currentMode === 'nakshatra';
        
        if (enableRasiCheckbox.checked && isNakshatraMode) {
            rasiField.disabled = false;
            rasiField.required = true;
            rasiField.style.backgroundColor = '';
            rasiField.style.color = '';
            rasiLabel.innerHTML = 'Your Rasi/Lagnam <span class="text-danger">*</span>';
        } else {
            rasiField.disabled = true;
            rasiField.required = false;
            rasiField.style.backgroundColor = '#f8f9fa';
            rasiField.style.color = '#6c757d';
            rasiLabel.innerHTML = 'Your Rasi/Lagnam';
            // Preserve the selection as requested in original code
        }
    }

    /**
     * Update gothram field visibility based on search mode
     * Gothram field is only required and visible in nakshatra mode
     */
    static updateGothramFieldVisibility(mode) {
        const gothramSection = document.getElementById('nakshatraGothramSection');
        const gothramButtonSection = document.getElementById('nakshatraGothramButtonSection');
        const gothramField = document.getElementById('nakshatra-gothram');
        
        if (!gothramSection || !gothramField) {
            return; // Elements not found, possibly not on this page
        }
        
        if (mode === 'nakshatra') {
            // Show gothram field and button for nakshatra mode (unregistered users)
            gothramSection.classList.remove('d-none');
            if (gothramButtonSection) {
                gothramButtonSection.classList.remove('d-none');
            }
            gothramField.required = true;
            gothramField.disabled = false;
        } else {
            // Hide gothram field and button for serial mode (registered users - gothram comes from profile)
            gothramSection.classList.add('d-none');
            if (gothramButtonSection) {
                gothramButtonSection.classList.add('d-none');
            }
            gothramField.required = false;
            gothramField.disabled = true;
            gothramField.value = ''; // Clear value when hidden
        }
    }
}