/**
 * Data Manager Utility
 * Handles initialization and management of profiles and seeker data
 * Phase 2A: Extracted from find-matching.ejs
 */

export class DataManager {
    /**
     * Initialize profiles data from the embedded JSON
     */
    static initializeProfilesData() {
        try {
            const profilesDataElement = document.getElementById('matching-profiles-data');
            if (profilesDataElement) {
                const profilesData = profilesDataElement.textContent;
                window.matchingProfiles = JSON.parse(profilesData);
            } else {
                console.warn('Profiles data element not found');
                window.matchingProfiles = [];
            }
        } catch (error) {
            console.error('Error parsing profiles data:', error);
            window.matchingProfiles = [];
        }
    }

    /**
     * Initialize seeker info data from the embedded JSON
     */
    static initializeSeekerData() {
        try {
            const seekerDataElement = document.getElementById('seeker-info-data');
            if (seekerDataElement) {
                window.seekerInfo = JSON.parse(seekerDataElement.textContent);
            } else {
                console.warn('Seeker data element not found');
                window.seekerInfo = {
                    name: "Profile Seeker",
                    serialNo: "N/A",
                    gender: "",
                    nakshatraid: "",
                    age: ""
                };
            }
        } catch (error) {
            console.error('Error parsing seeker info:', error);
            window.seekerInfo = {
                name: "Profile Seeker",
                serialNo: "N/A",
                gender: "",
                nakshatraid: "",
                age: ""
            };
        }
    }

    /**
     * Initialize all data
     */
    static initialize() {
        DataManager.initializeProfilesData();
        DataManager.initializeSeekerData();
    }

    /**
     * Get profiles data
     * @returns {Array} Array of profile objects
     */
    static getProfiles() {
        return window.matchingProfiles || [];
    }

    /**
     * Get seeker info
     * @returns {Object} Seeker information object
     */
    static getSeekerInfo() {
        return window.seekerInfo || {};
    }
}