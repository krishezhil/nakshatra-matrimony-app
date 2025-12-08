/**
 * Field Manager Utility
 * Handles field clearing operations with visual feedback
 * Phase 2A: Extracted from find-matching.ejs
 */

export class FieldManager {
    /**
     * Clear field with visual feedback animation
     * @param {string} fieldId - The ID of the field to clear
     * @param {string} fieldName - The name of the field (for logging/debugging)
     */
    static clearFieldWithFeedback(fieldId, fieldName) {
        const field = document.getElementById(fieldId);
        if (!field) {
            console.warn(`Field with ID '${fieldId}' not found`);
            return;
        }
        
        const currentValue = field.value;
        
        if (currentValue && currentValue.trim() !== '') {
            // Add visual feedback for cleared field
            field.style.backgroundColor = '#fff3cd'; // Light yellow
            field.style.transition = 'background-color 0.3s ease';
            
            // Reset after animation
            setTimeout(() => {
                field.style.backgroundColor = '';
                field.style.transition = '';
            }, 1500);
        }
        
        field.value = '';
    }

    /**
     * Clear nakshatra-specific fields only
     */
    static clearNakshatraFields() {
        FieldManager.clearFieldWithFeedback('nakshatraid', 'Nakshatra');
        FieldManager.clearFieldWithFeedback('gender', 'Gender');  
        FieldManager.clearFieldWithFeedback('seeker-age', 'Age');
        FieldManager.clearFieldWithFeedback('seeker-rasi', 'Rasi/Lagnam');
    }

    /**
     * Clear serial-specific fields only
     */
    static clearSerialFields() {
        FieldManager.clearFieldWithFeedback('serial-no', 'Serial Number');
    }
}