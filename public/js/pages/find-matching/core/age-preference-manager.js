/**
 * Age Preference Manager
 * Handles dynamic UI behavior for age preference field based on gender and seeker age
 */

export class AgePreferenceManager {
    /**
     * Initialize age preference field event listeners
     */
    static initialize() {
        const genderField = document.getElementById('gender');
        const seekerAgeField = document.getElementById('seeker-age');
        
        if (genderField) {
            genderField.addEventListener('change', AgePreferenceManager.updateAgePreferenceUI);
        }
        
        if (seekerAgeField) {
            seekerAgeField.addEventListener('input', AgePreferenceManager.updateAgePreferenceUI);
            seekerAgeField.addEventListener('change', AgePreferenceManager.updateAgePreferenceUI);
        }
        
        // Initialize on page load
        AgePreferenceManager.updateAgePreferenceUI();
    }
    
    /**
     * Update age preference UI based on current gender and seeker age
     */
    static updateAgePreferenceUI() {
        const genderField = document.getElementById('gender');
        const seekerAgeField = document.getElementById('seeker-age');
        const agePreferenceLabel = document.getElementById('agePreferenceLabel');
        const agePreferenceField = document.getElementById('agePreference');
        const agePreferenceHelp = document.getElementById('agePreferenceHelp');
        
        if (!genderField || !seekerAgeField || !agePreferenceLabel || !agePreferenceField || !agePreferenceHelp) {
            return;
        }
        
        const gender = genderField.value;
        const seekerAge = seekerAgeField.value;
        
        if (!gender || !seekerAge) {
            // Reset to default state when gender or age is not selected
            AgePreferenceManager.setDefaultUI(agePreferenceLabel, agePreferenceField, agePreferenceHelp);
            return;
        }
        
        const seekerAgeNum = parseInt(seekerAge, 10);
        if (isNaN(seekerAgeNum)) {
            AgePreferenceManager.setDefaultUI(agePreferenceLabel, agePreferenceField, agePreferenceHelp);
            return;
        }
        
        if (gender === 'Male') {
            AgePreferenceManager.setMaleUI(agePreferenceLabel, agePreferenceField, agePreferenceHelp, seekerAgeNum);
        } else if (gender === 'Female') {
            AgePreferenceManager.setFemaleUI(agePreferenceLabel, agePreferenceField, agePreferenceHelp, seekerAgeNum);
        } else {
            AgePreferenceManager.setDefaultUI(agePreferenceLabel, agePreferenceField, agePreferenceHelp);
        }
    }
    
    /**
     * Set default UI state (no gender selected)
     */
    static setDefaultUI(label, field, help) {
        label.textContent = 'Age Preference';
        field.placeholder = 'Optional age preference';
        field.removeAttribute('min');
        field.removeAttribute('max');
        help.innerHTML = '<i class="fas fa-info-circle"></i> Refine age range based on your preference (optional)';
    }
    
    /**
     * Set UI for male seeker (seeking females)
     */
    static setMaleUI(label, field, help, seekerAge) {
        label.textContent = 'Minimum Female Age';
        field.placeholder = `e.g., 25 (shows 25-${seekerAge})`;
        field.setAttribute('min', '18');
        field.setAttribute('max', seekerAge.toString());
        help.innerHTML = `<i class="fas fa-info-circle"></i> Shows females from this age to your age (${seekerAge})`;
    }
    
    /**
     * Set UI for female seeker (seeking males)
     */
    static setFemaleUI(label, field, help, seekerAge) {
        label.textContent = 'Maximum Male Age';
        field.placeholder = `e.g., 30 (shows ${seekerAge}-30)`;
        field.setAttribute('min', seekerAge.toString());
        field.setAttribute('max', '75');
        help.innerHTML = `<i class="fas fa-info-circle"></i> Shows males from your age (${seekerAge}) to this age`;
    }
}