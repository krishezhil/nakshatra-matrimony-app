/**
 * DownloadManager - Handle all profile download operations
 * Phase 2B: Extracted from find-matching.ejs for better code organization
 */

export class DownloadManager {
    constructor() {
        this.debugLogger = window.debugLogger || { info: () => {}, error: (...args) => console.error(...args) };
        this.initializeDownloadFeatures();
    }

    /**
     * Initialize download-related features
     */
    initializeDownloadFeatures() {
        // Auto-scroll to results section when page loads with results
        // Only add listener if DOM is not already loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.handleAutoScroll();
            });
        } else {
            // DOM is already loaded, execute immediately
            this.handleAutoScroll();
        }
    }

    /**
     * Handle auto-scroll to results section
     */
    handleAutoScroll() {
        const resultsSection = document.getElementById('results-section');
        if (resultsSection) {
            setTimeout(() => {
                resultsSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }, 500);
        }
    }

    /**
     * Main download function for matching profiles
     * @param {string} format - Download format ('excel', 'pdf', 'whatsapp-pdf', 'whatsapp')
     * @param {Event} event - Click event (optional)
     */
    async downloadProfiles(format, event) {
        let profilesData = [];
        
        // Try to use the full profiles data from the server first
        if (window.matchingProfiles && Array.isArray(window.matchingProfiles) && window.matchingProfiles.length > 0) {
            profilesData = window.matchingProfiles;
        } else {
            // Fallback: scrape the table data if window data is not available
            const tableRows = document.querySelectorAll('table tbody tr');
            tableRows.forEach(function(row) {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 10) {
                    const profile = {
                        serial_no: cells[0].textContent.trim(),
                        name: cells[1].textContent.trim(),
                        age: cells[2].textContent.trim(),
                        nakshatraid: cells[3].textContent.trim(),
                        rasi_lagnam: cells[4].textContent.trim(),
                        qualification: cells[5].textContent.trim(),
                        monthly_income: cells[6].textContent.replace('₹', '').replace(/,/g, '').trim(),
                        region: cells[7].textContent.trim(),
                        contact_no: cells[8].textContent.trim(),
                        additional_contact_no: '', // Default empty - will be populated from server data if available
                        porutham: (() => {
                            const poruthammValue = cells[9].textContent.trim();
                            // Double-transformation protection: if already transformed, keep as-is
                            const isAlreadyTransformed = poruthammValue === 'M' || poruthammValue === 'U' || 
                                                        poruthammValue === 'Mathimam' || poruthammValue === 'Uthamam';
                            return isAlreadyTransformed ? poruthammValue : 
                                   (window.PoruthamFormatter && window.PoruthamFormatter.transformPorutham ? 
                                    window.PoruthamFormatter.transformPorutham(poruthammValue) : poruthammValue);
                        })()
                    };
                    profilesData.push(profile);
                }
            });
        }
        
        if (profilesData.length === 0) {
            if (typeof ErrorHandler !== 'undefined') {
                ErrorHandler.showError('No profiles available to download', ErrorHandler.errorTypes.VALIDATION);
            } else {
                alert('No profiles available to download');
            }
            return;
        }

        this.debugLogger.info('Download', 'Download function called', {
            format: format,
            profilesDataLength: profilesData.length,
            hasProfilesData: !!profilesData
        });

        // For Excel and PDF downloads, try to use File System Access API for folder selection
        if ((format === 'excel' || format === 'pdf' || format === 'whatsapp-pdf') && 'showSaveFilePicker' in window) {
            try {
                const result = await this.handleModernFileDownload(format, profilesData);
                if (result) return; // Success, exit early
            } catch (error) {
                if (error.name === 'AbortError') {
                    return; // User cancelled the file picker
                }
                console.error('Error with File System Access API:', error);
                // Fall back to traditional download
            }
        }

        // Traditional download method (fallback or for WhatsApp format)
        await this.handleTraditionalDownload(format, profilesData, event);
    }

    /**
     * Handle modern file download using File System Access API
     * @param {string} format - Download format
     * @param {Array} profilesData - Profiles to download
     * @returns {boolean} - Success status
     */
    async handleModernFileDownload(format, profilesData) {
        // Generate filename with timestamp
        let filename = 'Matchings_';
        if (window.seekerInfo && window.seekerInfo.name && window.seekerInfo.name !== 'null' && window.seekerInfo.name !== 'Profile Seeker') {
            filename = `Matchings_${window.seekerInfo.name.replace(/[^a-zA-Z0-9]/g, '_')}`;
        }
        
        // Add timestamp for uniqueness (matching backend format)
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        filename += `_${timestamp}`;

        // Determine file extension and type
        const fileExtension = format === 'excel' ? '.xlsx' : '.pdf';
        const mimeType = format === 'excel' 
            ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            : 'application/pdf';
        const fileDescription = format === 'excel' ? 'Excel files' : 'PDF files';

        // Show folder/file picker
        const fileHandle = await window.showSaveFilePicker({
            suggestedName: `${filename}${fileExtension}`,
            types: [{
                description: fileDescription,
                accept: { [mimeType]: [fileExtension] }
            }]
        });

        // Get the file data from server
        const response = await fetch('/export/matching-profiles', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                profiles: profilesData,
                format: format,
                seekerInfo: window.seekerInfo || {}
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to generate ${format.toUpperCase()} file`);
        }

        // Write the file to the selected location
        const blob = await response.blob();
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();

        if (typeof ErrorHandler !== 'undefined') {
            ErrorHandler.showSuccess(`${format.toUpperCase()} file saved successfully!`);
        } else {
            alert(`${format.toUpperCase()} file saved successfully!`);
        }
        return true;
    }

    /**
     * Handle traditional file download (fallback method)
     * @param {string} format - Download format
     * @param {Array} profilesData - Profiles to download
     * @param {Event} event - Click event (optional)
     */
    async handleTraditionalDownload(format, profilesData, event) {
        // For Excel and PDF downloads, notify user about download location
        if (format === 'excel' || format === 'pdf' || format === 'whatsapp-pdf') {
            const fileType = format === 'excel' ? 'Excel' : 'PDF';
            // For WhatsApp PDF, skip the confirmation dialog since it's part of a different flow
            if (format !== 'whatsapp-pdf') {
                const confirmed = await this.showDownloadConfirmation(fileType);
                if (!confirmed) {
                    return;
                }
            }
        }

        const profiles = profilesData;
        this.debugLogger.info('Download', 'Traditional download method', {
            profilesLength: profiles.length
        });

        // Extract seeker info from form
        const seekerInfo = this.extractSeekerInfo();

        // Send profiles data to export endpoint
        this.debugLogger.info('Download', 'Creating form submission', {
            profilesLength: profiles.length,
            format: format,
            hasSeekerInfo: !!seekerInfo
        });

        // Enhanced form submission with better error handling
        try {
            // For PDF and Excel downloads, try fetch first as backup method
            if (format === 'pdf' || format === 'excel') {
                const success = await this.handleFetchDownload(format, profiles, seekerInfo, event);
                if (success) return;
            }
            
            // Form submission method (fallback or for WhatsApp)
            await this.handleFormSubmission(format, profiles, seekerInfo);
            
        } catch (error) {
            console.error('Error during download:', error);
            if (typeof ErrorHandler !== 'undefined') {
                ErrorHandler.showError('Download failed. Please try again or check your browser settings.', ErrorHandler.errorTypes.SERVER);
            } else {
                alert('Download failed. Please try again or check your browser settings.');
            }
        }
    }

    /**
     * Extract seeker information from form
     * @returns {Object} - Seeker info object
     */
    extractSeekerInfo() {
        return {
            searchMode: document.querySelector('input[name="searchMode"]:checked')?.value || '',
            serialNo: document.getElementById('serial-no')?.value?.trim() || '',
            nakshatraid: document.getElementById('nakshatraid')?.value || '',
            gender: document.getElementById('gender')?.value || '',
            age: document.getElementById('seeker-age')?.value?.trim() || '',
            seekerRasi: document.getElementById('seeker-rasi')?.value || '',
            qualification: document.getElementById('qualification')?.value || '',
            regions: (() => {
                const regionsSelect = document.getElementById('regions');
                if (!regionsSelect) return [];
                
                // Check if Select2 is initialized - if so, use Select2 method
                if (typeof $ !== 'undefined' && $(regionsSelect).hasClass('select2-hidden-accessible')) {
                    return $(regionsSelect).val() || [];
                }
                
                // Fallback to native selectedOptions for backward compatibility
                return Array.from(regionsSelect.selectedOptions).map(option => option.value);
            })(),
            region: '', // Keep for backward compatibility, but now empty
            name: (window.seekerInfo && window.seekerInfo.name && window.seekerInfo.name !== 'null' && window.seekerInfo.name !== 'Profile Seeker') ? window.seekerInfo.name : 'Profile Seeker',
            searchCriteria: {
                exactQualification: document.getElementById('exactQualification')?.checked || false,
                includeMathimam: document.getElementById('includeMathimam')?.checked || false,
                includeRemarried: document.getElementById('includeRemarried')?.checked || false,
                enableRasiCompatibility: document.getElementById('enableRasiCompatibility')?.checked || false,
                minIncome: document.querySelector('input[name="minIncome"]')?.value || '',
                maxIncome: document.querySelector('input[name="maxIncome"]')?.value || ''
            }
        };
    }

    /**
     * Handle download using fetch API
     * @param {string} format - Download format
     * @param {Array} profiles - Profiles data
     * @param {Object} seekerInfo - Seeker information
     * @param {Event} event - Click event
     * @returns {boolean} - Success status
     */
    async handleFetchDownload(format, profiles, seekerInfo, event) {
        // Show loading indicator
        const originalText = event?.target?.textContent || 'Download';
        if (event?.target) {
            event.target.textContent = 'Downloading...';
            event.target.disabled = true;
        }
        
        try {
            // Alternative method using fetch for better error handling
            const response = await fetch('/export/matching-profiles', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    profiles: profiles,
                    format: format,
                    seekerInfo: seekerInfo
                })
            });
            
            if (response.ok) {
                // Get the blob and create download link
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                
                // Generate filename with timestamp (matching backend format)
                let filename = 'Matchings_';
                if (seekerInfo.name && seekerInfo.name !== 'Profile Seeker') {
                    filename += `${seekerInfo.name.replace(/[^a-zA-Z0-9]/g, '_')}`;
                }
                // Add timestamp for uniqueness (matching backend format)
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
                filename += `_${timestamp}`;
                filename += format === 'excel' ? '.xlsx' : '.pdf';
                
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                
                // Cleanup
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                
                this.debugLogger.info('Download', 'Download successful via fetch method');
                
                // Restore button
                if (event?.target) {
                    event.target.textContent = originalText;
                    event.target.disabled = false;
                }
                
                return true;
            } else {
                this.debugLogger.info('Download', 'Fetch method failed, falling back to form submission');
            }
        } catch (fetchError) {
            this.debugLogger.error('Download', 'Fetch method error, falling back to form submission', fetchError);
        }
        
        // Restore button for form submission fallback
        if (event?.target) {
            event.target.textContent = originalText;
            event.target.disabled = false;
        }
        
        return false;
    }

    /**
     * Handle form submission for download
     * @param {string} format - Download format
     * @param {Array} profiles - Profiles data
     * @param {Object} seekerInfo - Seeker information
     */
    async handleFormSubmission(format, profiles, seekerInfo) {
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = '/export/matching-profiles';
        form.style.display = 'none';

        // Add profiles data
        const profilesInput = document.createElement('input');
        profilesInput.type = 'hidden';
        profilesInput.name = 'profiles';
        profilesInput.value = JSON.stringify(profiles);
        form.appendChild(profilesInput);

        // Add seeker info
        const seekerInput = document.createElement('input');
        seekerInput.type = 'hidden';
        seekerInput.name = 'seekerInfo';
        seekerInput.value = JSON.stringify(seekerInfo);
        form.appendChild(seekerInput);

        // Add format
        const formatInput = document.createElement('input');
        formatInput.type = 'hidden';
        formatInput.name = 'format';
        formatInput.value = format;
        form.appendChild(formatInput);

        try {
            document.body.appendChild(form);
            
            // Add a timestamp to track the download
            const downloadStartTime = Date.now();
            this.debugLogger.info('Download', 'Submitting download form', { timestamp: new Date(downloadStartTime) });
            
            // Form submission method
            form.submit();
            
            // Set a timeout to check if download started
            setTimeout(() => {
                this.debugLogger.info('Download', 'Form submitted, download should have started');
                // Note: We can't reliably detect if download started due to browser security
            }, 1000);
            
        } finally {
            // Clean up form
            try {
                if (form.parentNode) {
                    document.body.removeChild(form);
                }
            } catch (e) {
                this.debugLogger.error('Download', 'Form cleanup error (non-critical)', e);
            }
        }
    }

    /**
     * Helper function to try opening Downloads folder
     */
    static openDownloadsFolder() {
        try {
            // Try different methods to open Downloads folder
            if (navigator.platform.toLowerCase().includes('win')) {
                // Windows - try to open Downloads folder
                window.open('ms-appdata:///downloads/'); // UWP apps
            } else if (navigator.platform.toLowerCase().includes('mac')) {
                // macOS
                window.open('file:///Users/' + navigator.userAgent.split('Mac OS X')[0] + '/Downloads/');
            } else {
                // Linux or other
                window.open('file:///home/Downloads/');
            }
        } catch (e) {
            // Fallback: show instructions
            if (typeof ErrorHandler !== 'undefined') {
                ErrorHandler.showInfo(
                    '📁 Please navigate to your Downloads folder manually:\n\n' +
                    '• Windows: Press Win+E, then click "Downloads"\n' +
                    '• Mac: Press Cmd+Space, type "Downloads"\n' +
                    '• Linux: Open file manager and go to Downloads\n\n' +
                    `Look for: ${window.whatsappPdfFilename || 'Matchings_*.pdf'}`
                );
            } else {
                alert(
                    '📁 Please navigate to your Downloads folder manually:\n\n' +
                    '• Windows: Press Win+E, then click "Downloads"\n' +
                    '• Mac: Press Cmd+Space, type "Downloads"\n' +
                    '• Linux: Open file manager and go to Downloads\n\n' +
                    `Look for: ${window.whatsappPdfFilename || 'Matchings_*.pdf'}`
                );
            }
        }
    }

    /**
     * Show download confirmation modal (Bootstrap alternative to confirm())
     * @param {string} fileType - Type of file (Excel or PDF)
     * @returns {Promise<boolean>} - User's confirmation choice
     */
    showDownloadConfirmation(fileType) {
        return new Promise((resolve) => {
            // Check if ErrorHandler exists and has Bootstrap support
            if (typeof bootstrap === 'undefined') {
                // Fallback to native confirm if Bootstrap not available
                const confirmed = confirm(
                    `${fileType} file will be downloaded to your default Downloads folder.\n\n` +
                    'Click OK to proceed with download, or Cancel to abort.'
                );
                resolve(confirmed);
                return;
            }

            // Create Bootstrap confirmation modal
            const modalId = 'downloadConfirmationModal';
            
            // Remove any existing modal
            const existingModal = document.getElementById(modalId);
            if (existingModal) {
                existingModal.remove();
            }

            const modalHTML = `
                <div class="modal fade" id="${modalId}" tabindex="-1" aria-labelledby="downloadConfirmTitle" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered">
                        <div class="modal-content">
                            <div class="modal-header bg-primary text-white">
                                <h5 class="modal-title" id="downloadConfirmTitle">
                                    <i class="fas fa-download me-2"></i>Confirm Download
                                </h5>
                                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                <div class="text-center mb-3">
                                    <i class="fas fa-file-${fileType === 'Excel' ? 'excel text-success' : 'pdf text-danger'}" style="font-size: 3rem;"></i>
                                </div>
                                <p class="lead text-center">
                                    <strong>${fileType} file</strong> will be downloaded to your default Downloads folder.
                                </p>
                                <div class="alert alert-info">
                                    <i class="fas fa-info-circle me-2"></i>
                                    The file will be saved automatically to your browser's Downloads folder.
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" id="downloadCancelBtn">
                                    <i class="fas fa-times me-2"></i>Cancel
                                </button>
                                <button type="button" class="btn btn-primary" id="downloadProceedBtn">
                                    <i class="fas fa-download me-2"></i>Proceed with Download
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Insert modal into DOM
            document.body.insertAdjacentHTML('beforeend', modalHTML);
            
            const modalElement = document.getElementById(modalId);
            const modal = new bootstrap.Modal(modalElement);
            
            // Handle proceed button
            document.getElementById('downloadProceedBtn').addEventListener('click', () => {
                modal.hide();
                resolve(true);
            });
            
            // Handle cancel button and backdrop click
            document.getElementById('downloadCancelBtn').addEventListener('click', () => {
                modal.hide();
                resolve(false);
            });
            
            // Handle modal close event (X button or ESC key)
            modalElement.addEventListener('hidden.bs.modal', function handler() {
                modalElement.removeEventListener('hidden.bs.modal', handler);
                modalElement.remove();
                // If neither button was clicked, default to false
                const backdrop = document.querySelector('.modal-backdrop');
                if (backdrop) backdrop.remove();
            });
            
                // Show the modal
                modal.show();
            });
        }
    }