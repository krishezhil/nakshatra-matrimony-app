/**
 * WhatsAppManager - Handle WhatsApp integration and PDF sharing workflow
 * Phase 2B: Extracted from find-matching.ejs for better code organization
 */

export class WhatsAppManager {
    constructor(downloadManager) {
        this.downloadManager = downloadManager;
        this.whatsappWindowRef = null;
        this.debugLogger = window.debugLogger || { step: () => {}, info: () => {}, error: (...args) => console.error(...args) };
        this.initializeWhatsAppFeatures();
    }

    /**
     * Initialize WhatsApp-related features
     */
    initializeWhatsAppFeatures() {
        // Enhanced phone number input formatting
        // Only add listener if DOM is not already loaded to prevent conflicts
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setupPhoneNumberFormatting();
            });
        } else {
            // DOM is already loaded, execute immediately
            this.setupPhoneNumberFormatting();
        }
    }

    /**
     * Setup phone number input formatting
     */
    setupPhoneNumberFormatting() {
        const phoneInput = document.getElementById('phoneNumber');
        if (phoneInput) {
            phoneInput.addEventListener('input', (e) => {
                let value = e.target.value.replace(/\D/g, ''); // Remove non-digits
                
                // Format as user types
                if (value.length <= 10) {
                    // Indian mobile number format
                    if (value.length > 5) {
                        value = value.replace(/(\d{5})(\d{0,5})/, '$1 $2');
                    }
                } else if (value.length <= 12 && (value.startsWith('91') || value.startsWith('1'))) {
                    // With country code
                    value = value.replace(/(\d{2})(\d{5})(\d{0,5})/, '+$1 $2 $3');
                }
                
                e.target.value = value.trim();
            });

            // Handle paste events
            phoneInput.addEventListener('paste', (e) => {
                setTimeout(() => {
                    let value = e.target.value.replace(/\D/g, '');
                    if (value.length === 10) {
                        e.target.value = value.replace(/(\d{5})(\d{5})/, '$1 $2');
                    } else if (value.length === 12 && value.startsWith('91')) {
                        e.target.value = value.replace(/(\d{2})(\d{5})(\d{5})/, '+$1 $2 $3');
                    }
                }, 10);
            });
        }
    }

    /**
     * Show WhatsApp modal for phone number input
     */
    showWhatsAppModal() {
        // Check if we have profiles to send
        let profilesCount = 0;
        if (window.matchingProfiles && Array.isArray(window.matchingProfiles)) {
            profilesCount = window.matchingProfiles.length;
        } else {
            // Count table rows
            const tableRows = document.querySelectorAll('table tbody tr');
            profilesCount = tableRows.length;
        }
        
        if (profilesCount === 0) {
            if (typeof ErrorHandler !== 'undefined') {
                ErrorHandler.showError('No profiles available to send via WhatsApp', ErrorHandler.errorTypes.VALIDATION);
            } else {
                alert('No profiles available to send via WhatsApp');
            }
            return;
        }
        
        // Show the modal
        const modal = new bootstrap.Modal(document.getElementById('whatsappModal'));
        modal.show();
        
        // Clear previous input
        document.getElementById('phoneNumber').value = '';
        document.getElementById('phoneNumber').focus();
    }

    /**
     * Send WhatsApp PDF - Generate PDF and prepare for WhatsApp sharing
     */
    async sendWhatsAppPDF() {
        // Clean up any existing instruction modals first
        const existingInstructionModals = document.querySelectorAll('#whatsappInstructionModal');
        existingInstructionModals.forEach(modal => {
            const bsModal = bootstrap.Modal.getInstance(modal);
            if (bsModal) {
                bsModal.hide();
            }
            modal.remove();
        });
        
        const phoneNumber = document.getElementById('phoneNumber').value.trim();
        
        if (!phoneNumber) {
            if (typeof ErrorHandler !== 'undefined') {
                ErrorHandler.showError('Please enter a phone number', ErrorHandler.errorTypes.VALIDATION);
            } else {
                alert('Please enter a phone number');
            }
            document.getElementById('phoneNumber').focus();
            return;
        }

        // Validate phone number format
        if (!this.validatePhoneNumber(phoneNumber)) {
            if (typeof ErrorHandler !== 'undefined') {
                ErrorHandler.showError('Please enter a valid phone number (10 digits with optional country code)', ErrorHandler.errorTypes.VALIDATION);
            } else {
                alert('Please enter a valid phone number (10 digits with optional country code)');
            }
            document.getElementById('phoneNumber').focus();
            return;
        }

        // Close the modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('whatsappModal'));
        modal.hide();

        // Show processing message
        const processingAlert = this.createProcessingAlert();
        document.body.appendChild(processingAlert);

        try {
            // Generate filename
            const filename = this.generateWhatsAppFilename();
            window.whatsappPdfFilename = filename;

            // Step 1: Generate and download the PDF synchronously
            this.debugLogger.step('WhatsApp', 1, 'Starting PDF generation');
            
            try {
                // Wait for PDF to be fully generated and downloaded
                await this.downloadManager.downloadProfiles('whatsapp-pdf');
                this.debugLogger.step('WhatsApp', 1, 'PDF downloaded successfully');
                
                // Remove processing alert safely
                if (processingAlert && processingAlert.parentNode) {
                    processingAlert.remove();
                }

                // Step 2: Show confirmation modal for WhatsApp (only after PDF is ready)
                this.debugLogger.step('WhatsApp', 2, 'Showing WhatsApp confirmation');
                this.showConfirmationModal(phoneNumber);
                
            } catch (pdfError) {
                this.debugLogger.error('WhatsApp', 'Error in PDF generation step', pdfError);
                throw pdfError; // Re-throw to be caught by outer catch
            }

        } catch (error) {
            // Remove processing alert safely
            if (processingAlert && processingAlert.parentNode) {
                processingAlert.remove();
            }
            
            this.cleanupModals();
            
            console.error('Error sending WhatsApp PDF:', error);
            if (typeof ErrorHandler !== 'undefined') {
                ErrorHandler.showError('Error generating PDF for WhatsApp. Please try again.', ErrorHandler.errorTypes.SERVER);
            } else {
                alert('Error generating PDF for WhatsApp. Please try again.');
            }
        }
    }

    /**
     * Validate phone number format
     * @param {string} phoneNumber - Phone number to validate
     * @returns {boolean} - Validation result
     */
    validatePhoneNumber(phoneNumber) {
        const phoneRegex = /^(\+\d{1,3}[- ]?)?\d{10}$/;
        return phoneRegex.test(phoneNumber.replace(/\s+/g, ''));
    }

    /**
     * Create processing alert element
     * @returns {HTMLElement} - Processing alert element
     */
    createProcessingAlert() {
        const processingAlert = document.createElement('div');
        processingAlert.className = 'alert alert-info alert-dismissible fade show position-fixed';
        processingAlert.style.cssText = 'top: 20px; right: 20px; z-index: 9999; max-width: 400px;';
        processingAlert.innerHTML = `
            <i class="fas fa-spinner fa-spin me-2"></i>
            <strong>Generating PDF...</strong><br>
            <small>Please wait while we prepare your file</small>
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        return processingAlert;
    }

    /**
     * Generate unique filename for WhatsApp PDF
     * @returns {string} - Generated filename
     */
    generateWhatsAppFilename() {
        const now = new Date();
        const timestamp = now.toISOString().slice(0, 19).replace(/:/g, '-').replace('T', '_');
        
        this.debugLogger.info('WhatsApp', 'Seeker info retrieved', { seekerInfo: window.seekerInfo });
        
        let seekerName = 'Profile_Seeker';
        if (window.seekerInfo && window.seekerInfo.name && window.seekerInfo.name !== 'null' && window.seekerInfo.name !== 'Profile Seeker') {
            seekerName = window.seekerInfo.name;
        }
        
        this.debugLogger.info('WhatsApp', 'Using seeker name', { seekerName, originalSeekerInfo: window.seekerInfo });
        
        const cleanSeekerName = seekerName.replace(/[^a-zA-Z0-9]/g, '_');
        return `Matchings_${cleanSeekerName}_${timestamp}.pdf`;
    }

    /**
     * Show confirmation modal after PDF is ready
     * @param {string} phoneNumber - Phone number for WhatsApp
     */
    showConfirmationModal(phoneNumber) {
        const confirmationModal = document.createElement('div');
        confirmationModal.className = 'modal fade';
        confirmationModal.id = 'whatsappConfirmationModal';
        confirmationModal.setAttribute('data-bs-backdrop', 'static');
        confirmationModal.setAttribute('data-bs-keyboard', 'false');
        confirmationModal.innerHTML = `
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content" style="border: 2px solid #25D366; border-radius: 15px;">
                    <div class="modal-header" style="background: linear-gradient(45deg, #25D366, #128C7E); color: white;">
                        <h5 class="modal-title">
                            <i class="fas fa-check-circle me-2"></i>PDF Ready!
                        </h5>
                    </div>
                    <div class="modal-body text-center" style="background: rgba(37, 211, 102, 0.05);">
                        <div class="mb-4">
                            <i class="fas fa-file-pdf text-danger" style="font-size: 3rem;"></i>
                            <h4 class="text-success mt-2">PDF Downloaded Successfully!</h4>
                        </div>
                        
                        <div class="alert alert-success">
                            <i class="fas fa-info-circle me-2"></i>
                            <strong>File saved:</strong> ${window.whatsappPdfFilename}
                        </div>
                        
                        <div class="alert alert-info">
                            <i class="fab fa-whatsapp me-2"></i>
                            <strong>Ready for WhatsApp!</strong><br>
                            Your PDF is now ready. Would you like to proceed to WhatsApp Web to send it?
                        </div>
                        
                        <p class="text-muted small">
                            The PDF has been downloaded to your Downloads folder. 
                            You can now share it via WhatsApp or close this dialog.
                        </p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                            <i class="fas fa-times me-2"></i>Just Download (Close)
                        </button>
                        <button type="button" class="btn btn-success" onclick="proceedToWhatsApp('${phoneNumber}')"
                            <i class="fab fa-whatsapp me-2"></i>Open WhatsApp Web
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(confirmationModal);
        const modal = new bootstrap.Modal(confirmationModal);
        
        // Add proper cleanup when modal is hidden
        confirmationModal.addEventListener('hidden.bs.modal', function () {
            confirmationModal.remove();
            const backdrops = document.querySelectorAll('.modal-backdrop');
            backdrops.forEach(backdrop => backdrop.remove());
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        });
        
        modal.show();
        this.debugLogger.step('WhatsApp', 2, 'Confirmation modal shown');
    }

    /**
     * Proceed to WhatsApp after PDF confirmation
     * @param {string} phoneNumber - Phone number for WhatsApp
     */
    proceedToWhatsApp(phoneNumber) {
        this.debugLogger.step('WhatsApp', 3, 'User confirmed - proceeding to WhatsApp');
        
        // Close the confirmation modal
        const confirmationModal = document.getElementById('whatsappConfirmationModal');
        if (confirmationModal) {
            const modal = bootstrap.Modal.getInstance(confirmationModal);
            if (modal) {
                modal.hide();
            }
        }
        
        // Format phone number and generate content
        const formattedPhone = this.formatPhoneNumberForWhatsApp(phoneNumber);
        const whatsappTextContent = this.generateWhatsAppTextContent();

        // Create WhatsApp message and open WhatsApp Web
        this.debugLogger.step('WhatsApp', 4, 'Opening WhatsApp Web');
        
        const message = this.createWhatsAppMessage(whatsappTextContent);
        const whatsappUrl = `https://web.whatsapp.com/send?phone=${formattedPhone}&text=${message}`;
        this.whatsappWindowRef = window.open(whatsappUrl, '_blank');
        this.debugLogger.step('WhatsApp', 4, 'WhatsApp Web opened');

        // Show final instructions modal (after WhatsApp is opened)
        setTimeout(() => {
            this.debugLogger.step('WhatsApp', 5, 'Showing final instructions');
            this.showFinalInstructionsModal();
        }, 500);
    }

    /**
     * Format phone number for WhatsApp
     * @param {string} phoneNumber - Raw phone number
     * @returns {string} - Formatted phone number
     */
    formatPhoneNumberForWhatsApp(phoneNumber) {
        let formattedPhone = phoneNumber.replace(/\D/g, ''); // Remove non-digits
        
        // Add country code if not present (default to +91 for India)
        if (formattedPhone.length === 10) {
            formattedPhone = '91' + formattedPhone;
        } else if (formattedPhone.startsWith('91') && formattedPhone.length === 12) {
            // Already has +91, keep as is
        } else if (formattedPhone.startsWith('0') && formattedPhone.length === 11) {
            // Indian number with leading 0, remove 0 and add 91
            formattedPhone = '91' + formattedPhone.substring(1);
        }

        return formattedPhone;
    }

    /**
     * Helper function to format Porutham with classification
     * @param {number} porutham - Porutham score
     * @param {string} matchingSource - Source of matching (uthamam/mathimam)
     * @returns {string} - Formatted Porutham with classification
     */
    formatPoruthamWithClassification(porutham, matchingSource) {
        if (!porutham) return 'N/A';
        
        // Transform porutham value: 4→"M", 11→"U", others unchanged
        const transformedPorutham = window.PoruthamFormatter && window.PoruthamFormatter.transformPorutham ? 
                                   window.PoruthamFormatter.transformPorutham(porutham) : porutham;
        
        // Special handling for transformed values - detect format dynamically
        if (transformedPorutham === 'M') {
            return 'M Porutham';
        } else if (transformedPorutham === 'U') {
            return 'U Porutham';
        } else if (transformedPorutham === 'Mathimam') {
            return 'Mathimam Porutham';
        } else if (transformedPorutham === 'Uthamam') {
            return 'Uthamam Porutham';
        } else {
            // Existing logic for numeric values
            const classification = matchingSource === 'uthamam' ? 'Uthamam' : 
                                  matchingSource === 'mathimam' ? 'Mathimam' : '';
            return classification ? `${transformedPorutham}/10 (${classification})` : `${transformedPorutham}/10`;
        }
    }

    /**
     * Helper function to generate minimal header/footer and calculate size
     * @param {string} seekerName - Name of the seeker
     * @param {string} serialNo - Serial number of the seeker
     * @param {number} totalMatches - Total number of matches
     * @param {string} pdfFilename - PDF filename
     * @returns {object} - Header, footer, and total size
     */
    generateMinimalHeaderFooter(seekerName, serialNo, totalMatches, pdfFilename) {
        // Create minimal header
        let header = `🔍 *PROFILES FOR ${seekerName || 'SEEKER'} (${serialNo || 'N/A'})*\n`;
        header += `📅 ${new Date().toLocaleDateString('en-IN')} | 👥 ${totalMatches} matches\n`;
        
        // Shorten PDF filename if too long
        let shortFilename = pdfFilename || 'PDF';
        if (shortFilename.length > 40) {
            shortFilename = shortFilename.substring(0, 37) + '...';
        }
        header += `📎 See PDF: ${shortFilename}\n\n`;
        
        // Minimal footer
        const footer = `\n\n📝 Review & share feedback. Thanks!`;
        
        return {
            header: header,
            footer: footer,
            totalSize: header.length + footer.length
        };
    }

    /**
     * Helper function to generate single profile text
     * @param {object} profile - Profile object
     * @param {number} index - Profile index
     * @returns {string} - Generated profile text
     */
    generateSingleProfileText(profile, index) {
        let profileText = `*Profile ${index + 1}*\n`;
        profileText += `👤 Name: ${profile.name || 'N/A'} (${profile.serial_no || 'N/A'})\n`;
        profileText += `🎂 Age: ${profile.age || 'N/A'}\n`;
        profileText += `⭐ Nakshatra: ${profile.nakshatraName || 'N/A'}\n`;
        profileText += `🎓 Qualification: ${profile.qualification || 'N/A'}\n`;
        if (profile.monthly_income) {
            const income = parseInt(profile.monthly_income);
            const formattedIncome = income ? `₹${income.toLocaleString('en-IN')}` : 'N/A';
            profileText += `💰 Income: ${formattedIncome}\n`;
        }
        profileText += `👨‍👩‍👧‍👦 Region: ${profile.region || 'N/A'}\n`;
        if (profile.porutham) {
            profileText += `🎯 Porutham: ${this.formatPoruthamWithClassification(profile.porutham, profile.matchingSource)}\n`;
        }
        profileText += `${'─'.repeat(30)}\n\n`;
        return profileText;
    }

    /**
     * Generate WhatsApp text content from profile data
     * @returns {string} - WhatsApp text content
     */
    generateWhatsAppTextContent() {
        // WhatsApp character limit constants - Optimized for maximum profile visibility
        const WHATSAPP_SAFE_LIMIT = 5500;  // Increased safe character limit for WhatsApp messages
        const HEADER_FOOTER_SIZE = 100;    // Minimized header + footer content
        const AVAILABLE_FOR_PROFILES = 5400; // Maximum space available for profiles (5500 - 100)

        // Get the profile data
        let profilesData = [];
        if (window.matchingProfiles && Array.isArray(window.matchingProfiles) && window.matchingProfiles.length > 0) {
            profilesData = window.matchingProfiles;
            
            // Sort profiles: Uthamam -> Mathimam -> Others
            profilesData = [...profilesData].sort((a, b) => {
                const getOrder = (matchingSource) => {
                    if (matchingSource === 'uthamam') return 1;
                    if (matchingSource === 'mathimam') return 2;
                    return 3;
                };
                return getOrder(a.matchingSource) - getOrder(b.matchingSource);
            });
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
                        porutham: cells[9].textContent.trim()
                    };
                    profilesData.push(profile);
                }
            });
        }

        // Get seeker info for minimal header/footer generation
        const seekerName = (window.seekerInfo && window.seekerInfo.name && window.seekerInfo.name !== 'null') 
            ? window.seekerInfo.name : 'SEEKER';
        const seekerSerialNo = (window.seekerInfo && window.seekerInfo.serialNo) 
            ? window.seekerInfo.serialNo : 'N/A';

        // Generate minimal header and footer
        const headerFooterInfo = this.generateMinimalHeaderFooter(
            seekerName, 
            seekerSerialNo, 
            profilesData.length, 
            window.whatsappPdfFilename
        );

        // Start with the minimal header
        let whatsappTextContent = headerFooterInfo.header;

        // Dynamic profile fitting algorithm
        let profilesContent = '';
        let profilesShown = 0;
        const footerSize = headerFooterInfo.footer.length;

        // Reserve space for "See PDF for X more profiles" message if needed
        const additionalProfilesMessageReserve = 80; // Approximate size of the additional profiles message

        for (let i = 0; i < profilesData.length; i++) {
            const profileText = this.generateSingleProfileText(profilesData[i], i);
            
            // Calculate potential total message size if we add this profile
            const potentialTotalSize = whatsappTextContent.length + profilesContent.length + profileText.length + footerSize;
            
            // Check if adding this profile would exceed the limit
            // Reserve space for additional profiles message if there are more profiles after this one
            const spaceNeeded = (i < profilesData.length - 1) ? additionalProfilesMessageReserve : 0;
            
            if (potentialTotalSize + spaceNeeded <= WHATSAPP_SAFE_LIMIT) {
                profilesContent += profileText;
                profilesShown++;
            } else {
                // Cannot fit this profile, stop adding more
                break;
            }
        }

        // Add the profiles content to the message
        whatsappTextContent += profilesContent;

        // Add "See PDF for more profiles" message if there are remaining profiles
        const remainingProfiles = profilesData.length - profilesShown;
        if (remainingProfiles > 0) {
            whatsappTextContent += `� *See PDF for ${remainingProfiles} more profile${remainingProfiles > 1 ? 's' : ''}*\n\n`;
        }

        // Add the minimal footer to complete the message
        whatsappTextContent += headerFooterInfo.footer;

        // Debug logging to match EJS template
        this.debugLogger.info('WhatsApp', 'Dynamic fitting result', {
            profilesShown: `${profilesShown}/${profilesData.length}`,
            charactersUsed: `${whatsappTextContent.length}/${WHATSAPP_SAFE_LIMIT}`
        });

        return whatsappTextContent;
    }

    /**
     * Create the complete WhatsApp message
     * @param {string} whatsappTextContent - Complete profile text content (includes header and footer)
     * @returns {string} - Encoded WhatsApp message
     */
    createWhatsAppMessage(whatsappTextContent) {
        // The whatsappTextContent now includes optimized header, profiles, and footer
        // No need to add additional wrapper content as it's already optimized for character limits
        return encodeURIComponent(whatsappTextContent);
    }

    /**
     * Show final instructions modal after WhatsApp opens
     */
    showFinalInstructionsModal() {
        const instructionModal = document.createElement('div');
        instructionModal.className = 'modal fade';
        instructionModal.id = 'whatsappInstructionModal';
        instructionModal.setAttribute('data-bs-backdrop', 'static');
        instructionModal.setAttribute('data-bs-keyboard', 'false');
        instructionModal.innerHTML = `
            <div class="modal-dialog modal-lg modal-dialog-centered">
                <div class="modal-content" style="border: 3px solid #25D366; border-radius: 15px;">
                    <div class="modal-header" style="background: #25D366; color: white;">
                        <h5 class="modal-title">
                            <i class="fab fa-whatsapp me-2"></i>WhatsApp Ready to Send!
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body" style="background: #f8f9fa;">
                        <div class="text-center mb-4">
                            <i class="fas fa-check-circle text-success" style="font-size: 3rem;"></i>
                            <h4 class="text-success mt-2">All Set!</h4>
                        </div>
                        
                        <div class="alert alert-success">
                            <i class="fas fa-info-circle me-2"></i>
                            <strong>WhatsApp Web opened:</strong> Message is ready to send
                        </div>

                        <h6 class="text-primary mb-3">
                            <i class="fas fa-list-ol me-2"></i>Final steps to send the PDF:
                        </h6>
                        
                        <div class="row">
                            <div class="col-md-6">
                                <div class="card border-primary mb-3">
                                    <div class="card-body">
                                        <h6 class="card-title text-primary">
                                            <span class="badge bg-primary me-2">1</span>Attach PDF
                                        </h6>
                                        <p class="card-text small">
                                            • Click the <strong>📎 attachment</strong> icon in WhatsApp<br>
                                            • Select <strong>"Document"</strong><br>
                                            • Choose: <code>${window.whatsappPdfFilename}</code>
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="card border-success mb-3">
                                    <div class="card-body">
                                        <h6 class="card-title text-success">
                                            <span class="badge bg-success me-2">2</span>Send Message
                                        </h6>
                                        <p class="card-text small">
                                            • Review the pre-filled message<br>
                                            • Add any personal notes if needed<br>
                                            • Click <strong>Send</strong> 🚀
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="text-center">
                            <button class="btn btn-outline-primary btn-sm me-2" onclick="openDownloadsFolder()">
                                <i class="fas fa-folder-open me-1"></i>Open Downloads
                            </button>
                            <button class="btn btn-success btn-sm" onclick="focusWhatsApp()">
                                <i class="fab fa-whatsapp me-1"></i>Focus WhatsApp
                            </button>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                            <i class="fas fa-times me-2"></i>Close
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(instructionModal);
        const modal = new bootstrap.Modal(instructionModal);
        
        // Add proper cleanup when modal is hidden
        instructionModal.addEventListener('hidden.bs.modal', function () {
            instructionModal.remove();
            const backdrops = document.querySelectorAll('.modal-backdrop');
            backdrops.forEach(backdrop => backdrop.remove());
            document.body.classList.remove('modal-open');
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        });
        
        modal.show();
        this.debugLogger.step('WhatsApp', 5, 'Final instructions shown');
    }

    /**
     * Helper function to focus WhatsApp window
     */
    focusWhatsApp() {
        try {
            if (this.whatsappWindowRef && !this.whatsappWindowRef.closed) {
                this.whatsappWindowRef.focus();
            } else {
                // If window reference is lost, show instructions
                if (typeof ErrorHandler !== 'undefined') {
                    ErrorHandler.showInfo(
                        '📱 Please switch to your WhatsApp Web tab:\n\n' +
                        '1. Look for the WhatsApp Web browser tab\n' +
                        '2. Click the attachment icon (📎)\n' +
                        '3. Select "Document"\n' +
                        '4. Choose your downloaded PDF file\n' +
                        '5. Add any additional message if needed\n' +
                        '6. Click Send! �'
                    );
                } else {
                    alert(
                        '�📱 Please switch to your WhatsApp Web tab:\n\n' +
                        '1. Look for the WhatsApp Web browser tab\n' +
                        '2. Click the attachment icon (📎)\n' +
                        '3. Select "Document"\n' +
                        '4. Choose your downloaded PDF file\n' +
                        '5. Add any additional message if needed\n' +
                        '6. Click Send! 🚀'
                    );
                }
            }
        } catch (e) {
            if (typeof ErrorHandler !== 'undefined') {
                ErrorHandler.showInfo('Please switch to your WhatsApp Web tab to attach the PDF file.');
            } else {
                alert('Please switch to your WhatsApp Web tab to attach the PDF file.');
            }
        }
    }

    /**
     * Clean up any stuck modals and reset body state
     */
    cleanupModals() {
        // Clean up any stuck modals
        const existingModals = document.querySelectorAll('#whatsappInstructionModal, #whatsappConfirmationModal');
        existingModals.forEach(modal => modal.remove());
        
        // Clean up any modal backdrops
        const backdrops = document.querySelectorAll('.modal-backdrop');
        backdrops.forEach(backdrop => backdrop.remove());
        
        // Reset body state
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
    }
}